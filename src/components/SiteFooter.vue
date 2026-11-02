<script setup lang="ts">
import { ref } from 'vue'
import { nav } from '../content'
const documentNotice = ref(false)
</script>
<template>
  <footer class="footer"><div class="footer-content container"><div class="footer-event"><a href="#"><img class="brand" src="/assets/brand.webp" alt="Турбо Облако | Forbes" width="390" height="50"></a><p>27 ноября 2026&nbsp; 18.30 – 00.00<br>Москва, пространство Суперметалл</p><a class="button" href="#registration">Регистрация</a></div><nav class="footer-nav" aria-label="Навигация в подвале"><p class="muted">Навигация</p><a v-for="item in nav" :key="item.href" :href="item.href">{{ item.label }}</a><a href="#registration">Регистрация</a></nav><div class="footer-documents"><p class="muted">Документы</p><button @click="documentNotice = !documentNotice">Юридическая информация</button><button @click="documentNotice = !documentNotice">Политика обработки<br>персональных данных</button><p v-if="documentNotice" class="document-notice" role="status">Юридические документы пока не предоставлены организатором.</p></div><div class="footer-contacts"><p class="muted">Контакты</p><a href="mailto:Email@mail.ru">Email@mail.ru</a><a href="tel:+79999999999">+7(999)999-99-99</a></div></div></footer>
</template>
