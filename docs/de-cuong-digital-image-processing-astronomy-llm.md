# Đề cương: Digital Image Processing cho Ảnh Thiên văn học có sử dụng LLM để Detect

Tài liệu đề cương môn học / dự án: Xử lý ảnh số cho ảnh thiên văn, tích hợp LLM (Vision-Language Model) để phát hiện và nhận dạng đối tượng.

---

## Tổng quan

| Thông tin | Chi tiết |
|-----------|----------|
| **Môn học / Dự án** | Digital Image Processing for Astronomical Images |
| **Công nghệ bổ trợ** | LLM / VLM (Vision-Language Model) cho detection |
| **Đối tượng** | Sinh viên CNTT / Thiên văn học / Khoa học dữ liệu |

---

## Chương 1. Giới thiệu & Cơ sở toán học

### 1.1. Tổng quan xử lý ảnh số (DIP)
- Định nghĩa ảnh số: ma trận pixel, độ sâu bit (8-bit, 16-bit, 32-bit float)
- Không gian màu: RGB, Grayscale, FITS (astronomical)
- Các phép toán cơ bản: cộng, trừ, nhân ảnh; convolution

### 1.2. Đặc điểm ảnh thiên văn
- Ảnh FITS (Flexible Image Transport System): cấu trúc file, header, data
- Ảnh CCD/CMOS: noise, dark current, flat field, bias
- Độ sáng thấp: tín hiệu yếu trên nền tối
- Phạm vi động rộng: vùng sáng (sao) vs vùng tối (nền trời)
- Cosmic rays: điểm sáng nhiễu từ tia vũ trụ

### 1.3. Cơ sở toán học
- Fourier transform trong 2D, ý nghĩa với ảnh thiên văn
- Convolution và correlation
- Các metric: SNR (Signal-to-Noise Ratio), FWHM (Full Width at Half Maximum)
- PSF (Point Spread Function) – hàm lan truyền điểm

---

## Chương 2. Tiền xử lý ảnh thiên văn (Pre-processing)

### 2.1. Calibration
- **Bias**: trừ offset thiết bị
- **Dark**: trừ dark current (phụ thuộc nhiệt độ, thời gian phơi sáng)
- **Flat**: chuẩn hóa độ nhạy pixel (flat field correction)
- Công thức: **Calibrated = (Raw - Bias - Dark) / Flat**
- Thực hành với thư viện: `astropy`, `ccdproc`, `photutils`

### 2.2. Alignment & Stacking
- Căn chỉnh ảnh (registration): tìm transformation (shift, rotate, scale) giữa các frame
- Stacking: trung bình / median stack để giảm noise
- Drizzle / Super-resolution stacking (HST)
- Công cụ: `astroalign`, `stretch`, `ImageStacker`

### 2.3. Noise reduction (Giảm nhiễu)
- Gaussian blur, median filter
- Bilateral filter, Non-local means
- Wavelet denoising
- Cân bằng với giữ chi tiết (sao mờ vs sắc nét)

---

## Chương 3. Các kỹ thuật Detection truyền thống

### 3.1. Source detection (Phát hiện nguồn sáng)
- **Thresholding**: ngưỡng đơn giản, adaptive threshold
- **SExtractor / Source Extractor**: thuật toán nổi tiếng trong thiên văn
- **DAOFIND / IRAF**: tìm sao dạng điểm
- **Photutils (Python)**: `DAOStarFinder`, `IRAFStarFinder`, `StarFinder`
- Blob detection: Laplacian of Gaussian (LoG)

### 3.2. Segmentation & Object detection
- Phân vùng ảnh (image segmentation)
- Watershed, region growing
- K-means, DBSCAN trên không gian (x, y, intensity)
- Deblending: tách các nguồn sáng chồng lấn

### 3.3. Catalog & Photometry
- Đo độ sáng: aperture photometry, PSF photometry
- Tạo catalog: vị trí (RA, Dec), magnitude, FWHM
- Matching với catalog chuẩn (Gaia, SIMBAD)

---

## Chương 4. Machine Learning & Deep Learning cho ảnh thiên văn

### 4.1. Học máy cổ điển
- Feature extraction: HOG, SIFT, texture
- Classifier: SVM, Random Forest
- Ứng dụng: phân loại thiên hà (spiral / elliptical / irregular)

### 4.2. Convolutional Neural Networks (CNN)
- Kiến trúc: VGG, ResNet, EfficientNet
- Transfer learning từ ImageNet
- Ứng dụng: phân loại thiên hà, tìm transient (supernova, asteroid), tìm exoplanet
- Dataset: Galaxy Zoo, DES, LSST simulated data

### 4.3. Object Detection với CNN
- Two-stage: R-CNN, Faster R-CNN
- One-stage: YOLO, SSD, RetinaNet
- Ứng dụng: detect galaxy, star, artifact, cosmic ray

### 4.4. Segmentation với Deep Learning
- U-Net, FCN, Mask R-CNN
- Segment galaxy, star field, nebula regions
- Semantic vs instance segmentation

---

## Chương 5. Tích hợp LLM / VLM cho Detection

### 5.1. Khái niệm LLM & VLM
- **LLM (Large Language Model)**: GPT, LLaMA, Mistral – xử lý ngôn ngữ
- **VLM (Vision-Language Model)**: kết hợp ảnh + text – GPT-4V, LLaVA, Qwen-VL, Claude 3
- Multimodal: đầu vào ảnh, đầu ra text / structured data

### 5.2. Vai trò của VLM trong detection thiên văn
- **Zero-shot detection**: mô tả đối tượng bằng ngôn ngữ, mô hình tìm trên ảnh
- **Classification với prompt**: "Đây có phải thiên hà xoắn ốc không?"
- **Bounding box / region description**: "Vùng này có gì?" – trích xuất vùng quan tâm
- **Caption & explanation**: mô tả nội dung ảnh, giúp validate kết quả detection
- **Query-driven detection**: "Tìm tất cả các ngôi sao sáng nhất trong ảnh"

### 5.3. Kiến trúc pipeline đề xuất
```
[Ảnh thiên văn] 
    → [Pre-processing: Calibration, Stacking]
    → [Traditional / DL detection] (sơ bộ)
    → [VLM analysis] 
        - Input: ảnh + prompt (mô tả đối tượng cần detect)
        - Output: bbox, label, confidence, mô tả
    → [Fusion / Validation] 
    → [Catalog / Report]
```

### 5.4. Prompt engineering cho thiên văn
- Prompt chuẩn hóa: "Identify all stars, galaxies, and nebulae in this astronomical image. Provide bounding boxes and labels."
- Domain-specific prompt: "Detect cosmic rays (bright streaks or dots) in this CCD image."
- Few-shot: đưa vài ví dụ ảnh + kết quả trong prompt
- Structured output: JSON schema cho bbox, labels

### 5.5. API & Công cụ
- OpenAI GPT-4V, Gemini, Claude Vision
- Open-source: LLaVA, Qwen-VL, InternVL
- Local: Ollama + LLaVA, LM Studio
- Cloud free tier: OpenRouter (`openrouter/free` hoặc model VLM `:free`)

### 5.6. Hạn chế & Giải pháp
- **Độ phân giải**: VLM thường resize ảnh → mất chi tiết
  - Giải pháp: chia ảnh thành tiles, detect từng vùng rồi merge
- **Domain gap**: VLM train trên ảnh thường, ảnh thiên văn khác biệt
  - Giải pháp: fine-tune, adapt với ảnh thiên văn có label
- **Độ chính xác**: VLM có thể hallucinate
  - Giải pháp: kết hợp với detection truyền thống / DL, human-in-the-loop

---

## Chương 6. Use cases & Ứng dụng thực tế

### 6.1. Phát hiện sao (Star detection)
- Detection: Photutils / VLM hỗ trợ validate
- Prompt: "List all point-like sources (stars) with their approximate positions."

### 6.2. Phân loại thiên hà (Galaxy classification)
- Morphology: spiral, elliptical, irregular
- VLM: "Classify the morphology of the galaxy in this image."

### 6.3. Phát hiện Cosmic Ray
- Detection: median stack diff, sigma clipping
- VLM: "Are there any cosmic ray artifacts (bright streaks, hot pixels) in this image?"

### 6.4. Phát hiện Transient / Anomaly
- Supernova, asteroid, satellite streak
- VLM: "Identify any unusual or transient objects in this image."
- Kết hợp: difference imaging + VLM để giảm false positive

### 6.5. Giải thích & Giáo dục
- VLM: "Explain what objects are visible in this image and their significance."
- Tích hợp vào nền tảng học thiên văn (e.g. Galaxies Edu): AI giải thích ảnh cho người dùng

---

## Chương 7. Công cụ & Công nghệ

### 7.1. Thư viện Python
| Thư viện | Mục đích |
|----------|----------|
| `astropy` | Đọc FITS, WCS, calibration |
| `ccdproc` | Calibration ảnh CCD |
| `photutils` | Source detection, photometry |
| `scikit-image` | Xử lý ảnh tổng quát |
| `opencv-python` | Image processing, computer vision |
| `transformers`, `openai` | Gọi VLM/LLM API |

### 7.2. Môi trường & Framework
- Python 3.10+
- PyTorch / TensorFlow cho DL
- Jupyter / Colab cho thử nghiệm
- FastAPI / Flask cho API service

### 7.3. Dataset mẫu
- SDSS, Hubble Legacy Archive
- Galaxy Zoo
- LSST simulated data
- Ảnh từ kính thiên văn nghiệp dư (định dạng FITS, CR2)

---

## Chương 8. Dự án thực hành & Đề tài

### 8.1. Dự án 1: Pipeline Calibration + Star Detection
- Đầu vào: raw FITS từ CCD
- Đầu ra: catalog sao (vị trí, magnitude)
- Tích hợp: gửi vùng quanh mỗi sao cho VLM để validate / mô tả

### 8.2. Dự án 2: Galaxy Classification với VLM
- Đầu vào: ảnh thiên hà
- Pipeline: CNN pre-classify → VLM refine & explain
- Đầu ra: label (spiral/elliptical/irregular) + mô tả ngắn

### 8.3. Dự án 3: Cosmic Ray Detection hỗ trợ VLM
- Traditional: sigma clipping, median stack
- VLM: "Identify cosmic ray artifacts" trên ảnh đã crop
- So sánh precision/recall: traditional vs VLM vs hybrid

### 8.4. Dự án 4: AI Tutor ảnh thiên văn (gắn với Galaxies Edu)
- User upload ảnh
- Backend: pre-process → detect → gọi VLM
- Response: danh sách đối tượng + giải thích bằng ngôn ngữ tự nhiên

---

## Thời lượng gợi ý (nếu là môn học)

| Chương | Số buổi | Ghi chú |
|--------|---------|--------|
| 1. Giới thiệu & Cơ sở | 2–3 | Lý thuyết + ví dụ ảnh |
| 2. Pre-processing | 3–4 | Thực hành calibration |
| 3. Detection truyền thống | 3–4 | Photutils, SExtractor |
| 4. ML/DL | 4–5 | CNN, object detection |
| 5. LLM/VLM | 3–4 | API, prompt, pipeline |
| 6. Use cases | 2 | Seminar / case study |
| 7. Công cụ | 1 | Lab setup |
| 8. Dự án | 4–6 | Làm nhóm, báo cáo |
| **Tổng** | **~24–30** | |

---

## Tài liệu tham khảo

### Sách & Tài liệu
- *Handbook of Astronomical Image Processing* (Berry & Burnell)
- *Astronomical Image and Data Analysis* (Starck & Murtagh)
- *Learning with Few Labels* (survey cho thiên văn)

### Paper
- Galaxy Zoo, deep learning cho galaxy classification
- Astropy Collaboration papers
- VLM surveys: LLaVA, Qwen-VL, GPT-4V technical reports

### Khóa học / Tutorial
- Astropy tutorials
- ESA/Hubble image processing guides
- Photutils documentation

---

*Đề cương – Galaxies Edu – Digital Image Processing for Astronomy with LLM Detection*
