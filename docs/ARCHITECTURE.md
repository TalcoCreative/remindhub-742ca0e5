# Tinjauan Arsitektur

Dokumen ini memberikan ikhtisar tingkat tinggi tentang arsitektur RemindHub.

## Stack Teknologi

*   **Frontend Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
*   **Bahasa**: [TypeScript](https://www.typescriptlang.org/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **Komponen UI**: [shadcn-ui](https://ui.shadcn.com/)
*   **Backend / Database**: [Supabase](https://supabase.com/)
*   **Manajemen State**: [React Query](https://tanstack.com/query/latest) (untuk state server)

## Struktur Folder

Proyek ini mengikuti struktur standar Vite + React:

```
src/
├── components/     # Komponen UI yang dapat digunakan kembali
│   ├── ui/         # Komponen dasar shadcn-ui
│   └── ...         # Komponen spesifik fitur
├── hooks/          # Custom React hooks (contoh: usekv, useAuth)
├── integrations/   # Integrasi pihak ketiga
│   └── supabase/   # Client Supabase dan tipe-tipenya
├── lib/            # Fungsi utilitas (contoh: utils.ts)
├── pages/          # Halaman aplikasi (routed components)
├── App.tsx         # Komponen utama aplikasi dengan routing
└── main.tsx        # Titik masuk (entry point) aplikasi
```

## Pola Utama

### Integrasi Supabase

Kami menggunakan direktori `integrations/supabase` untuk mengelola klien Supabase kami.
*   `client.ts`: Menginisialisasi klien Supabase menggunakan variabel environment.
*   `types.ts`: Berisi definisi tipe TypeScript yang dihasilkan dari skema Database kami.

### Routing

Kami menggunakan `react-router-dom` untuk routing sisi klien. Rute didefinisikan di `App.tsx` dan dipetakan ke komponen di direktori `pages/`.

### Komponen UI

Kami memanfaatkan `shadcn-ui` untuk pustaka komponen UI yang konsisten dan mudah diakses. Komponen-komponen ini terletak di `src/components/ui`.
