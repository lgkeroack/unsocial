interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimitConfig {
  maxTokens: number;
  refillRate: number; // tokens per second
  interval: number;   // refill interval in ms
}

const stores = new Map<string, Map<string, TokenBucket>>();

const MAX_STORE_SIZE = 10_000;

export const RATE_LIMITS = {
  backupStart: { maxTokens: 5, refillRate: 5 / 3600, interval: 3600_000 },  // 5 per hour
  statusPoll: { maxTokens: 30, refillRate: 30 / 60, interval: 60_000 },      // 30 per minute
  download: { maxTokens: 10, refillRate: 10 / 3600, interval: 3600_000 },    // 10 per hour
  general: { maxTokens: 60, refillRate: 60 / 60, interval: 60_000 },         // 60 per minute
} as const;

export type RateLimitName = keyof typeof RATE_LIMITS;

interface RateLimitResult {
  allowed: boolean;
  retryAfter: number; // seconds until next token
  remaining: number;
}

function getStore(storeName: string): Map<string, TokenBucket> {
  let store = stores.get(storeName);
  if (!store) {
    store = new Map();
    stores.set(storeName, store);
  }
  return store;
}

function cleanupStore(store: Map<string, TokenBucket>, config: RateLimitConfig): void {
  if (store.size <= MAX_STORE_SIZE) return;

  const now = Date.now();
  for (const [key, bucket] of store) {
    const elapsed = now - bucket.lastRefill;
    const refilled = bucket.tokens + (elapsed / 1000) * config.refillRate;
    if (refilled >= config.maxTokens) {
      store.delete(key);
    }
  }
}

export function checkRateLimit(
  storeName: string,
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const store = getStore(storeName);
  cleanupStore(store, config);

  const now = Date.now();
  let bucket = store.get(key);

  if (!bucket) {
    bucket = { tokens: config.maxTokens, lastRefill: now };
    store.set(key, bucket);
  }

  // Refill tokens based on elapsed time
  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(config.maxTokens, bucket.tokens + elapsed * config.refillRate);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return {
      allowed: true,
      retryAfter: 0,
      remaining: Math.floor(bucket.tokens),
    };
  }

  // Calculate time until next token
  const deficit = 1 - bucket.tokens;
  const retryAfter = Math.ceil(deficit / config.refillRate);

  return {
    allowed: false,
    retryAfter,
    remaining: 0,
  };
}
