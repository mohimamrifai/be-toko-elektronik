# BE Toko Elektronik

Backend API untuk aplikasi toko online elektronik.

## Prasyarat

- [Bun](https://bun.sh) (v1.0+)
- [Docker](https://www.docker.com/) & Docker Compose

## Setup

```bash
# Install dependensi
bun install

# Salin file environment
cp .env.example .env

# Jalankan PostgreSQL
docker compose up -d

# Terapkan migration & seed data
bun run db:migrate
bun run db:seed

# Jalankan aplikasi
bun run start:dev
```

### Variabel Environment

| Variabel | Default | Keterangan |
|----------|---------|------------|
| `PORT` | `5000` | Port server API |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5433/toko_elektronik` | Koneksi PostgreSQL |

> PostgreSQL berjalan di port **5433** untuk menghindari konflik dengan instalasi PostgreSQL lain di mesin lokal.

Server berjalan di `http://localhost:5000`.
