import { onBeforeUnmount, onMounted } from 'vue'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

export function useSmoothScroll(): void {
  let scroll: Lenis | undefined
  let motion: MediaQueryList | undefined
  let pointer: MediaQueryList | undefined

  function configure(): void {
    const enabled = pointer?.matches && !motion?.matches
    if (!enabled) {
      scroll?.destroy()
      scroll = undefined
      return
    }
    if (scroll) return
    scroll = new Lenis({
      autoRaf: true,
      lerp: .085,
      smoothWheel: true,
      wheelMultiplier: 1,
      syncTouch: false,
      anchors: { duration: 1.15 },
      prevent: element => element instanceof HTMLElement && element.matches('input,textarea,select,[data-native-scroll]'),
    })
  }

  onMounted(() => {
    motion = matchMedia('(prefers-reduced-motion: reduce)')
    pointer = matchMedia('(hover: hover) and (pointer: fine)')
    motion.addEventListener('change', configure)
    pointer.addEventListener('change', configure)
    configure()
  })
  onBeforeUnmount(() => {
    scroll?.destroy()
    motion?.removeEventListener('change', configure)
    pointer?.removeEventListener('change', configure)
  })
}
