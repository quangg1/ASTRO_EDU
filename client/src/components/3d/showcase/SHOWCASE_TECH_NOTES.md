# Showcase 3D Technical Notes

Tài liệu này ghi lại đầy đủ kỹ thuật đã áp dụng cho cụm `client/src/components/3d/showcase/*`, lý do thiết kế, và checklist xử lý lỗi thực tế.

## 1) Mục tiêu hiển thị

- Zoom xa: thấy toàn cục hệ Mặt Trời + label đọc được.
- Zoom gần: planet/entity về kích thước hợp lý, xoay quanh đúng tâm đang chọn.
- Orbit moon/entity phải bám parent đúng (không dính vào parent, không lệch sang vùng khác).

## 2) Kiến trúc file chính

- `ShowcaseScene.tsx`
  - Scene orchestration, `OrbitControls`, `Planet`, `Sun`, `ShowcaseEntityLayer`.
  - Dynamic camera far/maxDistance theo quỹ đạo xa nhất.
- `ShowcaseEntityLayer.tsx`
  - Tính vị trí entity theo Kepler/vector/hierarchy.
  - Vẽ local orbit/heliocentric orbit.
  - Lọc entity hiển thị theo group + media + selected planet.
- `ShowcaseEntityMesh.tsx`
  - Load map/model, render sphere/model.
  - Dynamic size boost theo zoom (xa to hơn, gần về thật).
- `ShowcaseCameraManager.tsx`
  - State machine camera: `transition -> focused -> idle`.
  - Focus/snap/lock pivot khi chọn planet/entity.
- `ShowcaseModelEntityMesh.tsx`
  - Render GLTF/GLB entity.

## 3) Quy tắc scale (quan trọng nhất)

Không dùng chung 1 scale cho mọi thứ.

### 3.1 DIST scale (chỉ cho khoảng cách quỹ đạo)

- Heliocentric AU -> scene:
  - `ORBIT_DISTANCE_SCALE_AU` (trong `ShowcaseEntityLayer.tsx`)
- Mục tiêu: giữ bố cục toàn hệ có thể quan sát và điều khiển.

### 3.2 SIZE scale (chỉ cho kích thước body)

- Radius km -> scene:
  - `ENTITY_SIZE_SCALE_KM`
  - cộng thêm boost theo kích cỡ body để tránh body nhỏ mất hút.

### 3.3 Local moon system (moon quanh planet)

- Dùng quy đổi vật lý:
  - `aAu -> km -> số lần bán kính hành tinh parent`
  - rồi chiếu sang `scene` theo bán kính mesh parent.
- Có hệ số nén local system:
  - `SATELLITE_DISTANCE_COMPRESS`
- Mục tiêu: moon tách rõ khỏi parent, không bung quá xa.

## 4) Orbit & hierarchy

### 4.1 Parent resolution

- Nguồn ưu tiên:
  1. `parentPlanetName`
  2. `parentId` dạng `planet-*` -> map trực tiếp sang `Mercury..Neptune`
  3. fallback catalog.
- Hàm chính:
  - `resolveShowcaseOrbitParentPlanetName()` trong `showcaseEntities.ts`

### 4.2 Chống đệ quy vô hạn

- `depthOf()` dùng:
  - `orbitById` map O(1)
  - `stack: Set<string>` để chặn cycle.
- Tránh lỗi:
  - `RangeError: Maximum call stack size exceeded`

### 4.3 Local orbit hiển thị

- Với moon của planet đang chọn:
  - vẽ `FadedLocalEllipticOrbit`.
- Bán kính line orbit dùng cùng hàm scale như vị trí body:
  - `satelliteOrbitDisplayRadius(entity)`

## 5) Camera focus/pivot

### 5.1 State machine

- `transition`: lerp target + distance về `focus`/`wantDist`.
- `focused`: lock pivot theo object đang chọn.
- `idle`: chỉ khi không có focus hợp lệ.

### 5.2 Snap & lock

- Kết thúc transition luôn hard snap:
  - `target = focus`
  - `position = target + dir * wantDist`
- Khi `focused`:
  - nếu target di chuyển (do quỹ đạo), dịch cả `target` và `camera.position` theo cùng delta.
  - đảm bảo drag chuột luôn xoay quanh object đã chọn.

### 5.3 Recovery guard

- Nếu đang focused nhưng khoảng cách camera lệch xa `wantDist`:
  - kéo dần về framing mong muốn.

### 5.4 Lỗi “chỉ thấy EARTH, scene tối”

Thường là camera bị kẹt ở khoảng cách sai hoặc pivot sai:

- `focus` có nhưng `dist >> wantDist`.
- `target` không bám object (xoay bị trôi mất object).
- URL `dist/az/el` cũ đẩy camera ra quá xa.

Đã có recovery nhưng nếu tái phát, debug theo checklist mục 9.

## 6) Nametag (NASA-style text-only)

Áp dụng ở `ShowcaseEntityNametag`:

- Không nền, không border, không box.
- Chỉ text + shadow + stroke.
- Opacity fade 2 đầu:
  - quá gần: fade out
  - vùng đọc: fade in/hiện rõ
  - quá xa: fade out
- Font scale theo distance factor (có clamp).

## 7) Entity size boost theo zoom

Trong `ShowcaseEntityMesh.tsx`:

- Xa: tăng scale để không mất dấu.
- Gần: thu về gần kích cỡ thực.
- Dùng `smoothstep(near, far)` để chuyển mượt, tránh giật.

## 8) Visibility rules

Trong `ShowcaseEntityLayer.tsx`:

- Chỉ render entity có media renderable:
  - texture/model local hoặc remote.
- Khi chưa chọn planet:
  - ẩn satellite entities (trừ active) để tránh rối.
- Khi đã chọn planet:
  - hiện đúng moon/entity thuộc planet đó.

## 9) Debug checklist nhanh (khi có bug hiển thị)

1. **Parent mapping**
   - Kiểm tra `parentId`, `parentPlanetName`, `parentShowcaseEntityId`.
   - `planet-*` phải resolve về đúng tên planet.

2. **Orbit inputs**
   - `semiMajorAxisAu`, `orbitalElements`, `periodDays` có hợp lệ không.
   - Entity local dùng `satelliteOrbitDisplayRadius()` chưa.

3. **Camera**
   - `phaseRef.current` có vào `focused` không.
   - `distNow` có lệch quá nhiều so với `wantDist` không.
   - `target` có bám theo `focus` mỗi frame không.

4. **Controls bounds**
   - `maxDistance` đủ lớn.
   - `camera.far` đủ để không cắt scene.

5. **Media**
   - texture URL/model URL có load được không.
   - nếu map fail vẫn phải có fallback sphere màu.

## 10) Tham số tune nên chỉnh đầu tiên

- Orbit/scale:
  - `ORBIT_DISTANCE_SCALE_AU`
  - `ENTITY_SIZE_SCALE_KM`
  - `SATELLITE_DISTANCE_COMPRESS`
- Camera:
  - `MAX_TRANSITION_SEC`
  - công thức `wantDist` theo loại target
  - ngưỡng recovery `tooFar/tooNear`
- Nametag:
  - `fadeInStart/fadeInEnd`
  - `fadeOutStart/fadeOutEnd`
  - `fontPx` clamp

## 11) Lưu ý vận hành

- Nếu vừa đổi lớn camera/scale mà scene “mất hành tinh”:
  - reload hard + clear URL camera param (dist/az/el) trước khi kết luận data lỗi.
- Nếu DB có data đúng nhưng render sai:
  - ưu tiên kiểm tra parent resolution + camera phase trước khi nghi texture/orbit data.

