---
title: "ADR-0003: Envelope response và error taxonomy thống nhất"
status: accepted
date: 2026-08-12
---

# ADR-0003: Envelope response và error taxonomy thống nhất

## Bối cảnh

Mỗi endpoint tự chọn hình dạng response: chỗ trả mảng trần, chỗ bọc `{ data }`, chỗ `{ courses }`. Lỗi thì mỗi nơi một kiểu — `{ message }`, `{ error }`, hoặc `{ success: false, error }` — và mỗi handler tự viết `try/catch` rồi `res.status(500)`. Client buộc phải nhớ từng endpoint hành xử ra sao, và mọi exception không lường trước đều thành 500 kèm stack trace lọt ra ngoài.

## Quyết định

**Thành công** đi qua `shared/http/respond.js`, luôn có dạng `{ success: true, ... }`:

- `ok(res, payload)` → 200
- `created(res, payload)` → 201
- `noContent(res)` → 204
- `paginated(res, { items, total, page, limit })` → 200 kèm khối `pagination` đầy đủ `totalPages`

**Lỗi** không được tạo thủ công trong handler. Handler ném `AppError` (`AppError.notFound`, `AppError.forbidden`, `AppError.validation`, …) và một error middleware duy nhất trong `shared/errors.js` map về `{ success: false, code, error, details? }`.

Middleware đó cũng dịch lỗi không phải `AppError`: `ZodError` → 400 kèm danh sách issue theo từng field, Mongoose `CastError` → 400, duplicate key → 409. Lỗi ngoài danh mục thành 500 với thông điệp chung, chi tiết chỉ đi vào log có cấu trúc qua `req.logger`.

Handler async được bọc bằng `asyncHandler` / `asyncController`, nên promise reject tự vào middleware — không còn `try/catch` lặp lại.

## Hệ quả

Client chỉ cần rẽ nhánh trên `success` và đọc `code` khi cần xử lý riêng. Thêm một loại lỗi mới là thêm một factory, không phải sửa mọi handler. Stack trace không còn rò rỉ.

Đánh đổi: envelope làm payload dài hơn một chút, và code cũ trả mảng trần phải được sửa cùng lúc với client. Khi refactor, hình dạng response của các endpoint đã có được giữ nguyên có chủ đích — ví dụ `DELETE` announcement trả 200 `{ success: true }` thay vì 204, vì client hiện tại gọi `res.json()`.
