import { Worker } from 'bullmq'
import { Redis } from 'ioredis'
import { createClient } from '@supabase/supabase-js'

// This worker runs as a standalone process
// Start with: npx tsx server/workers/cartExpiry.worker.ts

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null })
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const LOCK_PREFIX = 'ticket_lock:'

const worker = new Worker(
  'cart-expiry',
  async (job) => {
    const { cartItemId, ticketId, userId } = job.data

    console.log(`[CartExpiry] Processing: cart=${cartItemId}, ticket=${ticketId}, user=${userId}`)

    try {
      // 1. Check if cart item is still active (not yet checked out)
      const { data: cartItem } = await supabase
        .from('cart_items')
        .select('id, status')
        .eq('id', cartItemId)
        .single()

      if (!cartItem) {
        console.log(`[CartExpiry] Cart item ${cartItemId} not found, skipping`)
        return
      }

      // If already checked out or expired, skip
      if (cartItem.status !== 'active') {
        console.log(`[CartExpiry] Cart item ${cartItemId} status is ${cartItem.status}, skipping`)
        return
      }

      // 2. Release Redis lock
      const lockKey = `${LOCK_PREFIX}${ticketId}`
      const lockValue = await connection.get(lockKey)

      if (lockValue && lockValue.startsWith(userId + ':')) {
        await connection.del(lockKey)
        console.log(`[CartExpiry] Released lock for ticket ${ticketId}`)
      }

      // 3. Update cart item status to expired
      await supabase
        .from('cart_items')
        .update({ status: 'expired' })
        .eq('id', cartItemId)

      // 4. Reset ticket status to available
      await supabase
        .from('tickets')
        .update({ status: 'available' })
        .eq('id', ticketId)
        .eq('status', 'reserved') // Only reset if still reserved

      console.log(`[CartExpiry] Expired cart item ${cartItemId}, ticket ${ticketId} now available`)
    } catch (err) {
      console.error(`[CartExpiry] Error processing job:`, err)
      throw err // Let BullMQ retry
    }
  },
  {
    connection,
    concurrency: 10,
  }
)

worker.on('completed', (job) => {
  console.log(`[CartExpiry] Job ${job.id} completed`)
})

worker.on('failed', (job, err) => {
  console.error(`[CartExpiry] Job ${job?.id} failed:`, err.message)
})

worker.on('ready', () => {
  console.log('[CartExpiry] Worker ready and listening for jobs...')
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[CartExpiry] Shutting down...')
  await worker.close()
  await connection.quit()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('[CartExpiry] Shutting down...')
  await worker.close()
  await connection.quit()
  process.exit(0)
})
