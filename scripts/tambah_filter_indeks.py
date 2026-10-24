"""Menambahkan kolom filter ke public/data/kandidat-indeks.json.

- SBK (KMK 57/2026): kolom `kl` dari judul bagian "Kementerian Negara/Lembaga: Nama (kode BA)"
  di teks PDF (public/regulasi/indeks-kmk.json). Lampiran I = SBK Umum.
- SBM (KMK 296/2026): kolom `klaster` (6 jenis SBM pada bahan sosialisasi PMK 54/2026)
  berdasarkan nomor jenis SBM pada kode_item.

Jalankan ulang setelah kandidat-indeks.json diperbarui:  python3 scripts/tambah_filter_indeks.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'public/data/kandidat-indeks.json'
TEXT = ROOT / 'public/regulasi/indeks-kmk.json'

SBK_UMUM = 'SBK Umum (semua K/L)'
SBM_LAMPIRAN_II_MULAI = 69  # halaman PDF KMK 296/2026; kolom `lampiran` hasil ekstraksi tidak selalu tepat
HEADING = re.compile(r'(?:Kementerian Negara/)?Lembaga:\s*(.+?)\s*\(\s*(\d{3})\s*\)')

# Nomor jenis SBM pada KMK 296/2026 -> klaster.
HON, FAS, PERDIN, PEM, BAN, BJ = 'Honorarium', 'Fasilitas', 'Perjalanan Dinas', 'Pemeliharaan', 'Bantuan', 'Barang dan Jasa'
KLASTER_SBM = {
    'I': {**{n: HON for n in range(1, 21)},
          21: FAS, 22: FAS, 30: FAS, 35: FAS,
          24: PERDIN, 25: PERDIN, 26: PERDIN, 27: PERDIN, 28: PERDIN,
          23: BJ, 29: BJ, 31: BJ, 32: BJ, 33: BJ, 34: BJ, 36: BJ, 37: BJ,
          38: BAN, 39: BAN},
    'II': {1: HON,
           **{n: PERDIN for n in range(2, 8)},
           8: PEM, 9: PEM, 10: PEM,
           **{n: BJ for n in range(11, 19)},
           19: BAN},
}


def kl_per_row(rows, pages):
    """Tentukan K/L tiap baris SBK Lampiran II dari judul bagian terakhir sebelum baris tsb."""
    texts = {p['page']: p['text'] for p in pages if p['doc'] == 'kmk57'}
    heads = {pg: [(m.start(), f'{m.group(2)} {m.group(1).strip()}') for m in HEADING.finditer(t)] for pg, t in texts.items()}
    carry, last_on = None, {}
    for pg in sorted(texts):
        last_on[pg] = carry  # K/L yang berlaku di awal halaman
        if heads[pg]:
            carry = heads[pg][-1][1]
    for r in rows:
        if r['lampiran'] != 'II':
            r['kl'] = SBK_UMUM
            continue
        pg, t = r['halaman_pdf'], texts.get(r['halaman_pdf'], '')
        kl = last_on.get(pg)
        pos = t.find(r['uraian'][:30]) if r['uraian'] else -1
        page_heads = heads.get(pg, [])
        if pos < 0 and kl is None and page_heads:
            kl = page_heads[0][1]
        for start, name in page_heads:
            if 0 <= start <= pos:
                kl = name
        r['kl'] = kl or 'Tidak terbaca'


def main():
    data = json.loads(DATA.read_text())
    pages = json.loads(TEXT.read_text())['pages']
    sbk = [r for r in data['rows'] if r['jenis'] == 'SBK']
    kl_per_row(sbk, pages)
    for r in data['rows']:
        if r['jenis'] == 'SBM':
            n = int(r['kode_item'].split('.')[0]) if r['kode_item'] else 0
            lampiran = 'II' if r['halaman_pdf'] >= SBM_LAMPIRAN_II_MULAI else 'I'
            r['klaster'] = KLASTER_SBM[lampiran].get(n, 'Lainnya')
    DATA.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')))


if __name__ == '__main__':
    main()
