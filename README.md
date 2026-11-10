# DLA AC — jual beli AC borongan dan jasa teknisi

Website jual beli AC bekas borongan dan informasi jasa teknisi AC dengan Next.js, React, TypeScript, dan Route Handler Node.js. Foto dan logo tersedia di folder `fotoac/`.

Tema mengikuti logo DLA AC: biru navy `#092E5A`, biru `#0864AD`, biru terang `#57CAFD`, dan putih.

Foto dokumentasi unit ditampilkan di katalog. Jumlah, kondisi, harga, dan ketersediaan dapat dikonfirmasi bersama penjual.

## Menjalankan proyek

Gunakan Node.js 20.9 atau lebih baru:

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000). Untuk build produksi lokal:

```bash
npm run typecheck
npm run build
npm start
```

## Mengatur WhatsApp dan admin

Salin `.env.example` menjadi `.env.local`, lalu isi:

- `WHATSAPP_NUMBER` (opsional): nomor awal WhatsApp Admin 2 (default `6285173209025`) dalam format internasional tanpa `+`. Pada mode MySQL, pengaturan yang disimpan owner digunakan terlebih dahulu. Jika nomor awal tidak valid, pilihan Admin 2 ditampilkan sebagai tidak tersedia.
- `ADMIN_PASSWORD`: kata sandi admin minimal 8 karakter untuk mode JSON lama. Pada mode MySQL, dashboard memakai akun individu dan variabel ini tidak digunakan untuk login.
- `ADMIN_SESSION_SECRET`: kunci acak minimal 32 karakter. Contoh cara membuatnya: `openssl rand -hex 32`.
- `APP_ORIGIN` (opsional): URL publik lengkap, misalnya `https://dlaac.example.com`; isi jika proxy mengubah header host agar pemeriksaan asal permintaan admin tetap sesuai.
- `AC_DATA_DIR` (opsional): direktori data dan foto unggahan yang dapat ditulis; default `./data`.
- `AC_STORAGE` (opsional): `json` secara default, atau `mysql` setelah skema disiapkan dan katalog diimpor. Foto unggahan tetap berada di `AC_DATA_DIR/uploads/`.
- `AC_DB_HOST`, `AC_DB_PORT`, `AC_DB_NAME`, `AC_DB_USER`, `AC_DB_PASSWORD`, dan `AC_DB_SSL`: pengaturan koneksi MySQL/MariaDB untuk migrasi atau saat menggunakan `AC_STORAGE=mysql`. Atur `AC_DB_SSL=true` jika database menyediakan TLS dengan sertifikat tepercaya.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, dan `SMTP_FROM`: pengaturan email hosting untuk mengirim kode pemulihan kata sandi. Isi sesuai informasi SMTP dari cPanel; jangan membagikan password email.

Mulai ulang server setelah mengubah konfigurasi. Dashboard tersedia di `/admin`. Mode JSON memerlukan kata sandi admin dan kunci sesi; mode MySQL memerlukan kunci sesi dan akun yang disiapkan melalui proses inisialisasi di bawah. Jangan membagikan `.env.local`.

Pelanggan dapat memilih Admin Utama (nomor awal `628981213681`) atau Admin 2 sebelum membuka WhatsApp. Pada mode MySQL, owner dapat memperbarui kedua nomor melalui dashboard.

## Migrasi katalog ke MySQL/MariaDB

Penyimpanan JSON tetap digunakan sampai `AC_STORAGE=mysql` dipilih. Sebelum migrasi pada hosting, pastikan versi Node.js dan ketersediaan MySQL/MariaDB, lokasi `AC_DATA_DIR`, akses database, serta ruang penyimpanan foto. Uji seluruh prosedur terlebih dahulu pada database dan salinan data staging yang terpisah.

1. Cadangkan `lots.json` dan seluruh direktori `uploads/` dari `AC_DATA_DIR` ke lokasi privat. Simpan juga salinan versi aplikasi dan konfigurasi yang diperlukan untuk pemulihan; jangan menaruh kredensial atau backup di direktori publik.
2. Siapkan database kosong dan isi variabel `AC_DB_*` pada environment atau `.env.local`. Pastikan `AC_DATA_DIR` menunjuk ke salinan katalog yang ingin diimpor. Pengguna database memerlukan izin membuat tabel saat migrasi.
3. Jalankan perintah berikut dari root aplikasi. Keduanya memuat konfigurasi environment dan aman dijalankan ulang; impor tidak menimpa katalog database yang sudah diinisialisasi. Untuk database MySQL yang sudah digunakan sebelumnya, jalankan `db:migrate` lagi saat memperbarui aplikasi agar tabel riwayat dan perubahan skema tersedia.

   ```bash
   npm run db:migrate
   npm run db:import
   ```

   Jika `lots.json` tidak ada, data contoh diimpor dengan penanda contoh. Jika file berisi `[]`, katalog database tetap kosong. ID, harga/jumlah yang belum diketahui, status, urutan lot dan foto, serta referensi `client:` dan `upload:` dipertahankan. Foto fisik tidak disalin atau dihapus oleh impor.
4. Siapkan akun owner pertama melalui terminal interaktif **sebelum** mengaktifkan mode MySQL. Pastikan `ADMIN_SESSION_SECRET` sudah diisi minimal 32 karakter, lalu jalankan:

   ```bash
   npm run db:init-owner
   ```

   Masukkan nama, username, dan kata sandi saat diminta; kata sandi tidak ditampilkan. Perintah ini tidak membuat owner duplikat saat dijalankan ulang. Di mode MySQL, login menggunakan username dan kata sandi individu; sesi serta kata sandi bersama dari mode JSON tidak berlaku.
5. Periksa jumlah dan rincian lot, termasuk URL foto unggahan. Setelah siap, atur `AC_STORAGE=mysql`, mulai ulang aplikasi, lalu periksa katalog publik, detail, keranjang, dan dashboard. Kegagalan koneksi atau katalog yang belum diimpor tidak otomatis beralih ke JSON.

### Backup dan rollback

Simpan backup database, `lots.json`, `uploads/`, dan versi aplikasi yang saling sesuai di lokasi privat. Jika perlu kembali ke penyimpanan JSON, pertahankan backup database terlebih dahulu, atur `AC_STORAGE=json`, lalu mulai ulang aplikasi. JSON tidak otomatis menerima perubahan yang dibuat setelah beralih ke database; pulihkan atau ekspor data yang diperlukan secara terencana agar perubahan tersebut tidak hilang. Jangan menimpa foto atau file produksi tanpa memverifikasi backup.

### Pengujian database

Tes migrasi akan menghapus dan membuat ulang tabel aplikasi pada database uji. Gunakan **hanya database kosong khusus pengujian** dengan nama yang diawali `dla_ac_test_`; jangan gunakan database produksi. Isi `AC_DB_HOST`, `AC_DB_PORT`, `AC_DB_USER`, dan `AC_DB_PASSWORD` untuk server uji, lalu jalankan:

```bash
AC_TEST_DB_NAME=dla_ac_test_local AC_TEST_DB_RESET=1 npm run test:db
AC_TEST_DB_NAME=dla_ac_test_local AC_TEST_DB_RESET=1 npm run test:auth
AC_TEST_DB_NAME=dla_ac_test_local AC_TEST_DB_RESET=1 npm run test:reset
```

Tanpa kedua variabel uji tersebut, tes integrasi database dilewati. Tes autentikasi memakai hasil build produksi; jalankan `npm run build -- --webpack` terlebih dahulu. Perintah yang sama dapat digunakan untuk memeriksa build yang sesuai dengan cPanel sebelum deployment.

## Akun owner dan admin

Pada mode MySQL, owner yang telah masuk ke `/admin` dapat membuka **Kelola akun admin** untuk membuat akun, mengaktifkan atau menonaktifkannya, mereset kata sandi, dan mengatur izin mengubah harga serta menghapus lot. Sampaikan kata sandi awal kepada admin secara aman. Setiap perubahan akun mengakhiri sesi admin tersebut; admin yang tidak diberi izin harga hanya dapat membuat lot dengan harga belum ditentukan.

Owner maupun admin dapat menggunakan **Ubah kata sandi saya**. Setelah berhasil, seluruh sesi akun tersebut berakhir dan pengguna harus masuk kembali. Mode JSON tetap memakai kata sandi bersama lama sampai migrasi ke MySQL diselesaikan.

### Pemulihan kata sandi melalui email

Fitur ini tersedia untuk akun individu pada mode MySQL. Setelah memperbarui kode, jalankan `npm run db:migrate` untuk menyiapkan tabel baru sebelum me-restart aplikasi. Akun yang sudah ada tetap dapat masuk seperti biasa; setiap admin dan owner perlu menyimpan **Email pemulihan** di menu pengaturan dengan memasukkan kata sandi saat ini. Owner juga dapat mengisi email pemulihan saat membuat atau mengubah akun admin.

Siapkan kotak email pengirim di cPanel dan isi variabel `SMTP_*` pada environment hosting. Gunakan host, username, dan alamat pengirim sesuai penyedia hosting; `SMTP_FROM` berisi alamat email pengirim. Umumnya port `465` menggunakan `SMTP_SECURE=true`, sedangkan port `587` menggunakan `SMTP_SECURE=false` dengan STARTTLS. Sertifikat TLS harus tepercaya. Jangan menaruh password SMTP di repository atau chat.

Jalankan `npm run smtp:check` untuk memeriksa koneksi dan autentikasi SMTP tanpa mengirim email. Setelah itu, uji pengiriman kode ke alamat pemulihan yang sudah didaftarkan.

Pada halaman login, pilih **Lupa kata sandi?**, lalu masukkan username dan email pemulihan yang terdaftar. Jika data cocok, kode OTP dikirim melalui email dan dapat digunakan sekali dalam 10 menit untuk membuat kata sandi baru. Pengiriman ulang dibatasi, dan setelah berhasil seluruh sesi lama akun tersebut berakhir. Kode, password, dan isi email tidak disimpan dalam riwayat aktivitas.

Pada menu **Jasa teknisi dan WhatsApp**, admin dan owner dapat memperbarui keterangan jasa teknisi. Hanya owner yang dapat mengubah nomor Admin Utama dan Admin 2; nomor harus menggunakan format internasional Indonesia yang diawali `62`. Perubahan diterapkan pada beranda, katalog, detail produk, jasa teknisi, dan keranjang saat halaman dimuat kembali. Jika belum ada pengaturan tersimpan, aplikasi memakai nomor awal dan keterangan jasa yang sudah ada.

Menu **Riwayat aktivitas** hanya tersedia untuk owner dan menampilkan hingga 100 aktivitas terbaru: pelaku, waktu, target, serta ringkasan perubahan katalog, akun, jasa, dan kontak. Kata sandi, token, isi chat, dan pesan pelanggan tidak disimpan dalam riwayat. Pada mode MySQL, perubahan dan riwayatnya disimpan dalam transaksi yang sama.

## Persiapan rilis cPanel

Uji terlebih dahulu di staging dengan versi Node.js dan MySQL/MariaDB yang sesuai dengan hosting. Verifikasi backup privat database, `lots.json`, dan foto unggahan sebelum perubahan. Siapkan variabel environment dan database, jalankan migrasi, impor dan inisialisasi owner sesuai urutan di atas, lalu bangun aplikasi dengan `npm run build -- --webpack` dan restart dari **Setup Node.js App**. Setelah restart, periksa login owner/admin, perubahan katalog dan pengaturan, foto, serta kedua pilihan WhatsApp pada URL utama tanpa query. Pastikan cache/proxy tidak menyajikan halaman lama atau menyimpan respons privat.

Jangan menimpa `.env`, `.htaccess`, foto, data, atau symlink `node_modules` milik hosting. Siapkan rollback versi aplikasi, database, dan foto yang saling sesuai; jika kembali ke JSON, ingat bahwa perubahan setelah migrasi tidak otomatis tersalin ke `lots.json`. Penyiapan staging, deployment, dan pengujian hosting perlu dilakukan pada lingkungan tujuan.

## SEO dan Google Search Console

Beranda, katalog, dan detail lot memiliki metadata serta URL kanonis untuk `https://dla-ac.com`. Sitemap `/sitemap.xml` dibuat secara dinamis dari katalog, sedangkan `/robots.txt` menunjuk ke sitemap tersebut. Halaman admin dan keranjang menggunakan `noindex`. Domain kanonis diatur di `lib/seo.ts` jika alamat website berubah.

Setelah pembaruan dirilis, kirim `https://dla-ac.com/sitemap.xml` melalui menu **Sitemaps** di Google Search Console dan gunakan **Inspeksi URL** untuk memeriksa halaman. Pertahankan file verifikasi Google di folder `public/`. Pengindeksan dilakukan oleh Google dan dapat membutuhkan waktu.

Untuk memeriksa metadata dan sitemap dengan data uji terpisah, jalankan build produksi lalu `npm run test:seo`.

## Fitur

- Beranda, galeri foto klien, dan penjelasan cara meminta penawaran.
- Halaman `/tentang` dengan informasi DLA AC, alamat, dan peta Google Maps berdasarkan titik lokasi yang diberikan.
- Informasi jasa teknisi AC dengan tombol WhatsApp untuk menanyakan layanan, jadwal, dan biaya.
- Katalog `/produk` dengan pencarian, filter jenis/merek/status, dan detail per dokumentasi atau lot.
- Keranjang `/keranjang` untuk memilih beberapa dokumentasi atau lot dan mengirim permintaan penawaran melalui WhatsApp. Harga, pengiriman, dan metode pembayaran dikonfirmasi bersama penjual.
- Pesan WhatsApp yang menyertakan kode, perkiraan jumlah, kota tujuan, dan catatan pembeli.
- Dashboard admin untuk menambah, mengubah, menghapus, dan menandai status lot; memilih foto klien atau mengunggah JPEG/PNG/WebP hingga 8 MB. Ringkasan katalog menampilkan jumlah lot per status dan menandai jumlah data contoh. Pada mode MySQL, owner mengelola akun admin dan izin harga/hapus.
- Endpoint Node.js `GET /api/products` untuk data katalog. Mutasi katalog dan upload memerlukan sesi admin.

Secara default, katalog disimpan di `data/lots.json` dan foto unggahan di `data/uploads/`; keduanya tidak dimasukkan ke Git. Sebelum data pertama disimpan, aplikasi menampilkan dokumentasi awal dari `lib/lots.ts` dengan foto dari `fotoac/`. Katalog juga dapat dipindahkan ke MySQL/MariaDB melalui prosedur di atas. Keranjang disimpan di browser pengunjung dan tidak otomatis dikosongkan setelah WhatsApp dibuka.

Penyimpanan lokal dan pembatasan percobaan masuk saat ini ditujukan untuk satu proses Node.js. Untuk deployment yang memakai banyak instance atau filesystem sementara, gunakan database, penyimpanan foto persisten, HTTPS, dan sistem autentikasi/rate limiting yang sesuai. Pembayaran dan pengiriman disepakati melalui WhatsApp.
