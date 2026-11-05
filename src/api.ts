export const apiOrigin = location.hostname === 'sergey-develop.github.io' ? 'https://turbo-rave.aopopo11.workers.dev' : ''
export async function request<T=any>(path:string,options:RequestInit={}):Promise<T>{
 const response=await fetch(apiOrigin+'/api/'+path,{signal:AbortSignal.timeout(15000),...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}})
 const data=await response.json();if(!response.ok)throw Error(data.error||`Ошибка ${response.status}`);return data
}
