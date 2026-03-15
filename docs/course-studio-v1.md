# Course Studio v1

## Muc tieu
- Teacher co the tu chinh sua noi dung course ma khong can dev.
- Luu truc tiep vao `courses-service` de student view dung ngay.

## URL
- `GET /studio`: danh sach khoa hoc de vao editor.
- `GET /studio/:slug`: man hinh sua lesson theo block.

## API moi
- `GET /api/courses/:slug/editor` (auth): lay full course cho editor (ke ca unpublished).
- `PUT /api/courses/:slug/editor` (auth): luu metadata course + toan bo lessons.

## Kha nang hien tai
- Sua metadata course: title, description, level.
- Quan ly lessons: them/xoa lesson, cap nhat title/slug/week/type/video/stageTime/content.
- Quan ly slides/sections trong lesson: them/xoa text-image-video section.
- Save vao DB bang nut `Luu khoa hoc`.
- Link xem ngay student view (`/courses/:slug`).

## Ghi chu
- Ban v1 chua co role `teacher/admin` rieng, hien tai dung user da dang nhap.
- Nen bo sung versioning + draft workflow o ban v1.1.
