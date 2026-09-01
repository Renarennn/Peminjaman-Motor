# Motor Desk · Astra Motor Jakarta

Web responsif untuk pengajuan peminjaman motor dengan login asli, database Supabase, dua tahap persetujuan, panel Admin Pengelola, dan notifikasi email.

## Alur aplikasi

1. Peminjam mendaftar dan login.
2. Peminjam memilih motor berstatus **Tersedia**, lalu mengisi Nama, Email, Dept, Tujuan, Tanggal, dan Nopol.
3. **Harifah** memutuskan persetujuan tahap 1.
4. Jika Harifah menyetujui, pengajuan masuk ke antrean **Ray** untuk tahap 2.
5. Jika salah satu menolak, status akhir menjadi **Ditolak** dan motor kembali tersedia.
6. Jika keduanya menyetujui, status akhir menjadi **Disetujui** dan motor menjadi dipinjam.
7. Notifikasi pengajuan dan keputusan akhir dikirim ke **email dan notifikasi penyetuju**.

Admin Pengelola tidak ikut menyetujui. Admin hanya mengatur peran akun serta memperbaiki status dan nama peminjam pada data motor.

## Peran dan hak akses

| Peran | Hak akses |
| --- | --- |
| Peminjam | Melihat armada, mengajukan peminjaman, melihat status pengajuan sendiri |
| Harifah | Login khusus dan persetujuan tahap 1 |
| Ray | Login khusus dan persetujuan tahap 2 setelah Harifah menyetujui |
| Admin Pengelola | Mengatur peran pengguna serta memperbaiki data motor; tidak dapat menyetujui |

Setiap peran staf—Harifah, Ray, dan Admin—dibatasi untuk satu akun. Peminjam dapat mendaftar sendiri dan otomatis mendapat peran `borrower`.

## Isi proyek

```text
motor-desk-github/
├── index.html
├── styles.css
├── app.js
├── config.js
├── logo-peminjaman-motor.png
├── .nojekyll
├── .gitignore
├── README.md
└── supabase/
    ├── schema.sql
    └── functions/
        └── send-notification/
            └── index.ts
```

`logo-peminjaman-motor.png` digunakan sebagai logo pada layar masuk, header aplikasi, favicon browser, dan ikon saat web disimpan ke layar utama perangkat.

## 1. Buat proyek Supabase

1. Buka [Supabase](https://supabase.com/) dan buat proyek baru.
2. Masuk ke **SQL Editor**.
3. Salin seluruh isi `supabase/schema.sql`, lalu klik **Run**.

`schema.sql` membuat tabel, 33 data motor, trigger status otomatis, fungsi admin, dan Row Level Security. Data awal mengikuti spreadsheet motor yang diberikan: 2 motor tersedia dan 31 motor dipinjam.

## 2. Hubungkan frontend

Di Supabase buka **Project Settings → API**, lalu salin:

- Project URL
- `anon` / public key

Masukkan keduanya ke `config.js`:

```js
window.MOTOR_DESK_CONFIG = Object.freeze({
  supabaseUrl: "NEXT_PUBLIC_SUPABASE_URL=https://scvpascdvmkthfncgdpg.supabase.co",
  supabaseAnonKey: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_a0jAOI1ucR5DSTf4L2YBPg_30mDDdcs",
  notificationEmail: "penyetuju",
  staffEmails: Object.freeze({
    admin: "Ftrwhyni15@gmail.com",
    ray: "ftrmtch@gmail.com",
    harifah: "fitriwahyuni336@gmail.com"
  })
});
```

`anon` key memang boleh dipakai pada frontend. Keamanan data tetap dijaga oleh RLS dari `schema.sql`. Jangan pernah menaruh `service_role` key atau Resend API key di `config.js` maupun GitHub.

## 3. Daftarkan semua akun dari awal

Buka web dan pilih **Daftar Akun**. Form pendaftaran menyediakan dua jenis akun:

- **Karyawan / Pengaju** untuk pengguna yang akan mengajukan motor;
- **Penyetuju** yang hanya memiliki pilihan Harifah dan Ray.

Daftarkan akun awal berikut:

| Akun | Email awal | Pilihan saat daftar | Peran otomatis |
| --- | --- | --- | --- |
| Admin Pengelola | `Ftrwhyni15@gmail.com` | Karyawan | Admin Pengelola |
| Harifah | `fitriwahyuni336@gmail.com` | Penyetuju → Harifah | Penyetuju tahap 1 |
| Ray | `ftrmtch@gmail.com` | Penyetuju → Ray | Penyetuju tahap 2 |

Database tidak mempercayai pilihan frontend untuk memberikan hak staf. Trigger di `schema.sql` hanya memberikan peran awal jika email sama dengan daftar di atas. Email lain selalu menjadi `borrower`, sehingga jumlah penyetuju tetap hanya dua orang.

Pertahankan konfirmasi email Supabase agar seseorang harus membuktikan kepemilikan email sebelum login. Atur URL web pada **Authentication → URL Configuration → Site URL** dan tambahkan URL GitHub Pages pada **Redirect URLs**.

### Jika email staf berubah

1. Daftarkan email baru sebagai **Karyawan / Pengaju**.
2. Login dengan Admin lama.
3. Buka **Pengaturan Admin** dan pindahkan peran Harifah, Ray, atau Admin ke akun baru.
4. Untuk Harifah atau Ray, perbarui juga `staffEmails` di `config.js` agar validasi pilihan Penyetuju saat pendaftaran berikutnya memakai email terbaru.

Saat peran staf dipindahkan, pemilik lama otomatis kembali menjadi Karyawan/Pengaju. Untuk memindahkan Admin, pilih peran Admin pada akun baru; sistem otomatis mempertahankan hanya satu Admin.

## 4. Aktifkan email ke Ftrwhyni15@gmail.com

Fungsi email berjalan di server melalui Supabase Edge Functions dan Resend.

1. Buat akun di [Resend](https://resend.com/) dan siapkan API key.
2. Instal Supabase CLI, login, lalu hubungkan folder proyek ke project Supabase.
3. Dari root proyek jalankan:

```bash
supabase functions deploy send-notification
```

4. Simpan secret server:

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxx
supabase secrets set NOTIFICATION_TO_EMAIL=Ftrwhyni15@gmail.com
supabase secrets set NOTIFICATION_FROM_EMAIL="Motor Desk <notification@domain-anda.com>"
```

Alamat pengirim harus menggunakan domain yang sudah diverifikasi di Resend. Untuk pengujian awal, pengirim bawaan Resend dapat digunakan sesuai batasan akun Resend Anda.

Email dikirim saat:

- pengajuan baru dibuat;
- Harifah atau Ray menolak sehingga status akhir **Ditolak**;
- Harifah dan Ray menyetujui sehingga status akhir **Disetujui**.

Log keberhasilan atau kegagalan tersimpan di tabel `notifications`, dan kombinasi pengajuan + jenis notifikasi dibuat unik untuk mengurangi email ganda.

## 5. Upload ke GitHub Pages

1. Buat repository GitHub baru.
2. Upload **seluruh isi folder proyek ini**, termasuk folder `supabase` dan file `.nojekyll`.
3. Buka **Settings → Pages**.
4. Pada **Build and deployment**, pilih **Deploy from a branch**.
5. Pilih branch `main`, folder `/ (root)`, lalu **Save**.
6. Tunggu GitHub memberikan URL, misalnya `https://username.github.io/motor-desk/`.

Tidak diperlukan proses build. `index.html` langsung berjalan sebagai web statis, sedangkan login, database, persetujuan, dan email ditangani Supabase.

## Pengujian yang disarankan

1. Login sebagai peminjam dan ajukan salah satu motor tersedia.
2. Pastikan motor berubah menjadi **Diajukan**.
3. Login sebagai Ray: pengajuan belum boleh tampil.
4. Login sebagai Harifah dan setujui tahap 1.
5. Login sebagai Ray: pengajuan sekarang tampil untuk tahap 2.
6. Setujui sebagai Ray dan pastikan status akhir **Disetujui** serta motor menjadi **Dipinjam**.
7. Ulangi dengan motor lain dan tolak di salah satu tahap; motor harus kembali **Tersedia**.
8. Periksa email `Ftrwhyni15@gmail.com` dan tabel `notifications`.

## Catatan keamanan

- Password dikelola oleh Supabase Auth dan tidak disimpan di kode frontend.
- Semua tabel menggunakan Row Level Security.
- Peminjam hanya dapat melihat pengajuannya sendiri.
- Harifah dan Ray hanya dapat memutuskan tahap masing-masing.
- Ray diblokir di tingkat database jika Harifah belum menyetujui.
- Admin tidak mempunyai izin menulis ke tabel persetujuan.
- Secret email dan `service_role` hanya disimpan di Supabase.
