import { reactive, type Directive } from 'vue'
import { program, speakers } from './content'
export const questions = reactive([
 {question:'Какой дресс-код',answer:'Свободный стиль. Приветствуем образы в эстетике техно: чёрный, металлические фактуры и необычные аксессуары. Вход только для зарегистрированных гостей.'},
 {question:'До скольки продлится вечер',answer:'27 ноября, 18.30 – 00.00.'},
 {question:'Как отменить регистрацию',answer:'Используйте ссылку отмены, полученную после регистрации или в письме организатора.'},
])
export const texts:Record<string,string> = reactive({
 heroTitle:'под капотом\nтурбо_рейв',heroDate:'27 ноября 2026',heroTime:'18.30 – 00.00',heroVenue:'Москва, пространство Суперметалл',
 heroDescription:'Клиентский вечер Турбо Облака,\nобъединяющий деловую программу,\nличное общение и электронную музыку.',
 aboutHeading:'Обсудим итоги года через опыт реальных проектов: какие задачи решали клиенты, что сработало и какие подходы могут пригодиться вашему бизнесу.',
 aboutText:'Вы сможете напрямую задать вопросы команде Турбо, обсудить свои ИТ-задачи и познакомиться с планами развития продуктов. А в разговоре с коллегами из других компаний сравнить опыт\nи найти идеи для собственных решений.',
 forbesLabel:'Партнёр деловой программы',forbesTitle:'Клиентские кейсы и открытый\nдиалог с модератором издания',
 programTitle:'программа мероприятия',speakersTitle:'спикеры',tedTitle:'Выступления в формате TED',discussionTitle:'Клиентская дискуссия с модератором Forbes',
 registrationTitle:'пройдите\nрегистрацию',registrationDescription:'Участие в мероприятии — по предварительному приглашению. Заполните форму, и после рассмотрения заявки мы свяжемся с вами.',
 contactTitle:'вы всегда можете\nсвязаться с нами',contactEmail:'Email@mail.ru',contactPhone:'+7(999)999-99-99',
 routeLabel:'Как добраться',routeTitle:'постройте маршрут\nк площадке',address:'Пространство Суперметалл. 2-я Бауманская ул., 9/23',
 routeWalk:'Метро Бауманская, около 12 минут\nпешком до пространства Суперметалл.',routeCar:'Укажите в навигаторе: 2-я Бауманская ул., 9/23. Рядом есть платная городская парковка',
 footerEvent:'27 ноября 2026  18.30 – 00.00\nМосква, пространство Суперметалл',
faqTitle:'часто задаваемые\nвопросы',
})
export const initialContent=()=>({program:program.map(x=>({...x})),speakers:speakers.map(x=>({...x,image:x.image||'/assets/speaker.webp'})),faq:questions.map(x=>({...x})),texts:{...texts}})
export async function loadContent():Promise<void>{
 const preview=new URLSearchParams(location.search).get('preview')==='1'
 const response=await fetch('/api/public/content'+(preview?'?preview=1':''));if(!response.ok)throw Error('Контент временно недоступен')
 const {content}=await response.json();if(!content)return
 program.splice(0,program.length,...content.program)
 speakers.splice(0,speakers.length,...content.speakers.map((x:object,id:number)=>({...x,id})))
 questions.splice(0,questions.length,...content.faq);Object.assign(texts,content.texts)
}
// Plain text only. Newlines become real line breaks; no arbitrary HTML is accepted.
export const cms:Directive<HTMLElement,string>={mounted(el,{value}){
 const text=texts[value];if(text===undefined)return
 if(value==='contactEmail'&&el instanceof HTMLAnchorElement&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))el.href='mailto:'+text
 if(value==='contactPhone'&&el instanceof HTMLAnchorElement)el.href='tel:'+text.replace(/[^+\d]/g,'')
 if(value==='footerEvent'){
  const lines=text.split('\n'),match=lines[0]?.match(/^(.*?20\d{2})\s+(.*)$/)
  if(match){const row=document.createElement('span');row.className='footer-datetime';for(const part of [match[1],match[2]]){const span=document.createElement('span');span.textContent=part;row.append(span)}el.replaceChildren(row);for(const line of lines.slice(1))el.append(document.createElement('br'),document.createTextNode(line));return}
 }
 // Preserve styled headlines: update their text nodes separately.
 if(value==='heroTitle'){const lines=text.split('\n'),parts=(lines[1]||'').split('_');el.replaceChildren(document.createTextNode(lines[0]||''),document.createElement('br'),document.createTextNode(parts[0]||''));if(parts.length>1){const accent=document.createElement('span');accent.className='orange';accent.textContent='_';el.append(accent,document.createTextNode(parts.slice(1).join('_')))}return}
 const lines=text.split('\n');el.replaceChildren();lines.forEach((line,i)=>{if(i)el.append(document.createElement('br'));if(i===lines.length-1&&['routeTitle','faqTitle'].includes(value)){const span=document.createElement('span');span.className='orange';span.textContent=line;el.append(span)}else el.append(document.createTextNode(line))})
}}
