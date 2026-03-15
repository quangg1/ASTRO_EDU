# Lưu media trên cloud và cấu hình app

Các thư mục sau **không** nằm trong Git (quá nặng), cần lưu trên cloud và cấu hình app đọc từ URL.

- `client/public/course-media/` – ảnh trích từ PDF khóa học
- `client/public/models/` – file .glb (3D)
- `client/public/textures/` – ảnh texture (planets, paleo)
- `client/public/images/` – ảnh dùng chung (vd nebula-home.jpg)

---

## 1. Chọn dịch vụ cloud

| Dịch vụ | Ưu điểm | Ghi chú |
|--------|---------|---------|
| **Cloudinary** | Free tier, dễ dùng, có SDK | Tốt cho ảnh; .glb upload được nhưng cần plan phù hợp |
| **Vercel Blob** | Gắn với Vercel, đơn giản | Nếu deploy Next.js trên Vercel |
| **AWS S3 + CloudFront** | Mạnh, scale tốt | Cần tạo bucket, IAM, CDN |
| **Backblaze B2** | Rẻ, tương thích S3 | Có thể dùng với Cloudflare R2 hoặc CDN |

---

## 2. Upload và giữ cấu trúc thư mục

Trên cloud, tạo **cùng cấu trúc** để URL dễ map:

```
bucket-hoac-folder/
  course-media/
    pdf-extracted/
      w1-dai-duong-dau-tien/
      ...
  models/
    allosaurus.glb
    ...
  textures/
    paleo/
    8k_earth_daymap.jpg
    ...
  images/
    nebula-home.jpg
```

- **Cloudinary**: tạo folder tương ứng (course-media, models, textures, images), upload từng thư mục.
- **S3/B2**: upload cả thư mục (vd `aws s3 sync client/public/models s3://bucket/models`).

---

## 3. Cấu hình app (Next.js)

Thêm biến môi trường base URL cho static media (trong `client/.env.local`):

```env
# Base URL media trên cloud (không có dấu / ở cuối)
# VD Cloudinary: https://res.cloudinary.com/your-cloud/image/upload/v123/astro-edu
# VD S3/CloudFront: https://d123xxx.cloudfront.net
NEXT_PUBLIC_MEDIA_CDN=https://your-cdn-or-bucket-url.com
```

Trong code, thay vì dùng path local `/models/xxx.glb`, dùng:

```ts
const mediaBase = process.env.NEXT_PUBLIC_MEDIA_CDN || '';
const modelUrl = mediaBase ? `${mediaBase}/models/allosaurus.glb` : '/models/allosaurus.glb';
```

- Nếu **chưa set** `NEXT_PUBLIC_MEDIA_CDN`: app dùng file local trong `client/public/` (khi chạy ở máy bạn, file vẫn nằm ở đó).
- Khi **đã set**: app load từ cloud; lúc deploy (Vercel, v.v.) không cần copy thư mục media vào repo.

---

## 4. Gợi ý: Cloudinary (nhanh)

1. Đăng ký [cloudinary.com](https://cloudinary.com), tạo cloud (free).
2. Dashboard → Media Library → Upload → upload từng thư mục `course-media`, `models`, `textures`, `images` (có thể kéo thả cả folder nếu giao diện hỗ trợ, hoặc dùng Upload API).
3. Lấy **Base URL** (Settings → Access → hoặc URL dạng `https://res.cloudinary.com/<cloud_name>/image/upload`). Với raw file (.glb) có thể dùng delivery URL tương ứng (xem tài liệu Cloudinary cho “raw”/file).
4. Đặt trong `client/.env.local`:
   ```env
   NEXT_PUBLIC_MEDIA_CDN=https://res.cloudinary.com/your-cloud-name/image/upload/v1/astro-edu
   ```
   (thay `your-cloud-name` và folder `astro-edu` nếu bạn đặt tên khác).

---

## 5. Push lại Git

Sau khi đã bỏ media khỏi Git và commit (như đã làm):

```bash
git push origin main
```

Repo sẽ nhẹ hơn; media chỉ nằm trên cloud và trên máy local (trong `client/public/`) khi cần chạy dev.

---

## 6. Đồng bộ media lên cloud (tùy chọn)

Có thể viết script (Node hoặc shell) để sync thư mục local → cloud:

- **Cloudinary**: dùng `cloudinary` SDK, duyệt file trong `client/public/models`, `client/public/textures`, … và upload từng file, giữ path (public_id).
- **S3**: `aws s3 sync client/public/models s3://bucket/models --acl public-read` (và tương tự cho textures, course-media, images).

Chạy script sau khi thêm/sửa file media local, trước khi deploy hoặc khi cần cập nhật CDN.
