import { serverSupabaseUser } from '#supabase/server'
import { getServiceClient } from '../../../utils/supabase'
import { checkTicketAgainstResults, fetchLatestResults } from '../../../services/prizeChecker.service'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'กรุณาเข้าสู่ระบบ' })
  }

  const drawId = getRouterParam(event, 'drawId')
  if (!drawId) {
    throw createError({ statusCode: 400, message: 'กรุณาระบุ draw ID' })
  }

  const supabase = getServiceClient()

  // Get user's sold tickets for this draw (via order_items)
  const { data: orderItems } = await supabase
    .from('order_items')
    .select(`
      id,
      ticket_id,
      prize_status,
      tickets!inner(id, number, set_number, draw_id),
      orders!inner(user_id, status)
    `)
    .eq('orders.user_id', user.id)
    .eq('orders.status', 'paid')
    .eq('tickets.draw_id', drawId)

  if (!orderItems?.length) {
    return { data: [], message: 'ไม่มีลอตเตอรี่ในงวดนี้' }
  }

  // Check draw results exist in DB
  const { data: drawResults } = await supabase
    .from('draw_results')
    .select('*')
    .eq('draw_id', drawId)

  // If no results in DB, try fetching from API
  let apiResults: any = null
  if (!drawResults?.length) {
    try {
      const apiData = await fetchLatestResults()
      apiResults = apiData.response
    } catch {
      return {
        data: orderItems.map((item: any) => ({
          ticket_number: item.tickets.number,
          prize_status: item.prize_status || 'unchecked',
          prizes: [],
        })),
        message: 'ยังไม่มีผลรางวัล',
      }
    }
  }

  // Check each ticket
  const results = orderItems.map((item: any) => {
    const ticket = item.tickets

    if (apiResults) {
      const matches = checkTicketAgainstResults(ticket.number, apiResults)
      return {
        ticket_number: ticket.number,
        set_number: ticket.set_number,
        prize_status: matches.length > 0 ? 'won' : 'no_prize',
        prizes: matches,
      }
    }

    // Use DB results
    const ticketPrizes: any[] = []
    if (drawResults) {
      for (const result of drawResults) {
        // Check full number
        if (result.winning_number === ticket.number) {
          ticketPrizes.push({
            prizeType: result.prize_type,
            prizeName: result.prize_name,
            rewardAmount: result.reward_amount,
          })
        }
        // Check front 3
        if (result.prize_type === 'runningNumberFrontThree' &&
            result.winning_number === ticket.number.substring(0, 3)) {
          ticketPrizes.push({
            prizeType: result.prize_type,
            prizeName: result.prize_name,
            rewardAmount: result.reward_amount,
          })
        }
        // Check back 3
        if (result.prize_type === 'runningNumberBackThree' &&
            result.winning_number === ticket.number.substring(3, 6)) {
          ticketPrizes.push({
            prizeType: result.prize_type,
            prizeName: result.prize_name,
            rewardAmount: result.reward_amount,
          })
        }
        // Check back 2
        if (result.prize_type === 'runningNumberBackTwo' &&
            result.winning_number === ticket.number.substring(4, 6)) {
          ticketPrizes.push({
            prizeType: result.prize_type,
            prizeName: result.prize_name,
            rewardAmount: result.reward_amount,
          })
        }
      }
    }

    return {
      ticket_number: ticket.number,
      set_number: ticket.set_number,
      prize_status: ticketPrizes.length > 0 ? 'won' : (item.prize_status || 'no_prize'),
      prizes: ticketPrizes,
    }
  })

  return { data: results }
})
