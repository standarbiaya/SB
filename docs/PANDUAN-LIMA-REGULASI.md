# Integrasi lima dokumen regulasi

- SBM: PMK 54 Tahun 2026 + KMK 296 Tahun 2026.
- SSB: PMK 79 Tahun 2025.
- SBK: PMK 3 Tahun 2026 + KMK 57 Tahun 2026.

Paket menyediakan tampilan dan penelusuran isi PDF pada menu Regulasi. Dokumen berada di `public/regulasi/` dan akan disalin ke `dist/regulasi/` ketika `npm run build` berhasil.

## Pemasangan aman
1. Buat branch pengujian dan simpan cadangan commit produksi.
2. Unggah isi proyek hasil ekstraksi ZIP, termasuk `public/regulasi/*.pdf`.
3. Pastikan `worker/portal-auth.ts` tetap memuat solusi `safeOrigin()` produksi yang sudah bekerja.
4. Build `npm run build`, deploy `npx wrangler deploy` di Worker yang benar.
5. Login, buka Regulasi, klik kelima tombol Baca PDF, dan coba pencarian isi.
6. Pastikan semua API dan D1 tetap normal sebelum merge.

Semua file dokumen diberikan pengguna; periksa naskah asli dan status regulasi saat pemakaian. Tidak ada impor data besaran baru ke D1 dalam pembaruan ini.
