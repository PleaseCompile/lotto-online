interface PrizeMatch {
  prizeType: string
  prizeName: string
  rewardAmount: number
}

interface LotteryApiResponse {
  status: string
  response: {
    date: string
    prizes: Array<{
      id: string
      name: string
      reward: string
      number: string[]
    }>
    runningNumbers: Array<{
      id: string
      name: string
      reward: string
      number: string[]
    }>
  }
}

export function checkTicketAgainstResults(
  ticketNumber: string,
  results: LotteryApiResponse['response']
): PrizeMatch[] {
  const matches: PrizeMatch[] = []

  // 1. Check full 6-digit number prizes
  for (const prize of results.prizes) {
    if (prize.number.includes(ticketNumber)) {
      matches.push({
        prizeType: prize.id,
        prizeName: prize.name,
        rewardAmount: parseInt(prize.reward) * 100,
      })
    }
  }

  // 2. Front 3 digits
  const front3 = ticketNumber.substring(0, 3)
  for (const rn of results.runningNumbers) {
    if (rn.id === 'runningNumberFrontThree' && rn.number.includes(front3)) {
      matches.push({
        prizeType: rn.id,
        prizeName: rn.name,
        rewardAmount: parseInt(rn.reward) * 100,
      })
    }
  }

  // 3. Back 3 digits
  const back3 = ticketNumber.substring(3, 6)
  for (const rn of results.runningNumbers) {
    if (rn.id === 'runningNumberBackThree' && rn.number.includes(back3)) {
      matches.push({
        prizeType: rn.id,
        prizeName: rn.name,
        rewardAmount: parseInt(rn.reward) * 100,
      })
    }
  }

  // 4. Back 2 digits
  const back2 = ticketNumber.substring(4, 6)
  for (const rn of results.runningNumbers) {
    if (rn.id === 'runningNumberBackTwo' && rn.number.includes(back2)) {
      matches.push({
        prizeType: rn.id,
        prizeName: rn.name,
        rewardAmount: parseInt(rn.reward) * 100,
      })
    }
  }

  return matches
}

export async function fetchLatestResults(): Promise<LotteryApiResponse> {
  const response = await fetch('https://lotto.api.rayriffy.com/latest')
  const data = await response.json()
  if (data.status !== 'success') {
    throw new Error('Failed to fetch lottery results')
  }
  return data
}
