# Giải thích code Hệ Mặt Trời (Solar System)

Tài liệu này mô tả **cách tạo nên Hệ Mặt Trời** trong project: dữ liệu, quỹ đạo, tự quay, ánh sáng và toàn bộ logic liên quan.

---

## 1. Nguồn dữ liệu: `solarSystemData.ts`

Mọi thứ bắt đầu từ **dữ liệu tĩnh** trong `src/lib/solarSystemData.ts`.

### 1.1 Cấu trúc một hành tinh (`PlanetData`)

```ts
interface PlanetData {
  name: string
  nameVi: string
  texture: string           // Đường dẫn texture (ảnh bề mặt)
  radius: number           // Bán kính hình cầu (đơn vị 3D)
  distance: number         // Khoảng cách từ Mặt Trời (bán kính quỹ đạo)
  period: number           // Chu kỳ quỹ đạo (giây) – 1 vòng quanh Mặt Trời
  spinPeriod: number       // Chu kỳ tự quay (giây) – 1 vòng quanh trục
  orbitColor: string       // Màu đường quỹ đạo (hex)
  ringTexture?: string     // (Sao Thổ) texture vành đai
  ringInner?: number       // Bán kính trong vành (tỉ lệ radius)
  ringOuter?: number       // Bán kính ngoài vành
  tilt?: number            // Độ nghiêng trục (chưa dùng trong code hiện tại)
}
```

- **radius**: Kích thước quả cầu trên màn hình. Có nhân với `PLANET_SIZE_SCALE = 2.8` để hành tinh đủ to, dễ nhìn (không theo tỉ lệ thật).
- **distance**: Bán kính vòng tròn quỹ đạo trong không gian 3D (trục XZ).
- **period** / **spinPeriod**: Dùng trong `useFrame` để tính **tốc độ góc** (rad/s) = `2π / period`, từ đó cập nhật vị trí và góc quay mỗi frame.

### 1.2 Mặt Trời (`sunData`)

Chỉ có `name`, `nameVi`, `texture`, `radius`. Mặt Trời đứng yên tại gốc tọa độ `(0, 0, 0)`; chỉ có **tự quay** (spin), không có quỹ đạo.

### 1.3 Tại sao không đúng tỉ lệ thật?

- Khoảng cách thật (vd: Trái Đất ~150 triệu km) và bán kính (vd: ~6371 km) chênh lệch rất lớn. Nếu vẽ đúng tỉ lệ, hành tinh sẽ nhỏ như điểm và không thấy rõ.
- Ở đây dùng **tỉ lệ hiển thị**: `distance` và `radius` là số đơn vị 3D (trong Three.js) để vừa nhìn thấy Mặt Trời, vừa thấy quỹ đạo và hành tinh rõ ràng.

---

## 2. Cấu trúc scene: Canvas và SceneContent

```
SolarSystemScene (default export)
  └─ Canvas (camera, gl, style)
       └─ SceneContent
            ├─ ambientLight
            ├─ SunLight
            ├─ OrbitPath (cho từng hành tinh)
            ├─ Sun
            ├─ Planet (cho từng hành tinh)
            ├─ Stars
            ├─ TargetController
            └─ OrbitControls
```

- **Canvas**: Cảnh 3D, camera ban đầu `[0, 25, 45]`, `fov: 50`.
- **SceneContent**: Chứa toàn bộ ánh sáng, quỹ đạo, Mặt Trời, hành tinh, sao nền, controller và điều khiển camera.

---

## 3. Ánh sáng (độ sáng)

### 3.1 Ambient light

```tsx
<ambientLight intensity={0.28} />
```

- Ánh sáng **từ mọi hướng**, không tạo bóng.
- Dùng để **không có vùng tối hoàn toàn** (mặt khuất của hành tinh vẫn hơi sáng).

### 3.2 SunLight – ánh sáng từ Mặt Trời

```tsx
<pointLight
  position={[0, 0, 0]}   // Đặt tại Mặt Trời (gốc tọa độ)
  intensity={55}
  color="#fff8ee"
  distance={200}
  decay={1.2}
/>
<pointLight
  position={[0, 0, 0]}
  intensity={20}
  color="#ffffff"
  distance={0}
  decay={0}
/>
```

- **Point light 1**: `position [0,0,0]` = Mặt Trời là nguồn sáng. `distance={200}`: ánh sáng có hiệu lực trong bán kính 200 đơn vị; `decay={1.2}`: càng xa càng tối (giảm theo khoảng cách). Hành tinh gần thì sáng, xa thì mờ hơn.
- **Point light 2**: `distance={0}` nghĩa là **không giới hạn khoảng cách** (Three.js), `decay={0}` = không suy giảm. Tạo thêm một lớp sáng tổng thể để hành tinh xa vẫn đủ sáng nhìn thấy.

Kết quả: Mặt Trời vừa là vật thể sáng (mesh), vừa là **nguồn sáng** chiếu lên các hành tinh; độ sáng giảm dần khi xa (point 1) nhưng vẫn có nền sáng (point 2 + ambient).

### 3.3 Vì sao hành tinh dùng `meshStandardMaterial`?

- `meshStandardMaterial` **phản xạ ánh sáng** (PBR): phản ứng với `pointLight` và `ambientLight`, tạo độ sáng/tối theo góc nhìn và vị trí nguồn sáng.
- Mặt Trời dùng `meshBasicMaterial` (chỉ màu/texture, không tính nguồn sáng) vì bản thân nó là nguồn sáng, không cần bị “chiếu”.

---

## 4. Hệ thống quay: quỹ đạo và tự quay

### 4.1 Quỹ đạo (orbit) – hành tinh quay quanh Mặt Trời

Quỹ đạo là **vòng tròn nằm trên mặt phẳng XZ** (mặt phẳng ngang), tâm tại Mặt Trời `(0, 0, 0)`.

- **Công thức vị trí** (theo thời gian ảo `angle`):

  - `x = distance * cos(angle)`
  - `y = 0`
  - `z = distance * sin(angle)`

- **Tốc độ góc** (rad/s): `orbitSpeed = (2 * Math.PI) / data.period`  
  Mỗi frame: `angleRef.current += delta * orbitSpeed`, rồi dùng `angle` này trong `cos`/`sin` để đặt `groupRef.current.position`.

- **OrbitPath**: Chỉ **vẽ đường tròn** (lineLoop) với bán kính `distance`, màu `orbitColor`. Không ảnh hưởng đến chuyển động; chuyển động hoàn toàn do `Planet` + `useFrame` quyết định.

### 4.2 Tự quay (spin) – hành tinh và Mặt Trời quay quanh trục

- **Mặt Trời**: Một `group` chứa mesh; mỗi frame `groupRef.current.rotation.y += delta * spinSpeed` với `spinSpeed = (2π) / SUN_SPIN_PERIOD` (vd 25 giây/vòng).
- **Hành tinh**: Có hai `group` lồng nhau:
  - **Group ngoài** (`groupRef`): chịu trách nhiệm **quỹ đạo** – `position` được set theo `cos(angle)`, `sin(angle)` như trên.
  - **Group trong** (`spinRef`): chịu trách nhiệm **tự quay** – `spinRef.current.rotation.y += delta * (2π / data.spinPeriod)`.

Như vậy: hành tinh vừa **chạy trên quỹ đạo** (nhờ group ngoài), vừa **tự xoay** (nhờ group trong), độc lập nhau.

### 4.3 Góc ban đầu ngẫu nhiên

```ts
const angleRef = useRef(Math.random() * Math.PI * 2)
```

- Mỗi hành tinh bắt đầu ở một góc khác nhau trên quỹ đạo, tránh tất cả thẳng hàng khi mở scene.

---

## 5. Các thành phần chính trong code

### 5.1 OrbitPath – đường quỹ đạo

- Tạo **128 điểm** trên vòng tròn bán kính `distance` (mặt phẳng XZ).
- `BufferGeometry` + `LineBasicMaterial` → vẽ **lineLoop** (vòng kín), màu `orbitColor`, opacity 0.85, `depthWrite: false` để có thể nhìn xuyên qua (không che sao/hành tinh phía sau theo depth).

### 5.2 Sun – Mặt Trời

- **Hai mesh**:
  1. Sphere lớn hơn (`radius * 1.35`) với `meshBasicMaterial` màu vàng nhạt, **BackSide**, opacity 0.4 → tạo lớp “hào quang” xung quanh.
  2. Sphere đúng `radius` với texture 8k_sun → bề mặt Mặt Trời.
- **useFrame**: chỉ cập nhật `rotation.y` (tự quay), không đổi `position` (luôn tại gốc).
- **onClick**: gọi `onSelect()` để camera chuyển target về Mặt Trời (target = origin).

### 5.3 Planet – hành tinh

- **useFrame** (mỗi khung hình):
  1. Cập nhật góc quỹ đạo: `angleRef.current += delta * orbitSpeed`.
  2. Đặt vị trí: `position.set(distance*cos(a), 0, distance*sin(a))`.
  3. Ghi vị trí vào `positionRef.current[index]` để **TargetController** đọc (khi user chọn hành tinh thì camera nhìn vào đúng vị trí hiện tại).
  4. Cập nhật tự quay: `spinRef.current.rotation.y += delta * spinSpeed`.
- **Mesh**: sphere + `meshStandardMaterial` (map texture, roughness, metalness) để nhận ánh sáng từ SunLight.
- **PlanetRing** (chỉ Sao Thổ): dùng `ringGeometry` + texture vành đai, xoay 90° để nằm trên mặt phẳng XZ (cùng mặt phẳng quỹ đạo).

### 5.4 TargetController – điều khiển “tâm nhìn” camera

- **OrbitControls** có thuộc tính **target**: điểm mà camera luôn hướng vào (quay quanh điểm đó).
- **TargetController** mỗi frame:
  - Nếu không chọn hành tinh: `target.lerp(origin, 0.08)` → target dần về Mặt Trời.
  - Nếu chọn hành tinh thứ `selectedIndex`: `target.lerp(planetPositionsRef.current[selectedIndex], 0.08)` → target dần về vị trí hành tinh đó.
- `lerp` với hệ số 0.08 tạo hiệu ứng **mượt** khi chuyển từ Mặt Trời sang hành tinh hoặc ngược lại.

### 5.5 OrbitControls

- **minDistance / maxDistance**: giới hạn zoom (2–120 đơn vị).
- **target**: ban đầu `[0,0,0]` (Mặt Trời); sau đó bị TargetController cập nhật khi user click Mặt Trời/hành tinh.
- **enablePan / enableZoom / enableRotate**: pan, zoom, xoay camera.

---

## 6. Luồng tổng thể

1. **Dữ liệu**: `sunData`, `planetsData` (radius, distance, period, spinPeriod, texture, orbitColor, …).
2. **Ánh sáng**: ambient + 2 point light tại Mặt Trời (một có decay theo distance, một không) → độ sáng tổng thể và hiệu ứng “ánh sáng từ Mặt Trời”.
3. **Quỹ đạo**: mỗi hành tinh có `angleRef` tăng đều theo `delta * (2π/period)`; vị trí = `(distance*cos(angle), 0, distance*sin(angle))`.
4. **Tự quay**: Mặt Trời và từng hành tinh có `rotation.y` tăng theo `delta * (2π/spinPeriod)` (và spinPeriod khác nhau cho từng object).
5. **Tương tác**: click Mặt Trời/hành tinh → cập nhật `selectedIndex` → TargetController lerp target tới vị trí tương ứng → camera quay/zoom về Mặt Trời hoặc hành tinh đó.

---

## 7. Tóm tắt nhanh

| Thành phần        | Vai trò |
|-------------------|--------|
| `solarSystemData` | Định nghĩa kích thước, khoảng cách, chu kỳ quỹ đạo/tự quay, texture, màu quỹ đạo. |
| `SunLight`       | Ánh sáng từ Mặt Trời (point light tại gốc + point light không decay). |
| `ambientLight`   | Ánh sáng nền, tránh vùng tối hoàn toàn. |
| `OrbitPath`      | Vẽ đường tròn quỹ đạo (chỉ hiển thị). |
| `useFrame` trong Planet | Cập nhật **vị trí** (quỹ đạo) và **rotation.y** (tự quay) mỗi frame. |
| `useFrame` trong Sun   | Chỉ cập nhật **rotation.y** (tự quay). |
| `TargetController`    | Điều khiển **target** của OrbitControls theo hành tinh được chọn. |
| `meshStandardMaterial` (hành tinh) | Phản xạ ánh sáng từ SunLight/ambient. |

Sau khi đọc xong, bạn có thể mở `SolarSystemScene.tsx` và `solarSystemData.ts` và đối chiếu từng phần với bảng trên để nắm rõ từng dòng code.
