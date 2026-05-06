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

export const streamText = ({ text, speedMs, chunkSize, onUpdate }) => {
  const fullText = String(text || '')

  if (!fullText) {
    onUpdate('', true)
    return { cancel: () => {} }
  }

  if (!speedMs || speedMs <= 0) {
    onUpdate(fullText, true)
    return { cancel: () => {} }
  }

  let index = 0
  let timer = null
  let cancelled = false

  const tick = () => {
    if (cancelled) return
    index += chunkSize
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
