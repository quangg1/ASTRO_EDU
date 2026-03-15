# Resources cần để hiển thị 3D sinh vật tiêu biểu

Để hiển thị **mô hình 3D** (GLB/GLTF) cho sinh vật tiêu biểu (Trilobita, Khủng long, v.v.), cần hai nhóm: **kỹ thuật (code)** và **nội dung (file 3D)**.

---

## 1. Resources kỹ thuật (trong project)

| Resource | Mục đích | Trạng thái |
|----------|----------|------------|
| **Three.js** | Render 3D | ✅ Đã có |
| **@react-three/fiber** | Khung React cho Three.js | ✅ Đã có |
| **@react-three/drei** | `useGLTF` load file .glb/.gltf | ✅ Đã có (drei có sẵn useGLTF) |
| **File .glb hoặc .gltf** | Model 3D từng sinh vật | ❌ Chưa có – cần tìm hoặc tạo |

**Kết luận:** Không cần cài thêm package. Chỉ cần **file model 3D** (GLB/GLTF) cho từng sinh vật và viết component load + hiển thị (vd dùng `useGLTF` từ drei).

---

## 2. Resources nội dung: file 3D (model) sinh vật

**Lưu ý:** Ở đây cần **phục dựng sinh vật sống** (life reconstruction / restoration) — tức model **bản hoàn chỉnh** có da, vảy, lông (nếu có), như con vật khi còn sống — **không** phải model scan hóa thạch / xương.

Mỗi sinh vật muốn hiện 3D cần **ít nhất một file**:

- Định dạng khuyên dùng: **.glb** (GLTF Binary) – một file chứa mesh + material + (nếu có) animation.
- Hoặc **.gltf** + file ảnh texture đi kèm.

### Nguồn lấy model 3D (ưu tiên phục dựng sống)

| Nguồn | Mô tả | Ghi chú |
|-------|--------|--------|
| **Sketchfab** (sketchfab.com) | Kho model 3D lớn. Tìm từ khóa **"reconstruction"**, **"life restoration"**, **"flesh"**, **"paleoart"** để ra bản có da/lông, không phải xương. | Xem **license** từng model (CC BY, CC0). Download thường có GLB. |
| **Creazilla** (creazilla.com) | Một số model sinh vật tuyệt chủng dạng glTF (có texture, da). | Free, có ghi nguồn Digital Atlas of Ancient Life cho một số mẫu. |
| **Smithsonian 3D** (3d.si.edu) | Có bản **phục dựng** (vd articulated woolly mammoth), không chỉ hóa thạch. | Kiểm tra từng object có download hay không. |
| **MorphoSource** | Chủ yếu **scan hóa thạch/xương**, ít bản "sinh vật sống". | Dùng khi cần độ chính xác giải phẫu; muốn bản hoàn chỉnh thì thường phải tự làm da/lông trên skeleton. |
| **Tự tạo (Blender, ZBrush)** | Paleoartist tạo full body có da. | Tốn thời gian; phù hợp khi cần đúng tài liệu khoa học và style thống nhất. |

### Nguồn có mô phỏng 3D **sinh vật sống** (có da / lông), không phải hóa thạch

Các nguồn dưới đây có hoặc dễ tìm model **con vật như lúc còn sống** (full body, da/lông/vảy), **không** chỉ xương hay hóa thạch. Ví dụ: voi ma mút thì là **con ma mút có lông**, không phải bộ xương.

| Nguồn | Loại model | Ví dụ cụ thể |
|-------|-------------|--------------|
| **Sketchfab** | Nhiều bản "life reconstruction", "with skin", "flesh". Tìm từ khóa: *reconstruction*, *with skin*, *paleoart*, *flesh*. | **Ma mút / động vật có vú:** tìm "woolly mammoth reconstruction", "mammoth 3D fur". **Khủng long:** Spinosaurus (virtual-paleoart), Velociraptor, Triceratops (Jay Qui – bản có da/pattern). **Kangaroo khổng lồ:** Queensland Museum – "Extinct Giant Kangaroo comes alive!" (có soft tissue). |
| **Smithsonian 3D** (3d.si.edu) | Một số bản **phục dựng gắn khớp** (articulated) hoặc có phần mô mềm. | **Ma mút:** "articulated woolly mammoth", "Mammuthus primigenius" – kiểm tra từng object (có bản skeleton, có bản phục dựng đầy đủ hơn). |
| **Creazilla** (creazilla.com) | Model glTF từ Digital Atlas of Ancient Life; một số có texture da. | **Gấu hang (Ursus spelaeus):** model có texture, dạng sinh vật hoàn chỉnh (không chỉ skull). |
| **Meshy AI** (meshy.ai) | Model 3D tạo bằng AI, nhiều bản **có lông/da** (PBR texture). | **Ma mút:** có bản "woolly mammoth" hyper-realistic (lông, da nhăn, ngà) – tải về dùng hoặc tham khảo style. |
| **Bảo tàng / artist trên Sketchfab** | Paleoartist (vd virtual-paleoart, Jay Qui) đăng bản **full body có da**. | Spinosaurus (có da), Triceratops (mossy skin / pattern), Dimetrodon, Velociraptor – filter "Downloadable" + license phù hợp. |

**Cách phân biệt nhanh:** Nếu mô tả/model chỉ có "skull", "skeleton", "fossil", "bone" → thường là **hóa thạch/xương**. Nếu có "reconstruction", "life", "with skin", "with fur", "flesh", "restoration" → nhiều khả năng là **mô phỏng con vật sống**.

### Gợi ý theo nhóm sinh vật

- **Khủng long (T.rex, Triceratops, Stegosaurus…):** Sketchfab có rất nhiều; chọn bản low-poly nếu cần chạy mượt trên web.
- **Trilobita, Anomalocaris, sinh vật Cambrian:** Ít hơn; có thể tìm “trilobite 3D”, “anomalocaris 3D” trên Sketchfab hoặc MorphoSource.
- **Động vật có vú cổ (ma mút, v.v.):** Sketchfab, MorphoSource.

Sau khi có file, nên đặt vào project (vd `public/models/organisms/`) và trong code chỉ cần **đường dẫn URL** tới file .glb (ví dụ `/models/organisms/trex.glb`).

---

## 3. Cấu trúc gợi ý trong code

- **Lưu đường dẫn model** cho từng sinh vật tiêu biểu, ví dụ trong `iconicOrganisms.ts`:
  - Thêm field `modelUrl?: string` (vd `/models/organisms/trilobite.glb`).
- **Component hiển thị 3D:**
  - Dùng `useGLTF(modelUrl)` từ `@react-three/drei` để load GLB.
  - Render `<primitive object={scene} />` trong một `<Canvas>` hoặc trong scene Earth (đặt cạnh Trái Đất hoặc trong panel 3D nhỏ).
- **Tối ưu:** Scale, vị trí, ánh sáng phù hợp; có thể dùng `useAnimations` nếu file có animation.

---

## 4. Tóm tắt checklist

| Hạng mục | Cần có |
|----------|--------|
| Thư viện load GLB trong app | ✅ Đã có (Three.js + drei) |
| File .glb / .gltf cho từng sinh vật | ❌ Cần tải từ Sketchfab/MorphoSource/… hoặc tự tạo |
| License / bản quyền model | Cần kiểm tra từng nguồn |
| Code component load + hiển thị model | Viết thêm (useGLTF + primitive) |

**Bước tiếp theo thực tế:** Chọn 1–2 sinh vật (vd Trilobita, T.rex) → tìm hoặc tạo file .glb → đặt vào `public/models/` → thêm `modelUrl` trong data và component hiển thị 3D.

---

## 5. Nguồn model 3D theo từng thời kỳ (phục dựng sinh vật sống)

**Chỉ liệt kê đúng các stage có trong timeline app** (`earthHistoryData`, stage id 5–21). Không thêm thời kỳ ngoài app. Các link là model **phục dựng** (reconstruction), không phải hóa thạch. Tải **GLB** khi có, nhớ **ghi credit** theo license.

---

### Các stage ít hoặc không cần model 3D (chỉ tham khảo nhanh)

| Stage | Tên trong app (timeline) | Ghi chú nguồn 3D |
|-------|---------------------------|-------------------|
| 5 | Đại dương đầu tiên | Không có (sự sống sơ khai / vi sinh). |
| 6 | Vi khuẩn lam | Ảnh / illustration; 3D: tìm "stromatolite 3D". |
| 7 | Great Oxidation Event | Stromatolites — Sketchfab/Creazilla "stromatolite". |
| 8 | Trái Đất Tuyết (Snowball Earth) | Ediacaran biota — ít phục dựng 3D; "Ediacaran", "Dickinsonia" trên Sketchfab. |
| 17 | Thiên thạch Chicxulub | Sự kiện, không sinh vật; dùng effect thiên thạch nếu cần. |
| 21 | Trái Đất hiện đại | Asset 3D hiện đại, không cần nguồn cổ sinh. |

---

### Stage 9: Bùng nổ Cambrian

| Sinh vật trong app | Nguồn model 3D phục dựng (bản hoàn chỉnh) |
|--------------------|--------------------------------------------|
| Trilobita, Anomalocaris, Hallucigenia | **Trilobita:** Phần lớn trên Sketchfab là **hóa thạch**. Muốn bản “sinh vật sống” tìm "trilobite reconstruction", "trilobite life" — ít; có thể dùng bản fossil có texture đẹp tạm. **Anomalocaris / Hallucigenia:** Sketchfab search "Anomalocaris 3D", "Hallucigenia" — rất ít phục dựng có da; chủ yếu paleoart 2D hoặc tự model. |

---

### Stage 10: Kỷ Ordovician

| Sinh vật trong app | Nguồn model 3D phục dựng |
|--------------------|---------------------------|
| Nautiloids, Graptolites, Ostracoderms (cá không hàm) | Sketchfab: "nautiloid", "orthoceras" (thân mềm có vỏ); "graptolite" thường là fossil. Cá không hàm: "ostracoderm reconstruction" — ít. |

---

### Stage 11: Kỷ Devonian - Cá chinh phục

| Sinh vật trong app | Nguồn model 3D phục dựng |
|--------------------|---------------------------|
| Dunkleosteus, Tiktaalik, Archaeopteris | **Dunkleosteus:** Sketchfab "Dunkleosteus reconstruction" — có bản có da. **Tiktaalik:** MorphoSource / bảo tàng có skeleton; phục dựng có da ít, có thể tìm "Tiktaalik 3D". **Archaeopteris:** Cây — "Archaeopteris 3D" hoặc cây cổ đại. |

---

### Stage 12: Kỷ Carboniferous - Rừng than đá

| Sinh vật trong app | Nguồn model 3D phục dựng |
|--------------------|---------------------------|
| Meganeura, Arthropleura, Lepidodendron | Sketchfab: "Meganeura", "giant dragonfly 3D"; "Arthropleura"; "Lepidodendron" (cây). Một số bản reconstruction có da/ texture. |

---

### Stage 13: Đại tuyệt chủng Permian

| Sinh vật trong app | Nguồn model 3D phục dựng |
|--------------------|---------------------------|
| Dimetrodon, Gorgonopsids | **Dimetrodon:** Sketchfab nhiều bản "Dimetrodon" có da, reconstruction. **Gorgonopsia:** "Gorgonopsid reconstruction" — ít hơn. |

---

### Stage 14: Kỷ Triassic - Khủng long đầu tiên

| Sinh vật trong app | Nguồn model 3D phục dựng |
|--------------------|---------------------------|
| Eoraptor, Plateosaurus, Pterosaurs | **Eoraptor / Plateosaurus:** Sketchfab "Eoraptor", "Plateosaurus reconstruction". **Pterosaur:** "pterosaur reconstruction", "pterodactyl 3D" — nhiều bản có da. **Coelophysis** (cùng kỷ): https://sketchfab.com/3d-models/coelophysis-bauri-348286c716944a73b9f74d07ce5b6ed8 (CC BY-NC-SA, kiểm tra skeleton vs flesh). |

---

### Stage 15: Kỷ Jurassic - Thời đại Khủng long

| Sinh vật trong app | Nguồn model 3D phục dựng |
|--------------------|---------------------------|
| Stegosaurus, Allosaurus, Archaeopteryx, Diplodocus | **Allosaurus:** https://sketchfab.com/3d-models/allosaurus-fragilis-b30bd9c9d048435cb412bc76314cca62 (CC0, kiểm tra flesh). **Stegosaurus / Diplodocus / Archaeopteryx:** Sketchfab "Stegosaurus reconstruction", "Diplodocus", "Archaeopteryx 3D" — chọn bản có da/lông, Downloadable. **Diamantinasaurus** (sauropod tương tự): https://sketchfab.com/3d-models/diamantinasaurus-3d-reconstruction-animation-fd95602a12474c0b8f70a557609c7884 . |

---

### Stage 16: Kỷ Cretaceous

| Sinh vật trong app | Nguồn model 3D phục dựng |
|--------------------|---------------------------|
| Tyrannosaurus rex, Triceratops, Velociraptor, Angiosperms | **T.rex:** Sketchfab "Tyrannosaurus rex reconstruction", "T.rex feathers" — nhiều bản có da/proto-feathers. **Triceratops:** "Triceratops reconstruction". **Velociraptor:** https://sketchfab.com/3d-models/velociraptor-mongoliensis-unfeathered-0a221f0209fb4132bbde028a6236c177 (phục dựng sống). **Spinosaurus** (cùng kỷ): https://sketchfab.com/3d-models/maquette-07b2b6bf4c464c09bd30daa629f266ff (virtual-paleoart, có da). **Kaprosuchus:** https://sketchfab.com/3d-models/kaprosuchus-saharicus-4ad181be245e46d7a573ca3cbe64aeaf . Thực vật có hoa: dùng asset cây/hoa generic hoặc illustration. |

---

### Stage 18: Kỷ Paleogene - Thú có vú lên ngôi

| Sinh vật trong app | Nguồn model 3D phục dựng |
|--------------------|---------------------------|
| Basilosaurus, Early primates, Gastornis (chim khổng lồ) | **Basilosaurus:** Sketchfab "Basilosaurus", "early whale 3D". **Chim khổng lồ:** "Gastornis", "terror bird 3D". **Linh trưởng sơ khai:** "early primate 3D", "Eocene primate" — ít. |

---

### Stage 19: Kỷ Neogene

| Sinh vật trong app | Nguồn model 3D phục dựng |
|--------------------|---------------------------|
| Australopithecus, Megafauna | **Australopithecus:** MorphoSource / Smithsonian có skull; phục dựng full body ít. Sketchfab "Australopithecus", "hominin". **Megafauna:** Gấu hang, voi cổ — xem Stage 20. |

---

### Stage 20: Kỷ Băng hà Pleistocene

| Sinh vật trong app | Nguồn model 3D phục dựng |
|--------------------|---------------------------|
| Homo sapiens (cổ), Mammoth, Neanderthals | **Ma mút (Woolly mammoth):** https://3d.si.edu/explorer/articulated-woolly-mammoth (Smithsonian, bản articulated). **Gấu hang (Ursus spelaeus):** https://creazilla.com/media/3d-model/65882/ursus-spelaeus (Creazilla, glTF). **Neanderthal / Homo sapiens:** Sketchfab "Neanderthal", "early human reconstruction" — kiểm tra license. |

---

### Cách tìm thêm (mọi thời kỳ)

- **Sketchfab:** Từ khóa **"reconstruction"**, **"life restoration"**, **"paleoart"**, **"flesh"** + tên sinh vật. Lọc **Downloadable**, **CC BY / CC0**.
- **Hóa thạch (nếu chấp nhận tạm):** MorphoSource, Smithsonian 3D — skeleton/vỏ; muốn bản hoàn chỉnh thì tự làm da trong Blender hoặc tìm artist.

Tải Sketchfab: trang model → **Download 3D Model** → **GLB**. Creazilla / Smithsonian: xem nút download trên từng trang.

**Lưu ý:** Nếu sau này timeline app thay đổi (thêm hoặc bớt stage trong `earthHistoryData`), cần cập nhật lại mục 5 cho khớp — doc luôn bám theo timeline app, không thêm thời kỳ ngoài app.
