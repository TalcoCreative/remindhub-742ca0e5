# Panduan Deployment

Panduan ini mencakup cara membangun (build) dan men-deploy aplikasi RemindHub.

## Membangun untuk Produksi (Production Build)

Untuk membuat build produksi, jalankan:

```bash
npm run build
```

Perintah ini akan mengompilasi aplikasi Anda ke dalam direktori `dist/`. Hasil output dioptimalkan untuk deployment produksi.

## Pratinjau (Preview) Build

Sebelum men-deploy, Anda dapat melihat pratinjau build produksi secara lokal:

```bash
npm run preview
```

Ini memulai server lokal yang melayani konten dari `dist/`.

## Opsi Deployment

### Vercel (Disarankan)

1.  Hubungkan repositori GitHub Anda ke Vercel.
2.  Vercel akan secara otomatis mendeteksi pengaturan proyek Vite.
3.  Tambahkan variabel environment Supabase Anda di pengaturan proyek Vercel.
4.  Deploy!

### Netlify

1.  Hubungkan repositori GitHub Anda ke Netlify.
2.  Atur perintah build ke `npm run build` dan direktori publish ke `dist`.
3.  Tambahkan variabel environment Supabase Anda di pengaturan situs Netlify.
4.  Deploy!


