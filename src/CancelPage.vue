<script setup lang="ts">
import {ref} from 'vue'
import {request} from './api'
const status=ref(''),busy=ref(false),done=ref(false)
async function cancel(){busy.value=true;status.value='';try{const p=new URLSearchParams(location.search);await request('cancel',{method:'POST',body:JSON.stringify({id:p.get('id'),token:p.get('token')})});done.value=true;status.value='Заявка отменена. Неотправленные письма сняты с очереди.'}catch(e){status.value=e instanceof Error?e.message:'Не удалось отменить заявку'}finally{busy.value=false}}
</script>
<template><main class="cancel-page"><h1>Отмена регистрации</h1><p>Отменить заявку на участие? Это освободит подтверждённое место.</p><button v-if="!done" class="button" :disabled="busy" @click="cancel">{{busy?'Отменяем…':'Отменить заявку'}}</button><p role="status">{{status}}</p><a href="/">Вернуться на сайт</a></main></template>
<style scoped>.cancel-page{max-width:700px;margin:15vh auto;padding:24px}.cancel-page h1{font-size:36px}.cancel-page p{margin:24px 0}.cancel-page a{text-decoration:underline}</style>
