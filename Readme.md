# 🚛 Fleetify - Fleet Maintenance System

Sistem internal untuk mengelola pemeliharaan armada kendaraan. Dibangun dengan **Go + GoFiber + GORM** (backend) dan **Vanilla JS + Bootstrap 5** (frontend).

---

## 🏗️ Arsitektur

```
fleetify/
├── cmd/
│   └── main.go              # Entry point: setup Fiber, routes
├── database/
│   └── database.go          # Koneksi DB + Seeder data awal
├── internal/
│   ├── handler/
│   │   └── handler.go       # HTTP handler (controller layer)
│   ├── middleware/
│   │   └── auth.go          # RBAC middleware (X-User-ID)
│   ├── model/
│   │   └── model.go         # Struct entitas database
│   ├── repository/
│   │   └── repository.go    # Data access layer (query DB)
│   └── usecase/
│       └── webhook.go       # Business logic: async webhook
├── frontend/
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── api.js           # Fetch API calls ke backend
│       ├── ui.js            # DOM manipulation (no innerHTML!)
│       ├── export.js        # Export CSV native JS
│       └── app.js           # Orkestrasi aplikasi
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── go.mod
```

### Pola Arsitektur: Repository Pattern
```
Request → Handler → Repository → Database
                 ↘ Usecase (Webhook)
```
- **Handler**: menerima request HTTP, validasi input, return response
- **Repository**: satu-satunya layer yang boleh query database
- **Usecase**: business logic yang tidak terkait langsung dengan DB

---

## 🚀 Setup & Menjalankan

### Prasyarat
- Docker & Docker Compose terinstall
- Git

### Langkah 1: Clone repository
```bash
git clone https://github.com/perriee/fleetify.git
cd fleetify
```

### Langkah 2: Buat file .env
```bash
cp .env.example .env
# Edit .env jika perlu mengubah konfigurasi
```

### Langkah 3: Jalankan dengan Docker Compose
```bash
docker-compose up --build
```

Aplikasi akan otomatis:
1. Menjalankan MySQL 8.0
2. Build aplikasi Go
3. Menjalankan migrasi tabel
4. Mengisi data awal (seeder)

### Akses Aplikasi
- **Frontend**: http://localhost:8080
- **API**: http://localhost:8080/api

---

## ⚙️ Environment Variables

| Variable | Default | Keterangan |
|---|---|---|
| `DB_HOST` | `db` | Hostname MySQL (nama service Docker) |
| `DB_PORT` | `3306` | Port MySQL |
| `DB_NAME` | `fleetify_db` | Nama database |
| `DB_USER` | `fleetify_user` | Username MySQL |
| `DB_PASS` | `fleetify_pass` | Password MySQL |
| `DB_ROOT_PASS` | `rootpassword` | Password root MySQL |
| `APP_PORT` | `8080` | Port aplikasi Go |
| `WEBHOOK_URL` | *(kosong)* | URL tujuan webhook (opsional). Contoh: `https://webhook.site/xxx` |

---

## 👥 Akun Testing

Data ini otomatis dibuat oleh Seeder saat aplikasi pertama kali dijalankan.

| ID | Username | Role | Keterangan |
|---|---|---|---|
| 1 | `budi_sa` | `SA` | Service Advisor - membuat & menyelesaikan laporan |
| 2 | `sari_sa` | `SA` | Service Advisor cadangan |
| 3 | `manager_approval` | `APPROVAL` | Manager - menyetujui laporan |

**Cara menggunakan di UI**: Pilih user dari dropdown di navbar kanan atas.

**Cara menggunakan di API**: Sertakan header `X-User-ID: {ID}` di setiap request.

---

## 📋 Daftar API Endpoint

### Master Data
| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| `GET` | `/api/users` | ❌ | Daftar semua user |
| `GET` | `/api/vehicles` | ✅ | Daftar semua kendaraan |
| `GET` | `/api/master-items` | ✅ | Daftar semua part & jasa |

### Laporan Pemeliharaan
| Method | Endpoint | Auth | Role | Keterangan |
|---|---|---|---|---|
| `GET` | `/api/reports` | ✅ | Semua | F-04: Riwayat semua laporan |
| `GET` | `/api/reports/:id` | ✅ | Semua | Detail satu laporan |
| `POST` | `/api/reports` | ✅ | SA | F-01: Buat laporan baru |
| `PATCH` | `/api/reports/:id/approve` | ✅ | APPROVAL | F-02: Setujui laporan |
| `PATCH` | `/api/reports/:id/complete` | ✅ | SA | F-03: Selesaikan laporan |

### Contoh Request: Buat Laporan
```bash
curl -X POST http://localhost:8080/api/reports \
  -H "Content-Type: application/json" \
  -H "X-User-ID: 1" \
  -d '{
    "vehicle_id": 1,
    "odometer": 15000,
    "complaint": "Mesin berbunyi kasar saat idle",
    "initial_photo": "foto_awal.jpg",
    "items": [
      { "item_id": 1, "quantity": 2 },
      { "item_id": 4, "quantity": 1 }
    ]
  }'
```

### Contoh Request: Setujui Laporan
```bash
curl -X PATCH http://localhost:8080/api/reports/1/approve \
  -H "X-User-ID: 3"
```

### Contoh Request: Selesaikan Laporan
```bash
curl -X PATCH http://localhost:8080/api/reports/1/complete \
  -H "Content-Type: application/json" \
  -H "X-User-ID: 1" \
  -d '{ "proof_photo": "bukti_selesai.jpg" }'
```

---

## 🔄 Alur Workflow

```
[SA] Buat Laporan
        ↓
Status: PENDING_APPROVAL
        ↓
[APPROVAL] Setujui
        ↓
Status: APPROVED  →  Webhook dikirim (async)
        ↓
[SA] Upload bukti & selesaikan
        ↓
Status: COMPLETED  →  Webhook dikirim (async)
```

---

## ✨ Fitur Bonus

### B-01: Export CSV
Klik tombol **"Export CSV"** di halaman Riwayat Laporan. Implementasi menggunakan Native JavaScript (Blob API + URL.createObjectURL) tanpa library eksternal.

### B-02: Webhook
Set `WEBHOOK_URL` di `.env`. Saat status berubah ke `APPROVED` atau `COMPLETED`, sistem akan mengirim HTTP POST ke URL tersebut secara **asynchronous** menggunakan **Goroutine**.

Payload webhook:
```json
{
  "event": "REPORT_APPROVED",
  "report_id": 1,
  "status": "APPROVED",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

Untuk testing, gunakan https://webhook.site untuk mendapat URL temporary gratis.

---

## 🗃️ Schema Database

```sql
users           (id, username, role)
vehicles        (id, license_plate, model)
master_items    (id, item_name, type, price)
maintenance_reports (id, vehicle_id, created_by, odometer, complaint, status, initial_photo, proof_photo, created_at)
report_items    (id, report_id, item_id, quantity, price_snapshot)
```

Semua tabel menggunakan engine **InnoDB** dengan Foreign Key constraints.
