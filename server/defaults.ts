export const defaultSettings = {
 mode:'closed', capacity:200, maxApplications:null as number|null, rejectionMail:false, checkIn:false,
 legalApproved:false, consentBasis:'', marketingBasis:'', consentVersion:'draft-1', marketingVersion:'draft-1',
 consentText:'Согласие на обработку персональных данных и фото-видео съёмку',
 marketingText:'Согласие на получение информационных и рекламных рассылок',
 retentionDays:null as number|null, mailEnabled:false,
 exportFields:['surname','name','company','position','email','status','created_at'],
}
export const defaultTemplates = [
 {id:'registered',subject:'Заявка получена',body:'Здравствуйте, {{name}}! Ваша заявка получена. Это ещё не подтверждение участия. Статус: {{status}}. Отмена заявки: {{cancel_url}}'},
 {id:'approved',subject:'Участие подтверждено',body:'Здравствуйте, {{name}}! Ваше участие подтверждено. Информация о мероприятии: {{event_url}}. Отмена: {{cancel_url}}'},
 {id:'rejected',subject:'Статус заявки',body:'Здравствуйте, {{name}}. К сожалению, мы не можем подтвердить участие. Свяжитесь с организатором, если у вас есть вопросы.'},
]
export const permissions:Record<string,string[]> = {
 admin:['registrations.read','registrations.write','export','content','settings','templates','mail','analytics','audit','roles','checkin','retention'],
 manager:['registrations.read','registrations.write','export','analytics'], editor:['content'], analyst:['analytics'], scanner:['checkin'],
}
export const exportable = ['surname','name','company','position','email','phone','status','created_at','utm_source','utm_medium','utm_campaign','checked_in_at']
export function renderTemplate(text:string, values:Record<string,string>):string {
 return text.replace(/\{\{([a-z_]+)\}\}/g, (_match,key:string) => values[key] ?? '')
}
