# Schema Tutorial chuẩn: Module → Node (concept) → Beginner | Explorer | Researcher

## Cách hiểu đúng (quan trọng)

- Ba tầng **Beginner / Explorer / Researcher** là **độ sâu cục bộ trong từng concept (Node)** — không phải “ba tầng của cả cây nội dung” hay “chia cả khóa thành ba nhánh toàn cục”.

### Sai — cây 3 tầng global (tránh)

Đừng thiết kế kiểu **cả course** bị chia thành:

```
Module
 ├── Beginner   ← toàn bộ nội dung “nhẹ”
 ├── Explorer
 └── Researcher
```

Cách này gộp nhầm **level người học** với **cấu trúc nội dung** — **không** dùng làm khung chính.

### Đúng — 3 tầng **local** trong **mỗi Node**

Mỗi **Node** là **một khái niệm**; **bên trong Node** mới có 3 tầng hiểu:

```
Module
 ├── Node A
 │    ├── 🟢 Beginner   (tầng 1 — hiểu cơ bản)
 │    ├── 🔵 Explorer  (tầng 2 — hiểu cơ chế)
 │    └── 🔴 Researcher (tầng 3 — mô hình / định lượng sâu)
 │
 ├── Node B
 │    ├── 🟢 Beginner
 │    ├── 🔵 Explorer
 │    └── 🔴 Researcher
```

Cùng một **Module** có nhiều **Node**; **mỗi Node** tự có bộ 3 tầng (có thể thiếu tầng — xem dưới).

---

## Ý tưởng cốt lõi

- **Không** phải 3 bài tách rời cho 3 “đối tượng”.
- **Là** 3 **lớp hiểu** của **cùng một khái niệm** (một **Node**).
- UI: tab **`[ Beginner | Explorer | Researcher ]`** trên **trang / khối của Node đó** — đổi nội dung tại chỗ.

```
Course
 └── Module
      └── Node (Concept A)
           ├── Beginner    (trực giác, hình vẽ)
           ├── Explorer    (mở rộng, liên hệ)
           └── Researcher  (định lượng, khung lý thuyết, sai số…)
```

## Quy tắc linh hoạt (pro)

- **Không** bắt buộc mọi Node đều có đủ 3 level.
  - Node A: đủ 3  
  - Node B: chỉ Beginner + Explorer  
  - Node C: chỉ Researcher  

→ Khai báo trong data: object `levels` **chỉ có key** cho tầng có nội dung.

## Progression theo chiều sâu (optional)

- Field `depthProgression: true` trên một Node:
  - Gợi ý UX: mở **Explorer** sau khi hoàn thành **Beginner** (cùng node), tương tự lên **Researcher**.
- Không dùng nếu bạn muốn mọi tab đều xem được ngay (chỉ ẩn tab không có content).

## Adaptive (gợi ý UX)

- User mới → mặc định tab **Beginner** (nếu có).
- User đã học → mặc định **Explorer** hoặc **Researcher** (theo profile).

Logic gợi ý: `suggestDefaultDepth()` trong `tutorialCurriculumSchema.ts`.

## Liên kết với code hiện tại (Mongo / API)

Hai hướng (chọn một khi triển khai):

| Cách | Mô tả |
|------|--------|
| **A — Một document / một slug** | `Tutorial` có thêm `depthLevels: { beginner: { sections… }, explorer: … }`. Một URL `/tutorial/[slug]` render tab. |
| **B — Ba slug con** | `ngay-va-dem-beginner`, `…-explorer` + `parentNodeId` — dễ migrate từ seed cũ nhưng kém “một concept một chỗ”. |

**Khuyến nghị:** hướng **A** cho đúng tinh thần “một Node, ba tầng”.

## File trong repo

| File | Nội dung |
|------|----------|
| `client/src/lib/tutorialCurriculumSchema.ts` | Types + helpers (`getAvailableDepths`, `suggestDefaultDepth`, …) |
| `client/src/lib/tutorialCurriculumExamples.ts` | Ví dụ **Ngày và đêm** |
| `docs/TUTORIAL_CURRICULUM_SCHEMA.md` | Tài liệu này |

## Khác với đề cương PDF theo “Module 1–8”

- PDF có thể **map** vào **Module** (và từng mục lớn → **Node**).
- Mỗi **Node** trong PDF có thể được tách thành **Beginner / Explorer / Researcher** theo schema này thay vì 3 bài riêng trong track phẳng.

---

*Cập nhật theo structure chuẩn người dùng định nghĩa (Course → Module → Node → levels).*
