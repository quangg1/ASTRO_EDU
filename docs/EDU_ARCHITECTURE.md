# Galaxies Edu – Kiến trúc Nội dung Giáo dục

Tài liệu mô tả cấu trúc nội dung học tập: **Tutorial** (miễn phí, tham khảo) và **Course** (có lộ trình, có thanh toán).

---

## 1. Tổng quan

| Loại | Mô tả | Tham khảo | Thanh toán |
|------|-------|-----------|------------|
| **Tutorial** | Thuật ngữ khoa học, thông tin cơ bản thiên văn/vũ trụ. Bài đọc độc lập, tra cứu nhanh. | GeeksforGeeks | **Miễn phí** |
| **Course** | Khóa học chuyên sâu, có lộ trình bài bản, modules, lessons, quiz. | Coursera, Udemy | **Có thanh toán** (payment service) |

---

## 2. Tutorial (GeeksforGeeks Style)

### 2.1. Định nghĩa
- **Tutorial** = bài viết tham khảo, giải thích thuật ngữ, khái niệm cơ bản.
- Không có enrollment, không có progress, không có quiz.
- Người dùng truy cập trực tiếp qua danh mục hoặc tìm kiếm.
- **Luôn miễn phí.**

### 2.2. Cấu trúc nội dung
- **Category**: Thuật ngữ | Vũ trụ | Hệ Mặt Trời | Thiên hà | Công cụ quan sát | Lịch sử thiên văn | ...
- **Article**: title, slug, categoryId, summary, content (sections giống Lesson: text, image, code, callout, math…), tags, readTime
- **Liên kết**: related articles, external references

### 2.3. Ví dụ bài Tutorial
- *Định nghĩa: Thiên hà (Galaxy)*
- *Hệ tọa độ thiên văn: RA và Dec*
- *Cấu trúc Hệ Mặt Trời*
- *Thang đo độ sáng: Magnitude*
- *Nhiệt độ và màu sắc của sao*
- *Định luật Hubble*

### 2.4. Studio – Tutorial
- Teacher/Admin tạo/sửa Tutorial tương tự Course.
- Có thể dùng chung block types (text, image, video, math, callout…).
- Tutorial không có modules, lessons; chỉ có các section trong một bài.

---

## 3. Course (Chuyên sâu, có thanh toán)

### 3.1. Định nghĩa
- **Course** = khóa học có lộ trình, modules, lessons, quiz.
- Có enrollment, progress, mục tiêu học tập.
- **Có thanh toán** (trừ khi `price = 0` hoặc `isPaid = false`).

### 3.2. Cấu trúc
- **Modules** → **Lessons** (text, visualization, quiz)
- Lộ trình rõ ràng: Beginner → Intermediate → Advanced
- Có duration (số tuần), learning goals

### 3.3. Payment
- `price`: số tiền (VNĐ hoặc USD)
- `isPaid`: boolean – khóa trả phí hay miễn phí
- `currency`: VND | USD
- Enroll: nếu `isPaid` và `price > 0` → gọi Payment Service trước khi enroll
- Khi đã mua / subscribe → mới có quyền truy cập nội dung khóa học đầy đủ

---

## 4. Payment Service (Thiết kế)

### 4.1. Vai trò
- Xử lý thanh toán khi mua khóa học.
- Tích hợp: VNPay, Momo, Stripe (tùy thị trường).
- Lưu purchase record: userId, courseId, amount, status, paymentGateway, transactionId.

### 4.2. API gợi ý
```
POST /api/payments/create-intent
  Body: { courseId, userId, amount, currency }
  Response: { paymentUrl, orderId, ... }  (redirect user tới trang thanh toán)

GET /api/payments/callback/:gateway
  (Webhook từ VNPay/Momo/Stripe khi thanh toán xong)

GET /api/payments/orders/:userId
  (Lịch sử mua hàng của user)
```

### 4.3. Luồng enroll có thanh toán
1. User bấm "Mua khóa học" / "Đăng ký" trên khóa trả phí.
2. Client gọi Payment Service → nhận `paymentUrl`.
3. User chuyển tới trang thanh toán (VNPay/Momo).
4. Sau khi thanh toán thành công → Payment gọi webhook Courses (hoặc Courses poll status).
5. Courses tạo Enrollment + đánh dấu đã thanh toán.
6. User quay lại `/courses/:slug` → thấy nội dung đã mở.

### 4.4. Enroll miễn phí
- Nếu `isPaid = false` hoặc `price = 0`: gọi `POST /courses/:slug/enroll` như hiện tại (không qua Payment).

---

## 5. Studio – Phân chia

### 5.1. Menu Studio
- **Courses**: Danh sách khóa học → mở Course Studio (chỉnh modules, lessons).
- **Tutorials**: Danh sách tutorial → mở Tutorial Studio (chỉnh bài viết theo category).

### 5.2. Tutorial Studio
- Tạo/sửa/xóa Tutorial.
- Chọn category.
- Soạn nội dung bằng blocks (text, image, code, callout, math…).
- Publish / Unpublish.

### 5.3. Course Studio (hiện có)
- Thêm fields: `price`, `isPaid`, `currency`.
- Teacher có thể đặt giá khóa học.

---

## 6. Sơ đồ tổng thể

```
                    ┌─────────────────────────────────────┐
                    │           GALAXIES EDU              │
                    └─────────────────────────────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
              ▼                      ▼                      ▼
     ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
     │   TUTORIAL      │   │    COURSE       │   │   COMMUNITY     │
     │   (miễn phí)    │   │   (trả phí)    │   │   (miễn phí)    │
     │                 │   │                 │   │                 │
     │ - Categories    │   │ - Modules       │   │ - Forums        │
     │ - Articles      │   │ - Lessons       │   │ - Posts         │
     │ - GfG-style     │   │ - Quiz          │   │ - News          │
     │ - Tra cứu       │   │ - Payment       │   │                 │
     └────────┬────────┘   └────────┬────────┘   └─────────────────┘
              │                     │
              │                     │  enroll
              │                     ▼
              │            ┌─────────────────┐
              │            │ PAYMENT SERVICE │
              │            │ (VNPay/Momo)    │
              │            └─────────────────┘
              │
              ▼
     ┌─────────────────┐
     │  TUTORIAL API   │  (cùng courses DB, collection tutorials)
     │  GET /tutorials │
     │  GET /tutorials/:slug
     └─────────────────┘
```

---

## 7. Roadmap triển khai

| Giai đoạn | Nội dung | Trạng thái |
|-----------|----------|------------|
| **Phase 1** | Tutorial model, API, client pages, sample articles, Studio Tutorial | ✅ Đã triển khai |
| **Phase 2** | Course: thêm price, isPaid, currency; UI hiển thị giá, nút "Mua khóa học" | ✅ Đã triển khai |
| **Phase 3** | Payment Service: VNPay/Momo integration, webhook, enroll flow | 🔲 Chưa triển khai |
| **Phase 4** | Gated content: kiểm tra purchase trước khi cho xem lesson chi tiết | 🔲 Chưa triển khai |

---

*Tài liệu kiến trúc – Galaxies Edu*
