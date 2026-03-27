interface SlipVerifyResult {
  success: boolean
  transactionId?: string
  amount?: number
  senderAccount?: string
  receiverAccount?: string
  transferDate?: Date
  bankName?: string
  rawResponse?: any
  error?: string
}

export async function verifySlipWithSlipOK(slipImageUrl: string): Promise<SlipVerifyResult> {
  const config = useRuntimeConfig()

  if (!config.slipokApiKey) {
    return { success: false, error: 'SlipOK API key not configured' }
  }

  try {
    const response = await fetch('https://api.slipok.com/api/line/apikey/12345', {
      method: 'POST',
      headers: {
        'x-authorization': config.slipokApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: slipImageUrl }),
    })

    const data = await response.json()

    if (!data.success) {
      return {
        success: false,
        error: data.message || 'การตรวจสลิปล้มเหลว',
        rawResponse: data,
      }
    }

    return {
      success: true,
      transactionId: data.data?.transRef,
      amount: data.data?.amount ? Math.round(parseFloat(data.data.amount) * 100) : undefined,
      senderAccount: data.data?.sender?.displayName || data.data?.sender?.name,
      receiverAccount: data.data?.receiver?.displayName || data.data?.receiver?.name,
      transferDate: data.data?.transDate ? new Date(data.data.transDate) : undefined,
      bankName: data.data?.sendingBank,
      rawResponse: data,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'ไม่สามารถเชื่อมต่อ SlipOK ได้',
    }
  }
}

export async function validateSlipAgainstOrder(
  slipResult: SlipVerifyResult,
  orderAmount: number,
  platformAccount: string
): Promise<{ valid: boolean; reason?: string }> {
  if (!slipResult.success) {
    return { valid: false, reason: 'ไม่สามารถอ่านสลิปได้' }
  }

  // Check amount matches (allow 1 baht tolerance for rounding)
  if (slipResult.amount !== undefined) {
    const tolerance = 100 // 1 baht in satang
    const diff = Math.abs(slipResult.amount - orderAmount)
    if (diff > tolerance) {
      return {
        valid: false,
        reason: `ยอดเงินไม่ตรง: สลิป ฿${(slipResult.amount / 100).toFixed(2)} ออเดอร์ ฿${(orderAmount / 100).toFixed(2)}`,
      }
    }
  }

  return { valid: true }
}
