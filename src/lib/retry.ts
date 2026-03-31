// ============================================================
// src/lib/retry.ts
//
// Mobile-Resilient Retry Utility with Exponential Backoff
//
// PURPOSE:
// In a gym with poor signal, Vercel Server Actions can hang forever
// or fail silently. This utility enforces a strict 15-second timeout,
// catches failures, and retries up to 3 times (1s → 3s → 5s).
//
// FEATURES:
// - 15-second Promise Timeout: prevents infinite pending states
// - Request Lock (Idempotency): discards duplicate keys to prevent DB spam
// ============================================================

const DEFAULT_DELAYS = [1000, 3000, 5000];
const TIMEOUT_MS = 15000; // 15-second hard limit

const inflightRequests = new Map<string, Promise<any>>();

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  lockKey?: string,
  delays: number[] = DEFAULT_DELAYS
): Promise<T> {
  // ── [1] REQUEST LOCK: Deduplicate concurrent calls ──
  if (lockKey) {
    const existing = inflightRequests.get(lockKey);
    if (existing) {
      console.log(`[RETRY] Blocking duplicate call for key: ${lockKey}`);
      return existing as Promise<T>;
    }
  }

  const execute = async (): Promise<T> => {
    let lastError: unknown;

    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        // ── [2] 15-SECOND GUARDBAND: Force rejection if network hangs ──
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Network timeout after 15s")), TIMEOUT_MS)
        );

        // Race the function against the timeline
        const result = await Promise.race([fn(), timeoutPromise]);
        
        return result;
      } catch (error) {
        lastError = error;
        console.warn(`[RETRY] Attempt ${attempt + 1} failed:`, error);

        if (attempt >= delays.length) {
          throw lastError; // Exhausted retries
        }

        // ── [3] EXPONENTIAL BACKOFF ──
        await new Promise((res) => setTimeout(res, delays[attempt]));
      }
    }
    
    throw lastError;
  };

  if (lockKey) {
    const promise = execute().finally(() => {
      inflightRequests.delete(lockKey);
    });
    inflightRequests.set(lockKey, promise);
    return promise;
  }

  return execute();
}
