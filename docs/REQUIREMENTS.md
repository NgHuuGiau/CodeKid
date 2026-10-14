# Đối chiếu master prompt

Ngày: 15/10/2026, Asia/Saigon. “Đã triển khai” và “đã kiểm thử production” là hai trạng thái khác nhau.

| Yêu cầu | Đã triển khai | Kiểm tra / giới hạn |
|---|---|---|
| Stack | React/TS/Vite, Tailwind, component shadcn/ui theo Radix Slot/CVA, Motion, Lucide, dnd-kit, Monaco; ASP.NET Core/Identity/EF/PostgreSQL | Build frontend/backend; database API test là SQLite |
| UI tiếng Việt | Design system, mascot SVG, responsive, dark mode, trạng thái loading/empty/error/success/disabled/locked | Browser desktop/390px, ảnh QA; giảm chuyển động theo thiết bị |
| Public | Trang chủ, giới thiệu, danh sách/chi tiết khóa, thử thách, leaderboard, footer, login/register/forgot | Browser trang chủ/menu và lỗi API |
| Tài khoản | Identity/cookie, xác minh/gửi lại, forgot/reset/change password, logout, hồ sơ/avatar, Student/Teacher/Admin | API login/register/reset/phân quyền; SMTP thật chưa kiểm tra |
| Trẻ em | Nhóm tuổi, đồng ý phụ huynh, email phụ huynh xác minh, hạn chế dữ liệu, leaderboard opt-in biệt danh | API chặn trước xác minh, không công khai email/tuổi; chưa kiểm tra pháp lý từng nơi triển khai |
| Dashboard | XP/cấp độ, số bài, khóa/tiến độ, tiếp tục học, nhiệm vụ, huy hiệu, lịch sử/ngôn ngữ | API và browser dữ liệu lưu, profile sau reload |
| Ngôn ngữ | Python đầy đủ seed; C++, C#, Java, JS, HTML, CSS, SQL sắp ra mắt | 8 ngôn ngữ; chỉ Python available; API chặn mở ngôn ngữ chưa có bộ chấm |
| Bài học | 12 bài: mục tiêu, giải thích, code tô màu, mascot, ghi chú, quiz, video/VTT, thực hành | Seed 12 bài/24 hoạt động/12 challenge; browser phát MP4 thật |
| Kéo thả | Pointer/touch, Space+arrows, Enter chọn/điền thay thế; hover, sai về bank, đúng cố định; âm, XP, reset/next | Browser kéo chuột đúng/sai, Enter, retry không XP trùng; touch vật lý chưa test |
| Nhiều ô/cấp độ | Level 1–5:1, 6–10:2, 11–15:3–4, 16–20:5–7, 21+:8–12 | Seed đến level 23/11 ô; validation và API kiểm tra mọi hoạt động |
| Tự gõ | Không bank, ô theo độ dài/Tab, chấm từng ô, gợi ý 3 mức, lần thử; đáp án thay thế | Browser sai/đúng/gợi ý; API trim và không reveal đáp án; chuỗi nhận nháy đơn/kép bằng dữ liệu |
| Viết code | Đề/IO, Monaco tự host/Python, chạy mẫu/nộp đầy đủ, errors/results, submissions, test ẩn | API test double kiểm tra grading/XP/privacy; browser editor và 503; Docker chưa chạy |
| Sandbox | Dịch vụ riêng, container user không root, không mạng/read-only, CPU/RAM/PID/wall/output limits | Có test_sandbox; Docker lỗi socket nên chưa xác nhận isolation thực tế |
| Mở khóa/XP | Theory→drag→memory→challenge, ≥80%, next lesson, +10/20/30/+50, ledger unique/transaction/Postgres lock | API concurrent completions chỉ cấp XP một lần; PostgreSQL lock chưa test thật |
| Gamification | Level/XP, huy hiệu, nhiệm vụ, progress, hoạt ảnh, leaderboard biệt danh, mascot/gợi ý tích cực | API badges/opt-in; không streak ép học, không trừ XP khi sai |
| Teacher/Admin | Dashboard/content ownership; khóa/chương/bài/video/questions/answers/challenges/tests/XP/badges; roles/lock; classes/progress; errors/report | API phân quyền/ownership; browser staff forms; test đã có lịch sử giữ nguyên |
| Schema | Đủ entity yêu cầu, FK/index/unique/XP constraints; Users/Roles là AspNetUsers/AspNetRoles | PostgreSQL InitialCreate và SQLite schema trong tests |
| Validation/bảo mật | Cookie HttpOnly/Secure prod, CSRF, rate limit, lockout, body/field bounds, null/missing, hidden tests | API bảo vệ dữ liệu, 429 và lỗi runner; chưa pentest/load test |
| Triển khai | Dockerfile, compose, env example, persist keys/DB, README | Chưa chạy production/SMTP/HTTPS/backup restore |

## Kiểm thử đã chạy

- Backend build: không warning/error ở lần kiểm tra.
- TypeScript + Vite build; editor tải riêng khi mở viết code.
- API: 22 checks (21 subtest + test tổng) qua, Identity và SQLite thật. Runner test double không thực thi code.
- Browser: 8 luồng qua sau khi sửa tràn mobile, stale unlock và Enter; chuột, keyboard, touch giả lập, video, profile, staff, lỗi API.
- Runner unit: 2 test qua cho validation và so sánh output.
- Curriculum: tất cả test case của 12 lời giải mẫu qua, chỉ chạy code fixture do dự án viết.
- Audit: .NET và frontend runtime không có vulnerability được báo ở lần kiểm tra.

## Chưa thể đánh dấu hoàn tất

1. Docker Desktop không khởi động do lỗi `sailor-ingest.sock`; chưa chạy PostgreSQL migration và bộ chấm thực tế.
2. Không có SMTP/tên miền/TLS để kiểm thử production.
3. Mobile là viewport giả lập Edge, chưa kiểm tra touch vật lý/screen reader thật.
4. Chưa đo tải, nhiều replica, backup restore hoặc chống thoát sandbox. Cần engine Docker chấm code riêng và kiểm toán trước mở công khai.
5. Video mẫu ngắn, không lời thoại; có hướng dẫn/ví dụ/ghi chú và phụ đề, có thể thay bằng video dài.

Do các mục này, chưa tuyên bố nền tảng production hoàn chỉnh theo toàn bộ master prompt.
