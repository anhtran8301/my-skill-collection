---
name: ai-dev
description: Đi từ yêu cầu đến thay đổi đã kiểm chứng bằng workflow AI Hero trong dự án đã setup toolkit; dùng khi người dùng gọi ai-dev hoặc yêu cầu triển khai một tính năng qua đủ các bước.
---

# AI Hero development flow

Đọc AGENTS.md, hướng dẫn từng module và docs/agents/issue-tracker.md. Giữ thay đổi chưa commit của người dùng.

Chọn bước theo công việc: sửa lỗi bắt đầu bằng diagnosing-bugs; thay đổi nhỏ làm trực tiếp rồi kiểm tra; tính năng mới đi qua flow dưới đây.

1. **Làm rõ**: grill-with-docs, đối chiếu code và tài liệu hiện có. Chốt phạm vi, tiêu chí chấp nhận và các quyết định còn mở. Không hỏi lại điều đã xác định.
2. **Spec**: to-spec rồi to-tickets. Dùng tracker đã chọn lúc setup. Nếu local, lưu Markdown trong docs/specs, docs/plans và docs/tickets. Không tự tạo GitHub Issues hoặc gửi nội dung ra ngoài chỉ vì tracker là GitHub; cần yêu cầu cụ thể của người dùng cho lần công việc đó.
3. **Build**: implement, dùng tdd ở các hành vi đáng kiểm tra. Làm từng lát dọc, tái sử dụng code và tính năng nền tảng trước khi thêm dependency. Tra tài liệu thư viện bằng Context7; truy vấn chỉ chứa thông tin API công khai.
4. **Review**: code-review theo spec và chuẩn của repo. Nếu công cụ không có subagent, tự review lần lượt hai góc nhìn standards/spec và nêu giới hạn. Cross-review giữa Claude và Codex chỉ chạy khi được yêu cầu.
5. **Verify**: lấy lệnh thật từ manifest/build config/CI của dự án, chạy kiểm tra liên quan. Không đưa lệnh Maven, Yarn, database hay coverage từ project khác vào mặc định.

Chỉ dùng skill chuyên môn đã cài và phù hợp. Pentest, deploy, publish, push hoặc gửi dữ liệu sang dịch vụ ngoài cần có yêu cầu tương ứng; việc cài pack không cấp quyền thực hiện các hành động đó. Không sao chép hoặc in token, key, file môi trường hay dữ liệu riêng tư vào prompt/log.

Báo thay đổi, kiểm tra đã chạy, kết quả và giới hạn; không gọi một bước chưa chạy là passed.
