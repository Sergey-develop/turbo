import { onBeforeUnmount, onMounted } from 'vue'

type Frames = Keyframe[] | ((element: HTMLElement) => Keyframe[])
const easeOut = 'cubic-bezier(.23,1,.32,1)'
const fadeUp: Keyframe[] = [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }]
const fadeIn: Keyframe[] = [{ opacity: 0 }, { opacity: 1 }]

export function usePageMotion(): void {
  const animations = new Set<Animation>()
  const pending = new Map<HTMLElement, Animation>()
  const observedTargets = new Map<Element, HTMLElement[]>()
  let observer: IntersectionObserver | undefined
  let media: MediaQueryList | undefined
  let footer: HTMLElement | null = null
  let frame = 0
  let disposed = false

  function finishAll(): void {
    for (const animation of animations) animation.cancel()
    animations.clear()
    for (const element of pending.keys()) element.dataset.motionState = 'done'
    pending.clear()
    observedTargets.clear()
    document.querySelectorAll<HTMLElement>('[data-motion-state]').forEach(element => { element.dataset.motionState = 'done' })
    observer?.disconnect()
    footer?.style.removeProperty('background-position-y')
  }

  function onPreferenceChange(): void {
    if (media?.matches) finishAll()
  }

  function updateParallax(): void {
    frame = 0
    if (media?.matches || !footer) return
    const rect = footer.getBoundingClientRect()
    if (rect.top > innerHeight || rect.bottom < 0) return
    const progress = Math.max(0, Math.min(1, (innerHeight - rect.top) / Math.min(rect.height, innerHeight)))
    footer.style.backgroundPositionY = `calc(100% - ${(18 * (1 - progress)).toFixed(2)}px)`
  }

  function onScroll(): void {
    if (!media?.matches && !frame) frame = requestAnimationFrame(updateParallax)
  }

  function onFocus(event: FocusEvent): void {
    if (!(event.target instanceof HTMLElement)) return
    const element = event.target.closest<HTMLElement>('[data-motion-state="pending"], [data-motion-state="running"]')
    if (!element) return
    const animation = pending.get(element)
    animation?.cancel()
    if (animation) animations.delete(animation)
    pending.delete(element)
    observer?.unobserve(element)
    element.dataset.motionState = 'done'
  }

  onMounted(() => {
    media = matchMedia('(prefers-reduced-motion: reduce)')
    footer = document.querySelector<HTMLElement>('.footer')
    media.addEventListener('change', onPreferenceChange)
    if (media.matches || !('IntersectionObserver' in window)) return

    observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) continue
        observer?.unobserve(entry.target)
        for (const element of observedTargets.get(entry.target) ?? []) {
          const animation = pending.get(element)
          if (!animation) continue
          element.dataset.motionState = 'running'
          animation.play()
          void animation.finished.then(() => {
            if (disposed) return
            element.dataset.motionState = 'done'
            pending.delete(element)
            animations.delete(animation)
            animation.cancel()
          }).catch(() => { /* Cancellation reveals the unanimated content. */ })
        }
        observedTargets.delete(entry.target)
      }
    }, { threshold: .01, rootMargin: '0px 0px 12% 0px' })

    function reveal(selector: string, frames: Frames = fadeUp, duration = 420, stagger = 0, initialDelay = 0, anchorSelector?: string): void {
      document.querySelectorAll<HTMLElement>(selector).forEach((element, index) => {
        const animation = element.animate(typeof frames === 'function' ? frames(element) : frames, {
          duration, delay: initialDelay + (index % 4) * stagger, easing: easeOut, fill: 'both',
        })
        animation.pause()
        animation.currentTime = 0
        element.dataset.motionState = 'pending'
        animations.add(animation)
        pending.set(element, animation)
        const anchor = (anchorSelector ? element.closest(anchorSelector) : element) ?? element
        const targets = observedTargets.get(anchor) ?? []
        targets.push(element)
        observedTargets.set(anchor, targets)
        observer?.observe(anchor)
      })
    }

    const lines: Frames = element => {
      const lineHeight = parseFloat(getComputedStyle(element).lineHeight)
      const count = Math.max(1, Math.round(element.offsetHeight / lineHeight))
      const frames: Keyframe[] = [{ clipPath: 'inset(0 0 100% 0)', offset: 0 }]
      for (let line = 1; line <= count; line++) {
        frames.push({ clipPath: `inset(0 0 ${100 * (1 - (line - 1) / count)}% 0)`, offset: (line - .7) / count })
        frames.push({ clipPath: `inset(0 0 ${100 * (1 - line / count)}% 0)`, offset: line / count })
      }
      return frames
    }

    reveal('.header', [{ opacity: 0, transform: 'translateY(-18px)' }, { opacity: 1, transform: 'none' }], 560)
    reveal('.hero h1', fadeUp, 650, 0, 100)
    reveal('.hero-date', fadeUp, 600, 0, 180)
    reveal('.hero-time', fadeUp, 600, 0, 230)
    reveal('.hero-location', fadeUp, 600, 0, 280)
    reveal('.hero-details>.muted', fadeUp, 600, 0, 360)
    reveal('.hero-cta,.mobile-hero-cta', fadeUp, 550, 0, 440)
    reveal('.hero>.hero-art:first-child', [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }], 1200, 0, 0, '.hero')
    reveal('.about h2', lines, 550, 0, 0, '.about')
    reveal('.about>p', lines, 550, 0, 60, '.about')
    reveal('.forbes-inner', fadeIn, 420)
    reveal('.program .section-title,.speakers .section-title,.location-heading,.faq h2', fadeIn, 380)
    reveal('.program-list>li', fadeUp, 400, 40)
    reveal('.speaker-card', fadeIn, 380, 35)
    reveal('.contact-panel,.registration-form', fadeIn, 440, 70)
    reveal('.route-details>article', fadeIn, 400, 40)
    reveal('.map-link img', [{ opacity: .65, transform: 'scale(1.05)' }, { opacity: 1, transform: 'none' }], 900)
    reveal('.faq-item', fadeIn, 380, 30)
    document.addEventListener('focusin', onFocus)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    onScroll()
  })

  onBeforeUnmount(() => {
    disposed = true
    finishAll()
    if (frame) cancelAnimationFrame(frame)
    media?.removeEventListener('change', onPreferenceChange)
    document.removeEventListener('focusin', onFocus)
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onScroll)
  })
}
