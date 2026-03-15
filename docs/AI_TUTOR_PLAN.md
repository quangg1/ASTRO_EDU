# Kế hoạch thiết kế AI Tutor – Galaxies Edu

## 1. Mục tiêu & phạm vi

**Mục tiêu:** Cung cấp trợ lý học tập (AI Tutor) giúp người dùng hiểu nội dung trong app: Lịch sử Trái Đất, sinh vật tiêu biểu, hóa thạch, Hệ Mặt Trời, Milky Way, và khóa học.

**Phạm vi ưu tiên:**
- **Phase 1:** Trả lời câu hỏi dựa trên **context có sẵn** (stages, organisms, mô tả) – không hallucionate.
- **Phase 2:** Gợi ý khám phá, giải thích theo thời kỳ đang xem, đố vui ngắn.
- **Phase 3:** Hỗ trợ khóa học (tóm tắt bài, gợi ý bài tiếp theo, ôn tập).

**Không nằm trong scope ban đầu:** Soạn nội dung bài học mới, chấm bài tự luận phức tạp, thay thế giáo viên.

---

## 2. Personas & use cases

| Persona        | Nhu cầu chính                          | Use case ví dụ                                      |
|----------------|----------------------------------------|-----------------------------------------------------|
| Học sinh THCS/THPT | Hiểu nhanh khái niệm, có ai đó “hỏi đáp” | “Kỷ Cambrian là gì?”, “Trilobite sống khi nào?”     |
| Sinh viên / tự học | Đào sâu theo thời kỳ / sinh vật        | “So sánh Dunkleosteus và Tiktaalik”, “Giải thích Ediacara” |
| Giáo viên      | Gợi ý câu hỏi, tóm tắt theo chủ đề     | “Gợi ý 3 câu hỏi về kỷ Jura”, “Tóm tắt sự sống Cambrian” |

**Luồng tương tác chính:**
1. User đang xem **Explore** (timeline / stage / organism / fossil) → mở Tutor → hỏi về thời kỳ/sinh vật đang xem (context-aware).
2. User đang xem **Khóa học** → hỏi về bài hiện tại hoặc chủ đề tổng quát.
3. User hỏi **tự do** (không cần context) → Tutor trả lời dựa trên kiến thức nền + RAG (dữ liệu app).

---

## 3. Nguồn context cho AI (RAG)

Để AI trả lời đúng và bám nội dung app, cần đưa vào prompt:

| Nguồn              | Dữ liệu                         | Cách dùng                              |
|--------------------|----------------------------------|----------------------------------------|
| `earthHistoryData` | Stages 0–21: tên, time, eon/era/period, mô tả, O2/CO2, icon | Chọn stage đang xem; trả lời “thời kỳ X là gì” |
| `iconicOrganisms`  | Sinh vật theo stage: name, nameVi, description, modelUrl     | Trả lời về sinh vật tiêu biểu, gợi ý xem 3D |
| Fossils API        | Mẫu hóa thạch theo stage (acceptedName, period, locality…)  | “Có hóa thạch gì trong kỷ này?”, search theo tên |
| Phyla API          | Nhóm sinh vật (tên, mô tả)      | Giải thích nhóm (Trilobita, Cá không hàm…) |
| Khóa học           | Course + lessons (slug, title, nội dung nếu có) | Gợi ý bài, tóm tắt bài đang học        |
| Solar / Milky Way  | Text mô tả (nếu có trong app)   | Câu hỏi về hành tinh, thiên hà         |

**Nguyên tắc:** Luôn ưu tiên **trích đoạn từ dữ liệu** (stages, organisms, mô tả) trong câu trả lời; hệ thống prompt phải nói rõ “chỉ dựa vào context, không bịa”.

---

## 4. Kiến trúc kỹ thuật

### 4.1 Tổng quan

```
[Client]  ←→  [API Galaxies]  ←→  [LLM Provider]
   |                  |
   |            [Context Builder]
   |                  |
   |            earthHistoryData, iconicOrganisms,
   |            fossils/phyla API, course content
```

- **Client:** UI chat (panel hoặc modal), gửi message + context (stageId, lessonSlug, viewMode…).
- **Server (Galaxies):** Route mới ví dụ `POST /api/tutor/chat`:
  - Nhận: `{ message, context?: { stageId?, lessonSlug?, viewMode? } }`.
  - **Context builder:** Lấy stage, organisms, (optional) fossils/phyla/lesson theo context.
  - Build **system prompt** + **user prompt** (message + context text).
  - Gọi LLM (OpenAI / Azure OpenAI / OpenAI-compatible).
  - Trả về: `{ reply, usage? }`.

### 4.2 LLM

- **Ưu tiên:** OpenAI API (gpt-4o-mini hoặc gpt-4o) hoặc Azure OpenAI – dễ kiểm soát prompt, RAG.
- **Thay thế:** Model OpenAI-compatible (local hoặc cloud) nếu cần tiết kiệm chi phí / on-premise.
- **Lưu ý:** API key lưu biến môi trường (server), không đưa ra client.

### 4.3 Bảo mật & giới hạn

- **Rate limit:** Giới hạn số message/người dùng/giờ (ví dụ 30–60/phút) để tránh lạm dụng.
- **Độ dài context:** Giới hạn token cho context (ví dụ 4k–8k) để không vượt quá giới hạn model.
- **Content filter:** Tùy provider; có thể thêm kiểm tra cơ bản (lọc câu hỏi không liên quan học tập nếu cần).

---

## 5. UI/UX

### 5.1 Vị trí & cách mở

- **Floating button** góc phải màn hình (Explore + Courses): icon “Tutor” hoặc “?”.
- **Trong Explore:** Khi đã chọn stage → có thể highlight “Hỏi AI về thời kỳ này” trong InfoPanel hoặc trong panel sinh vật/hóa thạch.
- **Trong Khóa học:** Nút “Hỏi AI” gần nội dung bài hoặc trong sidebar.

### 5.2 Giao diện chat

- **Panel/modal** (slide từ phải hoặc popup):
  - Header: “AI Tutor” + nút thu gọn/đóng.
  - Khu vực tin nhắn: user (phải), assistant (trái), có thể hiển thị “đang gõ…”.
  - Ô input + nút gửi; hỗ trợ Enter để gửi.
  - (Tùy chọn) Gợi ý nhanh: “Kỷ này có những sinh vật nào?”, “Giải thích ngắn gọn”, “So sánh với kỷ trước”.

### 5.3 Context-aware hint

- Khi user đang xem stage 9 (Cambrian): “Bạn đang xem Cambrian. Có thể hỏi: sinh vật tiêu biểu, hóa thạch, khí hậu…”
- Text này có thể là placeholder trong input hoặc chip clickable.

### 5.4 Ngôn ngữ

- Mặc định **tiếng Việt** (câu trả lời + gợi ý).
- System prompt quy định: trả lời bằng tiếng Việt, ngắn gọn, phù hợp lứa tuổi học sinh khi không có yêu cầu khác.

---

## 6. Các phase triển khai

### Phase 1 – MVP (4–6 tuần)

| Công việc | Mô tả |
|-----------|--------|
| **Backend** | Route `POST /api/tutor/chat`; context builder chỉ với `earthHistoryData` + `iconicOrganisms` (theo stageId). |
| **Prompt** | System prompt: vai trò “trợ lý học tập Galaxies”, chỉ dựa vào context, trả lời bằng tiếng Việt. |
| **LLM** | Tích hợp 1 provider (OpenAI hoặc Azure), env `TUTOR_API_KEY`, `TUTOR_MODEL`. |
| **Client** | Floating button + panel chat (danh sách message + input), gửi message + `stageId` (nếu đang ở Explore và đã chọn stage). |
| **Testing** | Vài câu hỏi mẫu theo stage (Cambrian, Jura, v.v.) và kiểm tra không bịa thông tin. |

### Phase 2 – Mở rộng context & trải nghiệm (3–4 tuần)

| Công việc | Mô tả |
|-----------|--------|
| **Context** | Thêm fossils (sample theo stage), phyla (mô tả nhóm). Tùy chọn: 1–2 câu mô tả Solar/Milky Way. |
| **UX** | Gợi ý câu hỏi nhanh theo context; “Đố vui” (1 câu trắc nghiệm ngắn về stage). |
| **Rate limit** | Giới hạn request/user (theo session hoặc theo account nếu đã đăng nhập). |

### Phase 3 – Gắn với khóa học (3–4 tuần)

| Công việc | Mô tả |
|-----------|--------|
| **Context** | Đưa lesson hiện tại (slug, title, nội dung text nếu có) vào context. |
| **Tính năng** | “Tóm tắt bài này”, “Bài tiếp theo nên học gì?”, trả lời câu hỏi về nội dung bài. |
| **Phân quyền** | Chỉ user đã đăng nhập mới dùng Tutor khi ở trang khóa học (tùy product). |

---

## 7. Rủi ro & lưu ý

- **Hallucination:** Giảm bằng cách prompt rõ “chỉ dùng thông tin trong context”, và chỉ đưa vào context dữ liệu đã kiểm duyệt (earthHistoryData, iconicOrganisms, mô tả từ API).
- **Chi phí LLM:** Dùng model nhỏ (gpt-4o-mini) cho phần lớn, giới hạn độ dài context và rate limit.
- **Độ trễ:** Streaming response (SSE hoặc tương đương) để user thấy reply đang gõ, tránh cảm giác “đơ”.
- **Accessibility:** Panel chat cần keyboard navigation, focus trap, aria-label phù hợp.

---

## 8. Tóm tắt deliverables Phase 1

1. **Server:** `server/routes/tutor.js` (hoặc `server/routes/aiTutor.js`) – POST chat, context builder, gọi LLM.
2. **Client:** `client/src/components/ui/TutorPanel.tsx` (hoặc tương đương) – floating button + chat UI.
3. **Client:** Gửi `stageId` từ Explore (store hoặc props) khi mở Tutor.
4. **Env:** `TUTOR_API_KEY`, `TUTOR_MODEL` (ví dụ `gpt-4o-mini`).
5. **Doc:** Cập nhật README với hướng dẫn bật AI Tutor và cấu hình env.

Sau khi Phase 1 chạy ổn, có thể bổ sung fossils/phyla vào context và triển khai Phase 2 theo bảng trên.
