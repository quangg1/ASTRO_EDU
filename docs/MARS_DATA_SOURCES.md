# Mars — nguồn dữ liệu & CDN

Tài liệu ghi lại **URL cố định**, **cách dùng**, và **cái gì nên tải về rồi host trên CDN** (không hotlink production lâu dài nếu bandwidth/policy không kiểm soát được).

---

## ① Texture — globe → regional

### Dùng nhanh (ảnh PNG/JPG equirectangular, bọc `SphereGeometry`)

| Nguồn | Link | Ghi chú | CDN |
|------|------|---------|-----|
| Solar System Scope — Mars | https://www.solarsystemscope.com/textures/ | CC BY 4.0, diffuse + normal, 8K | **Nên:** tải bản phân phối chính thức → đặt trên CDN của bạn |
| Planet Pixel Emporium — Mars | https://planetpixelemporium.com/mars.html | Free **non-commercial**; diffuse / bump / spec tách file | **Nên:** tải → CDN (kiểm tra license production) |

### Nguồn “science-grade”, thường cần xử lý file

| Nguồn | Link | Định dạng | CDN |
|------|------|-----------|-----|
| Viking MDIM 2.1 Color Mosaic (global ~232 m) | https://astrogeology.usgs.gov/search/map/Mars/Viking/MDIM21/Mars_Viking_MDIM21_ClrMosaic_global_232m | GeoTIFF → **convert** PNG/JPG/WebP tiled hoặc một equi-res vừa phải | **Bắt buộc:** tải USGS → convert → CDN |
| CTX Global Mosaic (Murray Lab) | https://astrogeology.usgs.gov/search/map/mars-mro-ctx-global-mosaic-murray-lab-v1 | Tiles cực lớn (~TB tổng) — chỉ tile theo vùng/site | **Bắt buộc:** chỉ tile cần thiết → CDN hoặc tile server riêng |
| HiRISE (ảnh site cực nét) | https://www.uahirise.org/ | Ảnh theo observation | URL theo từng product; **production:** mirror có chọn lọc lên CDN |

Công cụ tìm/map HiRISE (bổ sung):

- https://global-data.mars.asu.edu/bin/hirise.pl

---

## ② Địa chất theo kỳ (epoch / khí hậu)

### Bản đồ đơn vị địa chất chính thức (SIM 3292)

| Nội dung | Link | CDN |
|----------|------|-----|
| USGS SIM 3292 — Geologic Map of Mars | https://pubs.usgs.gov/sim/3292/ | **Bắt buộc:** tải shapefile/GIS bundle → xử lý offline → **cache kết quả** epoch/unit per lat/lng trong DB (không có REST “epoch tại điểm” chuẩn một nút) |

### Mô hình khí hậu / scenario (ước tính, không đo cổ đại trực tiếp)

| Nội dung | Link | CDN |
|----------|------|-----|
| Mars Climate Database (MCD), LMD | https://www-mars.lmd.jussieu.fr/mcd_python/ | Curate **một lần** theo papers/scenario → lưu JSON/DB; **không** gọi realtime cho mọi page load nếu không cần |

---

## ③ Site — ảnh & mô tả per location

### Ảnh orbital / NASA (nhãn UI: ảnh thực tại thời hiện đại)

| Nguồn | Link | API / scrape | CDN |
|-------|------|--------------|-----|
| HiRISE | https://www.uahirise.org/ | Tìm theo feature | Deep link hoặc mirror asset đã chọn |
| NASA Photojournal | https://photojournal.jpl.nasa.gov/ | Theo caption/metadata | URL JPEG stable thường dùng được; **CDN:** optional mirror |
| NASA Images API | `https://images-api.nasa.gov/search?q=<keyword>` | REST | Trả về link media — **CDN:** optional cache ảnh đã chọn cho Studio |

### Minh họa / reconstruction (nhãn UI bắt buộc: không phải ảnh chụp cổ đại)

| Nguồn | Link | CDN |
|-------|------|-----|
| NASA Scientific Visualization Studio | https://svs.gsfc.nasa.gov/ | Tải asset đã chọn → CDN |
| ESA Mars Express (HRSC, perspective) | https://www.esa.int/Enabling_Support/Operations/Mars_Express | Tuân license ESA → CDN nếu redistribute |

---

## Tóm tắt “info vs tải về”

| Loại | Lấy được info/link ngay | Cần bạn tải → CDN / DB |
|------|-------------------------|-------------------------|
| SSS / Planet Pixel textures | Có URL trang + thường file cố định sau khi mua/tải | **Nên** host file texture trên CDN |
| Viking MDIM / CTX mosaic | Metadata & download portal | **Có** — file GIANT / tiled |
| HiRISE per site | Trang search + product URLs | Không bắt buộc toàn bộ; chỉ mirror ảnh đã curate |
| SIM 3292 epoch | Publication + download GIS | **Có** shapefile → pipeline turf/backend → DB |
| MCD | Web/Python interface | Curate output → DB |
| NASA Images API | JSON có `href` ảnh | Studio pick → optional CDN cache |
| Photojournal | JPEG URLs | Thường dùng trực tiếp; CDN optional |

---

## Gợi ý workflow CDN trong CosmoLearn

1. **Globe diffuse (+ optional normal/spec)** một bản ~2–8K equi — một URL CDN (`/textures/mars/...`).
2. **Regional/site:** chỉ asset đã chọn (HiRISE crop, một tile CTX nếu có) — không đồng bộ whole-archive.
3. **Địa chất:** không đặt shapefile nguyên trên CDN cho client; chỉ đặt **kết quả đã query** trong API/DB.

---

## Badge ảnh (để UI không misleading)

Ánh xạ type → nhãn tiếng Việt (implement trong app khi có field):

| Type | Nhãn gợi ý |
|------|------------|
| `orbital-photo` | Ảnh orbital NASA — bề mặt hiện đại |
| `rover-photo` | Ảnh rover (Curiosity / Perseverance, …) |
| `artist-reconstruction` | Phục dựng / minh họa — không phải ảnh chụp cổ đại |
| `scientific-model` | Mô hình / ước tính — không phải đo trực tiếp |

---

*Cập nhật theo yêu cầu ghi link & phân loại CDN — có thể bổ sung DOI/paper cụ thể per stage sau.*
