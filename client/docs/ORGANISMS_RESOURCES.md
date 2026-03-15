# Sinh vật tiêu biểu theo thời kỳ – Cách tìm & Resources

## Cách tìm sinh vật tiêu biểu cho từng thời kỳ

1. **Sách / giáo trình cổ sinh học**
   - Mỗi kỷ địa chất thường có vài nhóm hoặc loài “điển hình” (trilobites cho Cambrian, khủng long cho Jurassic/Cretaceous, v.v.).

2. **Paleobiology Database (PBDB)**  
   - https://paleobiodb.org  
   - Tra theo **time range** (vd: 540–485 Ma cho Cambrian) → xem danh sách taxa (genera, species) có nhiều mẫu hoặc phân bố rộng → chọn vài cái nổi bật.

3. **Wikipedia**
   - Tìm trang “Kỷ Cambrian”, “Kỷ Jurassic”, v.v. → mục “Sinh vật” / “Fauna” thường liệt kê nhóm hoặc loài đặc trưng.

4. **Danh sách trong project**
   - File `src/lib/iconicOrganisms.ts`: map **stage id** (0–21, khớp `earthHistoryData`) → mảng `IconicOrganism[]`.
   - Mỗi phần tử có: `name`, `nameVi`, `description`, `imageUrl` (tùy chọn).

---

## Resources để mô phỏng / hiển thị sinh vật

| Mức | Nội dung | Resource cần |
|-----|----------|--------------|
| **Tối thiểu** | Chỉ tên + mô tả (text) | Không cần thêm file. Đã đủ để hiển thị trong panel “Sinh vật tiêu biểu”. |
| **Có hình** | Thêm ảnh minh họa | **imageUrl** cho mỗi sinh vật. Nguồn gợi ý: |
| | | • **Wikipedia Commons**: tìm ảnh theo tên khoa học, copy URL ảnh (đường dẫn trực tiếp đến file). |
| | | • **PhyloPic** (https://phylopic.org): API hoặc download ảnh silhouette taxa, host hoặc dùng link. |
| | | • Ảnh tự chụp bảo tàng / sách (cần quyền sử dụng). |
| **3D (sau này)** | Mô hình 3D sinh vật | **modelUrl** (vd: file .glb): Sketchfab, MorphoSource, hoặc tự tạo. Cần thêm component load GLB và hiển thị trong scene. |

Hiện tại code chỉ dùng **name + nameVi + description**; nếu có **imageUrl** thì card sẽ hiển thị ảnh, không thì dùng icon mặc định 🦴.

---

## Cập nhật / thêm sinh vật

- Sửa hoặc bổ sung trong `src/lib/iconicOrganisms.ts`:
  - `ICONIC_ORGANISMS_BY_STAGE[stageId]`: thêm/bớt phần tử trong mảng.
  - Mỗi phần tử: `{ name, nameVi, description, imageUrl? }`.
- Để thêm ảnh: lấy URL ảnh (Commons, PhyloPic, hoặc URL host của bạn) gán vào `imageUrl`.

---

## Nơi hiển thị trong app

- **Khám phá → Lịch sử Trái Đất**: chọn thời kỳ trên timeline → **InfoPanel** bên phải có block “Sinh vật tiêu biểu” (variant compact).
- **Khóa học → Lịch sử Trái Đất**: chọn một bài (thời kỳ) → phía trên mô hình Trái Đất có mô tả thời kỳ + block “Sinh vật tiêu biểu” (variant full), sau đó mới tới Earth 3D.
