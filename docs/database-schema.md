# Dokumen Database Schema / ERD

## Toko Online Elektronik

**Versi:** 1.0
**Tanggal:** 8 September 2026
**Referensi:** planning.md (v1.0), information-architecture.md (v1.0)

---

## 1. Tujuan Dokumen

Dokumen ini menerjemahkan entitas yang muncul di **User Flow** (Product, Category, Brand, User, Order, Wishlist, Klaim/Retur, dll) menjadi skema database yang siap diimplementasikan. Setiap tabel mencantumkan kolom, tipe data, constraint, dan relasi ke tabel lain.

Skema ini bersifat **database-agnostic** (bisa diimplementasikan di PostgreSQL maupun MySQL sesuai usulan tech stack di planning.md), dengan asumsi menggunakan ORM seperti Prisma atau Drizzle.

---

## 2. Diagram Relasi (Ringkas)

```
User ──1:N── Address
User ──1:1── Cart ──1:N── CartItem ──N:1── Product
User ──1:N── Order ──1:N── OrderItem ──N:1── Product
User ──1:N── Wishlist ──N:1── Product
User ──1:N── Review ──N:1── Product
User ──1:N── Claim ──N:1── OrderItem

Category ──1:N── Product
Brand ──1:N── Product
Product ──1:N── ProductImage
Product ──1:N── ProductSpecification
Product ──1:N── ProductVariant

Order ──1:1── Payment
Order ──1:N── OrderStatusHistory
Order ──N:1── Address (shipping address)

Promo ──N:N── Product (melalui PromoProduct)
FlashSale ──1:N── FlashSaleProduct ──N:1── Product
```

---

## 3. Detail Tabel

### 3.1 `users`

| Kolom             | Tipe         | Constraint         | Keterangan                  |
| ----------------- | ------------ | ------------------ | --------------------------- |
| id                | UUID         | PK                 |                             |
| name              | VARCHAR(100) | NOT NULL           |                             |
| email             | VARCHAR(150) | UNIQUE, NOT NULL   |                             |
| phone             | VARCHAR(20)  | UNIQUE             | Untuk login/OTP via WA      |
| password_hash     | VARCHAR(255) | NOT NULL           | Kosong jika login via OAuth |
| role              | ENUM         | DEFAULT 'customer' | `customer`, `admin`         |
| email_verified_at | TIMESTAMP    | NULLABLE           |                             |
| created_at        | TIMESTAMP    | NOT NULL           |                             |
| updated_at        | TIMESTAMP    | NOT NULL           |                             |

---

### 3.2 `addresses`

| Kolom          | Tipe         | Constraint    | Keterangan             |
| -------------- | ------------ | ------------- | ---------------------- |
| id             | UUID         | PK            |                        |
| user_id        | UUID         | FK → users.id |                        |
| label          | VARCHAR(50)  |               | "Rumah", "Kantor", dll |
| recipient_name | VARCHAR(100) | NOT NULL      |                        |
| phone          | VARCHAR(20)  | NOT NULL      |                        |
| full_address   | TEXT         | NOT NULL      |                        |
| city           | VARCHAR(100) | NOT NULL      |                        |
| province       | VARCHAR(100) | NOT NULL      |                        |
| postal_code    | VARCHAR(10)  | NOT NULL      |                        |
| is_default     | BOOLEAN      | DEFAULT false |                        |

---

### 3.3 `categories`

| Kolom     | Tipe         | Constraint                   | Keterangan                     |
| --------- | ------------ | ---------------------------- | ------------------------------ |
| id        | UUID         | PK                           |                                |
| name      | VARCHAR(100) | NOT NULL                     |                                |
| slug      | VARCHAR(100) | UNIQUE, NOT NULL             | Untuk URL `/categories/[slug]` |
| icon      | VARCHAR(50)  | NULLABLE                     | Nama ikon (lucide-react)       |
| parent_id | UUID         | FK → categories.id, NULLABLE | Untuk sub-kategori             |

---

### 3.4 `brands`

| Kolom    | Tipe         | Constraint       | Keterangan |
| -------- | ------------ | ---------------- | ---------- |
| id       | UUID         | PK               |            |
| name     | VARCHAR(100) | NOT NULL         |            |
| slug     | VARCHAR(100) | UNIQUE, NOT NULL |            |
| logo_url | VARCHAR(255) | NULLABLE         |            |

---

### 3.5 `products`

| Kolom           | Tipe          | Constraint          | Keterangan                     |
| --------------- | ------------- | ------------------- | ------------------------------ |
| id              | UUID          | PK                  |                                |
| category_id     | UUID          | FK → categories.id  |                                |
| brand_id        | UUID          | FK → brands.id      |                                |
| name            | VARCHAR(200)  | NOT NULL            |                                |
| slug            | VARCHAR(200)  | UNIQUE, NOT NULL    |                                |
| description     | TEXT          |                     |                                |
| price           | DECIMAL(12,2) | NOT NULL            |                                |
| discount_price  | DECIMAL(12,2) | NULLABLE            | Harga setelah diskon, jika ada |
| stock           | INTEGER       | NOT NULL, DEFAULT 0 |                                |
| sku             | VARCHAR(50)   | UNIQUE              |                                |
| warranty_months | INTEGER       | NULLABLE            | Durasi garansi resmi           |
| is_active       | BOOLEAN       | DEFAULT true        |                                |
| created_at      | TIMESTAMP     | NOT NULL            |                                |
| updated_at      | TIMESTAMP     | NOT NULL            |                                |

> **Catatan:** `stock` di sini untuk produk tanpa varian. Jika produk punya varian (misal warna/kapasitas), stok sebaiknya dipindah ke level `product_variants` (lihat 3.8).

---

### 3.6 `product_images`

| Kolom      | Tipe         | Constraint       | Keterangan                   |
| ---------- | ------------ | ---------------- | ---------------------------- |
| id         | UUID         | PK               |                              |
| product_id | UUID         | FK → products.id |                              |
| image_url  | VARCHAR(255) | NOT NULL         |                              |
| is_primary | BOOLEAN      | DEFAULT false    | Gambar utama di product grid |
| sort_order | INTEGER      | DEFAULT 0        |                              |

---

### 3.7 `product_specifications`

| Kolom      | Tipe         | Constraint       | Keterangan                      |
| ---------- | ------------ | ---------------- | ------------------------------- |
| id         | UUID         | PK               |                                 |
| product_id | UUID         | FK → products.id |                                 |
| spec_key   | VARCHAR(100) | NOT NULL         | Misal: "RAM", "Storage", "Daya" |
| spec_value | VARCHAR(255) | NOT NULL         | Misal: "8GB", "256GB", "65W"    |
| sort_order | INTEGER      | DEFAULT 0        |                                 |

> Tabel key-value ini dipilih (bukan kolom tetap seperti `ram`, `storage`) karena tiap kategori elektronik punya spesifikasi berbeda (TV tidak punya RAM, kulkas tidak punya storage) — pendekatan ini lebih fleksibel.

---

### 3.8 `product_variants`

| Kolom            | Tipe          | Constraint          | Keterangan                            |
| ---------------- | ------------- | ------------------- | ------------------------------------- |
| id               | UUID          | PK                  |                                       |
| product_id       | UUID          | FK → products.id    |                                       |
| variant_name     | VARCHAR(100)  | NOT NULL            | Misal: "Hitam - 256GB"                |
| price_adjustment | DECIMAL(12,2) | DEFAULT 0           | Selisih harga dari harga dasar produk |
| stock            | INTEGER       | NOT NULL, DEFAULT 0 |                                       |
| sku              | VARCHAR(50)   | UNIQUE              |                                       |

---

### 3.9 `carts` & `cart_items`

**`carts`**

| Kolom   | Tipe | Constraint            | Keterangan                 |
| ------- | ---- | --------------------- | -------------------------- |
| id      | UUID | PK                    |                            |
| user_id | UUID | FK → users.id, UNIQUE | Satu user, satu cart aktif |

**`cart_items`**

| Kolom      | Tipe    | Constraint                         | Keterangan |
| ---------- | ------- | ---------------------------------- | ---------- |
| id         | UUID    | PK                                 |            |
| cart_id    | UUID    | FK → carts.id                      |            |
| product_id | UUID    | FK → products.id                   |            |
| variant_id | UUID    | FK → product_variants.id, NULLABLE |            |
| quantity   | INTEGER | NOT NULL, DEFAULT 1                |            |

---

### 3.10 `orders`

| Kolom               | Tipe          | Constraint              | Keterangan                                                           |
| ------------------- | ------------- | ----------------------- | -------------------------------------------------------------------- |
| id                  | UUID          | PK                      |                                                                      |
| user_id             | UUID          | FK → users.id, NULLABLE | NULL jika guest checkout                                             |
| order_number        | VARCHAR(30)   | UNIQUE, NOT NULL        | Nomor pesanan yang dilihat customer                                  |
| shipping_address_id | UUID          | FK → addresses.id       |                                                                      |
| subtotal            | DECIMAL(12,2) | NOT NULL                |                                                                      |
| shipping_cost       | DECIMAL(12,2) | NOT NULL                |                                                                      |
| discount_amount     | DECIMAL(12,2) | DEFAULT 0               |                                                                      |
| total               | DECIMAL(12,2) | NOT NULL                |                                                                      |
| status              | ENUM          | NOT NULL                | `pending`, `paid`, `processing`, `shipped`, `completed`, `cancelled` |
| courier             | VARCHAR(50)   | NULLABLE                | Misal: "JNE", "J&T"                                                  |
| tracking_number     | VARCHAR(100)  | NULLABLE                |                                                                      |
| created_at          | TIMESTAMP     | NOT NULL                |                                                                      |

---

### 3.11 `order_items`

| Kolom        | Tipe          | Constraint                         | Keterangan                                                                    |
| ------------ | ------------- | ---------------------------------- | ----------------------------------------------------------------------------- |
| id           | UUID          | PK                                 |                                                                               |
| order_id     | UUID          | FK → orders.id                     |                                                                               |
| product_id   | UUID          | FK → products.id                   |                                                                               |
| variant_id   | UUID          | FK → product_variants.id, NULLABLE |                                                                               |
| product_name | VARCHAR(200)  | NOT NULL                           | Disalin saat checkout (snapshot), agar tidak berubah kalau produk asli diedit |
| price        | DECIMAL(12,2) | NOT NULL                           | Harga saat pembelian (snapshot)                                               |
| quantity     | INTEGER       | NOT NULL                           |                                                                               |

---

### 3.12 `payments`

| Kolom                 | Tipe         | Constraint             | Keterangan                                 |
| --------------------- | ------------ | ---------------------- | ------------------------------------------ |
| id                    | UUID         | PK                     |                                            |
| order_id              | UUID         | FK → orders.id, UNIQUE |                                            |
| method                | VARCHAR(50)  | NOT NULL               | "bank_transfer", "e_wallet", "credit_card" |
| provider              | VARCHAR(50)  | NULLABLE               | "Midtrans", "Xendit"                       |
| provider_reference_id | VARCHAR(150) | NULLABLE               | ID transaksi dari payment gateway          |
| status                | ENUM         | NOT NULL               | `pending`, `success`, `failed`, `expired`  |
| paid_at               | TIMESTAMP    | NULLABLE               |                                            |

---

### 3.13 `order_status_history`

| Kolom      | Tipe        | Constraint     | Keterangan                      |
| ---------- | ----------- | -------------- | ------------------------------- |
| id         | UUID        | PK             |                                 |
| order_id   | UUID        | FK → orders.id |                                 |
| status     | VARCHAR(50) | NOT NULL       |                                 |
| note       | TEXT        | NULLABLE       |                                 |
| created_at | TIMESTAMP   | NOT NULL       | Dasar tampilan tracking pesanan |

---

### 3.14 `claims` (Klaim Garansi/Retur)

| Kolom           | Tipe         | Constraint          | Keterangan                                                    |
| --------------- | ------------ | ------------------- | ------------------------------------------------------------- |
| id              | UUID         | PK                  |                                                               |
| order_item_id   | UUID         | FK → order_items.id |                                                               |
| user_id         | UUID         | FK → users.id       |                                                               |
| type            | ENUM         | NOT NULL            | `warranty`, `return`                                          |
| reason          | TEXT         | NOT NULL            |                                                               |
| proof_image_url | VARCHAR(255) | NULLABLE            |                                                               |
| status          | ENUM         | NOT NULL            | `submitted`, `reviewing`, `approved`, `rejected`, `completed` |
| created_at      | TIMESTAMP    | NOT NULL            |                                                               |

---

### 3.15 `wishlists`

| Kolom      | Tipe      | Constraint       | Keterangan |
| ---------- | --------- | ---------------- | ---------- |
| id         | UUID      | PK               |            |
| user_id    | UUID      | FK → users.id    |            |
| product_id | UUID      | FK → products.id |            |
| created_at | TIMESTAMP | NOT NULL         |            |

> Kombinasi `user_id` + `product_id` sebaiknya diberi **UNIQUE constraint** agar produk yang sama tidak terduplikasi di wishlist satu user.

---

### 3.16 `reviews`

| Kolom         | Tipe      | Constraint                    | Keterangan                               |
| ------------- | --------- | ----------------------------- | ---------------------------------------- |
| id            | UUID      | PK                            |                                          |
| product_id    | UUID      | FK → products.id              |                                          |
| user_id       | UUID      | FK → users.id                 |                                          |
| order_item_id | UUID      | FK → order_items.id, NULLABLE | Untuk verifikasi "pembeli terverifikasi" |
| rating        | INTEGER   | NOT NULL, CHECK 1–5           |                                          |
| comment       | TEXT      | NULLABLE                      |                                          |
| created_at    | TIMESTAMP | NOT NULL                      |                                          |

---

### 3.17 `promos` & `promo_products`

**`promos`**

| Kolom          | Tipe          | Constraint       | Keterangan                              |
| -------------- | ------------- | ---------------- | --------------------------------------- |
| id             | UUID          | PK               |                                         |
| code           | VARCHAR(30)   | UNIQUE, NULLABLE | Kode voucher, NULL jika diskon otomatis |
| name           | VARCHAR(100)  | NOT NULL         |                                         |
| discount_type  | ENUM          | NOT NULL         | `percentage`, `fixed`                   |
| discount_value | DECIMAL(12,2) | NOT NULL         |                                         |
| min_purchase   | DECIMAL(12,2) | DEFAULT 0        |                                         |
| starts_at      | TIMESTAMP     | NOT NULL         |                                         |
| ends_at        | TIMESTAMP     | NOT NULL         |                                         |

**`promo_products`** (relasi many-to-many, promo bisa berlaku untuk beberapa produk)

| Kolom      | Tipe | Constraint       |
| ---------- | ---- | ---------------- |
| promo_id   | UUID | FK → promos.id   |
| product_id | UUID | FK → products.id |

---

### 3.18 `flash_sales` & `flash_sale_products`

**`flash_sales`**

| Kolom     | Tipe         | Constraint | Keterangan                                    |
| --------- | ------------ | ---------- | --------------------------------------------- |
| id        | UUID         | PK         |                                               |
| name      | VARCHAR(100) | NOT NULL   |                                               |
| starts_at | TIMESTAMP    | NOT NULL   | Dasar countdown timer di komponen `FlashSale` |
| ends_at   | TIMESTAMP    | NOT NULL   |                                               |

**`flash_sale_products`**

| Kolom         | Tipe          | Constraint          | Keterangan                                               |
| ------------- | ------------- | ------------------- | -------------------------------------------------------- |
| id            | UUID          | PK                  |                                                          |
| flash_sale_id | UUID          | FK → flash_sales.id |                                                          |
| product_id    | UUID          | FK → products.id    |                                                          |
| flash_price   | DECIMAL(12,2) | NOT NULL            |                                                          |
| stock_limit   | INTEGER       | NOT NULL            | Stok khusus untuk flash sale, terpisah dari stok reguler |
| sold_count    | INTEGER       | DEFAULT 0           |                                                          |

---

## 4. Ringkasan Relasi Antar Tabel

| Tabel Utama              | Relasi | Tabel Terkait                                                  |
| ------------------------ | ------ | -------------------------------------------------------------- |
| `products`               | N:1    | `categories`, `brands`                                         |
| `products`               | 1:N    | `product_images`, `product_specifications`, `product_variants` |
| `users`                  | 1:N    | `addresses`, `orders`, `wishlists`, `reviews`, `claims`        |
| `orders`                 | 1:N    | `order_items`, `order_status_history`                          |
| `orders`                 | 1:1    | `payments`                                                     |
| `order_items`            | 1:N    | `claims`                                                       |
| `promos` / `flash_sales` | N:N    | `products` (melalui tabel pivot)                               |

---

## 5. Pemetaan ke Fitur & Komponen yang Sudah Dibangun

| Komponen Frontend            | Tabel yang Dibutuhkan                                                                  |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| `CategoryShortcuts`          | `categories`                                                                           |
| `PromoSlider`                | `promos` (atau tabel `banners` terpisah jika promo visual tidak selalu terikat produk) |
| `FlashSale`                  | `flash_sales`, `flash_sale_products`                                                   |
| `ProductGrid`                | `products`, `product_images`, `brands`                                                 |
| `UserAccountMenu` → Orders   | `orders`, `order_items`                                                                |
| `UserAccountMenu` → Wishlist | `wishlists`                                                                            |

> **Catatan untuk `PromoSlider`:** karena isi slider sejauh ini murni banner promosi (bukan selalu terikat ke satu produk), pertimbangkan tabel `banners` terpisah dari `promos` (yang lebih ke logic diskon). Tabel `banners` cukup berisi `image_url`, `title`, `href`, `sort_order`, `is_active`.

---

## 6. Langkah Selanjutnya

1. Implementasikan skema ini menggunakan ORM (Prisma/Drizzle) sesuai tech stack final.
2. Buat migration & seed data awal (minimal: beberapa kategori, brand, dan produk dummy) supaya `ProductGrid` dan `CategoryShortcuts` bisa langsung disambungkan ke data asli.
3. Bangun API endpoint dasar: `GET /api/products`, `GET /api/categories`, `GET /api/products/[slug]` — sesuai prioritas yang sudah disepakati sebelumnya.
4. Setelah API dasar jalan, lanjut ke autentikasi (`users`, session/JWT) sebelum masuk ke Cart & Checkout.

---

_Dokumen ini melengkapi planning.md dan information-architecture.md. Skema dapat disesuaikan seiring kebutuhan berkembang selama development._
