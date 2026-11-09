# Plugin catalog

Mô hình hybrid: skill snapshot được lưu, plugin dùng cơ chế cài chính thức. `catalog/plugins.json` chứa marketplace, tên plugin, revision tham chiếu và checksum metadata; không chứa mã plugin, token hoặc trạng thái đăng nhập.

Các tên trong catalog là snapshot để tham khảo. Marketplace cài qua Git có thể lấy phiên bản mới hơn revision đã ghi; xem lại nguồn, giấy phép, hook và quyền của phiên bản sẽ cài. Không xem checksum metadata là audit mã plugin.

## Codex

CLI trên máy được kiểm tra ở phiên bản `0.166.0` qua lệnh help. Ví dụ cài theo yêu cầu riêng:

```bash
codex plugin marketplace add https://github.com/openai/plugins.git
codex plugin list
```

Chọn plugin từ danh sách hiện có rồi dùng `codex plugin add TEN_PLUGIN@TEN_MARKETPLACE`. Tên marketplace tham chiếu của OpenAI trong catalog là `openai-curated`; không tự cài toàn bộ marketplace. Có thể dùng giao diện Plugins của Codex thay cho CLI.

## Claude Code và Addy Osmani

Trong phiên Claude Code, các lệnh chính thức từ upstream:

```text
/plugin marketplace add https://github.com/addyosmani/agent-skills.git
/plugin install agent-skills@addy-agent-skills
```

Bộ Addy bao phủ cả workflow, có thể trùng AI Hero/Superpowers; không cài/bật toàn bộ cùng profile đang dùng nếu chưa chọn lại workflow. Repo này chỉ lưu metadata của bộ đó. Khi lấy riêng một skill, giữ các shared references mà nó sử dụng; upstream ghi rõ việc copy riêng thư mục skill có thể thiếu tài liệu.

OAuth/đăng nhập, scope GitHub/Figma/Notion và các dịch vụ khác thực hiện trong agent/plugin tương ứng. Toolkit không thực hiện các bước đó và không thay đổi global plugin settings.

Nguồn: [OpenAI Plugins](https://github.com/openai/plugins), [Addy Osmani](https://github.com/addyosmani/agent-skills). Chưa cài hoặc kiểm thử runtime plugin trong lần setup này.
