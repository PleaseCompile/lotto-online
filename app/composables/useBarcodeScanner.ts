import { BrowserMultiFormatReader } from '@zxing/browser'
import { ref, onBeforeUnmount } from 'vue'

export interface ScanResult {
  ticketNumber: string
  setNumber: string
  drawDate: string
  rawValue: string
}

export function parseLotteryBarcode(raw: string): ScanResult | null {
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

export function useBarcodeScanner() {
  const isScanning = ref(false)
  const lastResult = ref<ScanResult | null>(null)
  const error = ref<string | null>(null)
  const reader = new BrowserMultiFormatReader()
  let controls: any = null

  async function startScanning(videoElementId: string, onScan?: (result: ScanResult) => void) {
    isScanning.value = true
    error.value = null
    lastResult.value = null

    try {
      const devices = await BrowserMultiFormatReader.listVideoInputDevices()
      if (devices.length === 0) {
        error.value = 'ไม่พบกล้อง'
        isScanning.value = false
        return
      }

      const backCamera = devices.find((d) =>
        d.label.toLowerCase().includes('back') ||
        d.label.toLowerCase().includes('rear') ||
        d.label.toLowerCase().includes('environment')
      ) || devices[0]

      controls = await reader.decodeFromVideoDevice(
        backCamera.deviceId,
        videoElementId,
        (result) => {
          if (result) {
            const parsed = parseLotteryBarcode(result.getText())
            if (parsed) {
              lastResult.value = parsed
              onScan?.(parsed)
            }
          }
        }
      )
    } catch (err: any) {
      error.value = err.message || 'ไม่สามารถเปิดกล้องได้'
      isScanning.value = false
    }
  }

  function stopScanning() {
    if (controls) {
      controls.stop?.()
      controls = null
    }
    reader.reset()
    isScanning.value = false
  }

  onBeforeUnmount(() => {
    stopScanning()
  })

  return { isScanning, lastResult, error, startScanning, stopScanning }
}
