---
title: Kiến trúc phân tầng của Unified API
status: active
audited: 2026-08-12
audience: engineers, tech leads, reviewers
related:
  - SERVICES.md
  - docs/ARCHITECTURE_AUDIT.md
  - services/api/scripts/check-architecture.mjs
  - services/api/shared/http/index.js
  - .github/workflows/api-guards.yml
---

# Kiến trúc phân tầng của Unified API

Tài liệu này mô tả **cách `services/api` được tổ chức sau đợt refactor tháng 8/2026**: các tầng, luật phụ thuộc giữa chúng, và cơ chế tự động ngăn kiến trúc trôi trở lại.

Đây là tài liệu **mô tả hệ thống đang có**, không phải kế hoạch.

---

## 1. Vấn đề trước refactor

`services/api` là một **modular monolith**: một tiến trình Express, code chia theo feature trong `features/<domain>/`. Cấu trúc thư mục thì đúng, nhưng *bên trong* thì không có tầng nào cả.

Ba file tệ nhất tự nói lên vấn đề:

| File | Trước | Sau |
| --- | ---: | ---: |
| `features/courses/routes/cohorts.js` | 925 dòng | 198 dòng |
| `features/admin/index.js` | 911 dòng | 17 dòng |
| `features/courses/routes/courses.js` | 680 dòng | 36 dòng |

Route handler tự làm hết: đọc `req.body` không validate, gọi thẳng Mongoose model, tính toán nghiệp vụ, `try/catch` lặp lại ở mọi endpoint, rồi `res.json` với hình dạng tuỳ hứng. Không có ranh giới nào để test, để tái sử dụng, hay để đọc hiểu nhanh.

## 2. Các tầng và luật phụ thuộc

Phụ thuộc chỉ đi **xuống**, không bao giờ đi ngược hay đi ngang qua nội bộ feature khác:

```
routes/        khai báo endpoint: path + middleware + controller. Không logic.
  ↓
controllers/   đọc req.valid, gọi service, chọn presenter. Không truy vấn DB.
  ↓
services/      nghiệp vụ. Không biết express, không đụng req/res.
  ↓
repositories/  mọi truy vấn Mongoose sống ở đây. Riêng tư với feature.
  ↓
models/        schema. Đáy đồ thị, không import gì lên trên.

presenters/    map domain object → JSON trả về (chống rò rỉ field nội bộ)
schemas/       Zod schema cho body/query/params
```

Điểm quan trọng: **`services/` không import `express`**. Nghĩa là nghiệp vụ test được bằng cách gọi hàm thuần, không cần dựng HTTP server.

## 3. Shared kernel

Bốn thứ dùng chung, gom trong `shared/`, thay thế phần lớn boilerplate cũ:

- **`shared/http/asyncHandler.js`** — bọc handler async, promise reject tự động đi vào error middleware. Xoá toàn bộ `try/catch` lặp lại. `asyncController(obj)` bọc cả một object controller một lần.
- **`shared/http/validate.js`** — middleware Zod cho `body`/`query`/`params`. Dữ liệu đã parse + ép kiểu nằm ở `req.valid`, nên controller không bao giờ phải tự `Number(req.query.page)` hay kiểm tra `undefined`.
- **`shared/http/respond.js`** — một envelope duy nhất: `{ success: true, ... }`, cùng `created`, `noContent`, `paginated`.
- **`shared/errors.js`** — `AppError` với factory (`AppError.notFound`, `AppError.validation`, …) và một error middleware duy nhất map `AppError`, `ZodError`, Mongoose `CastError`/duplicate key về `{ success: false, code, error, details? }`. Client chỉ cần rẽ nhánh trên `success`.

Thêm `shared/db/BaseRepository.js`: repository generic cho Mongoose, mặc định `lean()` cho read, gom `findById/paginate/upsert/aggregate/...` để repository con chỉ viết phần đặc thù.

`config/env.js` cũng đã chuyển sang schema Zod — thiếu biến môi trường thì fail lúc khởi động kèm danh sách cụ thể, thay vì `undefined` lan xuống runtime.

## 4. Một request đi qua hệ thống

Ví dụ `GET /api/courses` — toàn bộ route file giờ chỉ là khai báo:

```14:14:services/api/features/courses/routes/courses.js
router.get('/', optionalAuth, validate({ query: schema.catalogQuery }), courses.listCatalog);
```

Controller mỏng, chỉ nối input với service:

```10:12:services/api/features/courses/controllers/courseController.js
  async listCatalog(req, res) {
    return ok(res, { data: await catalog.listCatalog(req.valid.query) });
  },
```

Từ đó `courseCatalogService` dựng filter và gọi `courseRepository.listCatalog(...)`; presenter chuyển document thành card. Không tầng nào biết về tầng cách nó hai bậc.

Một chi tiết đáng nói: các luồng "cần thanh toán" **không** ném exception. Service trả về kết quả có nhãn (`{ status: 'payment_required' | 'already_enrolled' | ... }`) và controller quyết định HTTP status. Nghiệp vụ "chưa mua khoá học" là kết quả hợp lệ, không phải lỗi.

## 5. Ranh giới giữa các feature

Luật: feature A **không** được import `models/` hay `repositories/` của feature B. Muốn đọc dữ liệu của B thì đi qua service công khai của B.

Hai ví dụ đã áp dụng:

- **`auth/services/userDirectoryService.js`** — trước đây nhiều feature `require('../auth/models/User')` để lấy tên hiển thị. Giờ chúng gọi `getDisplayNameMap`, `listMailableRecipients`, `assertActiveTeacher`.
- **`admin/repositories/reportingRepository.js`** — analytics admin buộc phải đọc ngang qua nhiều feature. Thay vì rải import khắp nơi, toàn bộ được gom vào **một** file read-model có chú thích rõ đây là ngoại lệ có chủ đích.

## 6. Guard tự động (phần giữ cho kiến trúc không trôi)

Tài liệu không ngăn được ai `require` bậy. Script thì có.

`services/api/scripts/check-architecture.mjs` là Node thuần, không dependency, quét mọi `require()` trong `features/` và enforce 5 luật: `no-cross-feature-models`, `no-cross-feature-repositories`, `no-data-access-in-routes`, `no-express-in-services`, `no-services-in-models`.

Repo từng có hàng trăm vi phạm. Guard dùng **baseline ratchet** giống `client/scripts/check-import-boundaries.mjs`: nợ được đóng băng trong `scripts/architecture-baseline.json`, CI xanh với cây code lúc đóng băng, nhưng **bất kỳ vi phạm mới nào cũng fail**. Baseline chỉ được phép giảm (`--prune-baseline`), không được phình bằng tay.

Sau đợt dọn hoàn tất, baseline còn **0 mục** — mọi feature đi qua service công khai của feature sở hữu dữ liệu, hoặc qua một read-model có chú thích.

```bash
npm run check:architecture          # fail nếu có vi phạm mới
npm run check:architecture:report   # xem toàn bộ nợ, luôn exit 0
npm run verify                      # guard + test
```

Ngoại lệ có chủ đích (analytics admin, snapshot ngữ cảnh agent) được khai báo ngay trong file bằng comment `/* eslint-disable no-restricted-imports -- lý do */`, để lý do nằm cạnh code chứ không nằm trong một danh sách xa xôi. Các file đó là:

- `admin/repositories/reportingRepository.js`, `adminUserReportingRepository.js`, `adminCommerceReportingRepository.js`
- `admin/services/adminAuditService.js`, `adminSystemService.js`, `admin/gemEconomy.js`
- `agent/repositories/agentContextReadModel.js`

`.github/workflows/api-guards.yml` chạy guard trước (không cần install, fail nhanh) rồi mới `npm test`.

## 7. Trạng thái hiện tại

Toàn bộ surface HTTP đã lên tầng `routes → controllers → services → repositories`. Feature đã có public read/write API cho feature khác: `auth` (`userDirectoryService`), `courses` (`courseAccessService`), `community` (`communityReadService`, `forumBootstrapService`), `learning-path` (`learningPathQueryService`, `learningPathEventQueryService`, `exploreQuizProgressService`), `content3d` (`showcaseContentService`, earth-history/fossil/narrative services), `rewards` (wallet/unlock/shop helpers), `payment` (`orderCreditService`), `notifications` (broadcast).

Baseline architecture: **0 vi phạm**. Test: 109 test pass qua `node --test`.

Truy vết FE↔BE: inventory máy sinh tại [`client/ROUTE_INVENTORY.md`](../../client/ROUTE_INVENTORY.md); luật FE tại [`frontend-layering.md`](./frontend-layering.md).

## 8. Quyết định kiến trúc (ADR)

- [ADR-0001 — Giữ modular monolith thay vì tách microservice](adr/0001-modular-monolith.md)
- [ADR-0002 — Repository pattern bọc Mongoose](adr/0002-repository-pattern.md)
- [ADR-0003 — Envelope response và error taxonomy thống nhất](adr/0003-response-envelope.md)
- [ADR-0004 — Baseline ratchet thay vì big-bang refactor](adr/0004-baseline-ratchet.md)
