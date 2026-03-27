import { Worker } from 'bullmq'
import { Redis } from 'ioredis'
import { createClient } from '@supabase/supabase-js'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const SLIPOK_API_KEY = process.env.SLIPOK_API_KEY || ''

const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null })
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const worker = new Worker(
  'slip-verification',
  async (job) => {
    const { paymentId, orderId, slipImageUrl } = job.data

    console.log(`[SlipVerify] Processing: payment=${paymentId}, order=${orderId}`)

    try {
      // 1. Get order details
      const { data: order } = await supabase
        .from('orders')
        .select('id, total_amount, status')
        .eq('id', orderId)
        .single()

      if (!order) {
        console.log(`[SlipVerify] Order ${orderId} not found`)
        return
      }

      if (order.status !== 'pending_payment') {
        console.log(`[SlipVerify] Order ${orderId} status is ${order.status}, skipping`)
        return
      }

      // 2. Call SlipOK API
      let verifyResult: any = { success: false, error: 'API not configured' }

      if (SLIPOK_API_KEY) {
        try {
          const response = await fetch('https://api.slipok.com/api/line/apikey/12345', {
            method: 'POST',
            headers: {
              'x-authorization': SLIPOK_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: slipImageUrl }),
          })
          verifyResult = await response.json()
        } catch (err: any) {
          verifyResult = { success: false, error: err.message }
        }
      }

      // 3. Update slip verification record
      const { data: verification } = await supabase
        .from('slip_verifications')
        .insert({
          payment_id: paymentId,
          provider: 'slipok',
          provider_ref: verifyResult.data?.transRef || null,
          verified_amount: verifyResult.data?.amount ? Math.round(parseFloat(verifyResult.data.amount) * 100) : null,
          status: verifyResult.success ? 'verified' : 'failed',
          raw_response: verifyResult,
        })
        .select()
        .single()

      if (verifyResult.success) {
        // Check amount matches
        const verifiedAmount = verifyResult.data?.amount ? Math.round(parseFloat(verifyResult.data.amount) * 100) : 0
        const tolerance = 100 // 1 baht
        const amountMatch = Math.abs(verifiedAmount - order.total_amount) <= tolerance

        if (amountMatch) {
          // 4a. Payment matched — update order to paid
          await supabase
            .from('payments')
            .update({ status: 'verified', verified_at: new Date().toISOString() })
            .eq('id', paymentId)

          await supabase
            .from('orders')
            .update({ status: 'paid' })
            .eq('id', orderId)

          // Update tickets to sold
          const { data: orderItems } = await supabase
            .from('order_items')
            .select('ticket_id')
            .eq('order_id', orderId)

          if (orderItems?.length) {
            await supabase
              .from('tickets')
              .update({ status: 'sold' })
              .in('id', orderItems.map((i) => i.ticket_id))
          }

          // Create notification
          const { data: orderData } = await supabase
            .from('orders')
            .select('user_id, order_number')
            .eq('id', orderId)
            .single()

          if (orderData) {
            await supabase.from('notifications').insert({
              user_id: orderData.user_id,
              type: 'payment_verified',
              title: 'การชำระเงินสำเร็จ',
              message: `ออเดอร์ ${orderData.order_number} ชำระเงินเรียบร้อยแล้ว`,
              metadata: { order_id: orderId },
            })
          }

          console.log(`[SlipVerify] Payment ${paymentId} verified, order ${orderId} → paid`)
        } else {
          // 4b. Amount mismatch
          await supabase
            .from('payments')
            .update({ status: 'rejected' })
            .eq('id', paymentId)

          await supabase.from('notifications').insert({
            user_id: (await supabase.from('orders').select('user_id').eq('id', orderId).single()).data?.user_id,
            type: 'payment_rejected',
            title: 'ยอดเงินไม่ตรง',
            message: `กรุณาอัปโหลดสลิปใหม่ ยอดสลิป ฿${(verifiedAmount / 100).toFixed(2)} ไม่ตรงกับยอดออเดอร์`,
            metadata: { order_id: orderId },
          })

          console.log(`[SlipVerify] Payment ${paymentId} amount mismatch: slip=${verifiedAmount} order=${order.total_amount}`)
        }
      } else {
        // 4c. Verification failed
        await supabase
          .from('payments')
          .update({ status: 'rejected' })
          .eq('id', paymentId)

        const { data: orderData } = await supabase
          .from('orders')
          .select('user_id')
          .eq('id', orderId)
          .single()

        if (orderData) {
          await supabase.from('notifications').insert({
            user_id: orderData.user_id,
            type: 'payment_rejected',
            title: 'ตรวจสลิปไม่ผ่าน',
            message: 'ไม่สามารถตรวจสอบสลิปได้ กรุณาอัปโหลดใหม่',
            metadata: { order_id: orderId },
          })
        }

        console.log(`[SlipVerify] Payment ${paymentId} verification failed: ${verifyResult.error}`)
      }
    } catch (err) {
      console.error(`[SlipVerify] Error:`, err)
      throw err
    }
  },
  {
    connection,
    concurrency: 5,
  }
)

worker.on('completed', (job) => {
  console.log(`[SlipVerify] Job ${job.id} completed`)
})

worker.on('failed', (job, err) => {
  console.error(`[SlipVerify] Job ${job?.id} failed:`, err.message)
})

worker.on('ready', () => {
  console.log('[SlipVerify] Worker ready and listening for jobs...')
})

process.on('SIGTERM', async () => {
  await worker.close()
  await connection.quit()
  process.exit(0)
})

process.on('SIGINT', async () => {
  await worker.close()
  await connection.quit()
  process.exit(0)
})
