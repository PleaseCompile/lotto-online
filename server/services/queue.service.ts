import { Queue } from 'bullmq'
import { Redis } from 'ioredis'

let connection: Redis | null = null
let cartExpiryQueue: Queue | null = null

function getConnection(): Redis {
  if (!connection) {
    const config = useRuntimeConfig()
    connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null })
  }
  return connection
}

function getCartExpiryQueue(): Queue {
  if (!cartExpiryQueue) {
    cartExpiryQueue = new Queue('cart-expiry', {
      connection: getConnection(),
    })
  }
  return cartExpiryQueue
}

export async function addCartExpiryJob(
  data: { cartItemId: string; ticketId: string; userId: string },
  delayMs: number
) {
  const queue = getCartExpiryQueue()
  await queue.add('expire-cart-item', data, {
    delay: delayMs,
    removeOnComplete: true,
    removeOnFail: 100,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  })
}
