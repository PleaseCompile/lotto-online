import { createClient } from '@supabase/supabase-js'
import { checkTicketAgainstResults, fetchLatestResults } from './prizeChecker.service'

export async function batchCheckPrizesForDraw(drawId: string) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Fetch results from API
  const apiData = await fetchLatestResults()

  // 2. Save draw results to DB
  const drawResults: any[] = []
  for (const prize of apiData.response.prizes) {
    for (const number of prize.number) {
      drawResults.push({
        draw_id: drawId,
        prize_type: prize.id,
        prize_name: prize.name,
        prize_amount: parseInt(prize.reward) * 100,
        winning_number: number,
      })
    }
  }
  for (const rn of apiData.response.runningNumbers) {
    for (const number of rn.number) {
      drawResults.push({
        draw_id: drawId,
        prize_type: rn.id,
        prize_name: rn.name,
        prize_amount: parseInt(rn.reward) * 100,
        winning_number: number,
      })
    }
  }

  if (drawResults.length > 0) {
    await supabase.from('draw_results').upsert(drawResults, {
      onConflict: 'draw_id,prize_type,winning_number',
      ignoreDuplicates: true,
    })
  }

  // 3. Get all sold tickets for this draw
  const { data: soldTickets } = await supabase
    .from('tickets')
    .select('id, ticket_number')
    .eq('draw_id', drawId)
    .eq('status', 'sold')

  if (!soldTickets?.length) {
    return { checked: 0, winners: 0 }
  }

  let winnersCount = 0
  const PLATFORM_FEE_PERCENT = 5

  // 4. Check each ticket
  for (const ticket of soldTickets) {
    const matches = checkTicketAgainstResults(ticket.ticket_number, apiData.response)

    if (matches.length > 0) {
      winnersCount++

      // Find order_item linked to this ticket
      const { data: orderItem } = await supabase
        .from('order_items')
        .select('id, order_id')
        .eq('ticket_id', ticket.id)
        .single()

      if (!orderItem) continue

      // Get user_id from order
      const { data: order } = await supabase
        .from('orders')
        .select('user_id')
        .eq('id', orderItem.order_id)
        .single()

      if (!order) continue

      // Create prize claims
      for (const match of matches) {
        const platformFee = Math.round(match.rewardAmount * PLATFORM_FEE_PERCENT / 100)
        const netAmount = match.rewardAmount - platformFee

        await supabase.from('prize_claims').insert({
          order_item_id: orderItem.id,
          user_id: order.user_id,
          prize_type: match.prizeType,
          prize_amount: match.rewardAmount,
          platform_fee: platformFee,
          net_amount: netAmount,
          status: 'pending',
        })
      }

      // Update order_item prize status
      await supabase
        .from('order_items')
        .update({ prize_status: 'won' })
        .eq('id', orderItem.id)

      // Notify the winner
      const totalPrize = matches.reduce((sum, m) => sum + m.rewardAmount, 0)
      const prizeNames = matches.map((m) => m.prizeName).join(', ')

      await supabase.from('notifications').insert({
        user_id: order.user_id,
        type: 'prize_won',
        title: 'ยินดีด้วย! คุณถูกรางวัล!',
        message: `ลอตเตอรี่เลข ${ticket.ticket_number} ถูก ${prizeNames} รวม ${(totalPrize / 100).toLocaleString()} บาท`,
        metadata: {
          ticket_number: ticket.ticket_number,
          prize_matches: matches,
          total_amount: totalPrize,
        },
      })
    } else {
      // No prize
      await supabase
        .from('order_items')
        .update({ prize_status: 'no_prize' })
        .eq('ticket_id', ticket.id)
    }
  }

  // 5. Update draw status
  await supabase
    .from('lottery_draws')
    .update({ status: 'resulted' })
    .eq('id', drawId)

  return {
    checked: soldTickets.length,
    winners: winnersCount,
  }
}
