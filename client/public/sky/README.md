# Dữ liệu bầu trời — Explore `view=sky`

Đối chiếu với **Stellarium Web** (fisheye 185°, đứng trên mặt đất quay 360°). Renderer Three.js **không cần WASM**; chất lượng phụ thuộc **file data** bên dưới.

## CDN (khuyến nghị production)

Giống `textures/`, `images/`, … — **file nặng không commit Git**; upload prefix **`/sky/`** lên bucket/CDN (`NEXT_PUBLIC_MEDIA_CDN`).

```powershell
# Từ repo root (AWS CLI đã configure)
.\scripts\sync-media-to-s3.ps1
```

App: `getSkyAssetUrl('/sky/...')` → CDN khi có env, không thì `client/public/sky/` local.

**Giữ trong repo:** `README.md`, `western_sky_culture/index.json` (cho `npm run sky:build-western-bridge`).  
**Build local:** `npm run sky:build-hip-bright` → `data/hip-bright.json` rồi sync lên CDN.

---

## Đánh giá nhanh: app đang thiếu gì?

| Hạng mục | Stellarium | Hiện tại | Bạn cần bổ sung |
|----------|------------|----------|------------------|
| **Projection** | Stereographic 185° | Đã có cube + stereographic shader | — |
| **Landscape** | Ảnh 360° thật (cỏ, cây, nhà) | **`landscape.webp`** (4096×2048 equirect) | Thay bằng panorama Stellarium/địa điểm thật (tùy chọn) |
| **Sao nền** | Gaia / Hipparcos ~100k+ | ~35 sao có tên + ~3500 điểm giả | **`hip-bright.json`** (khuyến nghị) |
| **Nhãn sao** | Hàng nghìn theo mag | ~35 tên | Cùng catalog HIP |
| **Hành tinh / Mặt Trời / Trăng** | Ephemeris chính xác | **astronomy-engine** (đã gắn) | — |
| **Milky Way** | Survey texture | Band procedural mờ | **`milkyway.webp`** (tùy chọn) |
| **Chòm sao (lines)** | Skyculture + HIP | **88 chòm phương Tây** (`western_sky_culture/index.json`) | — |
| **Art chòm** | illustrations/*.webp | WebP tại `western_sky_culture/` | Overlay UI (tùy chọn) |
| **Atmosphere** | Model khí quyển | Gradient theo độ cao Mặt Trời | — |
| **DSO** (LMC, SMC, M42…) | Catalog DSO | Chưa có | **`dso/`** hoặc pack Stellarium |

---

## 1. Landscape (ưu tiên cao nhất)

**Đường dẫn:**

```
client/public/sky/landscape.webp
```

(hoặc `.jpg` / `.png`)

| Thuộc tính | Yêu cầu |
|------------|---------|
| Kiểu | **Equirectangular 360°** |
| Tỉ lệ | **2:1** (vd. 4096×2048) |
| Bố cục | **Chân trời ở giữa chiều cao**; nửa dưới = đất |

**Đang dùng:** [`bahia_de_cadiz/`](bahia_de_cadiz/) — gói Stellarium (`landscape.ini` + `bahia.png` RGBA). Pipeline: `skyLandscapePack.ts` → `LandscapeLowerHemisphere` (UV spherical + alpha). Fallback URL: `getSkyLandscapeUrls()` trong `skyAssets.ts` (resolve CDN).

**Cách lấy giống ảnh Stellarium:** landscape **Guéreins** — tiles `https://data.stellarium.org/landscapes/guereins` hoặc thư mục `landscapes/guereins` trong repo [stellarium-web-engine](https://github.com/Stellarium/stellarium-web-engine), ghép thành **một** panorama 2:1.

---

## 2. Catalog sao (HIP / Tycho)

**Đường dẫn:**

```
client/public/sky/data/hip-bright.json   ← app fetch file này
client/public/sky/data/hygdata_v41.csv   ← nguồn (không dùng trực tiếp trên web)
```

Sau khi đặt CSV, chạy từ `client/`: `npm run sky:build-hip-bright`

**Schema mỗi dòng:**

```json
{
  "hip": 32349,
  "raDeg": 101.287,
  "decDeg": -16.716,
  "mag": -1.46,
  "bv": 0.0,
  "name": "Sirius"
}
```

| Gợi ý | Nội dung |
|-------|----------|
| Số lượng | Mag ≤ 6.5 → ~5 000–8 000 sao (file ~500KB–2MB gzip) |
| Nguồn | [Hipparcos](https://www.cosmos.esa.int/web/hipparcos/catalogues), Yale BSC, hoặc export từ Stellarium `skydata/stars` |

Nếu không gửi file: app chỉ dùng vài chục sao trong code + điểm nền giả.

---

## 3. Skyculture Western (đã tích hợp)

**Thư mục:**

```
client/public/sky/western_sky_culture/
  index.json          # 88 chòm IAU, lines = chuỗi HIP
  *.webp              # minh họa (Stellarium: illustrations/*.webp)
```

Client: `westernSkyCulture.ts` + `hip-bright.json` → đường nối chòm đang chọn trên `/explore?view=sky`.

Cần **`hip-bright.json`** (mục 2) — 691 HIP trong culture, đều có trong catalog mag ≤ 6.5.

Ảnh trong JSON dùng path `illustrations/…`; file thực tế nằm ở thư mục gốc culture (resolver trong code).

---

## 4. Milky Way (tùy chọn)

```
client/public/sky/milkyway.webp
```

Equirect 2:1, band nhìn galactic plane, có thể lấy từ Stellarium `skydata/surveys/milkyway`.

---

## 5. Ephemeris (Mặt Trời, Trăng, hành tinh)

Đã dùng npm **`astronomy-engine`** (`skyAstronomy.ts`, `skyEphemeris.ts`). Không cần file ephemeris riêng.

---

## 6. Observer (không cần file)

Trên URL:

```
/explore?view=sky&lat=10.8&lon=106.66&time=2026-05-02T16:44:00+07:00
```

Mặc định: gần TP.HCM, giờ hiện tại.

---

## Thứ tự nên gửi

1. **`landscape.webp`** — thay đổi lớn nhất (mặt đất).  
2. **`hip-bright.json`** — sao đúng vị trí, đủ nhãn.  
3. **`western_sky_culture/`** — đã có; bổ sung overlay art nếu cần.  
4. **`milkyway.webp`** — tinh vân Ngân Hà.

Sau khi copy file → reload `/explore?view=sky` (không cần WASM).
