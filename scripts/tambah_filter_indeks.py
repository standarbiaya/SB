"""Menambahkan kolom filter ke public/data/kandidat-indeks.json.

- SBK (KMK 57/2026): kolom `kl` dari judul bagian "Kementerian Negara/Lembaga: Nama (kode BA)"
  di teks PDF (public/regulasi/indeks-kmk.json). Lampiran I = SBK Umum.
- SBM (KMK 296/2026): kolom `klaster` sesuai judul bagian lampiran KMK 296/2026 (Honorarium,
  Fasilitas, Perjalanan Dinas, Pemeliharaan, Barang dan Jasa, Bantuan), dipetakan lewat nomor
  jenis SBM pada kode_item.

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

# Klaster SBM = judul bagian pada lampiran KMK 296/2026 ("A. SATUAN BIAYA HONORARIUM", dst.).
# Lampiran I: hlm 3-50, Lampiran II: hlm 69-118; halaman di antaranya berisi penjelasan.
SBM_LAMPIRAN = {'I': range(3, 51), 'II': range(SBM_LAMPIRAN_II_MULAI, 119)}
SECTION = re.compile(r'(?<![A-Za-z0-9.])[A-H]\.\s+SATUAN BIAYA ((?:BARANG DAN JASA|PERJALANAN DINAS|[A-Z]+))')
ITEM = re.compile(r'(?<![\d.,])(\d{1,2})\.\s+(?=[A-Z]{3})')


def klaster_sbm(pages):
    """Petakan (lampiran, nomor jenis SBM) -> klaster dari urutan judul bagian dan judul jenis di teks PDF.

    Mengembalikan juga fungsi klaster-per-halaman untuk jenis yang judulnya tidak terbaca.
    """
    texts = {p['page']: p['text'] for p in pages if p['doc'] == 'kmk296'}
    items, sections = {}, {}
    for lampiran, span in SBM_LAMPIRAN.items():
        events = []
        for pg in span:
            t = texts.get(pg, '')
            events += [(pg, m.start(), 'S', m.group(1).title().replace(' Dan ', ' dan ')) for m in SECTION.finditer(t)]
            events += [(pg, m.start(), 'I', int(m.group(1))) for m in ITEM.finditer(t)]
        current, last_item = None, 0
        for pg, _, kind, value in sorted(events):
            if kind == 'S':
                current = value
                sections.setdefault(lampiran, []).append((pg, value))
            elif current and last_item < value <= last_item + 3:  # judul jenis berurutan 1, 2, 3, ...
                items[(lampiran, value)] = current
                last_item = value

    def by_page(lampiran, page):
        found = [name for pg, name in sections.get(lampiran, []) if pg <= page]
        return found[-1] if found else None

    return items, by_page


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
    klaster, klaster_halaman = klaster_sbm(pages)
    for r in data['rows']:
        if r['jenis'] == 'SBM':
            n = int(r['kode_item'].split('.')[0]) if r['kode_item'] else 0
            lampiran = 'II' if r['halaman_pdf'] >= SBM_LAMPIRAN_II_MULAI else 'I'
            r['klaster'] = klaster.get((lampiran, n)) or klaster_halaman(lampiran, r['halaman_pdf']) or 'Lainnya'
    DATA.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')))


if __name__ == '__main__':
    main()
