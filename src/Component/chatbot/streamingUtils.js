export const STREAMING_SPEEDS = {
  instant: 0,
  fast: 8,
  normal: 14,
  slow: 24
}

export const STREAMING_CHUNKS = {
  instant: 9999,
  fast: 6,
  normal: 4,
  slow: 2
}

/* Ceiling on how long the reveal animation may run, per speed setting.
   Without this, animation time grew with reply length: at "slow" (2 chars
   every 24ms) a 300-character answer took 3.6s and an 800-character one
   9.6s — all of it AFTER the model had already replied, because ChatBot
   awaits the animation before the turn is considered finished.

   The cap is applied by enlarging the chunk size, not by shortening the
   delay, so short replies keep exactly the cadence the user chose and only
   long ones are compressed. */
export const STREAMING_MAX_MS = {
  instant: 0,
  fast: 900,
  normal: 1400,
  slow: 2200
}

export const streamText = ({ text, speedMs, chunkSize, maxDurationMs, onUpdate }) => {
  const fullText = String(text || '')

  if (!fullText) {
    onUpdate('', true)
    return { cancel: () => {} }
  }

  if (!speedMs || speedMs <= 0) {
    onUpdate(fullText, true)
    return { cancel: () => {} }
  }

  /* Grow the chunk so the whole reveal fits inside the budget. Never shrink
     it below the caller's value — that would slow short replies down. */
  let step = Math.max(1, chunkSize)
  if (maxDurationMs > 0) {
    const maxTicks = Math.max(1, Math.floor(maxDurationMs / speedMs))
    step = Math.max(step, Math.ceil(fullText.length / maxTicks))
  }

  let index = 0
  let timer = null
  let cancelled = false

  const tick = () => {
    if (cancelled) return
    index += step
    const partial = fullText.slice(0, index)
    const done = index >= fullText.length
    onUpdate(partial, done)
    if (!done) {
      timer = setTimeout(tick, speedMs)
    }
  }

  timer = setTimeout(tick, speedMs)

  return {
    cancel: () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }
}
