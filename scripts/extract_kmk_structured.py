#!/usr/bin/env python3
"""Build review-only candidate tables from KMK PDF text; never auto-publish legal amounts."""
import csv,json,re,sqlite3,hashlib
from pathlib import Path
import fitz
BASE=Path(__file__).resolve().parents[1]
OUT=BASE/'data';OUT.mkdir(exist_ok=True)
PUB=BASE/'public'/'data';PUB.mkdir(exist_ok=True)
SOURCES=[('SBM','KMK-296-2026','public/regulasi/kmk-296-2026.pdf'),('SBK','KMK-57-2026','public/regulasi/kmk-57-2026.pdf')]
MONEY_SBM=re.compile(r'^Rp\s*([0-9]{1,3}(?:\.[0-9]{3})+|[0-9]{4,})$')
MONEY_SBK=re.compile(r'^([0-9]{1,3}(?:\.[0-9]{3})+|[0-9]{4,})$')
CODE=re.compile(r'^(?:[X0-9]{3,4}\.)?[A-Z]{3}(?:[/-][A-Z]{3})?\.XXX$|^\d{3}\.\d{2}$|^\d{4}\.[A-Z]{3}$')
NUMBER=re.compile(r'^\d+(?:\.\d+)*\.?$')
HEADER=re.compile(r'^(?:NO/URAIAN|BESARAN|SATUAN|URAIAN|Kode|Volume dan|Satuan Ukur|\(?dalam Rupiah\)?|LAMPIRAN|\(1\)|\(2\)|\(3\)|\(4\)|\(5\)|Keputusan Menteri)',re.I)
FIELD=['id','jenis','regulasi','lampiran','halaman_pdf','kode_item','kode_program','kelompok','uraian','wilayah','volume','satuan','besaran_rupiah','teks_asli','status_verifikasi','catatan_verifikasi','sumber_pdf']
rows=[];stats=[]
for jenis,reg,rel in SOURCES:
 doc=fitz.open(str(BASE/rel));num=0;potential=0
 for p,page in enumerate(doc):
  if p<2:continue
  lines=[re.sub(r'\s+',' ',s).strip() for s in page.get_text(sort=False).splitlines()]
  lines=[x for x in lines if x]
  lamp='II' if (jenis=='SBK' and p>=6) or (jenis=='SBM' and ('LAMPIRAN II' in ' '.join(lines[:14]) or p>=100)) else 'I'
  for i,s in enumerate(lines):
   m=(MONEY_SBM if jenis=='SBM' else MONEY_SBK).fullmatch(s)
   if not m:continue
   try: value=int(m.group(1).replace('.',''))
   except:continue
   if value<1000 or value>1000000000000:continue
   potential+=1
   window=lines[max(0,i-13):i]
   if jenis=='SBM':
    unit=window[-1] if window else ''
    isunit=bool(re.fullmatch(r'[A-Za-z][A-Za-z /()\-]{0,35}',unit)) and not HEADER.match(unit)
    unit=unit if isunit else ''
    descparts=window[:-1] if isunit else window
    descparts=[x for x in descparts if not HEADER.match(x)]
    # Find latest item number. Avoid treating standalone integer as currency metadata.
    ix=max((j for j,t in enumerate(descparts) if NUMBER.fullmatch(t)),default=-1)
    code=descparts[ix] if ix>=0 else ''
    desc=' '.join(descparts[ix+1:] if ix>=0 else descparts[-3:])[:280].strip()
    vol=''
    pcode=''
    if not desc or len(desc)<4:continue
   else:
    # PDF text layout: code -> description -> volume unit -> amount.
    candidates=[(j,x) for j,x in enumerate(window) if CODE.fullmatch(x)]
    if not candidates:continue
    ci, pcode=candidates[-1]
    seg=window[ci+1:]
    if not seg:continue
    u=seg[-1]
    v=re.match(r'^(\d+)\s+(.+)$',u)
    if v:vol=v.group(1);unit=v.group(2);seg=seg[:-1]
    else: vol='';unit=''
    seg=[x for x in seg if not HEADER.match(x)]
    desc=' '.join(seg)[:280].strip()
    code=''
    if len(desc)<4:continue
   # everything is a candidate only. No unverified entry goes into operational tables.
   row={'id':f'{reg}-{p+1:03d}-{i:03d}', 'jenis':jenis,'regulasi':reg,'lampiran':lamp,
     'halaman_pdf':p+1,'kode_item':code,'kode_program':pcode,'kelompok':'',
     'uraian':desc,'wilayah':'','volume':vol,'satuan':unit,'besaran_rupiah':value,
     'teks_asli':' | '.join(lines[max(i-5,0):i+1])[:500],
     'status_verifikasi':'PERLU_REVIEW','catatan_verifikasi':'Periksa deskripsi, klasifikasi, satuan, nominal dan kolom asli pada PDF.',
     'sumber_pdf':'/'+rel.replace('public/','')}
   rows.append(row);num+=1
 stats.append({'regulasi':reg,'halaman':len(doc),'kandidat':num,'baris_nominal_terdeteksi':potential})
with (OUT/'KANDIDAT_SBM_SBK_PERLU_VERIFIKASI.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.DictWriter(f,fieldnames=FIELD);w.writeheader();w.writerows(rows)
# Searchable client-side data is explicitly flagged and never presented as officially validated.
public=[{k:r[k] for k in ('id','jenis','regulasi','lampiran','halaman_pdf','kode_item','kode_program','uraian','wilayah','volume','satuan','besaran_rupiah','status_verifikasi','sumber_pdf')} for r in rows]
(PUB/'kandidat-indeks.json').write_text(json.dumps({'notice':'Hasil ekstraksi otomatis, semua baris WAJIB verifikasi silang dengan PDF sebelum dipakai untuk penganggaran.','rows':public,'stats':stats},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
db=sqlite3.connect(OUT/'review_kmk_296_57.sqlite')
db.executescript('''CREATE TABLE IF NOT EXISTS kandidat_biaya(id TEXT PRIMARY KEY,jenis TEXT NOT NULL,regulasi TEXT NOT NULL,lampiran TEXT,halaman_pdf INTEGER,kode_item TEXT,kode_program TEXT,kelompok TEXT,uraian TEXT,wilayah TEXT,volume TEXT,satuan TEXT,besaran_rupiah INTEGER,teks_asli TEXT,status_verifikasi TEXT NOT NULL CHECK(status_verifikasi IN ('PERLU_REVIEW','DISETUJUI','DITOLAK')),catatan_verifikasi TEXT,sumber_pdf TEXT); CREATE INDEX IF NOT EXISTS idx_kandidat_cari ON kandidat_biaya(regulasi,jenis,halaman_pdf);''')
db.executemany('INSERT OR REPLACE INTO kandidat_biaya VALUES ('+','.join(['?']*len(FIELD))+')',[[r[k] for k in FIELD] for r in rows]);db.commit();db.close()
print('TOTAL',len(rows),'STATS',stats)
