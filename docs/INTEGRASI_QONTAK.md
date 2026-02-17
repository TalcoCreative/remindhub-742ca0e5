# Panduan Integrasi Qontak Omnichannel

Dokumen ini menjelaskan cara menghubungkan dan mengonfigurasi Mekari Qontak dengan aplikasi RemindHub.

**Update Terkini (Direct Proxy Mode):**
Aplikasi kini menggunakan metode **Direct Proxy** untuk menampilkan Inbox. Artinya, data chat dan pesan diambil **langsung** dari API Qontak secara real-time melalui Edge Functions, tanpa melalui sinkronisasi database lokal yang rentan delay. Ini memastikan Inbox RemindHub selalu 100% akurat dengan aplikasi Qontak/WhatsApp asli.

## Prasyarat

Sebelum memulai, pastikan Anda memiliki:

1.  **Akun Mekari Qontak**: Akses ke dashboard Qontak Omnichannel.
2.  **Akses Admin**: Anda memerlukan role Admin di RemindHub untuk mengakses halaman Settings.
3.  **Supabase CLI**: Untuk men-deploy Edge Functions.

## Konfigurasi Kredensial

Agar RemindHub dapat berkomunikasi dengan API Qontak (untuk melihat dan mengirim pesan), Anda perlu menyimpan token akses.

1.  Masuk ke **Dashboard Qontak**.
2.  Pergi ke menu **Settings** > **API**.
3.  Salin **Access Token**.
4.  Buka aplikasi RemindHub > **Settings** > **Qontak Credentials**.
5.  Paste token Anda dan klik **Save Credentials**.
6.  (Opsional) Klik **Test Connection** untuk memverifikasi.

> **Penting (Mekari API Update)**:
> Qontak kini menggunakan endpoint `api.mekari.com`. Fitur "Login Otomatis" di Settings mungkin tidak berfungsi untuk semua akun tergantung tipe lisensi.
> **Sangat Disarankan** untuk membuat token secara manual dari Dashboard Qontak:
> `Settings` > `Integration` > `API Token` > `Generate`.

### Cara Mendapatkan Client ID dan Client Secret

Jika Anda ingin menggunakan fitur **Login Otomatis** (Generate Token) di halaman Settings, Anda memerlukan Client ID dan Client Secret.

1.  Buka **[Mekari Developer Center](https://developers.mekari.com/)** dan Login.
2.  Masuk ke Dashboard dan klik **Create Application**.
3.  Isi data aplikasi:
    *   **Name**: RemindHub (atau nama lain)
    *   **Scopes**: ✅ Centang **`qontak-chat:all`** (Wajib agar history chat bisa dibaca).
4.  Setelah dibuat, Anda akan melihat **Client ID** dan **Client Secret**.
5.  Salin kedua nilai tersebut ke RemindHub > Settings.

## Arsitektur Integrasi (Direct Proxy)

Integrasi ini dibangun menggunakan Supabase Edge Functions sebagai "jembatan" (proxy) aman antara Frontend dan API Qontak:

1.  **Melihat Daftar Chat (`get-chats`)**:
    *   Frontend memanggil `get-chats`.
    *   Fungsi ini meneruskan request ke API Qontak `/api/open/v1/rooms`.
    *   Data dikembalikan langsung ke UI.

2.  **Melihat Pesan (`get-messages`)**:
    *   Saat chat dibuka, Frontend memanggil `get-messages`.
    *   Fungsi ini mengambil riwayat pesan dari API Qontak `/api/open/v1/rooms/{id}/messages`.

3.  **Mengirim Pesan (`send-message`)**:
    *   Frontend mengirim teks ke fungsi `send-message`.
    *   Fungsi meneruskan ke API Qontak.
    *   Pesan langsung terkirim ke pelanggan (WhatsApp/IG/dll).

*Catatan: Webhook Qontak masih dapat dikonfigurasi untuk keperluan logging atau trigger otomatisasi lain di masa depan, namun **tidak lagi wajib** agar Inbox berfungsi.*

## Deployment Edge Functions

Jika Anda melakukan perubahan kode, deploy fungsi menggunakan Supabase CLI:

```bash
# Login
npx supabase login

# Link Project (ganti dengan Project ID Anda)
npx supabase link --project-ref oqdixbdanmajbrzqluxk

# Deploy fungsi-fungsi Proxy (Wajib)
npx supabase functions deploy get-chats --no-verify-jwt
npx supabase functions deploy get-messages --no-verify-jwt
npx supabase functions deploy send-message --no-verify-jwt

# Deploy webhook (Opsional)
npx supabase functions deploy whatsapp-webhook --no-verify-jwt
```

## Panduan Pengujian Manual

Berikut cara memverifikasi integrasi berjalan dengan baik:

### 1. Verifikasi Inbox Real-time
1.  Buka aplikasi RemindHub > Halaman **Omnichannel Inbox**.
2.  Anda akan melihat daftar chat yang **sama persis** dengan yang ada di aplikasi Qontak/WhatsApp Anda.
3.  Coba kirim pesan ke nomor WA bisnis Anda dari HP lain.
4.  Tunggu ~10 detik (interval polling otomatis). Pesan baru akan muncul di Inbox RemindHub.

### 2. Test Kirim Balasan
1.  Di RemindHub Inbox, buka salah satu chat.
2.  Ketik balasan dan klik **Send**.
3.  Periksa HP penerima. Pesan harusnya diterima secara instan.

### Troubleshooting
*   **Inbox Kosong**: Pastikan Token Qontak di Settings sudah benar dan tersimpan. Coba klik "Test Connection".
*   **Error "Failed to fetch"**: Periksa koneksi internet atau cek Logs di Supabase Dashboard untuk melihat detail error dari Edge Function.
*   **Pesan Terkirim tapi tidak muncul di UI**: Tunggu beberapa detik. UI melakukan refresh otomatis setiap 5 detik saat chat dibuka.
