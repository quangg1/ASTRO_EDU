# Quy trình Git – làm theo feature, gộp vào main

## 1. Push lên Git lần đầu (nếu chưa có remote)

```bash
# Đảm bảo đang ở nhánh main (hoặc master)
git branch

# Thêm remote (thay YOUR_REPO bằng URL repo GitHub/GitLab của bạn)
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git

# Push nhánh hiện tại lên origin, set upstream
git push -u origin main
```

Nếu repo đã có sẵn trên GitHub và bạn clone về thì đã có `origin`, chỉ cần push:

```bash
git push -u origin main
```

---

## 2. Quy trình làm theo feature (Feature branch workflow)

Mỗi tính năng/sửa lỗi làm trên **một nhánh riêng**, xong mới gộp vào `main`.

### Bước 1: Cập nhật main và tạo nhánh feature

```bash
git checkout main
git pull origin main

# Tạo nhánh mới theo tên feature (ví dụ: feature/payment-vnpay, fix/login-error)
git checkout -b feature/ten-tinh-nang
```

**Nhánh feature đã tạo (tương ứng cấu trúc code):**

| Nhánh | Tương ứng |
|-------|------------|
| `feature/api` | API gộp (server, config, mount routes) |
| `feature/auth` | Đăng ký, đăng nhập, OAuth, admin |
| `feature/courses` | Khóa học, tutorials, enrollments |
| `feature/payment` | VNPay, orders |
| `feature/community` | Forums, posts, news, comments, votes |
| `feature/media` | Upload, static files |
| `feature/client` | Next.js frontend |
| `feature/earth-history` | Earth History API (fossils, phyla) |

**Gợi ý thêm:** `fix/...` (sửa lỗi), `refactor/...` (tái cấu trúc).

### Bước 2: Làm việc trên nhánh feature

Code, commit như bình thường (nên commit theo đợt nhỏ, dễ review):

```bash
git add .
git status
git commit -m "feat(courses): thêm tìm kiếm khóa học"
```

### Bước 3: Push nhánh feature lên remote

```bash
git push -u origin feature/ten-tinh-nang
```

### Bước 4: Gộp vào main khi xong

**Cách 1 – Gộp trên máy (rồi push main):**

```bash
git checkout main
git pull origin main
git merge feature/ten-tinh-nang -m "Merge feature/ten-tinh-nang into main"
git push origin main
```

**Cách 2 – Dùng Pull Request (khuyến nghị trên GitHub/GitLab):**

1. Trên GitHub/GitLab: tạo **Pull Request** (PR) từ `feature/ten-tinh-nang` → `main`.
2. Review (nếu 2 người: người kia review).
3. Merge PR vào `main` trên web.
4. Trên máy: `git checkout main` và `git pull origin main`.

### Bước 5: Xóa nhánh feature (tùy chọn)

Sau khi đã merge xong:

```bash
git branch -d feature/ten-tinh-nang
git push origin --delete feature/ten-tinh-nang
```

---

## 3. Tóm tắt lệnh theo từng lần “update xong”

| Việc | Lệnh |
|------|------|
| Bắt đầu feature mới | `git checkout main` → `git pull` → `git checkout -b feature/xxx` |
| Commit trong feature | `git add .` → `git commit -m "mô tả"` |
| Đẩy nhánh feature | `git push -u origin feature/xxx` |
| Gộp vào main (local) | `git checkout main` → `git pull` → `git merge feature/xxx` → `git push origin main` |
| Hoặc gộp qua GitHub | Mở PR `feature/xxx` → `main` → Merge PR → `git checkout main` → `git pull` |

---

## 4. Liên hệ với cấu trúc code (API gộp theo feature)

Code backend đã tách theo thư mục feature (`services/api/features/auth`, `courses`, `payment`, …). Nên:

- Một nhánh feature thường chỉ sửa **một** thư mục feature (vd chỉ `features/payment`) → ít conflict với người làm feature khác.
- Khi tạo nhánh, có thể đặt tên trùng với feature: `feature/payment-vnpay`, `feature/auth-oauth`, …

Nếu hai người làm hai feature khác nhau (vd payment vs community), mỗi người một nhánh → merge lần lượt vào `main` sẽ ít đè lên nhau.
