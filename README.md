# My Skill Collection

Kho công cụ AI cá nhân và starter cho công việc code, debug, spec và review với Claude Code/Codex. Lưu snapshot skill đã rà soát; chỉ cài workflow và nhóm chuyên môn cần cho từng dự án.

**Workflow AI Hero, 44 skill, 6 pack.** Repo private; clone cần quyền GitHub. Không kèm app mẫu hoặc cấu hình nghiệp vụ từ các project tham khảo.

## Bắt đầu

Yêu cầu macOS/Linux và Node.js 24 trở lên; Git để clone hoặc suy ra GitHub remote. Không cần Claude/Codex CLI để sinh cấu hình.

```bash
git clone https://github.com/anhtran8301/my-skill-collection.git
cd my-skill-collection
npm ci --ignore-scripts
npm run catalog
```

Xem trước rồi áp dụng vào dự án mới, đường dẫn tính từ thư mục đang chạy lệnh:

```bash
node scripts/toolkit.mjs apply \
  --target ../my-new-project \
  --workflow aihero \
  --tracker local \
  --pack frontend \
  --dry-run

node scripts/toolkit.mjs apply \
  --target ../my-new-project \
  --workflow aihero \
  --tracker local \
  --pack frontend

node scripts/toolkit.mjs check --target ../my-new-project
```

Mở dự án đích bằng Claude Code hoặc Codex. AI Hero có entrypoint `ai-dev` (Claude: `/ai-dev`; Codex: `$ai-dev`).

## Chọn bộ công cụ

| Lựa chọn | Nội dung |
|---|---|
| Core, luôn có | Ponytail và Context7; cấu hình Context7 MCP |
| `aihero` | Flow tổng quát từ MDM: làm rõ → spec → ticket → implement → review; debug/TDD/domain modeling, 14 skill |
| `frontend` | Vercel React/composition/web guidelines, React Native/view transitions/writing; Taste v2 từ MDM |
| `review` | Code-review-expert, ponytail-review, ponytail-audit |
| `security` | Trail of Bits audit context/differential review/sharp edges/CodeQL/Semgrep/SARIF; hai skill Strix |
| `tooling` | Anthropic skill-creator, mcp-builder, webapp-testing |
| `documents` | Anthropic docx, pdf, pptx, xlsx |
| `deploy` | Vercel deploy, CLI with tokens và optimize |

AI Hero là workflow duy nhất được hỗ trợ. Lặp `--pack` hoặc dùng danh sách phân cách bằng dấu phẩy. Không chọn pack nghĩa là chỉ cài core + workflow. Chọn pack không cấp quyền chạy pentest, upload source, deploy hay publish.

```bash
node scripts/toolkit.mjs apply \
  --target ../existing-project \
  --workflow aihero \
  --tracker github \
  --github-repo anhtran8301/existing-project \
  --agent both \
  --pack frontend --pack review \
  --mcp playwright --mcp github \
  --dry-run
```

`--tracker` bắt buộc là `local` hoặc `github`. Với GitHub, có thể bỏ `--github-repo` nếu project đích có remote origin GitHub dạng HTTPS/SSH. Setup chỉ ghi đích tracker, không tạo repo/Issues/labels/bình luận. Khi cần publish, phải có yêu cầu cụ thể và công cụ GitHub đã xác thực.

## Hợp đồng CLI

| Lệnh/flag | Hành vi |
|---|---|
| `catalog [--json]` | Liệt kê skill, profile, pack và cấu hình MCP |
| `apply --target DIR --workflow NAME --tracker NAME` | Áp dụng bộ đã chọn vào project đích |
| `--agent both\|claude\|codex` | Mặc định `both`; chọn file cấu hình agent cần sinh |
| `--pack NAME` | Chọn thêm nhóm skill, được lặp |
| `--mcp playwright\|github` | Thêm MCP, được lặp; Context7 luôn có |
| `--dry-run` | Kiểm tra toàn bộ xung đột và báo số file thay đổi; không ghi gì |
| `check` | Kiểm tra snapshot, provenance, checksum, metadata và reference của kho |
| `check --target DIR` | Kiểm tra inventory/checksum của bản đã áp dụng; không kiểm tra kết nối dịch vụ |

CLI dùng exit code `0` khi thành công, `1` khi có lỗi. Không chạy installer hoặc script vendored khi setup. Sau khi đã `npm ci`, việc apply snapshot không cần mạng; lần kết nối MCP/plugin hoặc dùng skill có thể cần mạng.

## Cài vào repo đang có và cập nhật

Chạy dry-run trước. Nếu gặp `AGENTS.md`, `CLAUDE.md`, MCP config hoặc file skill không thuộc toolkit quản lý, toàn bộ apply dừng trước khi ghi. CLI không tự hợp nhất hoặc ghi đè; xem hướng dẫn [xử lý xung đột](docs/usage.md).

File đã cài được quản lý bằng checksum trong `.ai-toolkit/state.json`. Nếu bạn sửa/xóa chúng, apply sẽ dừng và nêu file cần hợp nhất. Với bản chưa sửa, chạy lại cùng lựa chọn không tạo thay đổi. Đổi pack sẽ gỡ file cũ thuộc toolkit và cài bộ mới; file thêm riêng của bạn được giữ.

Tài nguyên nằm trong project đích; Claude dùng symlink tương đối đến cùng bộ skill của Codex. Có thể chuyển hoặc clone project đích mà không cần giữ clone nguồn. Canonical skill store vẫn là `.agents/skills` ngay cả khi chọn Claude, nên Codex chạy sau này cũng có thể khám phá các skill đó. `--agent` điều khiển cấu hình được sinh, không cô lập khả năng đọc thư mục của agent khác.

## MCP và plugin

- Context7 được cấu hình mặc định; thiếu quyền/hạn mức thì cấu hình không có nghĩa đã kết nối thành công.
- Playwright MCP khóa phiên bản `0.0.84`; lần dùng đầu cần tải package và có browser tương thích.
- GitHub MCP dùng `GITHUB_MCP_TOKEN` từ môi trường hoặc cấu hình OAuth riêng của client; không ghi token vào file. Xem [MCP](docs/mcp.md).
- OpenAI Plugins và Addy Osmani có catalog/phiên bản tham chiếu và hướng dẫn cài chính thức trong [plugins](docs/plugins.md). Chưa cài hoặc bật plugin nào; OAuth thực hiện trong công cụ tương ứng.

Không tự thay đổi `~/.claude`, `~/.codex`, cấu hình agent global hoặc hooks. Nếu máy đã cài global skill hoặc workflow, tự tắt bộ trùng trước khi dùng profile dự án; CLI không quản lý global skills.

## Dùng làm GitHub Template

Repo được bật **Template** và giữ **private**. Trong GitHub chọn **Use this template** để tạo bản sao kho công cụ cho dự án mới; giữ toolkit tại root và chạy `apply --target ./project ...` để tạo thư mục làm việc của app. Chưa sinh code app; bắt đầu xây trong `project/`.

Nếu muốn app ở root và repo chỉ chứa tài nguyên đã chọn, tạo repo/thư mục riêng rồi dùng clone kho này để `apply --target ../ten-project ...`. Đây là cách dùng gọn nhất. CLI không apply đè lên root của chính kho toolkit.

## Nguồn, rà soát và bảo trì

Tham khảo inventory từ **secure-mdm**, **ddcproperty**, **solo-english** và **team-task-manager**. Lockfile chứng minh skill đã được khai báo, không đo tần suất dùng. Nghiệp vụ Laravel/MDM và cấu hình local không được nhập.

- [Danh mục nguồn](catalog/sources.json): các nguồn đang sử dụng và nguồn tác giả thực tế.
- [Manifest](catalog/manifest.json): revision, checksum, giấy phép, compatibility, review và patch cho từng skill.
- [Rà soát tĩnh](docs/reviews/snapshots.md): phạm vi, capability, giới hạn và các hành vi đã được harden.
- [Cập nhật tài nguyên](docs/maintenance.md): tải vào temp → rà soát → cập nhật snapshot/lock → kiểm tra → commit.
- [Giấy phép bên thứ ba](THIRD_PARTY_NOTICES.md): tài nguyên giữ giấy phép riêng; đặc biệt CC-BY-SA của Trail of Bits.

Taste giữ snapshot v2 đang dùng trong MDM, không tự nâng lên bản upstream có hook. Chưa kiểm thử hành vi các skill/document scripts trên agent thực tế. Các tiện ích có thể cần Python 3.10+, LibreOffice, Poppler, Graphviz, browser hoặc CLI riêng; setup không tự cài chúng.

## Kiểm tra

```bash
npm run check
npm test
```

CI chạy Node 24 trên macOS và Linux. Test chỉ chạy mã toolkit, không chạy mã skill bên ngoài, không gọi model và không tạo Issues. Chưa kiểm chứng kết nối MCP, đăng nhập plugin hoặc runtime Claude Code.
