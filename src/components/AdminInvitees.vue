<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { request } from '../api'
import { inviteesFromCsv } from '../csv'
defineProps<{ canWrite: boolean }>()
type Guest=Record<string,string>
const labels:Record<string,string>={surname:'Фамилия',name:'Имя',email:'Email',company:'Компания',position:'Должность',phone:'Телефон'}
const form=ref<Guest>({surname:'',name:'',email:'',company:'',position:'',phone:''})
const rows=ref<Record<string,any>[]>([]),total=ref(0),page=ref(0),query=ref(''),search=ref('')
const busy=ref(false),error=ref(''),notice=ref(''),pending=ref<Guest[]>([]),preview=ref<{newCount:number;duplicates:string[];total:number}|null>(null)
const statusNames:Record<string,string>={pending:'Заявка на рассмотрении',approved:'Участие подтверждено',waitlisted:'Лист ожидания',rejected:'Заявка отклонена',cancelled:'Заявка отменена'}
async function work(fn:()=>Promise<void>){busy.value=true;error.value='';notice.value='';try{await fn()}catch(e){error.value=e instanceof Error?e.message:'Не удалось выполнить действие'}finally{busy.value=false}}
async function load(){const result=await request('admin/invitees?'+new URLSearchParams({q:search.value,page:String(page.value)}));rows.value=result.rows;total.value=result.total}
async function add(){await work(async()=>{const result=await request('admin/invitees',{method:'POST',body:JSON.stringify({guests:[form.value]})});notice.value=result.added?'Гость добавлен в список приглашённых. Письма не отправлялись.':'Этот email уже есть в списке.';if(result.added)for(const key of Object.keys(form.value))form.value[key]='';await load()})}
async function readFile(event:Event){const input=event.target as HTMLInputElement;const file=input.files?.[0];pending.value=[];preview.value=null;if(!file)return;await work(async()=>{if(file.size>100000)throw Error('Файл слишком большой. Загрузите CSV до 100 КБ и 100 гостей.');const guests=inviteesFromCsv(await file.text());const result=await request('admin/invitees',{method:'POST',body:JSON.stringify({guests,preview:true})});pending.value=guests;preview.value=result});input.value=''}
async function importGuests(){await work(async()=>{const result=await request('admin/invitees',{method:'POST',body:JSON.stringify({guests:pending.value})});pending.value=[];preview.value=null;notice.value=`Добавлено: ${result.added}. Пропущено повторов: ${result.skipped}. Письма не отправлялись.`;page.value=0;await load()})}
async function remove(id:string){if(!confirm('Удалить человека из списка приглашённых? Его заявка, если она есть, сохранится.'))return;await work(async()=>{await request('admin/invitees',{method:'DELETE',body:JSON.stringify({id})});await load()})}
function sample(){const url=URL.createObjectURL(new Blob(['\uFEFFsurname,name,email,company,position,phone\r\nИванов,Иван,ivan@example.ru,Компания,Руководитель,+79991234567\r\n'],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='invitees-template.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
onMounted(()=>work(load))
</script>
<template>
<section class="admin-workflow" :aria-busy="busy">
 <h2>Приглашённые</h2><p>Список организатора до регистрации гостя. Добавление вручную и импорт не создают заявку, не подтверждают участие и не отправляют письма. После регистрации гостя по тому же email здесь появится статус его заявки.</p>
 <p v-if="error" class="message error" role="alert">{{error}}</p><p v-if="notice" class="message" role="status">{{notice}}</p>
 <template v-if="canWrite"><details><summary>Добавить гостя вручную</summary><form @submit.prevent="add"><div class="fields"><label v-for="(label,key) in labels" :key="key">{{label}}{{['surname','name','email'].includes(key)?' *':''}}<input v-model="form[key]" :type="key==='email'?'email':'text'" :required="['surname','name','email'].includes(key)" maxlength="160"></label></div><button class="primary" :disabled="busy">Добавить в приглашённые</button></form></details>
 <details><summary>Импортировать CSV</summary><p>До 100 гостей за раз, кодировка UTF-8, разделитель — запятая или точка с запятой. Обязательны Фамилия, Имя, Email. Повторы по email пропускаются.</p><button @click="sample">Скачать шаблон CSV</button><label>Файл CSV<input type="file" accept=".csv,text/csv" :disabled="busy" @change="readFile"></label>
 <div v-if="preview" class="workflow-panel"><p>В файле: {{preview.total}}. Новых: {{preview.newCount}}. Повторов: {{preview.duplicates.length}}.</p><p v-if="preview.duplicates.length">Будут пропущены: {{preview.duplicates.join(', ')}}</p><div class="table-wrap"><table><thead><tr><th>Гость</th><th>Email</th><th>Компания</th></tr></thead><tbody><tr v-for="(guest,i) in pending" :key="i"><td>{{guest.surname}} {{guest.name}}</td><td>{{guest.email}}</td><td>{{guest.company}}</td></tr></tbody></table></div><button class="primary" :disabled="busy||!preview.newCount" @click="importGuests">Импортировать {{preview.newCount}} гостей без отправки писем</button></div></details></template>
 <form @submit.prevent="page=0;search=query.trim();work(load)"><label>Поиск приглашённых<input v-model="query" placeholder="Email, имя, компания"></label><div class="actions"><button :disabled="busy">Найти</button><button type="button" :disabled="busy" @click="query='';search='';page=0;work(load)">Сбросить</button></div></form>
 <p>Всего: {{total}} · Страница {{page+1}} из {{Math.max(1,Math.ceil(total/50))}}</p>
 <div class="table-wrap"><table><thead><tr><th>Гость</th><th>Контакты</th><th>Регистрация</th><th v-if="canWrite">Действия</th></tr></thead><tbody><tr v-for="row in rows" :key="row.id"><td>{{row.data.surname}} {{row.data.name}}<small>{{row.data.company}} · {{row.data.position}}</small></td><td>{{row.email}}<small>{{row.data.phone}}</small></td><td>{{statusNames[row.registration_status]||'Ещё не зарегистрирован'}}</td><td v-if="canWrite"><button :disabled="busy" @click="remove(row.id)">Удалить из списка</button></td></tr></tbody></table></div><p v-if="!rows.length&&!busy">Список пуст.</p>
 <div class="actions"><button :disabled="busy||page===0" @click="page--;work(load)">Назад</button><button :disabled="busy||(page+1)*50>=total" @click="page++;work(load)">Далее</button></div>
</section>
</template>
<style scoped lang="scss" src="../admin-workflow.scss"></style>
