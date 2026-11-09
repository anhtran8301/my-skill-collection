# Áp dụng và xử lý xung đột

`--target` có thể là thư mục chưa tồn tại hoặc repo đang có; đường dẫn có khoảng trắng cần được quote. Không chọn home, root hoặc thư mục chứa chính toolkit làm target. Đường dẫn được canonicalize để hoạt động đúng với `/tmp` và `/private/tmp` trên macOS.

Mỗi lần setup chọn lại đủ workflow, tracker, agent, packs và MCP. Lần apply sau coi lựa chọn mới là bộ mong muốn; pack không còn được chọn sẽ bị gỡ những file thuộc toolkit. File thêm riêng trong thư mục skill vẫn được giữ. Không chạy nhiều apply đồng thời vào cùng target.

## Repo có cấu hình AI riêng

CLI không nhận sở hữu file đã có, kể cả nội dung giống template. Khi dry-run báo xung đột:

1. Sao lưu file cấu hình riêng vào một thư mục ngoài các đường dẫn toolkit sẽ ghi.
2. Đọc cấu hình dự kiến bằng cách apply cùng lựa chọn vào một thư mục tạm riêng.
3. Nếu muốn toolkit quản lý các file này, chuyển các file xung đột ra vị trí sao lưu rồi apply vào project thật.
4. Hợp nhất các chỉ dẫn và MCP riêng sau khi xem diff. Việc sửa file thuộc toolkit sẽ khiến lần apply sau yêu cầu hợp nhất lại; đây là giới hạn có chủ đích của v1.

Không xóa cấu hình đang dùng chỉ để bỏ qua xung đột. Nếu bạn muốn tự quản lý cấu hình hiện tại, dùng bản tạm để copy phần cần thiết và quản lý thủ công; không copy state rồi coi các file đã sửa là toolkit-owned.

## File toolkit đã sửa

Giữ bản sửa của bạn, dùng project tạm để xem bản mới, rồi tự hợp nhất. Không sửa checksum state để ép qua preflight. Có thể phục hồi bản toolkit từ lịch sử Git của project nếu muốn CLI quản lý lại.

Nếu một lần ghi gặp lỗi, CLI cố gắng rollback các file đã thay đổi và ghi rõ khi rollback cũng lỗi. Thư mục rỗng có thể còn lại; không xóa thư mục chứa file người dùng. `check --target` phát hiện file thiếu, bị sửa, inventory sai hoặc snapshot cần cập nhật.

## Giới hạn profile

CLI chặn profile đối nghịch đã có trong các vị trí skill project. Không đọc/sửa global skills hoặc plugin đã cài trên máy. Trước khi dùng, xem danh sách skill trong agent và tránh bản cài global/plugin trùng tên. Tên `superpowers:` từ ví dụ upstream ánh xạ sang tên skill standalone trong profile; không cần cài plugin Superpowers cùng lúc.

Claude-only vẫn dùng `.agents/skills` làm kho vật lý; `--agent` chỉ chọn cấu hình và alias. Không diễn giải `check` thành bảo đảm model đã nạp đúng hoặc dịch vụ đã xác thực.
