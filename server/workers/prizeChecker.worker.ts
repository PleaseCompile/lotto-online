import { Worker } from 'bullmq'
import { Redis } from 'ioredis'
import { batchCheckPrizesForDraw } from '../services/prizeChecker.batch'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null })

const worker = new Worker(
  'prize-checker',
  async (job) => {
    const { drawId } = job.data
    console.log(`[PrizeChecker] Processing draw ${drawId}`)

    const result = await batchCheckPrizesForDraw(drawId)
    console.log(`[PrizeChecker] Draw ${drawId}: checked ${result.checked}, winners ${result.winners}`)

    return result
  },
  {
    connection,
    concurrency: 1,
  }
)

worker.on('completed', (job, result) => {
  console.log(`[PrizeChecker] Job ${job.id} completed:`, result)
})

worker.on('failed', (job, err) => {
  console.error(`[PrizeChecker] Job ${job?.id} failed:`, err.message)
})

worker.on('ready', () => {
  console.log('[PrizeChecker] Worker ready and listening for jobs...')
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
