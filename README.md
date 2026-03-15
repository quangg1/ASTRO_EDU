# Earth History Simulator 🌍

Mô phỏng 3D tương tác lịch sử 4.6 tỷ năm của Trái Đất.

## Tech Stack

### Frontend (React)
- **Next.js 14** - React framework
- **React Three Fiber** - 3D rendering với Three.js
- **Zustand** - State management
- **TailwindCSS** - Styling

### Backend (Node.js)
- **Express.js** - REST API
- **MongoDB + Mongoose** - Database
- **PBDB Data** - 500,000+ fossil records

## Cấu trúc Project

```
galaxies/
├── client/               # React Frontend
│   ├── src/
│   │   ├── app/          # Next.js pages
│   │   ├── components/
│   │   │   ├── 3d/       # Three.js components
│   │   │   └── ui/       # UI components
│   │   ├── lib/          # API, utilities
│   │   ├── store/        # Zustand store
│   │   └── types/        # TypeScript types
│   └── package.json
│
├── services/
│   └── earth-history/    # Earth History API (Express)
│       ├── models/       # Mongoose schemas
│       ├── routes/       # API routes
│       ├── seeds/        # Database seeders
│       └── server.js
│
└── pbdb_data.csv         # Paleobiology data
```

## Cài đặt & Chạy

### 1. Cài đặt dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 2. Cấu hình

**Backend** (`services/earth-history/.env`):
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/earth_history
```

**Frontend** (`client/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 3. Import dữ liệu hóa thạch (chỉ cần làm 1 lần)

```bash
cd services/earth-history
npm run seed        # Seed Earth History stages
npm run import-pbdb # Import 500k fossils (mất ~5-10 phút)
```

### 4. Chạy ứng dụng (backend và frontend riêng)

Chạy **hai terminal**, không start chung:

**Terminal 1 – Backend:**
```bash
cd services/earth-history
npm run dev
# Server: http://localhost:3001
# Hoặc từ root: npm run dev:server
```

**Terminal 2 – Frontend:**
```bash
cd client
npm run dev
# App: http://localhost:3000
```

Từ thư mục gốc có thể dùng: `npm run dev:server` và `npm run dev:client` (mỗi lệnh một terminal).

### 5. Mở trình duyệt

Truy cập: **http://localhost:3000**

### 6. Tại sao lần đầu start chậm?

- **Frontend (Next.js):** Lần đầu phải compile TypeScript, Tailwind, React Three Fiber, Three.js → có thể mất 10–30 giây. Các lần sau nhanh hơn (cache).
- **Backend:** Nếu MongoDB chưa chạy hoặc kết nối chậm, server sẽ chờ tối đa 10s rồi báo lỗi (đã cấu hình timeout).
- **Cách nhanh hơn:** Chạy backend trước, đợi thấy "MongoDB Connected" rồi mới chạy frontend.

## Tính năng

### Timeline
- 22 giai đoạn từ 4.6 tỷ năm trước đến hiện tại
- Click để chuyển giữa các thời kỳ
- Auto-play với điều chỉnh tốc độ

### Earth 3D
- Mô phỏng màu sắc Trái Đất theo từng thời kỳ
- Mặt Trăng quay quanh với khoảng cách thay đổi
- Debris và thiên thạch cho thời kỳ sớm

### Hóa thạch
- 500,000+ bản ghi từ Paleobiology Database
- Hiển thị trên globe theo vị trí cổ địa lý
- Phân loại theo phylum với màu sắc
- Chỉ hiện hóa thạch của đúng thời kỳ

### Thông tin
- Nồng độ O₂, CO₂
- Độ dài ngày
- Mô tả chi tiết từng thời kỳ
- Cảnh báo sự kiện tuyệt chủng

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/fossils/stats` | Thống kê tổng quan |
| GET | `/api/fossils/by-time?maxMa=&minMa=` | Lấy fossils theo thời gian |
| GET | `/api/earth-history` | Lấy tất cả stages |
| GET | `/api/earth-history/:id` | Lấy stage cụ thể |

## Git – làm theo feature, gộp vào main

Làm việc trên nhánh feature, xong gộp vào `main`. Chi tiết: **[docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md)**.

- Push lần đầu: `git remote add origin <URL>` (nếu chưa có) → `git push -u origin main`
- Feature mới: `git checkout main` → `git pull` → `git checkout -b feature/ten-feature` → code → commit → `git push -u origin feature/ten-feature`
- Gộp vào main: merge trên GitHub (Pull Request) hoặc local: `git checkout main` → `git merge feature/ten-feature` → `git push origin main`

## License

MIT License
