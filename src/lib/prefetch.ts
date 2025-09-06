// src/lib/prefetch.ts
// Idle + network-aware prefetch with AbortController and Cache Storage.
// No dependencies; safe to import from components or logic modules.

type PrefetchOptions = {
  delayMs?: number            // debounce before starting after idle
  maxConcurrency?: number     // 1 by default
}

const rIC = (cb: () => void) =>
  ('requestIdleCallback' in window)
    ? (window as any).requestIdleCallback(cb, { timeout: 2000 })
    : setTimeout(cb, 500) as unknown as number;

export function shouldPrefetch(): boolean {
  const nav = (navigator as any)
  const conn = nav?.connection
  if (conn?.saveData) return false
  const et = conn?.effectiveType as string | undefined
  if (et && /(^|[^-\w])(2g|slow-2g)/i.test(et)) return false
  return document.visibilityState === 'visible'
}

export function politePrefetch(urls: string[], opts: PrefetchOptions = {}) {
  const { delayMs = 1200, maxConcurrency = 1 } = opts

  const controller = new AbortController()
  const abort = () => controller.abort()

  // Cancel on user interaction immediately.
  const cancelEvents = ['pointerdown', 'keydown', 'wheel', 'touchstart']
  cancelEvents.forEach(ev => window.addEventListener(ev, abort, { passive: true, once: true }))

  // Start when idle + visible + not constrained.
  const start = () => {
    if (!shouldPrefetch() || controller.signal.aborted) return
    queue().catch(() => {/* ignore */})
  }

  const idleHandle = rIC(() => setTimeout(start, delayMs))

  async function queue() {
    const cache = 'badger-animations'
    const c = await caches.open(cache)

    let inFlight = 0
    let i = 0

    return new Promise<void>((resolve) => {
      const pump = () => {
        if (controller.signal.aborted) return resolve()
        while (inFlight < maxConcurrency && i < urls.length) {
          const url = urls[i++]
          inFlight++
          fetchAndPut(c, url, controller.signal)
            .catch(() => {/* ignore individual failures */})
            .finally(() => { inFlight--; pump() })
        }
        if (inFlight === 0 && i >= urls.length) resolve()
      }
      pump()
    })
  }

  async function fetchAndPut(c: Cache, url: string, signal: AbortSignal) {
    // Skip if already cached
    const hit = await c.match(url)
    if (hit) return
    const res = await fetch(url, { signal, // @ts-ignore Chrome Priority Hints (best-effort)
      priority: 'low', credentials: 'omit', cache: 'no-store' })
    if (!res.ok) return
    await c.put(url, res.clone())
  }

  return {
    abort,
    signal: controller.signal,
    dispose() {
      try { (window as any).cancelIdleCallback?.(idleHandle) } catch {}
      cancelEvents.forEach(ev => window.removeEventListener(ev, abort))
      controller.abort()
    }
  }
}
