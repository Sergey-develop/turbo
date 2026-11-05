<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, useId } from 'vue'
const props = defineProps<{ state: 'success' | 'error' | 'duplicate'; inline?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const titleId = useId()
const descriptionId = useId()
const closeButton = ref<HTMLButtonElement>()
const content = computed(() => ({
  success: { title: 'ЗАЯВКА ОТПРАВЛЕНА!', text: 'Спасибо за интерес к Турбо.рейву! Мы получили вашу заявку. После рассмотрения отправим отдельное письмо с подтверждением участия и приглашением на мероприятие.' },
  error: { title: 'ЧТО-ТО ПОШЛО НЕ ТАК', text: 'Не удалось отправить заявку.\nПопробуйте еще раз.' },
  duplicate: { title: 'ВЫ УЖЕ ЗАРЕГИСТРИРОВАНЫ', text: 'Мы получили вашу заявку ранее. Проверьте почту - возможно, письмо с подтверждением уже ждет вас во входящих.' },
})[props.state])
let previousFocus: HTMLElement | null = null
let previousOverflow = ''
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
  if (event.key === 'Tab') { event.preventDefault(); closeButton.value?.focus() }
}
onMounted(() => {
  if (props.inline) return
  previousFocus = document.activeElement === document.body
    ? document.querySelector<HTMLElement>('.submit-button')
    : document.activeElement as HTMLElement | null
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  closeButton.value?.focus({ preventScroll: true })
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  if (props.inline) return
  document.body.style.overflow = previousOverflow
  document.removeEventListener('keydown', onKeydown)
  const target = previousFocus instanceof HTMLButtonElement && previousFocus.disabled
    ? document.querySelector<HTMLElement>('.cancel-link, #surname')
    : previousFocus
  target?.focus({ preventScroll: true })
})
</script>
<template>
  <Teleport to="body" :disabled="inline">
    <div class="registration-result-overlay" :class="{ 'registration-result-overlay--inline': inline }" data-lenis-prevent @click.self="!inline && emit('close')">
      <section class="registration-result" :class="`registration-result--${state}`" :role="inline ? undefined : 'dialog'" :aria-modal="inline ? undefined : true" :aria-labelledby="titleId" :aria-describedby="descriptionId">
        <div class="registration-result-art">
          <picture>
            <source media="(max-width: 640px)" :srcset="`/assets/registration-${state}-mobile.webp`">
            <source media="(max-width: 1100px)" :srcset="`/assets/registration-${state}-tablet.webp`">
            <img :src="`/assets/registration-${state}-desktop.webp`" alt="" width="666" height="247">
          </picture>
          <button v-if="!inline" ref="closeButton" type="button" class="registration-result-close" aria-label="Закрыть сообщение" @click="emit('close')"></button>
        </div>
        <div class="registration-result-copy">
          <h2 :id="titleId">{{ content.title }}</h2>
          <p :id="descriptionId">{{ content.text }}</p>
        </div>
      </section>
    </div>
  </Teleport>
</template>
<style lang="scss">
.registration-result-overlay { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 24px; overflow-y: auto; background: rgb(0 0 0 / 40%); backdrop-filter: blur(10px); }
.registration-result { box-sizing: border-box; width: 700px; max-width: 100%; min-height: 507px; padding: 16px; border: 1px solid #262626; border-radius: 8px; background: #0e0e0e; color: #fff; font-family: Manrope, Arial, sans-serif; }
.registration-result-art { position: relative; height: 247px; border-radius: 8px; overflow: hidden; }
.registration-result-art picture, .registration-result-art img { display: block; width: 100%; height: 100%; }
.registration-result-close { position: absolute; top: 8px; right: 8px; width: 34px; height: 34px; padding: 0; border: 0; border-radius: 4px; background: transparent; cursor: pointer; }
.registration-result-close:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
.registration-result-copy { padding: 50px 40px 46px; text-align: center; }
.registration-result-copy h2 { margin: 0; font-size: 40px; line-height: 1.125; font-weight: 700; letter-spacing: -1.6px; }
.registration-result-copy p { margin: 18px 0 0; color: #ccc; font-size: 20px; line-height: 22px; font-weight: 400; letter-spacing: -.5px; white-space: pre-line; }
@media (min-width: 1800px) { .registration-result { width: 43.2vw; min-height: 0; padding: 1vw; } .registration-result-art { height: auto; aspect-ratio: 666 / 247; } .registration-result-copy { padding: 3.1vw 2.5vw 2.9vw; } .registration-result-copy h2 { font-size: 2.22vw; } .registration-result-copy p { font-size: 1.11vw; line-height: 1.36vw; margin-top: 1.11vw; } .registration-result-close { top: .5vw; right: .5vw; width: 2.1vw; height: 2.1vw; } }
@media (min-width: 641px) and (max-width: 1100px) { .registration-result { width: 600px; min-height: 435px; padding: 13px; border-radius: 7px; } .registration-result-art { height: 211px; border-radius: 7px; } .registration-result-close { width: 29px; height: 29px; top: 7px; right: 7px; } .registration-result-copy { padding: 43px 32px 40px; } .registration-result-copy h2 { font-size: 30px; letter-spacing: -1.5px; } .registration-result-copy p { font-size: 16px; line-height: 19px; margin-top: 16px; } }
@media (max-width: 640px) { .registration-result-overlay { padding: 20px; } .registration-result { width: 300px; min-height: 0; padding: 5px; border-radius: 2px; border-color: #1b1b1b; } .registration-result-art { height: 130px; border-radius: 3px; } .registration-result-close { top: 3px; right: 3px; width: 22px; height: 22px; border-radius: 3px; } .registration-result-copy { padding: 20px 5px 20px; } .registration-result-copy h2 { font-size: 18px; line-height: 23px; letter-spacing: -.6px; white-space: nowrap; } .registration-result-copy p { margin-top: 7px; font-size: 13px; line-height: 13px; letter-spacing: -.4px; } .registration-result--success .registration-result-copy { padding-bottom: 21px; } }
.registration-result-overlay--inline { position: static; z-index: auto; display: flex; justify-content: center; padding: 0; overflow: visible; background: none; backdrop-filter: none; }
</style>
