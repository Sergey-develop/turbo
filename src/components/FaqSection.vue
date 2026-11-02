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
  <section id="faq" class="faq"><div class="faq-content"><h2>часто задаваемые<br><span class="orange">вопросы</span></h2><div class="faq-list"><div v-for="(item, i) in questions" :key="item.question" class="faq-item"><h3><button :aria-expanded="opened === i" :aria-controls="`answer-${i}`" @click="opened = opened === i ? null : i">{{ item.question }}<span class="faq-sign" aria-hidden="true">{{ opened === i ? '−' : '+' }}</span></button></h3><p v-show="opened === i" :id="`answer-${i}`">{{ item.answer }}</p></div></div></div></section>
</template>
