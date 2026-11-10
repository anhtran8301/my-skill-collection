# Thiết kế đã chốt

Kho private, hybrid: lưu snapshot skill đã review; MCP/plugin dùng cấu hình và cơ chế chính thức.
AI Hero là workflow duy nhất; core có Context7; pack chuyên môn chọn thêm.
Setup bắt buộc chọn workflow và tracker, chỉ tác động project đích, copy tài nguyên độc lập, không ghi đè file người dùng.
CLI Node 24 gồm catalog/apply/check, có dry-run, preflight toàn bộ, theo dõi ownership bằng checksum và nhận diện file bị sửa.
Chỉ dẫn và tài liệu dùng tiếng Việt. Lịch sử remote main được giữ, push fast-forward; repo GitHub private và Template.

Triển khai: nhập/rà soát snapshot → CLI và templates → kiểm thử hành vi trên thư mục tạm → tài liệu/CI → kiểm tra trước commit → push và xác nhận CI.
