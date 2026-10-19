
/** Cloudflare Workers API */

type Env = {
  DB: D1Database;
  GOOGLE_SHEET_ID: string;
  GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
  GOOGLE_PRIVATE_KEY?: string;
  SYNC_ADMIN_TOKEN?: string;
  ENABLE_SCHEDULED_SYNC?: string;
  ASSETS: Fetcher;
  PORTAL_LOGIN_PASSWORD: string;
  PORTAL_SESSION_SECRET: string;
type Row = Record<string, string>;

const REQUIRED:Record<string,string[]>={
  MASTER_ITEM:['id','jenis','kelompok','subkelompok','nama','definisi','satuan','status'],
  BESARAN_BIAYA:['id','item_id','tahun','wilayah','kategori','besaran','mata_uang','ketentuan'],
  REGULASI:['id','jenis','nomor','tahun','judul','tanggal_berlaku','status','url','status_publikasi'],
  RELASI_REGULASI:['item_id','regulation_id','pasal','lampiran','halaman','keterangan'],
  DOKUMEN:['id','judul','kategori','tahun','deskripsi','drive_file_id','status_publikasi'],
  FAQ:['id','pertanyaan','jawaban','referensi','status']}
const HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=60, stale-while-revalidate=120','x-content-type-options':'nosniff'};
function json(data:unknown,status=200,headers:Record<string,string>={}){return new Response(JSON.stringify(data),{status,headers:{...HEADERS,...headers}})}
function bad(message:string,status=400){return json({error:message},status,{'cache-control':'no-store'});}
function int(value:string|undefined,defaultValue:number,min:number,max:number){const n=Number(value);return Number.isInteger(n)&&n>=min&&n<=max?n:defaultValue}
function isId(s:string){return /^[\w.:-]{1,120}$/.test(s)}
function secureEq(a:string,b:string){const encoder=new TextEncoder();const aa=encoder.encode(a),bb=encoder.encode(b);let diff=aa.length^bb.length;for(let i=0;i<Math.max(aa.length,bb.length);i++)diff|=(aa[i]||0)^(bb[i]||0);return diff===0}
async function currentVersion(db:D1Database){const row=await db.prepare("SELECT value FROM settings WHERE key='published_version'").first<{value:string}>();return row?.value??null;}
function b64url(input:Uint8Array|string){const bytes=typeof input==='string'?new TextEncoder().encode(input):input;let s='';for(const x of bytes)s+=String.fromCharCode(x);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function googleToken(env:Env):Promise<string>{
  if(!env.GOOGLE_SERVICE_ACCOUNT_EMAIL||!env.GOOGLE_PRIVATE_KEY)throw new Error('Google service account secrets belum disetel');
  const header=b64url(JSON.stringify({alg:'RS256',typ:'JWT'}));
  const now=Math.floor(Date.now()/1000);
  const claim=b64url(JSON.stringify({iss:env.GOOGLE_SERVICE_ACCOUNT_EMAIL,scope:'https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.metadata.readonly',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3300}));
  const payload=`${header}.${claim}`;
  const pem=env.GOOGLE_PRIVATE_KEY.replace(/\\n/g,'\n').replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,'');
  const binary=atob(pem);const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
  const key=await crypto.subtle.importKey('pkcs8',bytes.buffer,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
  const signature=new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(payload)));
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:`${payload}.${b64url(signature)}`})});
  if(!response.ok)throw new Error(`Google OAuth gagal (${response.status})`);
  const token=await response.json() as {access_token?:string};if(!token.access_token)throw new Error('Google OAuth tidak memberikan token');return token.access_token;
}
async function readSheet(env:Env,token:string,name:string){
  // Template limit of 1,999 data rows; increase with batching for larger production datasets.
  const url=`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.GOOGLE_SHEET_ID)}/values/${encodeURIComponent(name+'!A1:U2000')}?valueRenderOption=UNFORMATTED_VALUE`;
  const response=await fetch(url,{headers:{authorization:`Bearer ${token}`}});
  if(!response.ok)throw new Error(`Tidak bisa membaca tab ${name} (${response.status})`);
  const data=await response.json() as {values?:(string|number|boolean)[][]};const rows=data.values||[];
  if(!rows.length)throw new Error(`Tab ${name} kosong atau tidak memiliki header`);
  const header=rows[0].map(x=>String(x).trim().toLowerCase());
  const missing=REQUIRED[name].filter(k=>!header.includes(k));if(missing.length)throw new Error(`${name}: kolom wajib tidak ada: ${missing.join(', ')}`);
  const records:Row[]=rows.slice(1).filter(r=>r.some(v=>String(v??'').trim()!=='')).map(r=>Object.fromEntries(header.map((h,i)=>[h,String(r[i]??'').trim()])));
  if(rows.length>=2000)throw new Error(`${name} mencapai batas 1.999 baris. Implementasikan pagination sebelum melanjutkan.`);
  return records;
}
function requiredString(row:Row,name:string,label:string){const s=row[name]?.trim()||'';if(!s&&name!=='definisi'&&name!=='subkelompok'&&name!=='ketentuan'&&name!=='tanggal_berlaku'&&name!=='deskripsi'&&name!=='pasal'&&name!=='lampiran'&&name!=='halaman'&&name!=='keterangan'&&name!=='referensi'&&name!=='jawaban'&&name!=='drive_file_id'&&name!=='url')throw new Error(`${label}: ${name} wajib diisi`);if(s.length>1500)throw new Error(`${label}: ${name} terlalu panjang`);return s;}
function year(s:string,label:string){const y=Number(s);if(!Number.isInteger(y)||y<2000||y>2100)throw new Error(`${label}: tahun tidak valid`);return y;}
function rupiah(s:string,label:string){const v=Number(s);if(!Number.isFinite(v)||v<0||v>1e15)throw new Error(`${label}: besaran harus angka non-negatif (tanpa separator ribuan)`);return v;}
function ensureUnique(rows:Row[],label:string,key='id'){const seen=new Set<string>();for(const r of rows){const id=requiredString(r,key,label);if(!isId(id))throw new Error(`${label}: ID tidak valid: ${id}`);if(seen.has(id))throw new Error(`${label}: ID duplikat: ${id}`);seen.add(id)}return seen;}
function validate(data:Record<string,Row[]>) {
  for(const [name,rows] of Object.entries(data))for(const r of rows)for(const k of REQUIRED[name])requiredString(r,k,name);
  const ids=ensureUnique(data.MASTER_ITEM,'MASTER_ITEM');
  const regIds=ensureUnique(data.REGULASI,'REGULASI');
  ensureUnique(data.BESARAN_BIAYA,'BESARAN_BIAYA');ensureUnique(data.DOKUMEN,'DOKUMEN');ensureUnique(data.FAQ,'FAQ');
  for(const item of data.MASTER_ITEM){if(!['SBM','SBK','SSB'].includes(item.jenis))throw new Error(`Jenis tidak dikenal: ${item.jenis}`);if(item.status!=='published')throw new Error(`MASTER_ITEM: entri ${item.id} belum berstatus published. Pisahkan draft dari sumber publikasi.`);}
  for(const r of data.BESARAN_BIAYA){if(!ids.has(r.item_id))throw new Error(`BESARAN_BIAYA: item_id tak ditemukan: ${r.item_id}`);year(r.tahun,'BESARAN_BIAYA');rupiah(r.besaran,'BESARAN_BIAYA');if(!['IDR','PCT'].includes(r.mata_uang))throw new Error('Satuan besaran hanya mendukung IDR (Rupiah) atau PCT (Persentase)');}
  for(const r of data.REGULASI){if(r.status_publikasi!=='approved_public')throw new Error(`REGULASI: ${r.id} belum disetujui untuk publikasi`);year(r.tahun,'REGULASI');if(r.url&&!/^https:\/\//.test(r.url))throw new Error('REGULASI: URL wajib HTTPS');}
  const seenRel=new Set<string>();for(const r of data.RELASI_REGULASI){if(!ids.has(r.item_id)||!regIds.has(r.regulation_id))throw new Error('RELASI_REGULASI mengacu ke ID yang tidak ada');const key=[r.item_id,r.regulation_id,r.pasal,r.lampiran].join('|');if(seenRel.has(key))throw new Error('RELASI_REGULASI duplikat');seenRel.add(key)}
  for(const r of data.DOKUMEN){year(r.tahun,'DOKUMEN');if(!['approved_public','draft','internal'].includes(r.status_publikasi))throw new Error('DOKUMEN status_publikasi tidak valid');if(r.status_publikasi==='approved_public'&&r.drive_file_id&&!/^[\w-]{10,150}$/.test(r.drive_file_id))throw new Error('DOKUMEN: Drive File ID salah format');}
  for(const r of data.FAQ){if(!['published','draft'].includes(r.status))throw new Error('FAQ status tidak valid');}
}
async function verifyDriveFiles(token:string,docs:Row[]){
  // Checks existence/metadata only; public sharing permission must be checked by operator.
  for(const doc of docs.filter(x=>x.status_publikasi==='approved_public'&&x.drive_file_id)){
    const response=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(doc.drive_file_id)}?fields=id%2Cname%2CmimeType%2Ctrashed`,{headers:{authorization:`Bearer ${token}`}});
    if(!response.ok)throw new Error(`Google Drive file ${doc.id} tidak bisa diakses (${response.status})`);
    const file=await response.json() as {trashed?:boolean};if(file.trashed)throw new Error(`File ${doc.id} berada di sampah Google Drive`);
  }
}
async function sync(env:Env){
  if(!env.GOOGLE_SHEET_ID)throw new Error('GOOGLE_SHEET_ID belum dikonfigurasi');
  const token=await googleToken(env);const data:Record<string,Row[]>={};
  for(const name of Object.keys(REQUIRED))data[name]=await readSheet(env,token,name);
  validate(data);await verifyDriveFiles(token,data.DOKUMEN);
  const version=crypto.randomUUID(),now=new Date().toISOString();
  const statements:D1PreparedStatement[]=[];
  for(const r of data.MASTER_ITEM)statements.push(env.DB.prepare('INSERT INTO items (version,id,jenis,kelompok,subkelompok,nama,definisi,satuan,status) VALUES (?,?,?,?,?,?,?,?,?)').bind(version,r.id,r.jenis,r.kelompok,r.subkelompok,r.nama,r.definisi,r.satuan,r.status));
  for(const r of data.BESARAN_BIAYA)statements.push(env.DB.prepare('INSERT INTO rates (version,id,item_id,tahun,wilayah,kategori,besaran,mata_uang,ketentuan) VALUES (?,?,?,?,?,?,?,?,?)').bind(version,r.id,r.item_id,year(r.tahun,'rates'),r.wilayah,r.kategori,rupiah(r.besaran,'rates'),r.mata_uang,r.ketentuan));
  for(const r of data.REGULASI)statements.push(env.DB.prepare('INSERT INTO regulations (version,id,jenis,nomor,tahun,judul,tanggal_berlaku,status,url) VALUES (?,?,?,?,?,?,?,?,?)').bind(version,r.id,r.jenis,r.nomor,year(r.tahun,'regulations'),r.judul,r.tanggal_berlaku,r.status,r.url));
  for(const r of data.RELASI_REGULASI)statements.push(env.DB.prepare('INSERT INTO item_regulations (version,item_id,regulation_id,pasal,lampiran,halaman,keterangan) VALUES (?,?,?,?,?,?,?)').bind(version,r.item_id,r.regulation_id,r.pasal,r.lampiran,r.halaman,r.keterangan));
  for(const r of data.DOKUMEN.filter(x=>x.status_publikasi==='approved_public'))statements.push(env.DB.prepare('INSERT INTO documents (version,id,judul,kategori,tahun,deskripsi,drive_file_id,status_publikasi) VALUES (?,?,?,?,?,?,?,?)').bind(version,r.id,r.judul,r.kategori,year(r.tahun,'documents'),r.deskripsi,r.drive_file_id,r.status_publikasi));
  for(const r of data.FAQ.filter(x=>x.status==='published'))statements.push(env.DB.prepare('INSERT INTO faqs (version,id,pertanyaan,jawaban,referensi,status) VALUES (?,?,?,?,?,?)').bind(version,r.id,r.pertanyaan,r.jawaban,r.referensi,r.status));
  // Each D1 batch is transactional. Until the FINAL publication pointer is updated,
  // unfinished versions remain invisible to all public read endpoints.
  for(let offset=0;offset<statements.length;offset+=50)await env.DB.batch(statements.slice(offset,offset+50));
  await env.DB.batch([
    env.DB.prepare('INSERT INTO publications(version,published_at,source_sheet_id,item_count,regulation_count,document_count) VALUES(?,?,?,?,?,?)').bind(version,now,env.GOOGLE_SHEET_ID,data.MASTER_ITEM.length,data.REGULASI.length,data.DOKUMEN.filter(x=>x.status_publikasi==='approved_public').length),
    env.DB.prepare("INSERT INTO settings(key,value) VALUES('published_version',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(version),
    env.DB.prepare('INSERT INTO sync_logs(id,started_at,completed_at,status,message,publication_version) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),now,new Date().toISOString(),'success','Synced and published',version)
  ]);
  return {version,counts:{items:data.MASTER_ITEM.length,rates:data.BESARAN_BIAYA.length,regulations:data.REGULASI.length,documents:data.DOKUMEN.filter(x=>x.status_publikasi==='approved_public').length},publishedAt:now};
}
async function handle(request:Request,env:Env):Promise<Response>{
  const u=new URL(request.url),path=u.pathname;
  if(path==='/api/health')return json({status:'ok',service:'portal-standar-biaya',timestamp:new Date().toISOString()});
  if(path==='/api/admin/sync'){
    if(request.method!=='POST')return bad('Method not allowed',405);
    if(!env.SYNC_ADMIN_TOKEN||env.SYNC_ADMIN_TOKEN.length<24)return bad('Sinkronisasi belum dikonfigurasi',503);
    const auth=request.headers.get('authorization')||'';
    if(!auth.startsWith('Bearer ')||!secureEq(auth.slice(7),env.SYNC_ADMIN_TOKEN))return bad('Unauthorized',401);
    try{return json({success:true,...await sync(env)},200,{'cache-control':'no-store'})}catch(e){console.error('Sync failed',String(e));return bad(`Sinkronisasi gagal. Versi publikasi sebelumnya dipertahankan. ${String(e)}`,422)}
  }
  if(request.method!=='GET')return bad('Method not allowed',405);
  const v=await currentVersion(env.DB);
  if(!v){
    const emptySummary={itemCount:0,regulationCount:0,documentCount:0,sbmCount:0,sbkCount:0,ssbCount:0,byType:[],byYear:[],updatedAt:null};
    if(path==='/api/summary')return json({data:emptySummary});
    if(['/api/items','/api/regulations','/api/documents','/api/faq'].includes(path))return json({data:[],total:0});
    return bad('Tidak ditemukan',404);
  }
  const limit=int(u.searchParams.get('limit')||undefined,30,1,500);
  const offset=int(u.searchParams.get('offset')||undefined,0,0,100000);
  if(path==='/api/summary'){
    const [pub,types,years]=await Promise.all([
      env.DB.prepare('SELECT * FROM publications WHERE version=?').bind(v).first<{published_at:string;item_count:number;regulation_count:number;document_count:number}>(),
      env.DB.prepare('SELECT jenis as name, COUNT(*) as value FROM items WHERE version=? GROUP BY jenis').bind(v).all<{name:string;value:number}>(),
      env.DB.prepare('SELECT CAST(tahun AS TEXT) as year, COUNT(*) as count FROM regulations WHERE version=? GROUP BY tahun ORDER BY tahun').bind(v).all<{year:string;count:number}>()
    ]);
    const byType=types.results||[];
    return json({data:{itemCount:pub?.item_count||0,regulationCount:pub?.regulation_count||0,documentCount:pub?.document_count||0,sbmCount:byType.find(x=>x.name==='SBM')?.value||0,sbkCount:byType.find(x=>x.name==='SBK')?.value||0,ssbCount:byType.find(x=>x.name==='SSB')?.value||0,byType,byYear:years.results||[],updatedAt:pub?.published_at||null}});
  }
  if(path==='/api/items'){
    const jenis=u.searchParams.get('jenis')||'',q=(u.searchParams.get('q')||'').slice(0,100);
    const filter="version=? AND (?='' OR jenis=?) AND (?='' OR nama LIKE ? OR kelompok LIKE ?)";
    const binds=[v,jenis,jenis,q,`%${q}%`,`%${q}%`];
    const [rows,total]=await Promise.all([
      env.DB.prepare(`SELECT * FROM items WHERE ${filter} ORDER BY nama LIMIT ? OFFSET ?`).bind(...binds,limit,offset).all(),
      env.DB.prepare(`SELECT count(*) AS c FROM items WHERE ${filter}`).bind(...binds).first<{c:number}>()
    ]);return json({data:rows.results,total:total?.c||0});
  }
  const match=path.match(/^\/api\/items\/([^/]+)$/);
  if(match){const id=decodeURIComponent(match[1]);if(!isId(id))return bad('Invalid item ID');const [item,rates,regs]=await Promise.all([
    env.DB.prepare('SELECT * FROM items WHERE version=? AND id=?').bind(v,id).first(),
    env.DB.prepare('SELECT * FROM rates WHERE version=? AND item_id=? ORDER BY tahun DESC,wilayah').bind(v,id).all(),
    env.DB.prepare('SELECT r.*, ir.pasal,ir.lampiran,ir.halaman,ir.keterangan FROM item_regulations ir JOIN regulations r ON r.id=ir.regulation_id AND r.version=ir.version WHERE ir.version=? AND ir.item_id=? ORDER BY r.tahun DESC').bind(v,id).all()
  ]);if(!item)return bad('Item not found',404);return json({data:{item,rates:rates.results,regulations:regs.results}});}
  if(path==='/api/regulations'){const result=await env.DB.prepare('SELECT * FROM regulations WHERE version=? ORDER BY tahun DESC,nomor LIMIT ? OFFSET ?').bind(v,limit,offset).all();return json({data:result.results});}
  if(path==='/api/documents'){const result=await env.DB.prepare("SELECT * FROM documents WHERE version=? AND status_publikasi='approved_public' ORDER BY tahun DESC,judul LIMIT ? OFFSET ?").bind(v,limit,offset).all();return json({data:result.results});}
  if(path==='/api/faq'){const result=await env.DB.prepare("SELECT * FROM faqs WHERE version=? AND status='published' ORDER BY id LIMIT ? OFFSET ?").bind(v,limit,offset).all();return json({data:result.results});}
  return bad('API route not found',404);
}
export default {
  async fetch(request:Request,env:Env){try{return await handle(request,env)}catch(e){console.error('API error',e);return bad('Terjadi gangguan layanan. Coba beberapa saat lagi.',500)}},
  async scheduled(_event:ScheduledController,env:Env,ctx:ExecutionContext){
    if(env.ENABLE_SCHEDULED_SYNC!=='true')return;
    ctx.waitUntil(sync(env).then(result=>console.log('Scheduled sync success',result.version)).catch(e=>console.error('Scheduled sync failed; old dataset preserved',String(e))));
  }
} satisfies ExportedHandler<Env>;
