/** AbortSignal that fires after `ms` (uses AbortSignal.timeout when available). */
export function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

/** Rejects after `ms` if `promise` has not settled; clears the timer when `promise` wins. */
export async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let tid: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, rej) => {
        tid = setTimeout(
          () => rej(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)),
          ms
        );
      }),
    ]);
  } finally {
    if (tid !== undefined) clearTimeout(tid);
  }
}
