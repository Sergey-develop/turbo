<script setup lang="ts">
import { ref } from 'vue'
const opened = ref<number | null>(0)
const questions: { question: string; answer: string }[] = [
  { question: 'Какой дресс-код', answer: 'Свободный стиль. Приветствуем образы в эстетике техно: чёрный, металлические фактуры и необычные аксессуары. Вход только для зарегистрированных гостей.' },
  { question: 'До скольки продлится вечер', answer: '27 ноября, 18.30 – 00.00.' },
  { question: 'Как отменить регистрацию', answer: 'Свяжитесь с нами: Email@mail.ru.' },
]
</script>
<template>
  <section id="faq" class="faq">
    <div class="faq-content">
      <h2>часто задаваемые<br><span class="orange">вопросы</span></h2>
      <div class="faq-list">
        <div v-for="(item, i) in questions" :key="item.question" class="faq-item">
          <h3><button :id="`question-${i}`" :aria-expanded="opened === i" :aria-controls="`answer-${i}`" @click="opened = opened === i ? null : i">{{ item.question }}<span class="faq-sign" :class="{ 'is-open': opened === i }" aria-hidden="true"></span></button></h3>
          <div :id="`answer-${i}`" class="faq-answer" :class="{ 'is-open': opened === i }" role="region" :aria-labelledby="`question-${i}`" :aria-hidden="opened !== i">
            <div class="faq-answer-content"><p>{{ item.answer }}</p></div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.faq-answer {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transform: translateY(8px);
  transition: grid-template-rows .36s cubic-bezier(.22, 1, .36, 1),
    opacity .24s ease, transform .36s cubic-bezier(.22, 1, .36, 1);

  &.is-open {
    grid-template-rows: 1fr;
    opacity: 1;
    transform: translateY(0);
  }

  p { margin-top: 0; padding-top: 20px; }
}
.faq-answer-content { min-height: 0; overflow: hidden; }
@media (max-width: 767px) {
  .faq-answer p { padding-top: 12px; }
}
</style>
