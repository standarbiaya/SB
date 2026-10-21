# Indeks terstruktur KMK 296/2026 dan KMK 57/2026

## Isi
- Menu **Indeks KMK**: pencarian baris kandidat di browser, tautan halaman asli PDF.
- `data/KANDIDAT_SBM_SBK_PERLU_VERIFIKASI.csv`: hasil ekstraksi otomatis.
- `data/REVIEW_KMK_296_57.xlsx`: lembar kerja review.
- `data/review_kmk_296_57.sqlite`: basis data lokal untuk pemeriksaan, **bukan** DB produksi.
- `public/data/kandidat-indeks.json`: dataset indeks web, berstatus PERLU_REVIEW.
- `migrations/0002_kmk_review.sql`: tabel D1 terpisah, tidak mengubah katalog D1 yang ada.
- `scripts/export_approved_sql.py`: menghasilkan SQL hanya untuk baris yang diverifikasi dan berstatus DISETUJUI.

## Cakupan dan keterbatasan
Ekstraksi teks PDF bukan pembacaan tabel yang sepenuhnya akurat. Bisa ada deskripsi terpotong, kode tidak terbaca, angka salah terhubung ke baris, pengulangan, dan baris tidak terekstraksi. Semua 5.715 baris kandidat **wajib diperiksa manual** sebelum disahkan. Jangan gunakan angka kandidat sebagai referensi final. Jumlah baris bukan jumlah resmi item dalam lampiran.

## Proses aman
1. Periksa halaman sumber PDF dan cocokkan setiap kandidat (nomenklatur, kelompok, kode, besaran, satuan, wilayah dan lampiran).
2. Isi bagian yang kosong, perbaiki data bila perlu, beri `status_verifikasi=DISETUJUI` serta catatan pengecekan, dan simpan CSV UTF-8.
3. `python scripts/export_approved_sql.py data/REVIEWED.csv data/approved.sql`.
4. Uji migrasi dan SQL hasil review **di database pengujian terlebih dahulu**, bukan produksi.
5. Tabel `kmk_review_candidates` sengaja terpisah dari `items`, `rates`, dan mekanisme publikasi Google Sheets. Tidak ada auto-publish.

## Catatan regulasi
- KMK 296/2026 menyebut besaran SBM digunakan untuk TA 2027.
- KMK 57/2026 menyebut indeks SBK digunakan untuk penyusunan RKA-K/L mulai tahun 2026.
