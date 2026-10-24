/** Satu akun akses portal. Secrets hanya disimpan pada Cloudflare. */
type AuthEnv = { PORTAL_LOGIN_PASSWORD?: string; PORTAL_SESSION_SECRET?: string };
const USERNAME = 'admin';
const COOKIE = 'sb_session';
const TTL = 8 * 60 * 60;
const encoder = new TextEncoder();
function noCache(headers: Record<string, string> = {}) { return { 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff', ...headers }; }
function reply(message: string, status: number) { return new Response(JSON.stringify({ error: message }), { status, headers: noCache({ 'content-type':'application/json; charset=utf-8' }) }); }
function base64url(bytes: Uint8Array): string {let str='';for(const b of bytes)str+=String.fromCharCode(b);return btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function constantEqual(a: string, b: string): boolean { const x=encoder.encode(a),y=encoder.encode(b);let diff=x.length^y.length;for(let i=0;i<Math.max(x.length,y.length);i++)diff|=(x[i]||0)^(y[i]||0);return diff===0; }
async function sign(secret: string, data: string): Promise<string> {const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return base64url(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(data))));}
function configValid(env: AuthEnv): boolean {return !!env.PORTAL_LOGIN_PASSWORD && !!env.PORTAL_SESSION_SECRET && env.PORTAL_SESSION_SECRET.length>=32;}
function getCookie(req:Request) { return (req.headers.get('cookie')||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||''; }
async function authenticated(req:Request, env:AuthEnv): Promise<boolean> {if(!configValid(env))return false;const cookie=getCookie(req);const m=/^(\d{10})\.([A-Za-z0-9_-]{43})$/.exec(cookie);if(!m)return false;const exp=Number(m[1]);const now=Math.floor(Date.now()/1000);if(exp<=now||exp>now+TTL)return false;return constantEqual(m[2],await sign(env.PORTAL_SESSION_SECRET!,`v1.${m[1]}.${USERNAME}`));}
function safeOrigin(req: Request): boolean {
  const expected = new URL(req.url).origin;
  const origin = req.headers.get('origin');
  const fetchSite = req.headers.get('sec-fetch-site');
  if (fetchSite !== 'same-origin') return false;
  return origin === expected || origin === null || origin === 'null';
}
function redirect(path:string,cookie?:string) {const h=new Headers(noCache({location:path}));if(cookie)h.set('set-cookie',cookie);return new Response(null,{status:303,headers:h});}
function loginPage(error=false) { const html=`<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Masuk — Portal Standar Biaya</title><style>*,*:before,*:after{box-sizing:border-box}body{font:16px system-ui,Arial;background:radial-gradient(circle at 85% 15%,#38bdf855,transparent 40%),radial-gradient(circle at 10% 100%,#14b8a640,transparent 45%),linear-gradient(130deg,#0b2550,#123a7a 45%,#1d5fd1);min-height:100vh;display:grid;place-items:center;margin:0;color:#153b64}.panel{width:min(430px,92vw);background:#fff;padding:42px;border-radius:22px;box-shadow:0 30px 70px #00000055;border-top:6px solid #a98bff}.brand{width:76px;height:76px;margin:auto;box-shadow:0 14px 26px -12px #3d1a80}.brand svg{display:block}h1{text-align:center;color:#0b2550;font-size:23px;margin:18px 0 7px}p{text-align:center;color:#627e94;line-height:1.6;font-size:14px}label{display:block;margin:18px 0 7px;font-weight:650;font-size:14px}input{width:100%;padding:14px 16px;border:1px solid #b9d8ea;border-radius:11px;font-size:16px;outline-color:#2999d9}button{width:100%;padding:15px;border:none;background:linear-gradient(135deg,#1d5fd1,#0ea5e9);box-shadow:0 10px 20px -10px #1d5fd1;color:#fff;font-weight:700;border-radius:11px;font-size:15px;margin-top:26px;cursor:pointer}.error{background:#fff0f1;color:#a52734;border-radius:10px;padding:12px}small{display:block;text-align:center;color:#7b96a9;margin-top:21px}</style></head><body><main class="panel"><div class="brand"><svg viewBox="0 0 120 120" role="img" width="76" height="76" aria-label="Logo Standar Biaya"><rect width="120" height="120" fill="#3D1A80"/><path d="M104 120 L120 104 L120 92 L92 120 Z" fill="#A98BFF"/><path d="M20 97 C 48 99, 80 92, 102 70" stroke="#A98BFF" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M95 66 L104 68 L101 77" stroke="#A98BFF" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M37.81 75.75Q33.17 75.75 28.88 74.6Q24.58 73.45 21.89 71.62L25.41 63.71Q27.96 65.36 31.28 66.39Q34.61 67.42 37.88 67.42Q40.12 67.42 41.45 67.03Q42.78 66.65 43.4 65.95Q44.02 65.26 44.02 64.34Q44.02 63.07 42.85 62.31Q41.68 61.56 39.78 61.07Q37.87 60.58 35.59 60.1Q33.31 59.61 31.01 58.87Q28.71 58.12 26.81 56.9Q24.9 55.68 23.73 53.69Q22.57 51.7 22.57 48.68Q22.57 45.32 24.42 42.55Q26.27 39.78 30 38.11Q33.72 36.45 39.32 36.45Q43 36.45 46.59 37.28Q50.18 38.11 52.99 39.76L49.72 47.66Q47.01 46.2 44.37 45.49Q41.73 44.78 39.22 44.78Q37.02 44.78 35.67 45.24Q34.32 45.7 33.73 46.46Q33.14 47.21 33.14 48.15Q33.14 49.39 34.31 50.12Q35.47 50.86 37.38 51.32Q39.28 51.78 41.58 52.25Q43.88 52.73 46.16 53.47Q48.44 54.21 50.35 55.41Q52.25 56.62 53.42 58.6Q54.59 60.57 54.59 63.54Q54.59 66.84 52.73 69.62Q50.86 72.39 47.15 74.07Q43.44 75.75 37.81 75.75Z M60.5 75V37.2H79.81Q87.27 37.2 90.94 39.94Q94.61 42.68 94.61 47.07Q94.61 49.98 93.08 52.19Q91.56 54.39 88.78 55.64Q85.99 56.88 82.15 56.88L83.2 54.32Q87.19 54.32 90.16 55.53Q93.13 56.74 94.79 59.04Q96.44 61.35 96.44 64.63Q96.44 69.53 92.49 72.26Q88.54 75 80.89 75ZM71.06 67.3H80.05Q82.81 67.3 84.23 66.35Q85.65 65.4 85.65 63.46Q85.65 61.51 84.23 60.55Q82.81 59.6 80.05 59.6H70.31V52.23H78.42Q81.12 52.23 82.47 51.3Q83.82 50.37 83.82 48.57Q83.82 46.73 82.47 45.81Q81.12 44.9 78.42 44.9H71.06Z" fill="#FFFFFF"/></svg></div><h1>Portal Standar Biaya</h1><p>Masuk ke Pusat Informasi Standar Biaya untuk menelusuri item dan regulasi.</p>${error?'<p class="error">Username atau password tidak sesuai.</p>':''}<form action="/login" method="POST"><label for="username">Username</label><input id="username" name="username" autocomplete="username" required maxlength="80"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="256"><button type="submit">Masuk ke Portal →</button></form><small>Akses terbatas • Administrator</small></main></body></html>`;return new Response(html,{headers:noCache({'content-type':'text/html; charset=utf-8','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",'referrer-policy':'same-origin'})}); }
export async function authGate(req:Request,env:AuthEnv):Promise<Response|null> {
 const {pathname:path}=new URL(req.url);
 // Endpoint otomatis tetap menggunakan SYNC_ADMIN_TOKEN independen dari sesi browser.
 if(path==='/api/admin/sync')return null;
 if(path==='/api/health')return null;
 if(!configValid(env))return reply('Konfigurasi login belum lengkap (Secrets Cloudflare).',503);
 if(path==='/login' && req.method==='GET')return (await authenticated(req,env))?redirect('/'):loginPage(new URL(req.url).searchParams.has('error'));
 if(path==='/login' && req.method==='POST') {
   if(!safeOrigin(req))return reply('Invalid origin',403);
   if(!(req.headers.get('content-type')||'').startsWith('application/x-www-form-urlencoded'))return reply('Format tidak sesuai',415);
   const body=await req.text();if(body.length>2048)return reply('Permintaan terlalu besar',413);
   const data=new URLSearchParams(body);
   const username=data.get('username')||'',password=data.get('password')||'';
   if(!constantEqual(username,USERNAME)||!constantEqual(password,env.PORTAL_LOGIN_PASSWORD!))return redirect('/login?error=1');
   const exp=String(Math.floor(Date.now()/1000)+TTL),mac=await sign(env.PORTAL_SESSION_SECRET!,`v1.${exp}.${USERNAME}`);
   return redirect('/',`${COOKIE}=${exp}.${mac}; Path=/; Max-Age=${TTL}; HttpOnly; Secure; SameSite=Strict`);
 }
 if(path==='/logout' && req.method==='POST') {if(!safeOrigin(req))return reply('Invalid origin',403);return redirect('/login',`${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`);}
 if(!(await authenticated(req,env)))return path.startsWith('/api/')?reply('Unauthorized',401):redirect('/login');
 if(path==='/login'||path==='/logout')return reply('Method not allowed',405);
 return null;
}
