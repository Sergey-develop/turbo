import { onBeforeUnmount, onMounted } from 'vue'

type Frames = Keyframe[] | ((element: HTMLElement) => Keyframe[])
const easeOut = 'cubic-bezier(.22,.61,.36,1)'
const fadeUp: Keyframe[] = [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }]

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
    footer?.style.removeProperty('--footer-shift')
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
    footer.style.setProperty('--footer-shift', `${(18 * (1 - progress)).toFixed(2)}px`)
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

  function initialize(): void {
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
    }, { threshold: .05, rootMargin: '0px 0px -14% 0px' })

    function reveal(selector: string, frames: Frames = fadeUp, duration = 600, stagger = 0, initialDelay = 0, anchorSelector?: string, staggerGroupSize = 4): void {
      document.querySelectorAll<HTMLElement>(selector).forEach((element, index) => {
        const animation = element.animate(typeof frames === 'function' ? frames(element) : frames, {
          duration, delay: initialDelay + (index % staggerGroupSize) * stagger, easing: easeOut, fill: 'both',
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

    reveal('.header', [{ opacity: 0, transform: 'translateY(-18px)' }, { opacity: 1, transform: 'none' }], 560)
    reveal('.hero h1', fadeUp, 650, 0, 100)
    reveal('.hero-date', fadeUp, 600, 0, 180)
    reveal('.hero-time', fadeUp, 600, 0, 230)
    reveal('.hero-location', fadeUp, 600, 0, 280)
    reveal('.hero-details>.muted', fadeUp, 600, 0, 360)
    reveal('.hero-cta,.mobile-hero-cta', fadeUp, 550, 0, 440)
    reveal('.hero>.hero-art:first-child', [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }], 1200, 0, 0, '.hero')
    reveal('.about', fadeUp, 600)
    reveal('.forbes-inner', fadeUp, 600)
    reveal('.program .section-title,.speakers .section-title,.location-heading,.faq h2', fadeUp, 560)
    reveal('.program-list>li', fadeUp, 560, 120, 0, '.program-list', Infinity)
    reveal('.speaker-card', fadeUp, 560, 50)
    reveal('.contact-panel,.registration-form', fadeUp, 620, 90)
    reveal('.route-details>article', fadeUp, 560, 60)
    reveal('.map-link iframe', [{ opacity: .75, transform: 'scale(.94)' }, { opacity: 1, transform: 'none' }], 1200, 0, 0, '.map-link')
    reveal('.faq-item', fadeUp, 560, 50)
    document.addEventListener('focusin', onFocus)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    onScroll()
  }

  onMounted(() => {
    if (document.documentElement.hasAttribute('data-site-loading')) {
      window.addEventListener('site:ready', initialize, { once: true })
    } else initialize()
  })

  onBeforeUnmount(() => {
    disposed = true
    window.removeEventListener('site:ready', initialize)
    finishAll()
    if (frame) cancelAnimationFrame(frame)
    media?.removeEventListener('change', onPreferenceChange)
    document.removeEventListener('focusin', onFocus)
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onScroll)
  })
}
