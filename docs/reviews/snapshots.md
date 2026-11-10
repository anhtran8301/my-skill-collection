# Rà soát snapshot — 2026-11-10

**Kết luận: safe-with-caveats cho các snapshot và cấu hình được lưu**, không phải chứng nhận an toàn toàn bộ upstream, dependency, MCP server hoặc plugin.

Phương pháp: shallow clone không submodule vào thư mục tạm, đối chiếu nguồn/giấy phép, chạy scanner `skill-security-review` và đọc các finding theo ngữ cảnh. Chỉ phân tích tĩnh; không chạy mã, installer, eval, dev server hay test của upstream. Kết quả và nhận định từng finding ở [scanner.json](scanner.json); bản dễ đọc ở [scanner.txt](scanner.txt). Scanner là công cụ định vị; số lượng high không đồng nghĩa số lỗ hổng.

## Tự chạy

Snapshot đã nhập không có auto-run entrypoint, hook được kích hoạt, lifecycle installer, symlink trỏ ra ngoài hoặc binary được scanner phát hiện. Không copy metadata plugin/hook cấp repository upstream. Skill gốc design-taste được giữ ở snapshot đang dùng trong MDM, không lấy bản mới có Stop hook.

MCP được tạo khi apply: Context7 HTTP mặc định; Playwright và GitHub chỉ khi chọn. Cấu hình MCP có thể khởi động/kết nối khi agent tải project, khác với script skill chạy theo yêu cầu. Setup không khởi động chúng. Quyền tin cậy project và OAuth vẫn thuộc agent/dịch vụ.

## Theo nhóm

| Nhóm | Khả năng và giới hạn |
|---|---|
| Core/AI Hero | Chủ yếu Markdown; script template debug tạo tiến trình khi người dùng dùng tiện ích đó. Code review có thể đề nghị subagents; dùng cách thực thi được người dùng chọn, hoặc review tuần tự khi thiếu công cụ. |
| Frontend | Taste v2 tải public asset từ Openverse/Wikimedia/Art Institute/Met/Archive/NASA và chạy Chrome/CDP trong profile tạm, phục vụ loopback. Ảnh/font/CDN xuất hiện trong output có thể gửi request từ trình duyệt. Kiểm tra license ảnh từng lần sử dụng. Các từ curl/keychain trong library JSON là mô tả hình ảnh, không truy cập credential. |
| Review | Prompt review và tối giản code; không tự cài hoặc chạy công cụ. |
| Security | Semgrep/CodeQL/SARIF scripts gọi CLI, có thể tải rule repo và xóa output cũ trong thư mục riêng. Strix có thể gửi source lên dịch vụ cloud hoặc chạy pentest nếu được yêu cầu; cài pack không cho phép upload/scan. Không dùng output directory chứa dữ liệu khác. |
| Tooling | MCP builder có ví dụ HTTP auth; webapp-testing chạy lệnh server do người dùng cung cấp; skill-creator eval gọi Claude và sử dụng auth/env kế thừa, có thể tốn phí. Không chạy eval trên code/prompt chưa tin cậy. |
| Documents | Chạy Python, LibreOffice, Poppler/Graphviz và các thư viện riêng khi được gọi; một số helper tạo macro/profile LibreOffice. Không thử chạy document scripts trong lượt này. Helper nạp thư viện chung từ `/tmp` đã bị thay thế. |
| Deploy | Đọc trạng thái Vercel và có thể gọi CLI/network/deploy khi được yêu cầu. Giữ preview mặc định của upstream; không tự publish do cài pack. |

## Bản sửa và portability

Diff so với upstream nằm trong `catalog/patches/` và được manifest trỏ tới:

- DOCX/PPTX/XLSX: bỏ cơ chế GCC/LD_PRELOAD dùng thư viện `/tmp/lo_socket_shim.so`; giữ môi trường `svp` và profile riêng cho mỗi lần `run_soffice`. Nếu môi trường chặn LibreOffice, báo lỗi thay vì dùng shim.
- Skill creator: bỏ hàm dừng tiến trình đang chiếm cổng; viewer chuyển sang cổng trống và chỉ listen loopback.
- `ai-dev` là flow tổng quát viết lại từ MDM; không mang lệnh build, URL dịch vụ, contract hoặc quy tắc tenant của MDM.
- AI Hero to-spec/to-tickets/code-review: đọc tracker đã được CLI cấu hình thay vì đòi setup lại; labels là tùy chọn và không tự tạo remote labels. Review có đường chạy tuần tự khi không dùng subagent.

U+200B trong ví dụ fenced code của audit-context-building và U+200D trong ví dụ emoji Swift đã được đọc và xác nhận là nội dung minh họa. Các finding “send API key” trong MCP builder là ví dụ auth tới API đích, không yêu cầu lấy khóa từ máy.

## Giấy phép và phần chưa rà soát

Mỗi skill giữ LICENSE upstream hoặc thông báo license. Vercel khai báo MIT tại README nhưng revision này không có toàn văn LICENSE; README và attribution được giữ nguyên. Trail of Bits dùng CC-BY-SA-4.0; mọi bản sửa của nó tiếp tục theo giấy phép đó. Không áp giấy phép MIT của toolkit lên tài nguyên bên thứ ba.

Không rà soát mã thực thi của MCP server, dependency pip/npm, LibreOffice/browser, CLI bên ngoài, rule repo tải về sau này, hoặc mã plugin OpenAI/Addy. Hai bộ plugin chỉ có metadata trong catalog, chưa cài, chưa đăng nhập và chưa được bật. Không có transcript hay opaque binary trong snapshot được nhập; ảnh/video remote chưa được tải. Các tool-specific lệnh trong skill upstream vẫn cần kiểm tra tương thích với phiên bản agent đang dùng.

Không kết luận toàn bộ 736 file vendored đã được audit từng dòng. Phạm vi là inventory, entrypoint, giấy phép và các file/vùng được scanner đánh dấu, kèm các bản sửa nêu trên; ai-dev được viết và kiểm tra riêng. Chưa kiểm thử hành vi skill trên Claude/Codex thực tế; test của repo chỉ kiểm chứng việc đóng gói và setup.
