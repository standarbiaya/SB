# Pembaruan dari dua PDF KMK yang diunggah pengelola

## Identifikasi sumber
- `public/regulasi/kmk-296-2026.pdf`: 126 halaman, KMK 296 Tahun 2026 tentang **Rincian Besaran Standar Biaya Masukan**, ditetapkan 25 September 2026. Diktum KETIGA/KEEMPAT: digunakan untuk RKA-K/L TA 2027 dan berlaku pada TA 2027. Lampiran I batas tertinggi dan penjelasan; Lampiran II dapat dilampaui dan penjelasan.
- `public/regulasi/kmk-57-2026.pdf`: 177 halaman, KMK 57 Tahun 2026 tentang **Rincian Indeks Standar Biaya Keluaran dalam Penganggaran Kementerian Negara/Lembaga**, ditetapkan 24 Februari 2026. Diktum KETIGA: digunakan untuk penyusunan RKA-K/L **mulai tahun 2026** (jangan ubah menjadi khusus TA 2027). Lampiran I SBK umum, Lampiran II SBK khusus.

## Implementasi
- Menu Regulasi memuat kedua dokumen dengan tautan PDF lokal.
- Pencarian full-text merujuk dokumen sumber per halaman PDF. `public/regulasi/indeks-kmk.json` dihasilkan dari teks PDF; hasil perlu diperiksa terhadap halaman asli, karena teks tabel PDF dapat kehilangan struktur kolom.
- `templates/CONTOH_INDEKS_KMK_PERLU_REVIEW.csv` adalah contoh 9 baris yang dibaca dari halaman sumber; **BUKAN** dataset lengkap atau impor D1 otomatis.
- File PDF dan indeks berada dalam **Static Assets yang wajib melalui autentikasi Cloudflare Worker** sesuai `run_worker_first: true`, untuk menjaga pola akses satu akun.
- Google Sheets, D1, login dan fungsi sinkronisasi tidak dimodifikasi oleh pembaruan ini.
- Sebelum produksi: backup GitHub, buat branch uji, `npm run check && npm run build`, tes login/logout; cek halaman PDF, pencarian, dan data API.

## Risiko
Data referensi di frontend dan indeks PDF bukan pengganti validasi angka dalam lampiran asli. Jangan mengimpor massal sebagai `BESARAN_BIAYA` sebelum mapping item/kode, satuan, wilayah, tahun, dan ketentuan diperiksa manual.
