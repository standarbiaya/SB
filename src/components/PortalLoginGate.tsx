import {createContext, useContext, useEffect, useState} from 'react';
import type {FormEvent, ReactNode} from 'react';
import {Eye, EyeOff, Landmark, LockKeyhole, LogIn, ShieldCheck} from 'lucide-react';

const LogoutContext = createContext<{logout: () => Promise<void>} | null>(null);
export function usePortalLogout() { return useContext(LogoutContext); }

type State = 'checking' | 'guest' | 'logged-in';
export default function PortalLoginGate({children}: {children: ReactNode}) {
  const [status, setStatus] = useState<State>('checking');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/auth/session', {credentials: 'same-origin', cache: 'no-store', signal: controller.signal})
      .then(async r => r.ok ? (await r.json() as {authenticated: boolean}) : {authenticated: false})
      .then(r => { if (!controller.signal.aborted) setStatus(r.authenticated ? 'logged-in' : 'guest'); })
      .catch(() => { if (!controller.signal.aborted) setStatus('guest'); });
    return () => controller.abort();
  }, []);

  async function login(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true); setError('');
    try {
      const result = await fetch('/api/auth/login', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({username, password}),
      });
      const body = await result.json() as {authenticated?: boolean; error?: string};
      if (!result.ok || !body.authenticated) {
        setError(body.error || 'Login gagal. Silakan coba lagi.'); return;
      }
      setPassword(''); setStatus('logged-in');
    } catch {
      setError('Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.');
    } finally { setLoading(false); }
  }
  async function logout() {
    setError('');
    try {
      const result = await fetch('/api/auth/logout', {method: 'POST', credentials: 'same-origin', cache: 'no-store'});
      if (!result.ok) throw new Error();
      setUsername(''); setPassword(''); setStatus('guest');
    } catch { setError('Gagal logout. Coba kembali atau tutup browser.'); }
  }
  if (status === 'checking') return <div className="portal-login-loading" role="status">Memeriksa akses portal...</div>;
  if (status === 'logged-in') return <LogoutContext.Provider value={{logout}}>{children}</LogoutContext.Provider>;
  return (
    <main className="portal-login-page">
      <div className="portal-login-card">
        <div className="portal-login-emblem"><Landmark size={31} strokeWidth={1.8}/></div>
        <p className="portal-login-eyebrow">PORTAL KAMUS STANDAR BIAYA</p>
        <h1>Masuk ke Portal</h1>
        <p className="portal-login-desc">Silakan masuk untuk mengakses kamus, besaran biaya, regulasi, dan dashboard.</p>
        <form onSubmit={login} className="portal-login-form">
          <label htmlFor="portal-username">Username</label>
          <input id="portal-username" type="text" autoComplete="username" value={username}
            onChange={e=>setUsername(e.target.value)} placeholder="Masukkan username" required autoFocus/>
          <label htmlFor="portal-password">Password</label>
          <div className="portal-password-wrap">
            <input id="portal-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password"
              value={password} onChange={e=>setPassword(e.target.value)} placeholder="Masukkan password" required/>
            <button type="button" className="portal-toggle-password" onClick={()=>setShowPassword(x=>!x)}
              aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}>
              {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
            </button>
          </div>
          {error && <p className="portal-login-error" role="alert">{error}</p>}
          <button className="portal-login-submit" type="submit" disabled={loading}>
            <LogIn size={18}/>{loading ? 'Memeriksa...' : 'Masuk'}
          </button>
        </form>
        <div className="portal-login-security"><ShieldCheck size={17}/> Akses dilindungi autentikasi server</div>
      </div>
      <div className="portal-login-footer"><LockKeyhole size={14}/> Hanya pengguna yang memiliki akses yang diperkenankan masuk.</div>
    </main>
  );
}
