# Live2D avatar (nito) — CosmoLearn AI

## Cấu trúc

```
client/public/live2d/
  nito.model3.json
  motion/          (21 *.motion3.json)
  nito/            (moc3, textures, pose, cdi)
  scripts/live2dcubismcore.min.js
```

App load: **`/live2d/nito.model3.json`** (hoặc CDN khi có `NEXT_PUBLIC_MEDIA_CDN`).

## Upload lên CDN (S3)

**Chưa tự upload** — chạy thủ công từ root repo (cần AWS CLI):

```powershell
$env:S3_MEDIA_BUCKET = "astro-edu-media"   # bucket của bạn
.\scripts\sync-media-to-s3.ps1
```

Script sync cả folder `live2d/` → `s3://<bucket>/live2d/` (cùng với models, videos, …).

Sau sync, URL ví dụ:

`https://<bucket>.s3.<region>.amazonaws.com/live2d/nito.model3.json`

Đặt `NEXT_PUBLIC_MEDIA_CDN` trùng base URL bucket/CDN. Code thử CDN trước, lỗi thì fallback `/live2d/...` trên Next.js.

Chi tiết: `docs/MEDIA_CLOUD.md`

## Checklist file local

| File | Trạng thái |
|------|------------|
| `nito.model3.json` | OK |
| `motion/*.motion3.json` (21) | OK |
| `scripts/live2dcubismcore.min.js` | OK |
| `nito/nito.moc3` | OK |
| `nito/nito.pose3.json` | OK |
| `nito/nito.cdi3.json` | OK |
| `nito/nito.2048/texture_*.png` | OK |
