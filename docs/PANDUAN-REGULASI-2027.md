# Pembaruan regulasi TA 2027

Paket ini mempertahankan Cloudflare Worker, login satu akun, database D1, dan alur Google Sheets dari paket tema biru muda sebelumnya.

## Penambahan
- Menu **Regulasi** memuat 5 referensi hukum yang dikelompokkan sebagai SBM 2027, SSB, dan SBK 2027.
- Sumber PMK: JDIH Kementerian Keuangan.
- KMK 296/2026: judul dari referensi UIN Malang, naskah utama perlu diverifikasi.
- KMK 57/2026: sumber dan keterkaitan dengan SBK 2027 BELUM terverifikasi; label disajikan sebagai kandidat, bukan dasar hukum final.
- Link yang tidak valid tidak dipublikasikan sebagai sumber resmi.

## Sinkronisasi Google Sheets
Menu baru memuat referensi terkurasi pada frontend supaya langsung terlihat meskipun database belum disinkronkan. Ini **tidak** menulis atau memodifikasi data D1. Untuk menjadi entri database yang dapat dicari melalui API, pengelola harus melengkapi sheet `REGULASI` dari dokumen resmi, menggunakan seluruh kolom wajib (termasuk tanggal_berlaku, status, status_publikasi `approved_public`) dan sinkronisasi terotorisasi. Jangan masukkan KMK yang belum lolos verifikasi ke data publikasi.

## Cara upload
1. Backup branch `main` dan buat branch `uji-regulasi-2027`.
2. Unggah seluruh isi ZIP (jangan sertakan folder induk) dan periksa diff.
3. Jalankan `npm run build`; deploy uji via Cloudflare.
4. Uji: login, logout, `/regulasi` via menu, serta `/api/regulations`, sinkronisasi Google Sheets, dan dashboard.
5. Sesudah pengujian, gabungkan branch ke `main`.

## Keamanan
Perubahan terkait Origin dibuat mengikuti kondisi browser teramati (`Origin: null`, `Sec-Fetch-Site: same-origin`). Verifikasi tambahan / CSRF token dan rate limiting disarankan untuk produksi. Pastikan tidak menimpa fungsi login yang telah diperbaiki di versi produksi jika berbeda.
