# CodeKid Academy

## Phạm vi và kiến trúc

React + TypeScript + Vite, Tailwind, các component theo shadcn/ui, Motion, Lucide, dnd-kit và Monaco. ASP.NET Core 10 dùng Identity/cookie HttpOnly, antiforgery và rate limit. EF Core dùng SQLite khi phát triển, PostgreSQL khi triển khai. Nội dung Python được seed từ JSON; 7 ngôn ngữ khác hiện đúng trạng thái sắp ra mắt.

Frontend → REST API → PostgreSQL. API → dịch vụ runner riêng → container Python giới hạn tài nguyên, không mạng. Code học sinh không chạy trong tiến trình API. API chấm đáp án, quyết định mở khóa và cấp XP; frontend không tự cấp quyền hoặc XP.

## Cấu trúc

- `frontend/src`: giao diện công khai, học sinh, giáo viên/quản trị, editor và kéo thả.
- `backend/CodeKid.Api`: Identity, schema EF, API, seed, chấm điểm và mail.
- `runner`: dịch vụ chấm code Docker cách ly.
- `tests`: kiểm thử tích hợp API.
- `docs`: đối chiếu yêu cầu, hướng dẫn vận hành và giới hạn được kiểm chứng.

## Luồng học

Lý thuyết và câu hỏi ôn tập → kéo thả → tự gõ → viết Python. Mỗi bước yêu cầu điểm ≥80%; bài tiếp theo mở khi hoàn thành thử thách. Mỗi nội dung chỉ cấp XP lần đầu. Luyện lại vẫn lưu lần thử. Transaction, khóa trong tiến trình, PostgreSQL advisory lock và ledger unique bảo vệ việc cấp XP. SQLite chỉ dùng phát triển trong một tiến trình. PostgreSQL/nhiều replica chưa được kiểm thử trên máy này.

## Các giai đoạn

1. Kiến trúc, schema và seed: tài liệu này, Models, Data, seed JSON.
2. Design system và trang: frontend; responsive, dark mode, bàn phím, giảm chuyển động.
3. Tài khoản: Identity, email/phụ huynh, khôi phục và đổi mật khẩu, hồ sơ, phân quyền.
4. Nội dung: Python 12 bài, 3 chế độ, nội dung quản lý và xuất bản.
5–6. Kéo thả và tự gõ: xác minh phía server, nhiều ô trống, gợi ý và số lần thử.
7. Chấm code: runner riêng, sample/hidden tests, giới hạn và xử lý khi runner không khả dụng.
8. Tiến độ: XP, huy hiệu, nhiệm vụ, lịch sử, bảng xếp hạng biệt danh và lựa chọn tham gia.
9. Teacher/Admin: nội dung được phân quyền, lớp học, tiến độ và báo cáo.
10. Build, kiểm thử API/giao diện, checklist và hướng dẫn triển khai.

Các chức năng chưa kiểm chứng trong môi trường thực tế sẽ ghi rõ trong `REQUIREMENTS.md`; không xem build thành công là chứng minh sandbox hoặc triển khai thành công.

## File bàn giao theo giai đoạn

| Giai đoạn | File chính | Kiểm tra |
|---|---|---|
| 1. Kiến trúc/schema | ARCHITECTURE.md, Models.cs, Data.cs, Migrations, schema-postgresql.sql | EF tạo migration và SQL; schema SQLite chạy thật trong tests |
| 2. UI/layout | frontend/src/components/ui.tsx, Layout.tsx, styles.css, pages/Public.tsx, main.tsx | TypeScript/Vite, desktop/mobile/dark/menu |
| 3. Tài khoản | AuthEndpoints.cs, Contracts.cs, Services.cs, pages/Auth.tsx, context.tsx | Identity, email/reset/CSRF/roles và validation API |
| 4. Nội dung | seed/python.json, Seed.cs, LearningEndpoints.cs, pages/Student.tsx, pages/Learning.tsx, public/videos | 12 bài, video phát được, curriculum fixtures |
| 5–6. Kéo thả/tự gõ | pages/Learning.tsx, LearningEndpoints.cs | Chuột, Enter, cảm ứng giả lập, sai/quay về, nhiều ô, đáp án thay thế, XP không trùng |
| 7. Chấm code | runner/server.py, runner/Dockerfile, CodeEditor.tsx, RunnerClient | API protocol và editor qua; sandbox Docker chưa kiểm chứng |
| 8. Gamification | Services.cs, LearningEndpoints.cs, pages/Student.tsx, Profile | Progress/XP/badges/leaderboard/private và lưu sau reload |
| 9. Quản trị | ManageEndpoints.cs, pages/Manage.tsx | Roles/ownership/classes/report và staff forms |
| 10. Vận hành | Dockerfile, compose.yml, .env.example, scripts/dev.mjs, README, REQUIREMENTS, tests | Build/API/browser/unit; Docker/PostgreSQL/SMTP/TLS còn chờ môi trường |

Các đường dẫn C# thuộc `backend/CodeKid.Api`, đường dẫn component thuộc `frontend/src`; bảng ghi trạng thái kiểm tra cuối của từng phần.
