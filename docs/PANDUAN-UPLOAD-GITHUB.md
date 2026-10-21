# Panduan upload dan validasi

1. **Backup**: GitHub repo lama > Code > Download ZIP. Jangan langsung hapus semua file existing.
2. Buat branch baru `uji-tema-biru-muda` di repository `standarbiaya/SB`.
3. Ekstrak paket ZIP ini pada komputer. Upload seluruh file **dan direktori** melalui GitHub Add file > Upload files (GitHub web upload bisa memiliki batas jumlah file); alternatif lebih aman melalui GitHub Desktop: clone repo, salin isi paket ke lokasi repo, commit ke branch uji, lalu push.
4. Bandingkan file dan konfigurasi `wrangler.jsonc` dengan konfigurasi produksi. Pastikan target Worker dan database benar.
5. Jalankan atau tunggu `npm run build`; untuk pengecekan ketat jalankan `npm run check` dari komputer/CI dengan npm install.
6. Deploy ke environment uji dan validasi login + menu + API. Baru merge ke `main` setelah lulus.

PERINGATAN: Paket adalah implementasi baru berdasarkan file kode dan struktur proyek yang disampaikan. Tidak menjamin kesetaraan seluruh fungsi frontend lama. Jangan unggah secrets atau `.dev.vars`.
