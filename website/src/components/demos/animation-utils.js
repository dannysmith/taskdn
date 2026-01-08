/**
 * Shared animation utilities for demo components
 */

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Type text character by character into an element
 * @param {HTMLElement} element - Target element
 * @param {string} text - Text to type
 * @param {number} charDelay - Delay between characters in ms
 * @param {AbortSignal} signal - Optional abort signal to cancel animation
 */
export async function typeText(element, text, charDelay = 50, signal = null) {
  for (const char of text) {
    if (signal?.aborted) return
    element.textContent += char
    await sleep(charDelay)
  }
}

/**
 * Reveal lines one by one into a container
 * @param {HTMLElement} container - Container element
 * @param {string[]} lines - Array of HTML strings for each line
 * @param {number} lineDelay - Delay between lines in ms
 * @param {AbortSignal} signal - Optional abort signal to cancel animation
 */
export async function revealLines(container, lines, lineDelay = 80, signal = null) {
  for (const line of lines) {
    if (signal?.aborted) return
    const el = document.createElement('div')
    el.innerHTML = line
    container.appendChild(el)
    await sleep(lineDelay)
  }
}

/**
 * Check if user prefers reduced motion
 * @returns {boolean}
 */
export function checkReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Set up visibility observation for an element
 * @param {HTMLElement} element - Element to observe
 * @param {(isVisible: boolean) => void} onVisibilityChange - Callback when visibility changes
 * @returns {() => void} Cleanup function
 */
export function observeVisibility(element, onVisibilityChange) {
  const observer = new IntersectionObserver(
    ([entry]) => onVisibilityChange(entry.isIntersecting),
    { threshold: 0.1 }
  )
  observer.observe(element)
  return () => observer.disconnect()
}

/**
 * Creates an animation controller with pause/resume and abort capabilities
 * @returns {{ pause: () => void, resume: () => void, abort: () => void, isPaused: () => boolean, signal: AbortSignal }}
 */
export function createAnimationController() {
  const abortController = new AbortController()
  let paused = false
  let pauseResolve = null

  return {
    pause() {
      paused = true
    },
    resume() {
      paused = false
      if (pauseResolve) {
        pauseResolve()
        pauseResolve = null
      }
    },
    abort() {
      abortController.abort()
      // Also resume if paused so loops can exit
      this.resume()
    },
    isPaused() {
      return paused
    },
    signal: abortController.signal,
    // Wait until not paused
    async waitIfPaused() {
      while (paused && !abortController.signal.aborted) {
        await new Promise((resolve) => {
          pauseResolve = resolve
        })
      }
    },
  }
}

/**
 * A pausable sleep that respects the animation controller
 * @param {number} ms - Time to sleep
 * @param {ReturnType<typeof createAnimationController>} controller - Animation controller
 */
export async function pausableSleep(ms, controller) {
  if (controller.signal.aborted) return
  await controller.waitIfPaused()
  if (controller.signal.aborted) return

  // Break up long sleeps so we can respond to pause more quickly
  const interval = 100
  let remaining = ms
  while (remaining > 0 && !controller.signal.aborted) {
    await controller.waitIfPaused()
    if (controller.signal.aborted) return
    const delay = Math.min(interval, remaining)
    await sleep(delay)
    remaining -= delay
  }
}

/**
 * Type text with pausable/abortable animation
 * @param {HTMLElement} element - Target element
 * @param {string} text - Text to type
 * @param {number} charDelay - Delay between characters
 * @param {ReturnType<typeof createAnimationController>} controller - Animation controller
 */
export async function typeTextPausable(element, text, charDelay, controller) {
  for (const char of text) {
    if (controller.signal.aborted) return
    await controller.waitIfPaused()
    if (controller.signal.aborted) return
    element.textContent += char
    await sleep(charDelay)
  }
}

/**
 * Reveal lines with pausable/abortable animation
 * @param {HTMLElement} container - Container element
 * @param {string[]} lines - Array of HTML strings
 * @param {number} lineDelay - Delay between lines
 * @param {ReturnType<typeof createAnimationController>} controller - Animation controller
 */
export async function revealLinesPausable(container, lines, lineDelay, controller) {
  for (const line of lines) {
    if (controller.signal.aborted) return
    await controller.waitIfPaused()
    if (controller.signal.aborted) return
    const el = document.createElement('div')
    el.innerHTML = line
    container.appendChild(el)
    await sleep(lineDelay)
  }
}
