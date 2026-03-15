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

## 3. Cấu hình app (Next.js client)

Thêm biến môi trường base URL cho static media (trong `client/.env` hoặc `client/.env.local`):

```env
# Base URL media trên cloud (không có dấu / ở cuối)
# VD S3: https://astro-edu-media.s3.ap-southeast-1.amazonaws.com
# VD CloudFront: https://d123xxx.cloudfront.net
NEXT_PUBLIC_MEDIA_CDN=https://your-cdn-or-bucket-url.com
```

App đã dùng **`getStaticAssetUrl(path)`** và **`resolveMediaUrl(url)`** từ `@/lib/apiConfig` cho mọi static asset (models, textures, images, course-media) và cho URL media trong bài học (ảnh/video/model upload từ editor).

- Nếu **chưa set** `NEXT_PUBLIC_MEDIA_CDN`: app dùng path local (vd `/models/xxx.glb`) từ `client/public/`.
- Khi **đã set**: app load tất cả static media từ CDN; upload từ editor (POST /upload) trả về URL từ S3 khi API cấu hình S3 (xem mục 3b).

### 3b. Cấu hình API (upload lên S3)

Khi teacher/admin upload ảnh/video/model trong editor, API có thể lưu lên S3 thay vì ổ đĩa local. Trong thư mục `services/api` (hoặc nơi chạy API), set:

```env
S3_MEDIA_BUCKET=astro-edu-media
AWS_REGION=ap-southeast-1
# Nếu không dùng default credential chain (vd EC2 IAM role):
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
# Base URL trả về cho client (không có / ở cuối). Nếu không set, dùng https://<bucket>.s3.<region>.amazonaws.com
MEDIA_CDN_URL=https://astro-edu-media.s3.ap-southeast-1.amazonaws.com
```

- **Có set** `S3_MEDIA_BUCKET`: file upload qua POST /upload được ghi lên S3 prefix `files/`, response trả về `url` dạng full CDN (client dùng trực tiếp).
- **Không set**: file lưu local thư mục `uploads/`, response trả về `url: "/files/xxx"` (client sẽ prefix với API base).

---

## 4. Hướng dẫn AWS S3

### Bước 1: Tạo bucket

1. Vào [AWS Console](https://console.aws.amazon.com/s3) → **Create bucket**.
2. **Bucket name**: ví dụ `astro-edu-media` (tên global phải unique).
3. **Region**: chọn gần user (vd `ap-southeast-1`).
4. **Block Public Access**: bỏ chọn “Block all public access” (để truy cập qua URL public), tick xác nhận.
5. **Create bucket**.

### Bước 2: Cho phép đọc public (public read)

1. Vào bucket vừa tạo → **Permissions** → **Bucket policy**.
2. Dán policy sau (thay `astro-edu-media` bằng tên bucket của bạn):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::astro-edu-media/*"
    }
  ]
}
```

3. **Save changes**.

### Bước 3: CORS (để trình duyệt load được)

1. Cùng bucket → **Permissions** → **CORS**.
2. Dán:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

3. **Save changes**.

### Bước 4: Upload media (AWS CLI)

Cài [AWS CLI](https://aws.amazon.com/cli/), cấu hình `aws configure` (Access Key, Secret Key, region). Từ thư mục gốc project:

```bash
BUCKET=astro-edu-media
PUBLIC=client/public

aws s3 sync $PUBLIC/course-media s3://$BUCKET/course-media --acl public-read
aws s3 sync $PUBLIC/models       s3://$BUCKET/models       --acl public-read
aws s3 sync $PUBLIC/textures     s3://$BUCKET/textures     --acl public-read
aws s3 sync $PUBLIC/images       s3://$BUCKET/images       --acl public-read
```

Hoặc dùng script có sẵn (xem mục 7 bên dưới):

```bash
node scripts/sync-media-to-s3.js
```

### Bước 5: URL và biến môi trường

URL file sẽ có dạng:

```
https://<bucket>.s3.<region>.amazonaws.com/models/allosaurus.glb
```

Base URL (không có dấu `/` cuối):

```
https://astro-edu-media.s3.ap-southeast-1.amazonaws.com
```

Thêm vào `client/.env.local`:

```env
NEXT_PUBLIC_MEDIA_CDN=https://astro-edu-media.s3.ap-southeast-1.amazonaws.com
```

(Thay tên bucket và region cho đúng.)

### Bước 6 (tùy chọn): CloudFront CDN

Để nhanh hơn và có HTTPS đẹp:

1. AWS Console → **CloudFront** → **Create distribution**.
2. **Origin domain**: chọn bucket `astro-edu-media.s3.ap-southeast-1.amazonaws.com`.
3. **Origin access**: chọn “Origin access control settings”, tạo OAC nếu cần.
4. Tạo distribution, đợi deploy xong.
5. Lấy **Distribution domain** (vd `d1234abcd.cloudfront.net`).
6. Trong `client/.env.local` dùng:
   ```env
   NEXT_PUBLIC_MEDIA_CDN=https://d1234abcd.cloudfront.net
   ```

---

## 7. Script sync media lên S3

Dùng script trong repo (cần cài [AWS CLI](https://aws.amazon.com/cli/) và chạy `aws configure`):

```bash
# Windows (PowerShell)
.\scripts\sync-media-to-s3.ps1

# macOS/Linux
./scripts/sync-media-to-s3.sh
```

Hoặc set biến môi trường rồi chạy tay (từ thư mục gốc project):

```bash
set S3_MEDIA_BUCKET=astro-edu-media
aws s3 sync client/public/course-media s3://%S3_MEDIA_BUCKET%/course-media --acl public-read
aws s3 sync client/public/models       s3://%S3_MEDIA_BUCKET%/models       --acl public-read
aws s3 sync client/public/textures    s3://%S3_MEDIA_BUCKET%/textures    --acl public-read
aws s3 sync client/public/images      s3://%S3_MEDIA_BUCKET%/images      --acl public-read
```

---

## 8. Gợi ý: Cloudinary (nhanh)

1. Đăng ký [cloudinary.com](https://cloudinary.com), tạo cloud (free).
2. Dashboard → Media Library → Upload → upload từng thư mục `course-media`, `models`, `textures`, `images` (có thể kéo thả cả folder nếu giao diện hỗ trợ, hoặc dùng Upload API).
3. Lấy **Base URL** (Settings → Access → hoặc URL dạng `https://res.cloudinary.com/<cloud_name>/image/upload`). Với raw file (.glb) có thể dùng delivery URL tương ứng (xem tài liệu Cloudinary cho “raw”/file).
4. Đặt trong `client/.env.local`:
   ```env
   NEXT_PUBLIC_MEDIA_CDN=https://res.cloudinary.com/your-cloud-name/image/upload/v1/astro-edu
   ```
   (thay `your-cloud-name` và folder `astro-edu` nếu bạn đặt tên khác).

---

## 9. Push lại Git

Sau khi đã bỏ media khỏi Git và commit (như đã làm):

```bash
git push origin main
```

Repo sẽ nhẹ hơn; media chỉ nằm trên cloud và trên máy local (trong `client/public/`) khi cần chạy dev.

---

## 10. Đồng bộ media lên cloud (tùy chọn)

Có thể viết script (Node hoặc shell) để sync thư mục local → cloud:

- **Cloudinary**: dùng `cloudinary` SDK, duyệt file trong `client/public/models`, `client/public/textures`, … và upload từng file, giữ path (public_id).
- **S3**: `aws s3 sync client/public/models s3://bucket/models --acl public-read` (và tương tự cho textures, course-media, images).

Chạy script sau khi thêm/sửa file media local, trước khi deploy hoặc khi cần cập nhật CDN.
