<script setup lang="ts">
import { reactive, ref } from 'vue'
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
function submit(): void {
  for (const key of Object.keys(errors) as (keyof typeof errors)[]) delete errors[key]
  for (const field of fields) if (!form[field.key].trim()) errors[field.key] = 'Заполните поле'
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Проверьте e-mail'
  if (form.phone && !/^\+?[\d\s()\-]+$/.test(form.phone)) errors.phone = 'Проверьте номер телефона'
  const digits = form.phone.replace(/\D/g, '')
  if (form.phone && (digits.length < 10 || digits.length > 15)) errors.phone = 'Укажите от 10 до 15 цифр'
  if (!form.consent) errors.consent = 'Необходимо согласие на обработку персональных данных'
  status.value = Object.keys(errors).length ? 'Проверьте выделенные поля.' : 'Данные проверены. Отправка заявки пока недоступна: сервер регистрации не подключён. Данные не отправлены.'
}
function addCalendar(): void {
  const ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Turbo Rave//RU','BEGIN:VEVENT','UID:turbo-rave-20261127@turbo-rave.local','DTSTAMP:20261102T000000Z','DTSTART:20261127T153000Z','DTEND:20261127T210000Z','SUMMARY:Под капотом — Турбо-рейв','LOCATION:Москва\, 2-я Бауманская улица\, 9/23\, Суперметалл','END:VEVENT','END:VCALENDAR'].join('\r\n')
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a'); a.href = url; a.download = 'turbo-rave.ics'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
</script>
<template>
  <section id="registration" class="registration">
    <div class="contact-panel"><h2>вы всегда можете<br> связаться с нами</h2><div class="contact-bottom"><div class="contact-details"><p><span>E-mail</span><a href="mailto:Email@mail.ru">Email@mail.ru</a></p><p><span>Телефон</span><a href="tel:+79999999999">+7(999)999-99-99</a></p></div><button class="button calendar-button" @click="addCalendar">Добавить в календарь</button></div></div>
    <form class="registration-form" novalidate @submit.prevent="submit"><div class="form-heading"><h2>пройдите<br>регистрацию</h2><p>Участие в мероприятии — по предварительному приглашению. Заполните форму, и после рассмотрения заявки мы свяжемся с вами.</p></div><div class="form-fields"><label v-for="field in fields" :key="field.key" :for="field.key">{{ field.label }}<input :id="field.key" v-model="form[field.key]" :type="field.type" :name="field.key" :autocomplete="field.autocomplete" :placeholder="field.placeholder || '-'" required :aria-invalid="!!errors[field.key]" :aria-describedby="errors[field.key] ? `${field.key}-error` : undefined"><span v-if="errors[field.key]" :id="`${field.key}-error`" class="field-error">{{ errors[field.key] }}</span></label></div><div class="consents"><label><input v-model="form.consent" type="checkbox" required :aria-invalid="!!errors.consent">Согласие на обработку персональных данных и фото-видео съёмку</label><p v-if="errors.consent" class="field-error">{{ errors.consent }}</p><label><input v-model="form.marketing" type="checkbox">Согласие на получение информационных и рекламных рассылок</label></div><button class="button submit-button" type="submit">Отправить</button><p v-if="status" class="form-status" role="status">{{ status }}</p></form>
  </section>
</template>
