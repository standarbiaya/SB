/** Secure, stateless portal login for Cloudflare Workers.
 * Secrets are configured in Cloudflare, never in the repository or Vite env.
 */
export type PortalAuthEnv = {
  PORTAL_LOGIN_PASSWORD?: string;
  PORTAL_SESSION_SECRET?: string;
};

const USERNAME = 'standarbiaya';
const COOKIE_NAME = 'sb_portal_session';
const SESSION_SECONDS = 8 * 60 * 60;
const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'private, no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
};
const response = (data: unknown, status = 200, more: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { ...jsonHeaders, ...more } });

function safeEqual(a: string, b: string): boolean {
  const aa = new TextEncoder().encode(a), bb = new TextEncoder().encode(b);
  let diff = aa.length ^ bb.length;
  for (let i = 0; i < Math.max(aa.length, bb.length); i++) diff |= (aa[i] || 0) ^ (bb[i] || 0);
  return diff === 0;
}
function b64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
async function signature(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const output = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return b64url(output);
}
function getCookie(request: Request): string | null {
  const cookies = request.headers.get('cookie') || '';
  for (const section of cookies.split(';')) {
    const [key, ...rest] = section.trim().split('=');
    if (key === COOKIE_NAME) return rest.join('=');
  }
  return null;
}
function configured(env: PortalAuthEnv): boolean {
  return !!env.PORTAL_LOGIN_PASSWORD && !!env.PORTAL_SESSION_SECRET &&
    env.PORTAL_SESSION_SECRET.length >= 32;
}
async function validSession(request: Request, env: PortalAuthEnv): Promise<boolean> {
  if (!configured(env)) return false;
  const cookie = getCookie(request);
  if (!cookie || cookie.length > 200 || !/^v1\.\d{10,13}\.[\w-]{43}$/.test(cookie)) return false;
  const parts = cookie.split('.');
  const expires = Number(parts[1]);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(expires) || expires <= now || expires > now + SESSION_SECONDS) return false;
  const payload = `v1.${parts[1]}.${USERNAME}`;
  return safeEqual(parts[2], await signature(env.PORTAL_SESSION_SECRET!, payload));
}
async function createSession(env: PortalAuthEnv): Promise<string> {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = `v1.${expires}.${USERNAME}`;
  return `v1.${expires}.${await signature(env.PORTAL_SESSION_SECRET!, payload)}`;
}
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch { return false; }
}
const loginCookie = (value: string) =>
  `${COOKIE_NAME}=${value}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
const deleteCookie = () =>
  `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;

/** Return a Response to stop the request, or null to continue normal API handling. */
export async function portalAuthGuard(request: Request, env: PortalAuthEnv): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  // Keep diagnostics available and preserve the independently authenticated admin sync.
  if (path === '/api/health' || path === '/api/admin/sync') return null;
  if (path === '/api/auth/session') {
    if (request.method !== 'GET') return response({ error: 'Method not allowed' }, 405);
    return response({ authenticated: await validSession(request, env) });
  }
  if (path === '/api/auth/login') {
    if (request.method !== 'POST') return response({ error: 'Method not allowed' }, 405);
    if (!configured(env)) return response({ error: 'Login belum dikonfigurasi oleh pengelola.' }, 503);
    if (!sameOrigin(request)) return response({ error: 'Invalid request origin' }, 403);
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
      return response({ error: 'Format permintaan tidak valid' }, 415);
    const size = Number(request.headers.get('content-length') || 0);
    if (size > 1024) return response({ error: 'Permintaan terlalu besar' }, 413);
    let credentials: { username?: unknown; password?: unknown };
    try { credentials = await request.json() as typeof credentials; }
    catch { return response({ error: 'Permintaan tidak valid' }, 400); }
    if (typeof credentials?.username !== 'string' || typeof credentials?.password !== 'string' ||
        credentials.username.length > 128 || credentials.password.length > 256 ||
        !safeEqual(credentials.username, USERNAME) ||
        !safeEqual(credentials.password, env.PORTAL_LOGIN_PASSWORD!)) {
      return response({ error: 'Username atau password salah' }, 401);
    }
    return response({ authenticated: true, username: USERNAME }, 200,
      { 'set-cookie': loginCookie(await createSession(env)) });
  }
  if (path === '/api/auth/logout') {
    if (request.method !== 'POST') return response({ error: 'Method not allowed' }, 405);
    if (!sameOrigin(request)) return response({ error: 'Invalid request origin' }, 403);
    return response({ authenticated: false }, 200, { 'set-cookie': deleteCookie() });
  }
  if (!path.startsWith('/api/')) return null;
  if (!configured(env)) return response({ error: 'Login belum dikonfigurasi oleh pengelola' }, 503);
  if (!(await validSession(request, env))) return response({ error: 'Unauthorized' }, 401);
  return null;
}
