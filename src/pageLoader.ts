// Keep the initial HTML loader visible until mounted page assets are ready.
let displayedProgress = 0
let targetProgress = 0
let progressFrame = 0
let previousTime = 0

function paintProgress(value: number): void {
  const loader = document.getElementById('site-loader')
  loader?.style.setProperty('--loader-progress', `${value}%`)
  const percent = Math.floor(value)
  loader?.setAttribute('aria-valuenow', String(percent))
  const label = loader?.querySelector('.loader-percent')
  if (label) label.textContent = `${percent}%`
}

function advanceProgress(time: number): void {
  const elapsed = Math.min(time - previousTime, 64)
  previousTime = time
  displayedProgress += (targetProgress - displayedProgress) * (1 - Math.exp(-elapsed / 160))
  if (targetProgress - displayedProgress < .02) displayedProgress = targetProgress
  paintProgress(displayedProgress)
  progressFrame = displayedProgress < targetProgress ? requestAnimationFrame(advanceProgress) : 0
}

export function setLoadingProgress(value: number): void {
  targetProgress = Math.max(targetProgress, Math.min(100, value))
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    displayedProgress = targetProgress
    paintProgress(displayedProgress)
  } else if (!progressFrame) {
    previousTime = performance.now()
    progressFrame = requestAnimationFrame(advanceProgress)
  }
}

function waitForFrame(frame: HTMLIFrameElement): Promise<void> {
  return new Promise(resolve => {
    // The map is cross-origin: its load event is the readiness signal available to us.
    const finish = () => {
      clearTimeout(timer)
      frame.removeEventListener('load', finish)
      frame.removeEventListener('error', finish)
      resolve()
    }
    const timer = window.setTimeout(finish, 30000)
    frame.addEventListener('load', finish, { once: true })
    frame.addEventListener('error', finish, { once: true })
    frame.loading = 'eager'
  })
}

async function decodeImage(image: HTMLImageElement): Promise<void> {
  image.loading = 'eager'
  await image.decode()
}

export async function waitForPageResources(): Promise<void> {
  const app = document.getElementById('app')
  if (!app) return
  app.inert = true
  const tasks: Promise<unknown>[] = []
  // Start the offscreen map and lazy portraits immediately, without scrolling the page.
  app.querySelectorAll<HTMLIFrameElement>('iframe').forEach(frame => tasks.push(waitForFrame(frame)))
  app.querySelectorAll<HTMLImageElement>('img').forEach(image => tasks.push(decodeImage(image)))
  const backgrounds = new Set<string>()
  for (const element of app.querySelectorAll('*')) {
    for (const pseudo of [null, '::before', '::after']) {
      const background = getComputedStyle(element, pseudo).backgroundImage
      for (const match of background.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
        if (!match[1].startsWith('data:')) backgrounds.add(match[1])
      }
    }
  }
  for (const url of backgrounds) {
    const image = new Image()
    image.src = url
    tasks.push(decodeImage(image))
  }
  tasks.push(document.fonts.load('400 20px Manrope'), document.fonts.load('600 50px Manrope'), document.fonts.ready)
  let completed = 0
  const ready = Promise.allSettled(tasks.map(task => task.finally(() => {
    completed += 1
    setLoadingProgress(5 + completed / tasks.length * 95)
  })))
  // A broken external resource must not leave visitors on an endless loading screen.
  let timer: number | undefined
  try {
    await Promise.race([ready, new Promise<void>(resolve => { timer = window.setTimeout(resolve, 45000) })])
  } finally { clearTimeout(timer) }
}

export async function revealPage(): Promise<void> {
  cancelAnimationFrame(progressFrame)
  progressFrame = 0
  const loader = document.getElementById('site-loader')
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  if (loader && !reducedMotion) {
    const from = displayedProgress
    await new Promise<void>(resolve => {
      const started = performance.now()
      const finish = (time: number) => {
        const progress = Math.min(1, (time - started) / 360)
        displayedProgress = from + (100 - from) * (1 - Math.pow(1 - progress, 3))
        paintProgress(displayedProgress)
        if (progress < 1) requestAnimationFrame(finish)
        else resolve()
      }
      requestAnimationFrame(finish)
    })
  }
  paintProgress(100)
  // Keep the overlay painted during its exit while the original page motion starts.
  if (loader) loader.style.display = 'block'
  document.documentElement.removeAttribute('data-site-loading')
  window.dispatchEvent(new Event('site:ready'))
  if (loader && !reducedMotion) {
    await loader.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 240, easing: 'ease-out', fill: 'forwards',
    }).finished.catch(() => {})
  }
  loader?.remove()
  const app = document.getElementById('app')
  if (app) app.inert = false
}
