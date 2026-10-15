import {useState} from 'react';
import {NavLink,Link,Outlet,useLocation} from 'react-router-dom';
import {BookOpen,Landmark,Menu,X,Search,ArrowUpRight,Mail} from 'lucide-react';
import type {SiteData} from '../lib/api';
const pages=[['/','Beranda'],['/mengenal','Mengenal SB'],['/kamus','Kamus Biaya'],['/regulasi','Regulasi'],['/dashboard','Dashboard'],['/pustaka','Pustaka'],['/faq','FAQ']];
export default function Layout({data}:{data:SiteData}){
 const [open,setOpen]=useState(false); const location=useLocation();
 return <div className="site-shell">
  <div className="top-stripe"/>
  <header className="site-header"><div className="container header-inner">
   <Link className="brand" to="/" onClick={()=>setOpen(false)}><span className="brand-icon"><Landmark size={26}/></span><span><b>PORTAL STANDAR BIAYA</b><small>Pusat Informasi & Kamus Standar Biaya</small></span></Link>
   <nav className={open?'nav-links nav-open':'nav-links'} aria-label="Navigasi utama">{pages.map(([url,label])=><NavLink key={url} to={url} onClick={()=>setOpen(false)} end={url==='/'} className={({isActive})=>isActive?'nav-link active':'nav-link'}>{label}</NavLink>)}</nav>
   <button className="mobile-toggle" onClick={()=>setOpen(x=>!x)} aria-label={open?'Tutup menu':'Buka menu'} aria-expanded={open}>{open?<X/>:<Menu/>}</button>
  </div></header>
  {data.demo&&<div className="demo-alert" role="status"><div className="container">MODE DEMONSTRASI — seluruh item, dokumen, statistik, dan referensi di halaman ini hanyalah ilustrasi, bukan data atau ketentuan resmi.</div></div>}
  {data.error&&<div className="error-alert container">Koneksi API belum tersedia. {data.error}. Data resmi tidak dapat ditampilkan.</div>}
  <main key={location.pathname}><Outlet/></main>
  <footer className="footer"><div className="container footer-grid"><div><div className="footer-logo"><Landmark size={24}/> Portal Standar Biaya</div><p>Platform informasi dan kamus digital untuk membantu penelusuran standar biaya secara terstruktur dan mudah diakses.</p><small>Prototype pengembangan. Bukan situs resmi yang telah diotorisasi Kementerian Keuangan.</small></div><div><b>Navigasi</b><Link to="/kamus"><Search size={14}/> Kamus Biaya</Link><Link to="/regulasi"><BookOpen size={14}/> Regulasi</Link><Link to="/dashboard"><ArrowUpRight size={14}/> Dashboard</Link></div><div><b>Informasi</b><Link to="/mengenal">Tentang Standar Biaya</Link><Link to="/faq">Tanya Jawab</Link><span className="footer-muted"><Mail size={14}/> Hubungi pengelola (konfigurasi)</span></div></div><div className="container footer-bottom">© {new Date().getFullYear()} Portal Standar Biaya — Konsep website. Periksa selalu peraturan resmi sebelum penggunaan.</div></footer>
 </div>
}
