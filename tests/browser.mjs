import {chromium} from 'playwright'
import assert from 'node:assert/strict'
const base=process.env.BASE_URL||'http://127.0.0.1:5175'
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('This test creates local fixtures; production runs are prohibited')
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})})
let context, originalSettings, settingsTouched=false
try{
context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const page=await context.newPage(),errors=[]
page.on('pageerror',e=>errors.push(e.message))
await page.goto(base+'/signin-with-chatgpt?return_to=/admin');await page.getByRole('heading',{name:'Управление мероприятием'}).waitFor()
await page.getByRole('button',{name:'Настройки',exact:true}).click();await page.locator('main[aria-busy=false]').waitFor()
const init=page.getByRole('button',{name:'Инициализировать настройки и текущий контент'});if(await init.count()){await init.click();await page.getByText('База инициализирована.',{exact:false}).waitFor()}
originalSettings=await (await context.request.get(base+'/api/admin/settings')).json()
const originalDraft=await (await context.request.get(base+'/api/admin/content')).json();const published=await (await context.request.get(base+'/api/public/content')).json();if(originalDraft.content?.texts.heroDate==='Дата для проверки предпросмотра')originalDraft.content.texts.heroDate=published.content?.texts.heroDate||'27 ноября 2026';
await page.getByLabel('Режим').selectOption('moderated')
await page.getByLabel('Версия обязательного согласия').fill('local-test-'+Date.now())
await page.getByLabel('Точный текст обязательного согласия').fill('ТЕСТ: согласие для локальной автоматической проверки.')
await page.getByLabel('Правовое основание обязательного согласия').fill('ТЕСТ, не production')
await page.getByLabel('Правовое основание рассылки',{exact:true}).fill('ТЕСТ, не production')
await page.getByLabel('Тексты и правовые основания проверены').check();settingsTouched=true;await page.getByRole('button',{name:'Сохранить настройки'}).click();await page.getByText('Настройки сохранены').waitFor()
const guest=await context.newPage();await guest.goto(base+'/?utm_source=browser-test&utm_campaign=qa');await guest.locator('#surname').fill('Локальный');await guest.locator('#name').fill('Тест');await guest.locator('#company').fill('Тестовая компания');await guest.locator('#position').fill('Тест');const email=`browser-${Date.now()}@example.test`;await guest.locator('#email').fill(email);await guest.locator('#phone').fill('+79991234567');await guest.locator('.consents input').first().check();await guest.getByRole('button',{name:'Отправить',exact:true}).click();const cancelLink=guest.locator('.cancel-link');await cancelLink.waitFor();const cancelUrl=await cancelLink.getAttribute('href')
await page.getByRole('button',{name:'Заявки',exact:true}).click();await page.getByLabel('Поиск',{exact:true}).fill(email);await page.getByRole('button',{name:'Применить'}).click();await page.getByRole('cell',{name:email,exact:false}).waitFor();await page.getByRole('button',{name:'Одобрить',exact:true}).click();await page.getByText('Сохранено',{exact:true}).waitFor()
await page.getByRole('button',{name:'Очередь писем',exact:true}).click();await page.getByRole('heading',{name:'Очередь писем'}).waitFor();await page.locator('main[aria-busy=false]').waitFor();assert.ok((await page.locator('tbody tr').count())>=2)
await guest.goto(base+cancelUrl);await guest.getByRole('button',{name:'Отменить заявку',exact:true}).click();await guest.getByText('Заявка отменена.',{exact:false}).waitFor()
await page.getByRole('button',{name:'Контент',exact:true}).click();await page.locator('main[aria-busy=false]').waitFor();await page.getByLabel('Дата мероприятия',{exact:true}).fill('Дата для проверки предпросмотра');await page.getByRole('button',{name:'Сохранить черновик',exact:true}).click();await page.getByText('Черновик сохранён',{exact:true}).waitFor();const preview=await context.newPage();await preview.goto(base+'/?preview=1');assert.equal(await preview.locator('.hero-date').innerText(),'Дата для проверки предпросмотра');await preview.close()
await page.getByRole('button',{name:'Шаблоны писем',exact:true}).click();await page.locator('main[aria-busy=false]').waitFor();await page.getByRole('button',{name:'Проверить сохранённый шаблон',exact:true}).first().click();await page.getByText('Предпросмотр шаблона готов',{exact:true}).waitFor()
for(const width of [1440,980,390]){await page.setViewportSize({width,height:900});if(width<=640)await page.getByRole('button',{name:'Меню управления',exact:true}).click();await page.getByRole('button',{name:'Заявки',exact:true}).click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.keyboard.press('Tab');assert.notEqual(await page.evaluate(()=>document.activeElement?.tagName),'BODY')}
await page.screenshot({path:'qa/admin-mobile.png',fullPage:true});assert.deepEqual(errors,[]);const latest=await (await context.request.get(base+'/api/admin/content')).json();const restored=await context.request.put(base+'/api/admin/content',{data:{content:originalDraft.content,version:latest.version}});assert.equal(restored.status(),200);console.log('PASS browser: admin login, setup, registration, approval, outbox, cancellation, CMS preview, template preview, responsive/keyboard')
}finally{
 try{
  if(context&&originalSettings&&settingsTouched){
   const latest=await (await context.request.get(base+'/api/admin/settings')).json()
   const restored=await context.request.put(base+'/api/admin/settings',{data:{...originalSettings,version:latest.version}})
   if(!restored.ok())throw Error('Failed to restore local registration settings after browser test')
  }
 }finally{await browser.close()}
}
