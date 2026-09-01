---
title: "ADR-0004: Baseline ratchet thay vì big-bang refactor"
status: accepted
date: 2026-08-12
---

# ADR-0004: Baseline ratchet thay vì big-bang refactor

## Bối cảnh

Sau khi lên tầng cho `courses` và `admin`, script quét ranh giới đếm được **186 vi phạm** còn lại trong `community`, `rewards`, `payment`, `agent`, `content3d`, `learning-path`, `tutorials` — chủ yếu là import model xuyên feature và truy cập dữ liệu ngay trong route.

Ba lựa chọn: refactor tất cả trước khi bật guard; chỉ viết tài liệu rồi tin vào kỷ luật; hoặc bật guard ở mức nợ hiện tại.

Refactor tất cả cùng lúc tạo ra một thay đổi khổng lồ không review nổi, chạm vào những luồng chưa có test bao phủ. Chỉ viết tài liệu thì đã được chứng minh là không hiệu quả — chính những luật này vốn đã ngầm tồn tại.

## Quyết định

Bật guard ngay, đóng băng nợ hiện tại làm baseline.

`scripts/check-architecture.mjs` ghi các vi phạm hiện có vào `scripts/architecture-baseline.json` dưới khoá `rule|file` (theo file chứ không theo số dòng, để sửa code không làm vỡ build vì lý do vô nghĩa). CI xanh với cây code hôm nay; mọi vi phạm **mới** làm fail build kèm thông điệp chỉ rõ luật nào bị vi phạm và cách sửa.

Baseline chỉ được phép co lại. `--update-baseline` tồn tại để tái đóng băng sau khi refactor xong một feature, và việc nó làm baseline phình to sẽ lộ ngay trong diff của PR.

Cách làm này lặp lại đúng mô hình `client/scripts/check-import-boundaries.mjs` đã dùng cho Next.js client, nên toàn repo chỉ có một khái niệm "guard" duy nhất.

## Hệ quả

Kiến trúc cải thiện đơn điệu: không cần refactor xong hết mới có được sự đảm bảo. Mỗi feature được dọn dần khi có người chạm vào nó, và tiến độ đo được bằng số mục baseline — từ 76 xuống **0** sau khi các feature còn lại đi qua service công khai hoặc read-model có chú thích.

Đánh đổi: trong giai độ chuyển tiếp repo tồn tại hai chuẩn cùng lúc; người đọc phải biết feature nào đã lên tầng. Trạng thái hiện tại nằm ở mục 7 của [`api-layering.md`](../api-layering.md).

Rủi ro: baseline có thể trở thành nơi giấu rác nếu ai đó chạy `--update-baseline` để né lỗi. Giảm thiểu bằng cách để baseline là file JSON được commit — thêm dòng vào đó là hành động hiện rõ trong review. Lệnh `--prune-baseline` chỉ xoá mục đã hết vi phạm, không bao giờ thêm.
