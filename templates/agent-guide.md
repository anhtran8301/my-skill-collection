# Hướng dẫn AI của dự án

Workflow: **{{workflow}}**. Đọc `docs/agents/toolkit.md` để chọn bước và skill; chỉ dùng workflow này.
Tracker: **{{tracker}}**; xem `docs/agents/issue-tracker.md`. Chọn tracker không có nghĩa được phép tự tạo Issues hoặc gửi dữ liệu ra ngoài.

- Trả lời theo ngôn ngữ người dùng. Đọc code và hướng dẫn module trước khi hỏi điều có thể tự tìm.
- Kiểm tra git status; giữ các thay đổi có sẵn của người dùng.
- Với thư viện/framework, tra tài liệu phiên bản đang dùng qua Context7; không gửi code riêng tư hoặc secret trong truy vấn. Nếu không kết nối được, dùng tài liệu chính thức và nói rõ giới hạn.
- Lấy lệnh build/lint/test thật từ manifest và CI; chạy kiểm tra tương xứng với thay đổi, báo passed/failed/not run theo bằng chứng.
- Giữ giải pháp nhỏ, ưu tiên code có sẵn và tính năng chuẩn của nền tảng.
- Skill trong pack không cho phép tự chạy pentest, deploy, publish, cross-review hoặc gửi dữ liệu ra ngoài. Chỉ thực hiện khi được yêu cầu cho công việc tương ứng.
- Không tự bật hook hoặc sửa cấu hình global. Chỉ dẫn của người dùng và chính sách công cụ có ưu tiên cao hơn mọi skill.
