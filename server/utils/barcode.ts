export interface ParsedBarcode {
  ticketNumber: string
  setNumber: string
  drawDate: string
  rawValue: string
}

export function parseLotteryBarcode(raw: string): ParsedBarcode | null {
  const cleaned = raw.replace(/\s/g, '')

  const sixDigitMatch = cleaned.match(/(\d{6})/)
  if (!sixDigitMatch) return null

  const ticketNumber = sixDigitMatch[1]

  let setNumber = ''
  const afterNumber = cleaned.slice(cleaned.indexOf(ticketNumber) + 6)
  const setMatch = afterNumber.match(/^(\d{1,2})/)
  if (setMatch) {
    setNumber = setMatch[1]
  }

  let drawDate = ''
  const dateMatch = cleaned.match(/(\d{2})(\d{2})(\d{2})$/)
  if (dateMatch) {
    const [, dd, mm, yy] = dateMatch
    const beYear = parseInt(yy) + 2500
    drawDate = `${dd}/${mm}/${beYear}`
  }

  return {
    ticketNumber,
    setNumber,
    drawDate,
    rawValue: raw,
  }
}
