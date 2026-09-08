# Dokumen Information Architecture

## Toko Online Elektronik

**Versi:** 1.0
**Tanggal:** 8 September 2026
**Referensi:** planning.md (v1.0)

---

## 1. Tujuan Dokumen

Dokumen ini melengkapi bagian Sitemap yang sudah ada di **Dokumen Planning**, dengan menambahkan detail **struktur halaman final** dan **User Flow** — alur langkah demi langkah yang dilalui pengguna dari masuk ke website sampai mencapai tujuannya (checkout, registrasi, klaim garansi, dll).

Sitemap menjawab pertanyaan **"halaman apa saja yang ada"**.
User Flow menjawab pertanyaan **"bagaimana urutan pengguna berpindah antar halaman untuk mencapai tujuan tertentu"**.

---

## 2. Sitemap (Struktur Halaman)

```
Home (/)
├── Kategori Produk (/categories)
│   ├── Handphone (/categories/handphone)
│   ├── Laptop & Komputer (/categories/laptop)
│   ├── Aksesoris (/categories/aksesoris)
│   └── Elektronik Rumah Tangga (/categories/rumah-tangga)
├── Brand (/brands)
│   └── Detail Brand (/brands/[slug])
├── Pencarian (/search?q=)
├── Detail Produk (/products/[slug])
├── Keranjang (/cart)
├── Checkout (/checkout)
│   ├── Pilih Alamat
│   ├── Pilih Ekspedisi
│   ├── Pilih Metode Pembayaran
│   └── Konfirmasi Pesanan (/checkout/confirmation)
├── Autentikasi
│   ├── Login (/login)
│   ├── Register (/register)
│   └── Lupa Password (/forgot-password)
├── Akun Saya (/account)
│   ├── Profil (/account/profile)
│   ├── Riwayat Pesanan (/account/orders)
│   │   └── Detail Pesanan (/account/orders/[id])
│   ├── Wishlist (/account/wishlist)
│   ├── Alamat (/account/address)
│   └── Klaim Garansi/Retur (/account/orders/[id]/claim)
├── Promo / Flash Sale (/promo)
├── Tentang Kami (/about)
├── Bantuan / FAQ (/help)
├── Kebijakan Garansi & Retur (/help/warranty-policy)
└── Kontak / Live Chat (/contact)
```

**Catatan perubahan dari sitemap awal di planning.md:**

- Ditambahkan halaman **Brand** (`/brands`) — konsisten dengan keputusan navigasi sebelumnya yang menambahkan filter Brand di samping Category.
- Ditambahkan halaman **Pencarian** (`/search`) sebagai halaman tersendiri, bukan bagian dari kategori.
- **Checkout** dipecah jadi beberapa sub-langkah eksplisit karena ini alur multi-step, bukan satu halaman datar.
- **Klaim Garansi/Retur** dipindahkan ke bawah Riwayat Pesanan (`/account/orders/[id]/claim`), karena secara logis proses klaim selalu berangkat dari pesanan tertentu.

---

## 3. User Flow

### 3.1 Flow: Pengunjung Baru Membeli Produk (Guest Checkout)

```
Home
  │
  ▼
Browse Kategori / Search
  │
  ▼
Detail Produk ──► Lihat Spesifikasi, Review, Stok
  │
  ▼
Tambah ke Keranjang
  │
  ▼
Keranjang ──► Ubah jumlah / Hapus item
  │
  ▼
Checkout
  │
  ├─► Isi alamat pengiriman (manual, karena belum login)
  ├─► Pilih metode pengiriman (kalkulasi ongkir otomatis)
  ├─► Pilih metode pembayaran
  │
  ▼
Konfirmasi Pesanan
  │
  ▼
Halaman Sukses ──► Opsi: "Buat akun untuk lacak pesanan ini?"
```

**Poin penting:**

- Guest checkout **tetap diizinkan** untuk mengurangi friksi pembelian pertama kali, tapi di akhir proses ditawarkan pembuatan akun agar bisa melacak pesanan.
- Jika pengguna sudah login sebelum checkout, langkah "Isi alamat manual" diganti "Pilih dari alamat tersimpan".

---

### 3.2 Flow: Registrasi & Login

```
Klik ikon akun (belum login)
  │
  ▼
Login Page
  │
  ├─► Sudah punya akun? → Isi email/HP + password → Masuk ke Akun Saya
  │
  └─► Belum punya akun? → Klik "Daftar"
         │
         ▼
      Register Page
         │
         ▼
      Isi data (nama, email/HP, password)
         │
         ▼
      Verifikasi (OTP via email/WA)
         │
         ▼
      Akun aktif → Redirect ke halaman sebelumnya (Home/Cart/Checkout)
```

**Poin penting:**

- Setelah login/register, pengguna **dikembalikan ke halaman terakhir sebelum diarahkan ke login** (misalnya kalau login dipicu saat mau checkout, setelah berhasil langsung lanjut ke checkout, bukan ke Home).

---

### 3.3 Flow: Checkout Pengguna Terdaftar (Logged-in)

```
Keranjang
  │
  ▼
Checkout
  │
  ├─► Pilih alamat tersimpan (atau tambah alamat baru)
  ├─► Ongkir terhitung otomatis berdasarkan alamat
  ├─► Pilih metode pembayaran
  ├─► (Opsional) Pakai voucher/promo
  │
  ▼
Ringkasan Pesanan ──► Total harga + estimasi tiba
  │
  ▼
Konfirmasi & Bayar
  │
  ▼
Halaman Sukses ──► Redirect otomatis ke Riwayat Pesanan
```

---

### 3.4 Flow: Pencarian & Filter Produk

```
Home / Header (semua halaman)
  │
  ▼
Ketik kata kunci di search bar
  │
  ▼
Autocomplete suggestion muncul ──► Klik saran, atau tekan Enter
  │
  ▼
Halaman Hasil Pencarian (/search?q=)
  │
  ├─► Terapkan filter: Kategori, Brand, Harga, Rating
  ├─► Urutkan: Termurah, Terlaris, Terbaru
  │
  ▼
Klik produk ──► Detail Produk
```

---

### 3.5 Flow: Wishlist

```
Detail Produk / Product Grid
  │
  ▼
Klik ikon hati (♥)
  │
  ├─► Belum login? → Diarahkan ke Login → setelah berhasil, produk otomatis masuk wishlist
  │
  └─► Sudah login? → Produk langsung tersimpan ke Wishlist
         │
         ▼
      Akun Saya → Wishlist
         │
         ▼
      Klik produk ──► Detail Produk ──► Tambah ke Keranjang
```

---

### 3.6 Flow: Tracking Pesanan & Klaim Garansi/Retur

```
Akun Saya → Riwayat Pesanan
  │
  ▼
Pilih salah satu pesanan
  │
  ▼
Detail Pesanan ──► Status: Diproses / Dikirim / Selesai
  │
  ├─► Status "Dikirim" → Tombol "Lacak Pengiriman" (redirect ke ekspedisi/nomor resi)
  │
  └─► Status "Selesai" → Tombol "Ajukan Klaim Garansi/Retur"
         │
         ▼
      Form Klaim ──► Pilih alasan, upload foto bukti
         │
         ▼
      Klaim terkirim ──► Status klaim bisa dipantau di halaman yang sama
```

---

## 4. Ringkasan Keterkaitan Flow ↔ Halaman

| Flow               | Halaman yang Dilalui                                                       |
| ------------------ | -------------------------------------------------------------------------- |
| Guest Checkout     | Home → Kategori/Search → Detail Produk → Keranjang → Checkout → Konfirmasi |
| Registrasi & Login | Login → Register → OTP → Akun Saya                                         |
| Checkout Member    | Keranjang → Checkout → Ringkasan → Konfirmasi → Riwayat Pesanan            |
| Pencarian          | Header (semua halaman) → Hasil Pencarian → Detail Produk                   |
| Wishlist           | Detail Produk / Product Grid → Login (jika perlu) → Akun Saya → Wishlist   |
| Tracking & Klaim   | Akun Saya → Riwayat Pesanan → Detail Pesanan → Form Klaim                  |

---

## 5. Langkah Selanjutnya

1. Validasi flow ini dengan gambaran fitur yang sudah dikerjakan di frontend (Header, PromoSlider, CategoryShortcuts, dst) — pastikan tidak ada flow yang terlewat dari yang sudah dibangun.
2. Lanjut ke tahap **Database Schema/ERD** — karena flow di atas menunjukkan entitas yang dibutuhkan (Product, Category, Brand, User, Order, Wishlist, Claim/Retur), yang akan jadi acuan struktur tabel database.
3. Setelah skema database, baru masuk ke fase **UI/UX Design (Wireframe)** untuk layar yang belum dibuat (Checkout, Login/Register, Akun Saya) — kalau ingin tetap divalidasi visualnya sebelum coding.

---

_Dokumen ini melengkapi Dokumen Planning (planning.md) dan sebaiknya dibaca berdampingan._
