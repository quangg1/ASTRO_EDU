# Solar Journey — media trên cloud (CDN)

Mọi file **ảnh / model 3D / âm thanh** cho milestone **không** commit vào repo; upload lên bucket (S3) + phân phối qua **CloudFront** (hoặc tương đương).

## Biến môi trường (client)

- `NEXT_PUBLIC_MEDIA_CDN` — URL gốc CDN **không** dấu `/` cuối, ví dụ: `https://d123.cloudfront.net`
- App ghép: `{NEXT_PUBLIC_MEDIA_CDN}{path}` qua `getStaticAssetUrl()` / `resolveMediaUrl()` trong `src/lib/apiConfig.ts`

## Quy ước thư mục trên bucket (gợi ý)

```
/journey/
  milestones/
    {milestoneId}/
      hero.webp          # ảnh bìa (ưu tiên webp; jpg được)
      poster.webp        # thumbnail list (tuỳ chọn)
      scene.glb          # model 3D (GLB khuyến nghị)
      narration.mp3      # giọng đọc / ambient (tuỳ chọn)
```

`milestoneId` trùng field `id` trong `src/lib/solarJourneyData.ts` (ví dụ `m-mer-in-01`).

## Gán vào dữ liệu

Trong `JourneyMilestone.media`:

```ts
media: {
  heroImage: '/journey/milestones/m-mer-in-01/hero.webp',
  modelGlbUrl: '/journey/milestones/m-mer-in-01/scene.glb',
  audioUrl: '/journey/milestones/m-mer-in-01/narration.mp3',
}
```

- Path bắt đầu bằng `/` → resolve qua CDN.
- Hoặc dùng **full URL** `https://...` → `resolveMediaUrl` giữ nguyên.

## Bạn cần cung cấp (khi sẵn sàng)

| Loại | Định dạng | Ghi chú |
|------|-----------|--------|
| Ảnh hero | webp / jpg, ~1200px ngang | Tỉ lệ 16:9 hoặc gần |
| Poster | webp nhỏ | Tuỳ chọn |
| Model | **GLB** (một file) | Tối ưu polygon + texture kích thước |
| Audio | mp3 / ogg | Bitrate vừa phải cho web |

**Chưa có file:** để trống `media` — UI vẫn chạy (chỉ text).

## Bảo mật & vận hành

- Bucket: public-read **chỉ** prefix `/journey/*` hoặc chỉ CloudFront OAC.
- Versioning: khi thay file, đổi tên path hoặc cache-bust query (tuỳ pipeline).

## Đồng bộ tiến độ (sau này)

Hiện tại milestone hoàn thành lưu `localStorage`. Khi có API user: POST `/api/journey/milestones/complete` + lưu server; key `cosmo-solar-journey-milestones-v1` có thể migrate.
