import { Redis } from 'ioredis'
import { randomUUID } from 'crypto'

let redis: Redis | null = null

function getRedis(): Redis {
  if (!redis) {
    const config = useRuntimeConfig()
    redis = new Redis(config.redisUrl)
  }
  return redis
}

const LOCK_DURATION_SECONDS = 900
const LOCK_PREFIX = 'ticket_lock:'

interface LockResult {
  success: boolean
  lockToken?: string
  expiresAt?: Date
  remainingSeconds?: number
  error?: 'ALREADY_LOCKED' | 'ALREADY_SOLD' | 'NOT_FOUND'
}

const LOCK_SCRIPT = `
  local key = KEYS[1]
  local value = ARGV[1]
  local ttl = tonumber(ARGV[2])
  local existing = redis.call('GET', key)
  if existing then
    return 0
  end
  redis.call('SET', key, value, 'EX', ttl)
  return 1
`

export async function acquireTicketLock(
  ticketId: string,
  userId: string
): Promise<LockResult> {
  const r = getRedis()
  const lockToken = randomUUID()
  const lockValue = `${userId}:${lockToken}:${Date.now()}`
  const key = `${LOCK_PREFIX}${ticketId}`

  const result = await r.eval(LOCK_SCRIPT, 1, key, lockValue, LOCK_DURATION_SECONDS.toString())

  if (result === 1) {
    const expiresAt = new Date(Date.now() + LOCK_DURATION_SECONDS * 1000)
    return {
      success: true,
      lockToken,
      expiresAt,
      remainingSeconds: LOCK_DURATION_SECONDS,
    }
  }

  const existingLock = await r.get(key)
  if (existingLock?.startsWith(userId + ':')) {
    const ttl = await r.ttl(key)
    return {
      success: true,
      remainingSeconds: ttl,
      expiresAt: new Date(Date.now() + ttl * 1000),
    }
  }

  return {
    success: false,
    error: 'ALREADY_LOCKED',
  }
}

export async function releaseTicketLock(
  ticketId: string,
  userId: string
): Promise<boolean> {
  const r = getRedis()
  const key = `${LOCK_PREFIX}${ticketId}`

  const RELEASE_SCRIPT = `
    local key = KEYS[1]
    local userId = ARGV[1]
    local val = redis.call('GET', key)
    if val and string.find(val, userId, 1, true) == 1 then
      redis.call('DEL', key)
      return 1
    end
    return 0
  `

  const result = await r.eval(RELEASE_SCRIPT, 1, key, userId)
  return result === 1
}

export async function getLockInfo(ticketId: string): Promise<{
  isLocked: boolean
  lockedBy?: string
  remainingSeconds?: number
}> {
  const r = getRedis()
  const key = `${LOCK_PREFIX}${ticketId}`
  const value = await r.get(key)

  if (!value) {
    return { isLocked: false }
  }

  const [userId] = value.split(':')
  const ttl = await r.ttl(key)

  return {
    isLocked: true,
    lockedBy: userId,
    remainingSeconds: ttl,
  }
}

export async function getLockedTicketIds(ticketIds: string[]): Promise<Set<string>> {
  if (ticketIds.length === 0) return new Set()

  const r = getRedis()
  const pipeline = r.pipeline()
  for (const id of ticketIds) {
    pipeline.exists(`${LOCK_PREFIX}${id}`)
  }

  const results = await pipeline.exec()
  const lockedIds = new Set<string>()

  results?.forEach(([err, exists], index) => {
    if (!err && exists === 1) {
      lockedIds.add(ticketIds[index])
    }
  })

  return lockedIds
}
