#!/usr/bin/env python3
"""Idempotent minimal portal-login integration; never edits wrangler.jsonc or D1."""
from pathlib import Path
import sys
root=Path(__file__).resolve().parents[1]
worker=root/'worker/index.ts'
main=root/'src/main.tsx'
layout=root/'src/components/Layout.tsx'
for path in (worker,main,layout):
    if not path.exists():
        sys.exit(f'ERROR: {path.relative_to(root)} tidak ditemukan. Jalankan dari repository portal yang benar.')
files={p:p.read_text(encoding='utf-8') for p in (worker,main,layout)}
w=files[worker]
if 'portalAuthGuard' not in w:
    imp="import {portalAuthGuard} from './portal-auth';\n"
    marker='async function handle(request:Request,env:Env):Promise<Response>{'
    if marker not in w:
        sys.exit('ERROR: struktur worker/index.ts berbeda; tidak ada file yang diubah.')
    w=imp+w
    w=w.replace(marker,marker+"\n  const blocked=await portalAuthGuard(request,env);\n  if(blocked)return blocked;",1)
    # Explicitly avoid storing authenticated API response in browsers or shared caches.
    old="async fetch(request:Request,env:Env){try{return await handle(request,env)}catch(e){"
    new="async fetch(request:Request,env:Env){try{const result=await handle(request,env);if(new URL(request.url).pathname.startsWith('/api/') && !['/api/health','/api/admin/sync'].includes(new URL(request.url).pathname))result.headers.set('cache-control','private, no-store');return result}catch(e){"
    if old not in w:
        sys.exit('ERROR: Worker fetch berbeda; tidak ada file yang diubah. Kirim screenshot bagian akhir worker/index.ts.')
    w=w.replace(old,new,1)
    # Worker Env types may have no explicit auth keys; structurally typed values are optional.
    if 'PORTAL_LOGIN_PASSWORD?:string;' not in w:
        if '  SYNC_ADMIN_TOKEN?:string;' not in w:
            sys.exit('ERROR: Env Worker tidak cocok; tidak ada file yang diubah.')
        w=w.replace('  SYNC_ADMIN_TOKEN?:string;', '  SYNC_ADMIN_TOKEN?:string;\n  PORTAL_LOGIN_PASSWORD?:string;\n  PORTAL_SESSION_SECRET?:string;',1)
files[worker]=w
m=files[main]
if 'PortalLoginGate' not in m:
    if "import App from './App';" not in m or "import './styles.css';" not in m:
        sys.exit('ERROR: src/main.tsx berbeda; tidak ada file yang diubah.')
    m=m.replace("import App from './App';", "import App from './App';\nimport PortalLoginGate from './components/PortalLoginGate';\nimport './portal-login.css';",1)
    original='<React.StrictMode><BrowserRouter><App/></BrowserRouter></React.StrictMode>'
    if original not in m:
        sys.exit('ERROR: React root berbeda; tidak ada file yang diubah.')
    m=m.replace(original,'<React.StrictMode><PortalLoginGate><BrowserRouter><App/></BrowserRouter></PortalLoginGate></React.StrictMode>',1)
files[main]=m
l=files[layout]
if 'usePortalLogout' not in l:
    if "import {BookOpen,Landmark,Menu,X,Search,ArrowUpRight,Mail} from 'lucide-react';" not in l:
        sys.exit('ERROR: import pada Layout.tsx berbeda; tidak ada file yang diubah.')
    l=l.replace("import {BookOpen,Landmark,Menu,X,Search,ArrowUpRight,Mail} from 'lucide-react';",
                "import {BookOpen,Landmark,Menu,X,Search,ArrowUpRight,Mail,LogOut} from 'lucide-react';\nimport {usePortalLogout} from './PortalLoginGate';",1)
    if 'const [open,setOpen]=useState(false); const location=useLocation();' not in l:
        sys.exit('ERROR: header pada Layout.tsx berbeda; tidak ada file yang diubah.')
    l=l.replace('const [open,setOpen]=useState(false); const location=useLocation();',
                'const [open,setOpen]=useState(false); const location=useLocation(); const portal=usePortalLogout();',1)
    target='   <button className="mobile-toggle"'
    if target not in l:
        sys.exit('ERROR: navigasi pada Layout.tsx berbeda; tidak ada file yang diubah.')
    l=l.replace(target,'   {portal&&<button type="button" className="portal-logout-button" onClick={()=>{void portal.logout()}} title="Keluar dari Portal"><LogOut size={16}/><span>Logout</span></button>}\n'+target,1)
files[layout]=l
# Apply changes only after all validations pass. Keep independent .pre-login.bak backups.
for path,new_text in files.items():
    if new_text != path.read_text(encoding='utf-8'):
        backup=path.with_suffix(path.suffix+'.pre-login.bak')
        if not backup.exists(): backup.write_text(path.read_text(encoding='utf-8'),encoding='utf-8')
        path.write_text(new_text,encoding='utf-8')
        print(f'OK: {path.relative_to(root)}')
    else:
        print(f'SKIP (sudah terpasang): {path.relative_to(root)}')
# In git repos, avoid accidentally committing backup files or uploaded ZIP.
exclude=root/'.git/info/exclude'
if exclude.exists():
    existing=exclude.read_text(encoding='utf-8')
    lines=['*.pre-login.bak', 'Portal_Standar_Biaya_LOGIN_PATCH.zip']
    to_add=[line for line in lines if line not in existing.splitlines()]
    if to_add: exclude.write_text(existing.rstrip('\n')+'\n'+'\n'.join(to_add)+'\n',encoding='utf-8')
print('Berhasil. Berikutnya: npm run build')
