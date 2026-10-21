#!/usr/bin/env python3
"""Export verified CSV rows to SQL for separate D1 staging table. Never modifies production catalog."""
import csv,sys,pathlib
if len(sys.argv)<3: raise SystemExit('Usage: python scripts/export_approved_sql.py REVIEWED.csv approved.sql')
q=lambda s: "'"+str(s).replace("'","''")+"'"
with open(sys.argv[1],encoding='utf-8-sig',newline='') as f: rows=list(csv.DictReader(f))
cols=['id','jenis','regulasi','lampiran','halaman_pdf','kode_item','kode_program','kelompok','uraian','wilayah','volume','satuan','besaran_rupiah','teks_asli','status_verifikasi','catatan_verifikasi','sumber_pdf']
with open(sys.argv[2],'w',encoding='utf8') as f:
 f.write('-- Reviewed staging data. Apply after migrations/0002_kmk_review.sql.\nBEGIN TRANSACTION;\n')
 count=0
 for r in rows:
  if r['status_verifikasi']!='DISETUJUI':continue
  if not r['catatan_verifikasi'].strip():raise ValueError('Catatan verifikasi wajib untuk '+r['id'])
  if not r['uraian'].strip() or not int(r['besaran_rupiah'])>0: raise ValueError('Kandidat tidak lengkap '+r['id'])
  vals=','.join(str(int(r[c])) if c in ('halaman_pdf','besaran_rupiah') else q(r[c]) for c in cols)
  f.write('INSERT OR REPLACE INTO kmk_review_candidates ('+','.join(cols)+') VALUES ('+vals+');\n')
  count+=1
 f.write('COMMIT;\n')
print('Exported approved rows:',count)
