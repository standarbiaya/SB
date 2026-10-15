import { demoItems,demoRegulations,demoDocuments,demoFaqs,demoSummary,demoDetail } from './demo';
import type { Item,Regulation,Document,FAQ,ItemDetail,Summary,ApiResult } from './types';
const allowDemo=import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE==='true';
export type SiteData={items:Item[];regulations:Regulation[];documents:Document[];faqs:FAQ[];summary:Summary;demo:boolean;error?:string};
async function get<T>(url:string):Promise<ApiResult<T>>{
  const response=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(12000)});
  if(!response.ok) throw new Error(`API ${response.status}`);
  const json=await response.json() as ApiResult<T>;
  if(json.error)throw new Error(json.error);
  return json;
}
export async function loadSite():Promise<SiteData>{
  try {
    const [item,reg,doc,faq,sum]=await Promise.all([
      get<Item[]>('/api/items?limit=500'),get<Regulation[]>('/api/regulations?limit=500'),
      get<Document[]>('/api/documents?limit=500'),get<FAQ[]>('/api/faq?limit=500'),get<Summary>('/api/summary')
    ]);
    if(sum.data.updatedAt) return {items:item.data,regulations:reg.data,documents:doc.data,faqs:faq.data,summary:sum.data,demo:false};
    if(!allowDemo) return {items:item.data,regulations:reg.data,documents:doc.data,faqs:faq.data,summary:sum.data,demo:false};
  } catch(error){
    if(!allowDemo)return {items:[],regulations:[],documents:[],faqs:[],summary:{itemCount:0,regulationCount:0,documentCount:0,sbmCount:0,sbkCount:0,ssbCount:0,byType:[],byYear:[],updatedAt:null},demo:false,error:String(error)};
  }
  return {items:demoItems,regulations:demoRegulations,documents:demoDocuments,faqs:demoFaqs,summary:demoSummary,demo:true};
}
export async function loadDetail(id:string,demo:boolean):Promise<ItemDetail|undefined>{
  if(demo)return demoDetail(id);
  try{ return (await get<ItemDetail>(`/api/items/${encodeURIComponent(id)}`)).data;}catch{return undefined;}
}
