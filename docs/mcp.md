# MCP cho Claude Code và Codex

`apply` sinh `.mcp.json` cho Claude và `.codex/config.toml` cho Codex từ cùng danh mục. Không ghi credential; không bắt đầu phiên agent hoặc mở kết nối trong lúc setup.

| MCP | Mặc định | Yêu cầu khi dùng |
|---|---|---|
| Context7 | Có | Mạng và quyền/hạn mức của Context7; endpoint `https://mcp.context7.com/mcp` |
| Playwright | Không, chọn `--mcp playwright` | Node/npm, tải `@playwright/mcp@0.0.84`, browser tương thích |
| GitHub | Không, chọn `--mcp github` | Quyền truy cập repository; token môi trường hoặc OAuth được agent hỗ trợ |

Với GitHub, cấu hình được sinh dùng biến `GITHUB_MCP_TOKEN`; export biến từ secret manager của bạn trước khi mở agent. Claude mở rộng biến trong header `Bearer ${GITHUB_MCP_TOKEN}`; Codex dùng `bearer_token_env_var`. Không để token trong `.env` được commit, shell history hoặc prompt. Nếu dùng OAuth thay cho token, tự cấu hình theo client và endpoint chính thức; template không tự chuyển cơ chế auth.

Trong Claude, dùng `/mcp` để xem trạng thái và chấp thuận MCP project khi được hỏi. Trong Codex, trust project rồi xem danh sách/trạng thái MCP; cấu hình project không thay thế quyền trust. Chỉ kiểm tra kết nối trong phiên agent sau khi đã setup và đăng nhập, không coi file JSON/TOML hợp lệ là server hoạt động.

Playwright chạy headless. Lần chạy đầu có thể cần cài browser theo thông báo của package; toolkit không tự cài browser hoặc chạy `npx` để kiểm tra. Không dùng browser automation với phiên đăng nhập/dữ liệu ngoài phạm vi công việc.

Tài liệu chính thức: [Claude MCP](https://code.claude.com/docs/en/mcp), [Codex MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli), [Context7](https://github.com/upstash/context7), [Playwright MCP](https://github.com/microsoft/playwright-mcp), [GitHub MCP](https://github.com/github/github-mcp-server).

Remote endpoint và package MCP không thuộc phạm vi audit của skill snapshot. Muốn đổi version Playwright: cập nhật hai cấu hình trong manifest cùng lúc và kiểm thử JSON/TOML; không dùng `@latest` cho template được lưu.
