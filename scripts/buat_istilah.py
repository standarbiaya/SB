"""Menyusun daftar istilah Kamus Biaya (public/data/istilah.json) dari teks peraturan.

Sumber teks: public/regulasi/indeks-kmk.json (hasil ekstraksi PDF).
- SBM: PMK 54/2026 (Pasal 1-2 dan definisi tiap jenis SBM di Lampiran I-II) + istilah
  pilihan dari bagian penjelasan KMK 296/2026.
- SSB: PMK 79/2025 (Pasal 1, 3, dan 6).
- SBK: PMK 3/2026 (Pasal 1-2, 4 dan Penjelasan SBK Umum) + KMK 57/2026 (diktum KEDUA).

Jalankan ulang setelah indeks teks diperbarui:  python3 scripts/buat_istilah.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEXT = ROOT / 'public/regulasi/indeks-kmk.json'
OUT = ROOT / 'public/data/istilah.json'
PDF = {'pmk54': '/regulasi/pmk-54-2026.pdf', 'kmk296': '/regulasi/kmk-296-2026.pdf', 'pmk79': '/regulasi/pmk-79-2025.pdf',
       'pmk3': '/regulasi/pmk-3-2026.pdf', 'kmk57': '/regulasi/kmk-57-2026.pdf'}
SIGNATURE = re.compile(r'MENTERI KEUANGAN REPUBLIK INDONESIA, (Ditandatangani secara elektronik |ttd\. )?PURBAYA YUDHI SADEWA')


def norm(text):
    return re.sub(r'\s+', ' ', text).strip()


def load_pages():
    pages = {}
    for p in json.loads(TEXT.read_text())['pages']:
        # buang nomor halaman di awal teks ("- 5 -" atau "5")
        pages.setdefault(p['doc'], {})[p['page']] = re.sub(r'^-?\s*\d+\s*-?\s+', '', norm(p['text']))
    return pages


def joined(pages, doc, first=1, last=999):
    return ' '.join(t for pg, t in sorted(pages[doc].items()) if first <= pg <= last)


def page_of(pages, doc, needle, first=1):
    key = norm(needle)[:40]
    for pg, t in sorted(pages[doc].items()):
        if pg >= first and key in t:
            return pg
    return None


def entry(jenis, kelompok, istilah, definisi, doc, sumber, page):
    definisi = norm(definisi)
    if definisi.endswith(':'):  # kalimat pengantar daftar rincian; daftar lengkap ada di PDF
        definisi = definisi.rsplit('. ', 1)[0].rstrip('.') + '.'
    definisi = definisi[:1].upper() + definisi[1:]
    istilah = norm(istilah)
    istilah = istilah[:1].upper() + istilah[1:]
    return {'jenis': jenis, 'kelompok': kelompok, 'istilah': istilah, 'definisi': definisi,
            'sumber': sumber, 'url': PDF[doc] + (f'#page={page}' if page else '')}


def pasal(text, start, end):
    """Kalimat dari `start` sampai sebelum `end` (keduanya teks literal)."""
    i = text.index(start)
    j = text.index(end, i + len(start)) if end else len(text)
    return text[i:j].strip()


def sbm_pmk54(pages):
    t = SIGNATURE.sub('', joined(pages, 'pmk54', 5))
    t = re.sub(r'(LAMPIRAN I+) PERATURAN MENTERI KEUANGAN.*?STANDAR BIAYA MASUKAN STANDAR BIAYA MASUKAN YANG BERSIFAT [A-Z ]+? (?=[A-Z]\. SATUAN)', r' @@\1@@ ', t)
    parts = re.split(r'(@@[^@]+@@|(?<![\w.])[A-H]\. SATUAN BIAYA [A-Z /]+?(?= \d+\. )|(?<![\d.,/])\d{1,2}\. (?=[A-Z]))', t)
    lampiran = kelompok = None
    items, current = [], None
    for part in parts:
        if not part or not part.strip():
            continue
        if part.startswith('@@'):
            lampiran = part.strip('@ ').replace('LAMPIRAN ', '')
        elif (m := re.match(r'[A-H]\. SATUAN BIAYA (.+)', part)):
            kelompok = m.group(1).strip().title().replace(' Dan ', ' dan ')
        elif re.fullmatch(r'\d{1,2}\. ', part):
            current = {'no': int(part.split('.')[0]), 'lampiran': lampiran, 'kelompok': kelompok, 'text': ''}
            items.append(current)
        elif current:
            current['text'] += part
    out = []
    for it in items:
        s = it['text'].strip()
        # definisi dimulai saat kata kategori diikuti kata berhuruf kecil ("Honorarium yang ...")
        m = re.search(r' (?=(Honorarium|Satuan [Bb]iaya|Uang [a-z]+|Biaya|Bantuan|Tarif|Dana) '
                      r'(yang|diberikan|berupa|untuk|merupakan|dana|adalah|sebagai|kebutuhan|bantuan)\b)', s)
        if not m:
            raise ValueError(f'Definisi tidak terpisah: {s[:80]}')
        istilah = s[:m.start()]
        definisi = re.sub(r'\s*(_{3,}|Salinan sesuai|MENTERI KEUANGAN).*$', '', s[m.start():])
        sifat = 'batas tertinggi' if it['lampiran'] == 'I' else 'dapat dilampaui'
        out.append(entry('SBM', it['kelompok'], istilah, definisi, 'pmk54',
                         f"PMK 54/2026 Lampiran {it['lampiran']} angka {it['no']} ({sifat})",
                         page_of(pages, 'pmk54', istilah, 5)))
    if len(out) != 58:
        raise ValueError(f'PMK 54/2026 seharusnya memuat 58 jenis SBM, terbaca {len(out)}')
    return out


def sbm_umum(pages):
    t = joined(pages, 'pmk54', 1, 4)
    return [
        entry('SBM', 'Ketentuan Umum', 'Standar Biaya Masukan (SBM)',
              pasal(t, 'Standar Biaya Masukan yang selanjutnya', ' Pasal 2'), 'pmk54', 'PMK 54/2026 Pasal 1', 2),
        entry('SBM', 'Ketentuan Umum', 'Batas Tertinggi',
              'Sifat penggunaan SBM berupa besaran biaya yang tidak dapat dilampaui. SBM yang bersifat batas tertinggi tercantum dalam Lampiran I.',
              'pmk54', 'PMK 54/2026 Pasal 2 ayat (3) dan Pasal 3 ayat (1)', 2),
        entry('SBM', 'Ketentuan Umum', 'Dapat Dilampaui',
              'Sifat penggunaan SBM yang dapat dilampaui dalam pelaksanaan anggaran dengan mempertimbangkan: a. harga pasar; dan b. prinsip ekonomis, efisien, dan efektif. SBM yang bersifat dapat dilampaui tercantum dalam Lampiran II.',
              'pmk54', 'PMK 54/2026 Pasal 2 ayat (4) dan Pasal 3 ayat (2)', 2),
    ]


# Istilah pilihan dari bagian penjelasan KMK 296/2026: (halaman, kelompok, istilah, kalimat dalam teks).
KMK296_TERMS = [
    (52, 'Honorarium', 'Unit Kerja Pengadaan Barang/Jasa (UKPBJ)', 'Yang dimaksud dengan UKPBJ adalah unit yang struktur organisasinya dilekatkan pada unit organisasi yang sudah ada.'),
    (53, 'Honorarium', 'Satuan Jam Honorarium Narasumber', 'Satuan jam yang digunakan dalam pemberian honorarium narasumber adalah 60 (enam puluh) menit baik dilakukan secara panel maupun individual'),
    (56, 'Honorarium', 'Sekretariat Tim Pelaksana Kegiatan', 'Sekretariat tim pelaksana kegiatan merupakan bagian tidak terpisahkan dari tim pelaksana kegiatan.'),
    (57, 'Honorarium', 'Unsur Sekretariat', 'Unsur sekretariat adalah pembantu umum, pelaksana dan yang sejenis, dan tidak berupa struktur organisasi tersendiri.'),
    (59, 'Honorarium', 'Honorarium Pelaksana Ujian Tingkat Nasional', 'Honorarium Pelaksana Ujian Tingkat Nasional adalah honorarium yang diberikan kepada petugas pelaksana ujian tingkat nasional'),
    (59, 'Honorarium', 'Koordinator (Ujian Tingkat Nasional)', 'Koordinator adalah petugas yang berperan sebagai ketua pelaksana ujian tingkat nasional yang mengambil keputusan dalam satu kali kegiatan ujian tingkat nasional.'),
    (59, 'Honorarium', 'Petugas Utama (Ujian Tingkat Nasional)', 'Petugas Utama adalah petugas yang berperan sebagai pengawas ujian atau petugas bidang Teknologi Informasi pada ujian berbasis komputer.'),
    (59, 'Honorarium', 'Petugas Pendukung (Ujian Tingkat Nasional)', 'Petugas Pendukung adalah petugas yang berperan sebagai pendukung kegiatan yaitu petugas kesehatan dan petugas teknis administrasi.'),
    (60, 'Honorarium', 'Jam Pelajaran Diklat', 'Jam pelajaran yang digunakan untuk kegiatan penyelenggaraan diklat adalah 45 (empat puluh lima) menit.'),
    (60, 'Fasilitas', 'Uang Lembur', 'Uang lembur merupakan kompensasi bagi Pegawai ASN yang melakukan kerja lembur berdasarkan surat perintah dari pejabat yang berwenang.'),
    (66, 'Barang dan Jasa', 'Rapat Koordinasi Tingkat Menteri/Wakil Menteri/Eselon I/Setara', 'Rapat koordinasi tingkat menteri/wakil menteri/eselon I/setara adalah rapat koordinasi yang pesertanya menteri/wakil menteri/eselon I/pejabat yang setara.'),
    (121, 'Barang dan Jasa', 'Kendaraan Operasional dalam Lingkungan Kantor', 'Yang dimaksud kendaraan operasional dalam lingkungan kantor adalah kendaraan yang digunakan hanya dalam lingkungan kantor.'),
    (123, 'Barang dan Jasa', 'Gedung Pertemuan', 'Gedung pertemuan adalah gedung yang biasa digunakan untuk pertemuan dengan kapasitas'),
    (123, 'Barang dan Jasa', 'Petugas Menara Suar (PMS)', 'PMS adalah petugas yang menjaga dan merawat menara suar agar dapat berfungsi dengan baik.'),
]


def sbm_kmk296(pages):
    out = []
    for pg, kelompok, istilah, kalimat in KMK296_TERMS:
        text = pages['kmk296'][pg] + (' ' + pages['kmk296'].get(pg + 1, ''))
        i = text.find(kalimat)
        if i < 0:
            raise ValueError(f'KMK 296/2026 hlm {pg}: kalimat tidak ditemukan: {kalimat[:50]}')
        # lengkapi kalimat yang terpotong sampai titik/titik koma berikutnya
        end = re.search(r'[.;]( |$)', text[i + len(kalimat) - 1:])
        definisi = text[i:i + len(kalimat) - 1 + end.start() + 1] if end else kalimat
        definisi = re.sub(r';$', '.', definisi)
        lampiran = 'II' if pg >= 119 else 'I'
        out.append(entry('SBM', kelompok, istilah, definisi, 'kmk296',
                         f'KMK 296/2026 Penjelasan Lampiran {lampiran}', pg))
    return out


def ssb_pmk79(pages):
    t = joined(pages, 'pmk79')
    defs = pasal(t, 'Pasal 1 Dalam Peraturan Menteri ini yang dimaksud dengan:', ' Pasal 2 ')
    out = []
    for no, text in re.findall(r'(?<![\d.])(\d{1,2})\. (.+?)(?= \d{1,2}\. [A-Z]|$)', defs.split(':', 1)[1]):
        m = re.match(r'(.+?) (?:yang selanjutnya (?:disingkat|disebut) (.+?) )?adalah (.+)', text)
        istilah = m.group(1) + (f' ({m.group(2)})' if m.group(2) else '')
        out.append(entry('SSB', 'Ketentuan Umum', istilah, m.group(3), 'pmk79', f'PMK 79/2025 Pasal 1 angka {no}', 2))
    if len(out) != 10:
        raise ValueError(f'PMK 79/2025 Pasal 1 seharusnya 10 istilah, terbaca {len(out)}')
    out += [
        entry('SSB', 'Klasifikasi Biaya', 'Biaya Utama', pasal(t, 'Biaya utama sebagaimana', ' (3)').split(', merupakan ')[-1].capitalize()
              + ' Terdiri atas komponen 001, 002, 003, 004, 005, dan komponen lain sepanjang substansinya berpengaruh secara langsung terhadap Keluaran.',
              'pmk79', 'PMK 79/2025 Pasal 3 ayat (2) dan Pasal 5 ayat (4)', 2),
        entry('SSB', 'Klasifikasi Biaya', 'Biaya Pendukung', pasal(t, 'Biaya pendukung sebagaimana', ' (4)').split(', merupakan ')[-1].capitalize()
              + ' Antara lain komponen yang memuat honorarium tim kegiatan, biaya konsumsi rapat dalam kantor, biaya kegiatan seremonial, biaya percetakan, pengadaan souvenir, dan/atau pengadaan ATK untuk kegiatan.',
              'pmk79', 'PMK 79/2025 Pasal 3 ayat (3) dan Pasal 5 ayat (5)', 2),
    ]
    batas = pasal(t, '(2) Besaran biaya pendukung sebagaimana dimaksud pada ayat (1) berupa:', ' (3) Grup KRO')
    for name, persen in re.findall(r'[a-f]\. (.+?) sebesar (\d+% \([a-z ]+\))', batas):
        out.append(entry('SSB', 'Batas Biaya Pendukung per Grup KRO', 'Grup KRO ' + name[0].upper() + name[1:],
                         f'Besaran biaya pendukung paling tinggi {persen} terhadap total biaya RO, bersifat batas tertinggi baik dalam perencanaan maupun pelaksanaan anggaran.',
                         'pmk79', 'PMK 79/2025 Pasal 6 ayat (2) dan Pasal 7 ayat (1)', 3))
    return out


def sbk(pages):
    t = joined(pages, 'pmk3', 1, 4)
    out = [
        entry('SBK', 'Ketentuan Umum', 'Standar Biaya Keluaran (SBK)', pasal(t, 'Standar Biaya Keluaran yang selanjutnya', ' Pasal 2'), 'pmk3', 'PMK 3/2026 Pasal 1', 2),
        entry('SBK', 'Ketentuan Umum', 'SBK Umum', 'SBK yang berlaku untuk lebih dari 1 (satu) atau seluruh kementerian negara/lembaga. Tercantum dalam Lampiran I.', 'pmk3', 'PMK 3/2026 Pasal 2 ayat (2) dan Pasal 3 ayat (1)', 2),
        entry('SBK', 'Ketentuan Umum', 'SBK Khusus', 'SBK yang berlaku untuk 1 (satu) kementerian negara/lembaga. Tercantum dalam Lampiran II.', 'pmk3', 'PMK 3/2026 Pasal 2 ayat (3) dan Pasal 3 ayat (2)', 2),
        entry('SBK', 'Ketentuan Umum', 'Sifat Batas Tertinggi SBK', pasal(t, 'Penggunaan SBK umum dan SBK khusus bersifat', ' (3)'), 'pmk3', 'PMK 3/2026 Pasal 4 ayat (2)', 3),
        entry('SBK', 'Ketentuan Umum', 'Rincian Indeks SBK', 'Rincian indeks standar biaya keluaran terdiri atas rincian indeks SBK umum (Lampiran I) dan rincian indeks SBK khusus (Lampiran II), digunakan untuk penyusunan Rencana Kerja dan Anggaran kementerian negara/lembaga mulai tahun 2026.', 'kmk57', 'KMK 57/2026 diktum KEDUA dan KETIGA', 2),
    ]
    p = joined(pages, 'pmk3', 9, 20)
    umum = pasal(p, 'A. Ketentuan Umum SBK Umum (SBKU)', ' 6. Penuangan Volume')
    for no, text in re.findall(r'(?<![\d.])(\d)\. (.+?)(?= \d\. [A-Z]|$)', umum):
        m = re.match(r'(.+?) (?:adalah|merupakan) (.+)', text)
        if m and no != '3':
            out.append(entry('SBK', 'Ketentuan Umum SBK Umum', m.group(1), m.group(2), 'pmk3', f'PMK 3/2026 Penjelasan SBK Umum huruf A angka {no}', 9))
    bagian = p[p.index('B. Standar Biaya Keluaran Umum'):]
    for no, name, rest in re.findall(r'(?<![\w.])(\d{1,2})\. (SBK [^.]+?) (SBK [^.].+?)(?= \d{1,2}\. SBK |$)', bagian):
        definisi = re.split(r' (?:Penggunaan SBK ini|a\. SBK |[a-z]\. Layanan )', rest)[0]
        definisi = re.split(r'(?<=\.) (?=[A-Z])', definisi)[0] if len(definisi) > 700 else definisi
        out.append(entry('SBK', 'SBK Umum', name, definisi, 'pmk3', f'PMK 3/2026 Penjelasan SBK Umum huruf B angka {no}',
                         page_of(pages, 'pmk3', f'{no}. {name}', 9)))
    return out


def main():
    pages = load_pages()
    data = sbm_umum(pages) + sbm_pmk54(pages) + sbm_kmk296(pages) + ssb_pmk79(pages) + sbk(pages)
    OUT.write_text(json.dumps({'catatan': 'Disalin dari teks peraturan; periksa PDF untuk rumusan resmi.', 'istilah': data},
                              ensure_ascii=False, indent=0))
    counts = {}
    for d in data:
        counts[d['jenis']] = counts.get(d['jenis'], 0) + 1
    print(len(data), counts)


if __name__ == '__main__':
    main()
