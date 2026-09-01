---
title: "ADR-0002: Repository pattern bọc Mongoose"
status: accepted
date: 2026-08-12
---

# ADR-0002: Repository pattern bọc Mongoose

## Bối cảnh

Trước refactor, lời gọi Mongoose nằm rải rác ở mọi tầng — kể cả trong route handler. Hệ quả cụ thể:

- Không test được nghiệp vụ nếu không có database thật.
- `lean()` lúc có lúc không, nên có chỗ trả về Mongoose document ra thẳng JSON response, rò rỉ `__v` và field nội bộ.
- Cùng một truy vấn được viết lại nhiều lần với điều kiện lệch nhau.
- Feature này import model của feature kia thoải mái, xoá sạch mọi ranh giới.

## Quyết định

Mọi truy cập dữ liệu đi qua `repositories/`, kế thừa `shared/db/BaseRepository.js`.

`BaseRepository` cung cấp `findById`, `findOne`, `findMany`, `paginate`, `count`, `exists`, `create`, `updateById`, `upsert`, `deleteById`, `aggregate` — **mặc định `lean()` cho read**. Khi thực sự cần document sống (để `.save()` hoặc dùng virtual), phải gọi tường minh `findDocById` / `findDocOne`. Việc "muốn document đầy đủ" trở thành một lựa chọn có ý thức thay vì mặc định.

Repository là **riêng tư với feature**. Feature khác muốn đọc dữ liệu thì gọi service công khai, không gọi repository.

## Hệ quả

Service nhận dữ liệu đã lean nên test được bằng cách stub repository. Truy vấn của một domain nằm cùng một chỗ, dễ tối ưu và thêm index. Ranh giới feature trở nên kiểm tra được bằng máy (ADR-0004).

Đánh đổi: thêm một tầng gián tiếp, và vài truy vấn aggregate phức tạp vẫn phải lộ pipeline Mongoose qua `aggregate()`. Chấp nhận — mục tiêu là gom chỗ truy cập dữ liệu, không phải giả vờ ORM không tồn tại.

Ngoại lệ duy nhất được ghi nhận: `admin/repositories/reportingRepository.js` đọc ngang qua nhiều feature cho analytics, và tự khai báo điều đó ngay trong file.
