# Cập nhật và thêm tài nguyên

Không có auto-update ở startup và không chạy `npx skills add` vào kho một cách mù quáng. Snapshot chỉ đổi trong commit có review.

1. Đọc `catalog/project-evidence.json` để đối chiếu bộ đang dùng; không copy nguyên cấu hình local của project tham khảo.
2. Tải upstream bằng shallow clone vào thư mục tạm, không recurse submodule và không chạy install/build/test/hook. Ghi commit SHA; kiểm tra LICENSE/NOTICE theo từng skill.
3. Chọn thư mục skill cùng đủ scripts/references/assets. Không copy cache, transcript, credential hoặc metadata tự bật plugin/hook. Giữ full license/attribution, gồm ShareAlike nếu có.
4. Dùng scanner `skill-security-review` đã được bạn cài và tin cậy: `node <skill-security-review>/scripts/scan.mjs <thu-muc-tam> --json`. Đây là công cụ bên ngoài, không vendored trong repo. Đọc mọi finding và auto-run entrypoint; không kết luận chỉ từ số lượng finding.
5. Chỉ đưa bản đạt review vào `vendor/skills`. Mục chưa được rà soát hoặc không rõ quyền phân phối chỉ thêm vào catalog với trạng thái catalog-only, không vào profile/pack cài được.
6. Reapply các thay đổi hardening trong `catalog/patches`; đối chiếu từng diff với revision mới. Cập nhật `sourcePath`, revision, license, provenance, review và checksum trong manifest. Với snapshot local, dùng revision dạng `local-snapshot:<tree-hash>` và ghi SHA upstream tham khảo riêng.
7. Cập nhật báo cáo và scanner đã chuẩn hóa đường dẫn; chạy `npm run check` rồi `npm test`, kiểm tra diff/secret/license trước khi commit.

Checksum tính theo tên file, SHA-256 nội dung và executable bit, thứ tự tên file tăng dần. Có thể lấy hash bằng hàm có sẵn, không thực thi mã skill:

```bash
node --input-type=module -e 'import {treeHash} from "./scripts/toolkit.mjs"; console.log(treeHash(process.argv[1]))' vendor/skills/ten-skill
```

Profile `core`, `aihero` và các pack là danh sách ID trong manifest. Dependency sang skill cùng bộ phải được giữ đầy đủ trong profile; `check` xác minh các link cụ thể từ SKILL.md. Các đường dẫn ví dụ/dynamic trong prompt không thể được kiểm tra tĩnh hoàn toàn: xem diff và thử đóng gói một project tạm khi thêm nguồn mới.

Sau khi cập nhật kho, project đích chỉ được cập nhật khi bạn chạy lại apply. File đã sửa thủ công sẽ bị chặn theo checksum; không thay hash ownership để bỏ qua khác biệt.
