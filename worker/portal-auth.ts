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

  // Izinkan Origin yang cocok dengan alamat website.
  if (origin === expected) {
    return fetchSite === 'same-origin';
  }

  // Tangani Origin: null dari browser Anda.
  if (origin === 'null' || origin === null) {
    return fetchSite === 'same-origin';
  }

  // Tolak permintaan dari asal lain.
  return false;
}


function redirect(path:string,cookie?:string) {const h=new Headers(noCache({location:path}));if(cookie)h.set('set-cookie',cookie);return new Response(null,{status:303,headers:h});}
function loginPage(error=false) { const html=`<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Masuk — Portal Standar Biaya</title><style>*,*:before,*:after{box-sizing:border-box}body{font:16px system-ui,Arial;background:linear-gradient(140deg,#dff5ff,#f0f9ff 55%,#cbeeff);min-height:100vh;display:grid;place-items:center;margin:0;color:#153b64}.panel{width:min(430px,92vw);background:#fff;padding:42px;border-radius:22px;box-shadow:0 22px 70px #0f568c20;border:1px solid #d8ebf7}.brand{width:66px;height:66px;background:#e4f5fe;border-radius:18px;margin:auto;display:grid;place-items:center;font-size:32px}h1{text-align:center;font-size:23px;margin:18px 0 7px}p{text-align:center;color:#627e94;line-height:1.6;font-size:14px}label{display:block;margin:18px 0 7px;font-weight:650;font-size:14px}input{width:100%;padding:14px 16px;border:1px solid #b9d8ea;border-radius:11px;font-size:16px;outline-color:#2999d9}button{width:100%;padding:15px;border:none;background:#1686c5;color:#fff;font-weight:700;border-radius:11px;font-size:15px;margin-top:26px;cursor:pointer}.error{background:#fff0f1;color:#a52734;border-radius:10px;padding:12px}small{display:block;text-align:center;color:#7b96a9;margin-top:21px}</style></head><body><main class="panel"><div class="brand">⚖️</div><h1>Portal Standar Biaya</h1><p>Masuk untuk menjelajahi Kamus Standar Biaya dan informasi regulasi.</p>${error?'<p class="error">Username atau password tidak sesuai.</p>':''}<form action="/login" method="POST"><label for="username">Username</label><input id="username" name="username" autocomplete="username" required maxlength="80"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="256"><button type="submit">Masuk ke Portal →</button></form><small>Akses terbatas • Administrator</small></main></body></html>`;return new Response(html,{headers:noCache({'content-type':'text/html; charset=utf-8','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",'referrer-policy':'same--origin'})}); }
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
