# Skema Database RemindHub

Dokumen ini menjelaskan struktur database yang digunakan dalam aplikasi RemindHub. Database dibangun di atas PostgreSQL menggunakan Supabase.

## Ringkasan Entity Relationship

Database ini berpusat pada entitas **Leads** (Prospek) dan **Chats** (Percakapan).
- Satu **Lead** dapat memiliki satu **Chat** aktif.
- **Messages** (Pesan) merujuk ke **Chat**.
- **Forms** (Formulir) digunakan untuk mengumpulkan data yang masuk ke **Form Submissions** dan membuat/mengupdate **Leads**.

## Tabel-Tabel (Tables)

### 1. `leads`
Menyimpan data utama prospek atau pelanggan. Ini adalah tabel inti untuk CRM.

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| `id` | uuid | Primary Key. |
| `name` | text | Nama lengkap prospek. |
| `phone` | text | Nomor telepon (format internasional, tanpa +). |
| `status` | enum | Status prospek (e.g., `new`, `followed_up`). Lihat Enum `lead_status`. |
| `source` | enum | Sumber prospek (e.g., `whatsapp`, `instagram`). Lihat Enum `lead_source`. |
| `type` | enum | Tipe prospek (`b2c` atau `b2b`). |
| `assigned_pic` | text | Nama agen/PIC yang menangani. |
| `notes` | text | Catatan tambahan. |
| `estimated_kg` | numeric | Estimasi berat (untuk logistik/pengiriman). |
| `actual_kg` | numeric | Berat aktual. |
| `deal_value` | numeric | Nilai kesepakatan (Rp). |
| `created_at` | timestamptz | Waktu pembuatan. |

### 2. `chats`
Menyimpan sesi percakapan (room) dengan pelanggan. Seringkali disinkronkan dengan Qontak.

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| `id` | uuid | Primary Key. |
| `contact_name` | text | Nama kontak di chat. |
| `contact_phone` | text | Nomor telepon kontak. |
| `lead_id` | uuid | Foreign Key ke tabel `leads`. Menghubungkan chat dengan data CRM. |
| `status` | enum | Status percakapan (sinkron dengan status lead). |
| `assigned_pic` | text | PIC yang menangani chat ini. |
| `last_message` | text | Cuplikan pesan terakhir. |
| `unread` | integer | Jumlah pesan belum terbaca. |
| `channel` | text | Channel komunikasi (e.g., `whatsapp`, `instagram`). |
| `room_id` | text | ID Room eksternal (dari Qontak/Mekari). |

### 3. `messages`
Menyimpan riwayat pesan dalam sebuah chat.

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| `id` | uuid | Primary Key. |
| `chat_id` | uuid | Foreign Key ke tabel `chats`. |
| `text` | text | Isi pesan. |
| `sender` | text | Pengirim pesan (`agent` atau `customer`). |
| `created_at` | timestamptz | Waktu pesan dikirim. |

### 4. `forms`
Definisi formulir publik yang dapat dibagikan kepada pelanggan.

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| `id` | uuid | Primary Key. |
| `name` | text | Nama formulir (Internal). |
| `slug` | text | URL slug unik untuk akses publik. |
| `platform` | text | Platform target (e.g., `whatsapp`, `web`). |
| `is_active` | boolean | Status aktif formulir. |

### 5. `form_submissions`
Menyimpan data yang dikirimkan melalui formulir publik.

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| `id` | uuid | Primary Key. |
| `form_id` | uuid | Foreign Key ke tabel `forms`. |
| `lead_id` | uuid | Foreign Key ke tabel `leads` (jika terhubung). |
| `data` | jsonb | Data mentah hasil isian formulir (JSON). |
| `source_platform` | text | Sumber platform saat submit. |

### 6. `contacts`
Menyimpan detail kontak tambahan yang mungkin terpisah dari leads, atau sebagai raw contact list.

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| `id` | uuid | Primary Key. |
| `phone` | text | Nomor telepon. |
| `name` | text | Nama kontak. |
| `lead_id` | uuid | Link ke tabel `leads` jika sudah dikonversi. |

### 7. `app_settings`
Tabel konfigurasi dinamis untuk aplikasi.

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| `key` | text | Kunci konfigurasi (Unique). |
| `value` | text | Nilai konfigurasi. |

### 8. `user_roles`
Manajemen hak akses pengguna aplikasi.

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| `user_id` | uuid | ID User (dari Supabase Auth). |
| `role` | enum | Peran pengguna (`admin`, `operator`, `viewer`). |

---

## Tipe Enumerasi (Enums)

### `lead_status`
Status perkembangan prospek:
- `new`
- `not_followed_up`
- `followed_up` (Sudah dihubungi)
- `in_progress`
- `picked_up`
- `sign_contract`
- `completed`
- `lost`
- `cancelled`

### `lead_source`
Asal prospek:
- `whatsapp`
- `web`
- `instagram`
- `tiktok`
- `referral`
- `campaign`
- `manual`
- dll.

### `app_role`
Hak akses aplikasi:
- `admin`: Akses penuh.
- `operator`: Bisa membalas chat dan update status.
- `viewer`: Hanya bisa melihat (Read-only).

---

## Catatan Keamanan (RLS)

- **Row Level Security (RLS)** saat ini diaktifkan di semua tabel.
- Kebijakan (Policy) perlu ditinjau ulang untuk memastikan hanya user yang terautentikasi yang dapat mengakses data sensitif seperti `leads` dan `chats`.

---

*Dokumen ini diperbarui secara otomatis berdasarkan definisi tipe database terbaru.*
