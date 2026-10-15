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
| Viết code | Đề/IO, Monaco tự host/Python, chạy mẫu/nộp đầy đủ, errors/results, submissions, test ẩn | API test double kiểm tra grading/XP/privacy; browser editor và 503; 7 test runner/sandbox Docker thật đã qua |
| Sandbox | Dịch vụ riêng, container user không root, không mạng/read-only, CPU/RAM/PID/wall/output limits, health báo Docker engine | Health check và unit fail-closed; Docker lỗi socket nên chưa xác nhận isolation thực tế |
| Mở khóa/XP | Theory→drag→memory→challenge, ≥80%, next lesson, +10/20/30/+50, ledger unique/transaction/Postgres lock | API concurrent completions chỉ cấp XP một lần; PostgreSQL lock chưa test thật |
| Gamification | Level/XP, huy hiệu, nhiệm vụ, progress, hoạt ảnh, leaderboard biệt danh, mascot/gợi ý tích cực | API badges/opt-in; không streak ép học, không trừ XP khi sai |
| Teacher/Admin | Dashboard/content ownership; khóa/chương/bài/video/questions/answers/challenges/tests/XP/badges; roles/lock; classes/progress; errors/report | API phân quyền/ownership; browser staff forms; test đã có lịch sử giữ nguyên |
| Schema | Đủ entity yêu cầu, FK/index/unique/XP constraints; Users/Roles là AspNetUsers/AspNetRoles | PostgreSQL InitialCreate và SQLite schema trong tests |
| Validation/bảo mật | Cookie HttpOnly/Secure prod, CSRF, rate limit, lockout, body/field bounds, null/missing, hidden tests | API bảo vệ dữ liệu, 429 và lỗi runner; chưa pentest/load test |
| Triển khai | Dockerfile, compose, env example, persist keys/DB, README | Chưa chạy production/SMTP/HTTPS/backup restore |

## Kiểm thử đã chạy

- Backend build: không lỗi biên dịch; NU1900 vì không truy cập được nguồn advisory NuGet.
- TypeScript + Vite build; editor tải riêng khi mở bước viết code, cỡ chữ 18px. Chunk editor 2.3 MB (596 KB gzip), chưa giảm thêm vì Monaco đã không nằm trong bundle trang đầu.
- API: 22 checks (21 subtest + test tổng) qua, Identity và SQLite thật. Runner test double không thực thi code.
- Browser: 8 luồng qua sau khi sửa tràn mobile, stale unlock và Enter; chuột, keyboard, touch giả lập, video, profile, staff, lỗi API.
- Runner unit: 3 test qua cho validation, so sánh output và trạng thái kết nối Docker (được giả lập; không thay thế sandbox integration test).
- Curriculum: tất cả test case của 12 lời giải mẫu qua, chỉ chạy code fixture do dự án viết.
- .NET unit: 33 test xUnit trong `backend/CodeKid.Tests` qua cho `Rules` (điểm, ô trống, đáp án, nickname/email), mở chế độ và giao thức `RunnerClient` với runner giả.
- CI: `.github/workflows/ci.yml` hợp lệ, hai job `test` (13 bước) và `compose-smoke` (3 bước) chạy đủ bộ kiểm thử khi push/PR.
- Compose smoke (`scripts/smoke-compose.mjs`): PASS — migration và seed PostgreSQL trong `docker compose` thật, `/api/health`, runner production tự chấm một test thật, và mạng API→runner; container/volume được dọn sau mỗi lần chạy.
- Seed sync: chạy trên SQLite thử và DB phát triển; backup online được tạo, tiến độ/lịch sử/XP giữ nguyên, integrity và foreign keys sạch.
- Audit dependency trực tuyến: chưa xác minh được trạng thái advisory .NET vì nguồn NuGet không truy cập được; chưa có kết quả sandbox Docker thực.

## Chưa thể đánh dấu hoàn tất

1. Bộ chấm đã qua test sandbox Docker thật; PostgreSQL migration, seed và mạng API→runner đã qua smoke test compose. Còn thiếu: luồng nộp bài đầy đủ qua API với cấu hình triển khai thật (cần tài khoản và SMTP) và PostgreSQL lock khi cấp XP chạy thật.
2. Không có SMTP/tên miền/TLS để kiểm thử production.
3. Mobile là viewport giả lập Edge, chưa kiểm tra touch vật lý/screen reader thật.
4. Chưa đo tải, nhiều replica, backup restore hoặc chống thoát sandbox. Cần engine Docker chấm code riêng và kiểm toán trước mở công khai.
5. Video minh họa 30 giây, không lời thoại; hiển thị mục tiêu, giải thích, ví dụ, ghi nhớ và thử thách với phụ đề tiếng Việt. Chưa có thuyết minh âm thanh.

Do các mục này, chưa tuyên bố nền tảng production hoàn chỉnh theo toàn bộ master prompt.
