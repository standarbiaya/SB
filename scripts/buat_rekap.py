"""Menyusun rekap Dashboard (public/data/rekap.json) dari teks peraturan.

- SBM: klaster dan jenis dari public/data/istilah.json (PMK 54/2026), jumlah rincian besaran
  terbaca dari public/data/kandidat-indeks.json (KMK 296/2026).
- SSB: 6 Grup KRO dan batas biaya pendukung dari istilah.json (PMK 79/2025 Pasal 6).
- SBK: SBKU (PMK 3/2026 Lampiran I) dan SBKK per K/L (PMK 3/2026 Lampiran II, dicocokkan dengan
  KMK 57/2026 Lampiran II).

Jalankan setelah buat_istilah.py:  python3 scripts/buat_rekap.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEXT = ROOT / 'public/regulasi/indeks-kmk.json'
ISTILAH = ROOT / 'public/data/istilah.json'
KANDIDAT = ROOT / 'public/data/kandidat-indeks.json'
OUT = ROOT / 'public/data/rekap.json'

KLASTER = ['Honorarium', 'Fasilitas', 'Perjalanan Dinas', 'Pemeliharaan', 'Barang dan Jasa', 'Bantuan']
KL_HEADING = re.compile(r'(?:Kementerian Negara/)?Lembaga:\s*(.+?)\s*\(\s*(\d{3})\s*\)')


def doc_text(pages, doc, first, last=999):
    return ' '.join(re.sub(r'\s+', ' ', p['text']) for p in sorted(pages, key=lambda p: p['page'])
                    if p['doc'] == doc and first <= p['page'] <= last)


def sbm(istilah, kandidat):
    jenis = [x for x in istilah if x['sumber'].startswith('PMK 54/2026 Lampiran')]
    rincian = {}
    for r in kandidat:
        if r['jenis'] == 'SBM':
            rincian[r.get('klaster')] = rincian.get(r.get('klaster'), 0) + 1
    klaster = []
    for nama in KLASTER:
        anggota = [x for x in jenis if x['kelompok'] == nama]
        klaster.append({
            'nama': nama,
            'batas_tertinggi': [x['istilah'] for x in anggota if 'Lampiran I ' in x['sumber']],
            'dapat_dilampaui': [x['istilah'] for x in anggota if 'Lampiran II ' in x['sumber']],
            'rincian_terbaca': rincian.get(nama, 0),
        })
    return {'jumlah_jenis': len(jenis), 'klaster': klaster}


def ssb(istilah):
    grup = []
    for x in istilah:
        if x['kelompok'] == 'Batas Biaya Pendukung per Grup KRO':
            persen = int(re.search(r'(\d+)%', x['definisi']).group(1))
            grup.append({'nama': x['istilah'].replace('Grup KRO ', ''), 'persen': persen})
    return {'grup_kro': grup}


def count_items(segment, numbered):
    """Nomor urut terbesar yang muncul berurutan (1, 2, 3, ...) di dalam satu bagian tabel."""
    last = 0
    for m in re.finditer(numbered, segment):
        n = int(m.group(1))
        if last < n <= last + 3:
            last = n
    return last


def sbkk(pages, doc, first):
    t = doc_text(pages, doc, first)
    heads = list(KL_HEADING.finditer(t))
    out = []
    for i, h in enumerate(heads):
        seg = t[h.end(): heads[i + 1].start() if i + 1 < len(heads) else len(t)]
        out.append({'kode': h.group(2), 'nama': h.group(1).strip(),
                    'jumlah': count_items(seg, r'(?<![\d.,])(\d{1,3}) (?=[A-Z(])')})
    return out


def sbk(pages, istilah):
    lamp1 = doc_text(pages, 'pmk3', 5, 8)
    lamp1 = lamp1[lamp1.index('1. SBK'):]
    lamp1 = re.sub(r' ?- \d+ - Kode BA/Unit/Program/ Kegiatan/KRO/RO Uraian 2 3', '', lamp1)  # kepala tabel tiap halaman
    sbku = []
    parts = re.split(r'(?<![\w.])(\d{1,2})\. (?=SBK )', lamp1)
    for no, body in zip(parts[1::2], parts[2::2]):
        nama = re.match(r'(SBK .+?)(?= X{3}| [a-z]\. |$)', body).group(1).strip()
        sbku.append({'no': int(no), 'nama': nama, 'ro': max(1, len(re.findall(r'X{3,4}\.[A-Z/\-]+\.X{3}', body)))})
    if len(sbku) != 23:
        raise ValueError(f'SBKU seharusnya 23, terbaca {len(sbku)}')
    pmk3 = sbkk(pages, 'pmk3', 21)
    kmk57 = {x['kode']: x['jumlah'] for x in sbkk(pages, 'kmk57', 7)}
    beda = [x['kode'] for x in pmk3 if kmk57.get(x['kode']) != x['jumlah']]
    if beda:
        raise ValueError(f'Jumlah SBKK PMK 3/2026 dan KMK 57/2026 berbeda untuk K/L {beda}')
    return {'sbku': sbku, 'sbkk': sorted(pmk3, key=lambda x: -x['jumlah'])}


def main():
    pages = json.loads(TEXT.read_text())['pages']
    istilah = json.loads(ISTILAH.read_text())['istilah']
    kandidat = json.loads(KANDIDAT.read_text())['rows']
    data = {'sbm': sbm(istilah, kandidat), 'ssb': ssb(istilah), 'sbk': sbk(pages, istilah)}
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
    k = data['sbk']
    print('SBM jenis', data['sbm']['jumlah_jenis'], [(c['nama'], len(c['batas_tertinggi']) + len(c['dapat_dilampaui'])) for c in data['sbm']['klaster']])
    print('SSB grup', len(data['ssb']['grup_kro']), 'SBKU', len(k['sbku']), 'RO', sum(x['ro'] for x in k['sbku']),
          'SBKK', sum(x['jumlah'] for x in k['sbkk']), 'K/L', len(k['sbkk']))


if __name__ == '__main__':
    main()
