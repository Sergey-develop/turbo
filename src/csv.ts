export function parseCsv(text: string): string[][] {
  const source=text.replace(/^\uFEFF/,'')
  const firstLine=source.split(/\r?\n/,1)[0]
  const delimiter=(firstLine.match(/;/g)||[]).length>(firstLine.match(/,/g)||[]).length?';':','
  const rows:string[][]=[];let row:string[]=[],cell='',quoted=false
  for(let i=0;i<source.length;i++){
    const char=source[i]
    if(char==='"'){
      if(quoted&&source[i+1]==='"'){cell+='"';i++}
      else if(quoted||!cell)quoted=!quoted
      else throw Error('Некорректная кавычка в CSV')
    }else if(char===delimiter&&!quoted){row.push(cell);cell=''}
    else if((char==='\n'||char==='\r')&&!quoted){if(char==='\r'&&source[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell=''}
    else cell+=char
  }
  if(quoted)throw Error('Незакрытая кавычка в CSV')
  row.push(cell);if(row.some(v=>v.trim()))rows.push(row)
  return rows
}
export function inviteesFromCsv(text: string): Record<string,string>[] {
  const rows=parseCsv(text)
  if(rows.length<2)throw Error('В CSV нужны заголовки и хотя бы один гость')
  const aliases:Record<string,string>={surname:'surname',фамилия:'surname',name:'name',имя:'name',email:'email','e-mail':'email',почта:'email',company:'company',компания:'company',position:'position',должность:'position',phone:'phone',телефон:'phone'}
  const headers=rows[0].map(h=>aliases[h.trim().toLowerCase()])
  for(const required of ['surname','name','email'])if(!headers.includes(required))throw Error('Обязательные столбцы: surname, name, email (или Фамилия, Имя, Email)')
  if(new Set(headers.filter(Boolean)).size!==headers.filter(Boolean).length)throw Error('В CSV повторяются столбцы')
  if(rows.length>101)throw Error('Не более 100 гостей в одном файле')
  return rows.slice(1).map((row,index)=>{
    if(row.length!==headers.length)throw Error(`Строка ${index+2}: количество ячеек отличается от заголовка`)
    return Object.fromEntries(headers.flatMap((key,i)=>key?[[key,row[i].trim()]]:[]))
  })
}
