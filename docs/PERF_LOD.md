# Hiệu năng khi có hàng nghìn thực thể (LOD)

## Nguyên tắc

Không ẩn thực thể để tiết kiệm. Mỗi thực thể được vẽ bằng dạng rẻ nhất đủ cho kích thước nó chiếm trên màn hình:

| Tier | Khi nào | Vẽ bằng | Chi phí |
| --- | --- | --- | --- |
| `point` | bán kính < ~3 px, hoặc ngoài khung nhìn | một `Points` chung cho mọi thực thể (`ShowcaseEntityPoints`) | 1 draw call cho cả nghìn thực thể, vẫn bấm chọn được |
| `globe` | ~3–28 px | `ShowcaseDiffuseGlobe` (quả cầu + texture) | tối đa `globeBudget` = 120 |
| `model` | > ~28 px và có GLB | `ShowcaseModelEntityMesh` | tối đa `modelBudget` = 6 GLB cùng lúc |

- Nhãn HTML chỉ cho `labelBudget` = 24 thực thể lớn nhất trên màn hình + thực thể đang chọn.
- Đường quỹ đạo chỉ vẽ cho thực thể đang có nhãn.
- Thực thể đang chọn luôn có nhãn và bắt đầu tải GLB ngay lúc camera bay tới.
- Ngưỡng vào/ra khác nhau (hysteresis) để không nhấp nháy khi zoom.
- GLB không còn dùng được giải phóng khỏi GPU sau 30 giây (`gltfAssetCache.ts`).

Logic nằm trong `client/src/features/content3d/showcase/lib/entityLod.ts` (hàm thuần, có test: `npm run test:lod`).
Ngưỡng và ngân sách chỉnh ở `DEFAULT_LOD_THRESHOLDS` / `DEFAULT_LOD_BUDGETS`.

## Đo

Mở `/explore?stress=2000` để thêm 2.000 thực thể giả (quỹ đạo vành đai tiểu hành tinh).

Đo ngày 24/11/2026 trong Chrome headless dùng GPU giả lập phần mềm (SwiftShader) — số tuyệt đối thấp hơn máy thật nhiều, chỉ dùng để so sánh:

| Thực thể thêm | Code cũ: FPS / nhãn HTML / heap JS | Code mới: FPS / nhãn HTML / heap JS |
| --- | --- | --- |
| 0 | 27,2 / 8 / 99 MB | 25,5 / 8 / 99 MB |
| 500 | 1,7 / 1.008 / 468 MB | 11,5 / 56 / 173 MB |
| 2.000 | 0,2 / 4.008 / 612 MB | 14,3 / 56 / 196 MB |

## Asset GLB

Trước khi đưa GLB tải từ web lên CDN:

```bash
cd client
npm run optimize:glb -- duong/dan/models --out assets-optimized --max-texture 2048 \
  --source "https://..." --license "CC BY 4.0"
```

Script gộp dữ liệu trùng, bỏ phần thừa, hàn đỉnh, (tuỳ chọn `--simplify 0.5`) giảm tam giác, thu texture về tối đa 2048 px dạng WebP và nén lưới Meshopt; ghi kèm `<tên>.meta.json` với nguồn và giấy phép.

Runtime đọc được Draco, Meshopt (drei mặc định) và KTX2 (`initKtx2Support`, transcoder ở `public/basis/`, copy tự động bởi `npm run copy:basis`). Muốn texture nằm nén trên GPU (tiết kiệm bộ nhớ hơn WebP), cần thêm bước mã hoá KTX2 bằng công cụ `toktx` của KTX-Software.
