---
title: "ADR-0001: Giữ modular monolith thay vì tách microservice"
status: accepted
date: 2026-08-12
---

# ADR-0001: Giữ modular monolith thay vì tách microservice

## Bối cảnh

`services/api` phục vụ auth, courses, community, payment, media, rewards, admin trong một tiến trình Express. Lịch sử repo từng có các service tách riêng (`services/auth`, `services/courses`, …) rồi gộp lại — xem `SERVICES.md`. Khi refactor lại tầng, câu hỏi tách microservice quay lại.

Ràng buộc thực tế: một người phát triển, deploy trên Render free/hobby tier, dùng chung một MongoDB cluster, và nhiều luồng nghiệp vụ cắt ngang feature (thanh toán → ghi danh → thông báo → gem reward) cần tính nhất quán.

## Quyết định

Giữ **một** unified API. Đầu tư vào ranh giới *bên trong* (feature-owned models, service công khai giữa các feature, guard tự động) thay vì ranh giới mạng.

Ngoại lệ vẫn giữ tiến trình riêng: `services/ai` (Python, RAG + LLM) và `services/embedding` — khác ngôn ngữ, khác hồ sơ tài nguyên, và ghép nối qua HTTP là tự nhiên.

## Hệ quả

Tích cực: một lần deploy, không cần distributed transaction, gọi giữa feature là gọi hàm nên rẻ và dễ debug. Ranh giới vẫn tồn tại và được kiểm tra máy móc, nên nếu sau này cần tách thì đường cắt đã sẵn.

Đánh đổi: không scale độc lập từng feature; một lỗi khởi động làm hỏng cả API. Chấp nhận được ở quy mô hiện tại.

Rủi ro chính là ranh giới logic bị bào mòn dần — được xử lý bằng ADR-0004.
