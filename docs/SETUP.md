# Panduan Setup

Panduan ini akan membantu Anda mengatur proyek RemindHub di mesin lokal Anda.

## Prasyarat

*   **Node.js**: Pastikan Anda sudah menginstal Node.js (disarankan versi 18 atau lebih tinggi).
*   **npm**: Untuk mengelola dependensi.
*   **Git**: Untuk version control.

## Instalasi

1.  **Clone repositori**:
    ```bash
    git clone https://github.com/TalcoCreative/remindhub.git
    cd remindhub
    ```

2.  **Instal dependensi**:
    ```bash
    npm install
    ```

## Pengaturan Environment

Proyek ini menggunakan **Supabase** untuk backend. Anda perlu mengonfigurasi variabel environment Anda untuk terhubung ke proyek Supabase Anda.

Untuk integrasi WhatsApp dengan Qontak, lihat [Panduan Integrasi Qontak](./INTEGRASI_QONTAK.md).

1.  Buat file `.env` di direktori root (berdasarkan `.env.example` jika ada).
2.  Tambahkan variabel berikut:
    ```env
    VITE_SUPABASE_URL=url_proyek_supabase_anda
    VITE_SUPABASE_ANON_KEY=anon_key_supabase_anda
    ```
    > **Catatan**: 
    > *   URL Proyek: `https://oqdixbdanmajbrzqluxk.supabase.co`
    > *   Anda dapat menemukan kredensial ini di pengaturan proyek Supabase Anda di bawah menu **API**.

## Menjalankan Server Pengembangan

Untuk memulai server pengembangan lokal:

```bash
npm run dev
```

Aplikasi sekarang seharusnya berjalan di `http://localhost:8080` (atau port lain jika 8080 sedang digunakan).

## Troubleshooting

*   **Masalah Dependensi**: Jika Anda mengalami error saat instalasi, coba hapus folder `node_modules` dan file `package-lock.json`, lalu jalankan `npm install` lagi.
*   **Koneksi Supabase**: Error autentikasi biasanya berarti variabel `.env` Anda hilang atau salah.

## Pengujian dengan Ngrok

Untuk menguji fitur seperti redirect autentikasi atau webhook di mesin lokal Anda, Anda perlu mengekspos server lokal Anda ke internet menggunakan [ngrok](https://ngrok.com/).

### 1. Prasyarat
*   Buat akun di [ngrok](https://ngrok.com/).
*   Instal ngrok CLI.

### 2. Jalankan Tunnel
2.  Di terminal baru, jalankan ngrok:
    ```bash
    ngrok http --domain=unquailing-homosporous-queen.ngrok-free.dev 8080
    ```
3.  Sekarang aplikasi Anda dapat diakses secara publik melalui URL `unquailing-homosporous-queen.ngrok-free.dev` yang diberikan.
 (contoh: `https://tunnel-id-anda.ngrok-free.app`).

### 3. Konfigurasi Autentikasi Supabase
Agar Supabase Auth berfungsi dengan benar dengan ngrok, Anda harus menambahkan URL ngrok ke daftar izin redirect (allowlist) proyek Anda.

1.  Buka **Dashboard Supabase** Anda.
2.  Navigasi ke **Authentication** > **URL Configuration**.
3.  Di bawah **Redirect URLs**, klik **Add URL**.
4.  Tambahkan URL ngrok Anda (contoh: `https://tunnel-id-anda.ngrok-free.app/**`).
5.  Klik **Save**.

> **Penting**: Jika Anda me-restart ngrok pada paket gratis (free tier), URL Anda akan berubah, dan Anda perlu memperbaruinya di dashboard Supabase.
