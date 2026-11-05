<script setup lang="ts">
import { ref } from 'vue'
import { routeUrl } from '../content'
const mapActive = ref(false)
</script>
<template>
  <section id="location" class="location container"><div class="location-heading"><p class="muted" v-cms="'routeLabel'">Как добраться</p><h2 v-cms="'routeTitle'">постройте маршрут<br><span class="orange">к площадке</span></h2></div><div class="route-details"><article><p class="route-label"><span class="route-icon"><img src="/assets/route-location.png" alt="" width="24" height="24" aria-hidden="true"></span>Адрес</p><p v-cms="'address'">Пространство Суперметалл.<br>2-я Бауманская ул., 9/23</p></article><article><p class="route-label"><span class="route-icon"><img src="/assets/route-walk.png" alt="" width="24" height="24" aria-hidden="true"></span>На метро / пешком</p><p v-cms="'routeWalk'">Метро Бауманская, около 12 минут<br class="route-desktop-break"> пешком до пространства Суперметалл</p></article><article><p class="route-label"><span class="route-icon"><img src="/assets/route-car.png" alt="" width="28" height="17" aria-hidden="true"></span>На машине</p><p v-cms="'routeCar'">Укажите в навигаторе: 2-я Бауманская ул., 9/23. Рядом есть платная городская парковка</p></article></div><div class="map-link" :class="{ 'is-map-active': mapActive }" @mouseleave="mapActive=false" @keydown.esc="mapActive=false"><iframe :tabindex="mapActive ? 0 : -1" src="https://yandex.ru/map-widget/v1/?ll=37.683365%2C55.764066&amp;pt=37.683365%2C55.764066%2Cpm2orl&amp;z=14" title="Яндекс Карта: Суперметалл, Москва, 2-я Бауманская улица, 9/23" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe><button type="button" class="map-interaction" :class="{ 'is-active': mapActive }" :aria-pressed="mapActive" @click="mapActive=!mapActive"><span>{{ mapActive ? 'Завершить просмотр карты' : 'Взаимодействовать с картой' }}</span></button><a class="map-route-button" :href="routeUrl" target="_blank" rel="noopener noreferrer">Построить маршрут</a></div></section>
</template>

<style lang="scss">
.map-link iframe { pointer-events: none; }
.map-link.is-map-active iframe { pointer-events: auto; }
.map-interaction { position:absolute; inset:0; z-index:1; width:100%; padding:16px; border:0; background:transparent; color:#fff; display:flex; align-items:flex-start; justify-content:flex-end; cursor:pointer; }
.map-interaction span { padding:10px 14px; border-radius:4px; background:rgb(14 14 14 / 85%); font-size:14px; line-height:20px; }
.map-interaction.is-active { inset:16px 16px auto auto; width:auto; padding:0; }
.map-link .map-route-button { z-index:2; }
</style>
