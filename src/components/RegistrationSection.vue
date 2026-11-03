<script setup lang="ts">
import { reactive, ref, onMounted, watch } from 'vue'
import { request } from '../api'
interface Registration { surname: string; name: string; company: string; position: string; email: string; phone: string; consent: boolean; marketing: boolean }
type FieldName = 'surname' | 'name' | 'company' | 'position' | 'email' | 'phone'
const fields: { key: FieldName; label: string; type: string; autocomplete: string; placeholder?: string }[] = [
  { key: 'surname', label: 'Фамилия', type: 'text', autocomplete: 'family-name' },
  { key: 'name', label: 'Имя', type: 'text', autocomplete: 'given-name' },
  { key: 'company', label: 'Компания', type: 'text', autocomplete: 'organization' },
  { key: 'position', label: 'Должность', type: 'text', autocomplete: 'organization-title' },
  { key: 'email', label: 'E-mail', type: 'email', autocomplete: 'email' },
  { key: 'phone', label: 'Телефон', type: 'tel', autocomplete: 'tel', placeholder: '+7 (999) 999-99-99' },
]
const form = reactive<Registration>({ surname: '', name: '', company: '', position: '', email: '', phone: '', consent: false, marketing: false })
const errors = reactive<Partial<Record<FieldName | 'consent', string>>>({})
const status = ref('')
const busy = ref(false)
const formConfig = ref<Record<string, any> | null>(null)
const cancelUrl = ref('')
const configLoading=ref(true)
async function loadFormConfig(){configLoading.value=true;try{formConfig.value=await request('public/config')}catch{status.value='Регистрация временно недоступна. Попробуйте позже.'}finally{configLoading.value=false}}
const requestKey = ref(crypto.randomUUID())
watch(form,()=>{if(!busy.value&&!cancelUrl.value)requestKey.value=crypto.randomUUID()})
const utm:Record<string,string> = {}
for(const key of ['utm_source','utm_medium','utm_campaign','utm_term','utm_content']){
  try { const val=new URLSearchParams(location.search).get(key);if(val)sessionStorage.setItem(key,val);const saved=sessionStorage.getItem(key);if(saved)utm[key]=saved } catch { /* Storage may be disabled. URL capture still works below. */ }
  const val=new URLSearchParams(location.search).get(key);if(val)utm[key]=val
}
onMounted(loadFormConfig)

async function submit(): Promise<void> {
  if(busy.value)return
  for (const key of Object.keys(errors) as (keyof typeof errors)[]) delete errors[key]
  for (const field of fields) if (!form[field.key].trim()) errors[field.key] = 'Заполните поле'
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Проверьте e-mail'
  if (form.phone && !/^\+?[\d\s()\-]+$/.test(form.phone)) errors.phone = 'Проверьте номер телефона'
  const digits = form.phone.replace(/\D/g, '')
  if (form.phone && (digits.length < 10 || digits.length > 15)) errors.phone = 'Укажите от 10 до 15 цифр'
  if (!form.consent) errors.consent = 'Необходимо согласие на обработку персональных данных'
  if(Object.keys(errors).length){status.value='Проверьте выделенные поля.';return}
  if(!formConfig.value?.available){status.value='Приём заявок сейчас закрыт.';return}
  busy.value=true
  try{
    const result=await request('registrations',{method:'POST',headers:{'Idempotency-Key':requestKey.value},body:JSON.stringify({...form,utm,consentVersion:formConfig.value.consentVersion,marketingVersion:formConfig.value.marketingVersion})})
    cancelUrl.value=result.cancelUrl||''
    status.value='Заявка сохранена. Статус участия сообщит организатор. Сохраните ссылку отмены ниже.'
  }catch(error){status.value=error instanceof Error?error.message:'Не удалось отправить. Повторите попытку.'}
  finally{busy.value=false}

}
function addCalendar(): void {
  const ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Turbo Rave//RU','BEGIN:VEVENT','UID:turbo-rave-20261127@turbo-rave.local','DTSTAMP:20261102T000000Z','DTSTART:20261127T153000Z','DTEND:20261127T210000Z','SUMMARY:Под капотом — Турбо-рейв','LOCATION:Москва\, 2-я Бауманская улица\, 9/23\, Суперметалл','END:VEVENT','END:VCALENDAR'].join('\r\n')
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a'); a.href = url; a.download = 'turbo-rave.ics'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
</script>
<template>
  <section id="registration" class="registration">
    <div class="contact-panel"><h2 v-cms="'contactTitle'">вы всегда можете<br> связаться с нами</h2><div class="contact-bottom"><div class="contact-details"><p><span>E-mail</span><a v-cms="'contactEmail'" href="mailto:Email@mail.ru">Email@mail.ru</a></p><p><span>Телефон</span><a v-cms="'contactPhone'" href="tel:+79999999999">+7(999)999-99-99</a></p></div><button class="button calendar-button" @click="addCalendar">Добавить в календарь</button></div></div>
    <form class="registration-form" novalidate @submit.prevent="submit"><div class="form-heading"><h2 v-cms="'registrationTitle'">пройдите<br>регистрацию</h2><p v-cms="'registrationDescription'">Участие в мероприятии — по предварительному приглашению. Заполните форму, и после рассмотрения заявки мы свяжемся с вами.</p></div><div class="form-fields"><label v-for="field in fields" :key="field.key" :for="field.key">{{ field.label }}<input :id="field.key" v-model="form[field.key]" :type="field.type" :name="field.key" :autocomplete="field.autocomplete" :placeholder="field.placeholder || '-'" required :aria-invalid="!!errors[field.key]" :aria-describedby="errors[field.key] ? `${field.key}-error` : undefined"><span v-if="errors[field.key]" :id="`${field.key}-error`" class="field-error">{{ errors[field.key] }}</span></label></div><div class="consents"><label><input v-model="form.consent" type="checkbox" required :aria-invalid="!!errors.consent">{{ formConfig?.consentText || 'Согласие на обработку персональных данных и фото-видео съёмку' }}</label><p v-if="errors.consent" class="field-error">{{ errors.consent }}</p><label><input v-model="form.marketing" type="checkbox">{{ formConfig?.marketingText || 'Согласие на получение информационных и рекламных рассылок' }}</label></div><button class="button submit-button" type="submit" :disabled="busy || !formConfig?.available || !!cancelUrl">{{ busy ? 'Отправляем…' : 'Отправить' }}</button><p v-if="configLoading" class="form-status" role="status">Проверяем доступность регистрации…</p><p v-else-if="formConfig && !formConfig.available" class="form-status">Приём заявок пока закрыт.</p><button v-if="!configLoading && !formConfig" type="button" class="button" @click="loadFormConfig">Проверить регистрацию ещё раз</button><p v-if="status" class="form-status" role="status">{{ status }}</p><a v-if="cancelUrl" class="cancel-link" :href="cancelUrl">Ссылка отмены заявки — сохраните её</a></form>
  </section>
</template>
