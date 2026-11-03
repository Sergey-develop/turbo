<script setup lang="ts">
import { ref } from 'vue'
import BrandLogo from './BrandLogo.vue'
import { nav } from '../content'
const documentNotice = ref(false)
const footerNav = [{ ...nav[0], label: 'О мероприятии' }, ...nav.slice(1, 3), { label: 'Регистрация', href: '#registration' }, ...nav.slice(3)]
</script>
<template>
  <footer class="footer"><div class="footer-content container"><div class="footer-event"><a href="#"><BrandLogo /></a><p v-cms="'footerEvent'">27 ноября 2026&nbsp; 18.30 – 00.00<br>Москва, пространство Суперметалл</p><a class="button" href="#registration">Регистрация</a></div><nav class="footer-nav" aria-label="Навигация в подвале"><p class="muted">Навигация</p><a v-for="item in footerNav" :key="item.href" :href="item.href">{{ item.label }}</a></nav><div class="footer-documents"><p class="muted">Документы</p><button @click="documentNotice = !documentNotice">Юридическая информация</button><button @click="documentNotice = !documentNotice">Политика обработки персональных данных</button><p v-if="documentNotice" class="document-notice" role="status">Юридические документы пока не предоставлены организатором.</p></div><div class="footer-contacts"><p class="muted">Контакты</p><a v-cms="'contactEmail'" href="mailto:Email@mail.ru">Email@mail.ru</a><a v-cms="'contactPhone'" href="tel:+79999999999">+7(999)999-99-99</a></div></div></footer>
</template>
