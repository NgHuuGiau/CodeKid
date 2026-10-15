# CodeKid Academy

[![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6)](https://www.typescriptlang.org/)
[![.NET](https://img.shields.io/badge/.NET-10-512BD4)](https://dotnet.microsoft.com/)
[![Python](https://img.shields.io/badge/Python-3.13-3776AB)](https://www.python.org/)
[![Education](https://img.shields.io/badge/Đối%20tượng-9%E2%80%9316%20tuổi-FFB703)](docs/REQUIREMENTS.md)

**CodeKid Academy** là website học lập trình tiếng Việt cho học sinh 9–16 tuổi. Lộ trình Python đưa người học từ xem giải thích, làm câu hỏi, kéo thả và tự gõ đến tự viết chương trình. Giao diện có mục tiêu rõ ràng, hướng dẫn theo từng bước, lưu nháp code và tiến độ để trẻ có thể học lại sau. Monaco Editor chỉ tải khi mở bước viết code; cỡ chữ mặc định là 18px.

---

## Trạng thái hiện tại (10/2026)

| Thành phần | Trạng thái |
|---|---|
| **Python** | ✅ Có thể học — 12 bài, 3 cách luyện tập và thử thách viết code |
| **Ngôn ngữ khác** | ⏳ Có trong danh mục, chưa có bài học và bộ chấm |
| **Nội dung học** | ✅ Mục tiêu, giải thích, ví dụ, ghi nhớ, câu hỏi và video có phụ đề |
| **Tiến độ** | ✅ Lưu phía máy chủ; code nháp lưu riêng trên trình duyệt |
| **Trẻ em và tài khoản** | ✅ Vai trò học sinh/giáo viên/quản trị, xác minh email và đồng ý phụ huynh theo nhóm tuổi |
| **Chạy code** | ✅ Runner Docker tách biệt; 7 kiểm thử sandbox thật đã qua. Cần khởi động runner và cấu hình secret để chấm bài trong phiên phát triển |
| **Test suite** | ✅ API, giao diện trình duyệt, runner unit và nội dung đều có kiểm tra; xem kết quả và giới hạn bên dưới |

## Tính năng chính

| Nhóm | Mô tả |
|---|---|
| **Học theo bước** | Lý thuyết ngắn, video phụ đề, câu hỏi ôn tập, kéo thả, tự gõ và viết Python |
| **Thân thiện với người mới** | Mục tiêu từng bước, giải thích dễ hiểu, gợi ý theo mức, phản hồi tích cực, editor chữ lớn và lưu code nháp |
| **Tiến độ và động lực** | XP, huy hiệu, nhiệm vụ, lịch sử học, mở khóa bài và bảng xếp hạng biệt danh tự chọn |
| **Lớp học** | Giáo viên theo dõi lớp và nội dung được giao; quản trị viên quản lý tài khoản và chương trình học |
| **Bảo vệ trẻ học code** | Xác minh tài khoản, giới hạn dữ liệu công khai, chống giả mạo yêu cầu và runner tách khỏi API |

## Bắt đầu nhanh

### Yêu cầu

- Windows 10/11 (các lệnh bên dưới dùng PowerShell)
- Node.js 22.12 trở lên
- .NET SDK 10
- Python 3.13 để chạy kiểm tra nội dung và runner unit
- Microsoft Edge để chạy UI test mặc định; có thể chọn Chrome bằng `BROWSER_CHANNEL=chrome`
- Docker Desktop/Linux container chỉ cần khi muốn chấm code thật hoặc chạy test sandbox

### Cài đặt và khởi chạy

```powershell
# Mở PowerShell tại thư mục gốc CodeKid
npm.cmd --prefix frontend ci
dotnet restore backend/CodeKid.Api
npm.cmd start
```

Mở **http://127.0.0.1:5173**. Lệnh `npm.cmd start` khởi động frontend và API, đồng thời dừng tiến trình con khi nhấn Ctrl+C. Nếu cổng bận, dừng phiên CodeKid cũ trước. Có thể chạy riêng bằng `npm.cmd run api` và `npm.cmd run dev` trong hai terminal.

Frontend chạy tại cổng 5173, API tại `127.0.0.1:5080`. Môi trường phát triển dùng SQLite tại `backend/CodeKid.Api/codekid.db`; tiến độ vẫn còn sau khi tải lại hoặc khởi động lại ứng dụng.

### Tài khoản mẫu

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Học sinh | `student@codekid.local` | `CodeKid2026!` |
| Giáo viên | `teacher@codekid.local` | `CodeKid2026!` |
| Quản trị | `admin@codekid.local` | `CodeKid2026!` |

Các tài khoản mẫu chỉ được tạo trong Development/Testing. Không dùng các mật khẩu này ở môi trường thật; Production tạo admin qua biến `SeedAdmin`.

Tài khoản mới phải xác minh email. Với nhóm 9–12 tuổi, quy trình dùng email phụ huynh và yêu cầu xác nhận đồng ý. Trong Development chưa có SMTP, email được ghi vào `backend/CodeKid.Api/mailbox/<SHA256-email>.txt`; mở file để lấy liên kết. Thư mục mailbox và khóa được gitignore và không được phục vụ qua HTTP. Production cần SMTP thật.

## Bản đồ entrypoint

| Lệnh | Vai trò |
|---|---|
| `npm.cmd start` | Khởi động API và giao diện phát triển cùng lúc |
| `npm.cmd run api` | Chạy riêng ASP.NET Core API ở chế độ Development |
| `npm.cmd run dev` | Chạy riêng Vite frontend |
| `dotnet build backend/CodeKid.Api` | Biên dịch API và tạo DLL mà UI test sử dụng |
| `npm.cmd run build` | Kiểm tra TypeScript và tạo bản build frontend |
| `npm.cmd test` | Chạy kiểm thử API bằng SQLite tạm và runner giả lập |
| `npm.cmd run test:dotnet` | Chạy 33 test xUnit cho quy tắc chấm điểm và giao thức runner |
| `npm.cmd run test:ui` | Chạy luồng trình duyệt Playwright |
| `npm.cmd run test:compose` | Smoke test PostgreSQL + runner production bằng docker compose |
| `node scripts/generate-videos.mjs` | Tạo lại 12 video và phụ đề từ nội dung seed |
| `dotnet run --project backend/CodeKid.Api -- --sync-python-seed` | Đồng bộ nội dung Python hiện có sau khi tạo SQLite backup tự động |

### Luồng học và dữ liệu

```text
Frontend → API → SQLite (Development) / PostgreSQL (triển khai)
Học:     mục tiêu/giải thích → ôn tập → kéo thả → tự gõ → viết Python
Chấm code: API → runner riêng → container Python giới hạn tài nguyên
Nội dung: backend/CodeKid.Api/seed/python.json → seed ban đầu → quản lý qua Admin/Teacher
```

API kiểm tra câu trả lời, mở khóa bài và cấp XP; frontend không tự cấp quyền hoặc XP. Code học sinh không chạy trong tiến trình API. Seed chỉ nạp khi cơ sở dữ liệu chưa có ngôn ngữ; nội dung đã tồn tại cần sửa qua giao diện quản trị.

### Cập nhật bài học Python cho database đã có

Lệnh `--sync-python-seed` đồng bộ nội dung 12 bài theo vị trí bài trong khóa, tạo backup SQLite online vào `artifacts/db-backups/` trước khi ghi và giữ nguyên tài khoản, tiến độ, XP, lịch sử làm bài cùng ID bài/test. Lệnh từ chối chạy nếu thiếu bài hoặc số test không khớp để tránh làm hỏng dữ liệu. Dừng API trước khi chạy. Nội dung Python do giáo viên/quản trị sửa sẽ được thay bằng nội dung trong seed; chỉ chạy khi muốn áp dụng lại bộ bài chuẩn. Lệnh hiện chỉ hỗ trợ SQLite. Với PostgreSQL, dùng `pg_dump` trước và cập nhật nội dung qua trang quản trị.

## Kiểm thử

Chạy từ thư mục gốc trên Windows/PowerShell:

```powershell
dotnet build backend/CodeKid.Api
dotnet test backend/CodeKid.Tests
npm.cmd run build
npm.cmd test
npm.cmd run test:ui
python -m unittest discover -s runner -p 'test_runner.py' -v
python -m unittest discover -s tests -p '*_test.py' -v
node scripts/smoke-compose.mjs
```

| Bộ kiểm thử | Môi trường và phạm vi |
|---|---|
| .NET unit | xUnit: `Rules` (điểm, ô trống, đáp án), mở chế độ và kiểm tra phản hồi của `RunnerClient` với runner giả |
| API | SQLite tạm, xác thực, phân quyền, tiến độ, chấm điểm, XP và lỗi runner; runner giả lập giao thức, không thực thi code |
| UI | Edge headless, API/DB riêng, cổng 5088/5199; kiểm tra luồng học, phím, viewport di động và quản lý |
| Runner unit | Kiểm tra validation, so sánh kết quả và trạng thái kết nối Docker; không chứng minh cách ly Docker |
| Nội dung | Kiểm tra dữ liệu bài học và chạy các lời giải mẫu do dự án cung cấp |
| Compose smoke | `docker compose` thật: migration + seed PostgreSQL, `/api/health`, runner tự chấm một test và mạng API→runner; tự dọn container/volume của project `codekid-smoke` |

CI `.github/workflows/ci.yml` chạy đủ các lệnh trên khi push/PR: job `test` cho sáu bộ đầu, job `compose-smoke` cho smoke test triển khai. Trên Linux đặt `BROWSER_CHANNEL=chromium` khi chạy `npm run test:ui`. Ảnh QA và trace khi lỗi nằm trong `artifacts/`.

## Sandbox Python thực tế

API không thực thi Python. Runner riêng tạo container cho từng test với user không root, không mạng, root filesystem chỉ đọc, 64 MB RAM, 0.5 CPU, 32 PID, giới hạn CPU 2 giây, wall time 5 giây và đầu ra 8 KB. Mỗi lần gửi tối đa 12.000 ký tự code, 10 test/job và 2 job đồng thời. Endpoint `/health` xác nhận Docker engine phản hồi; Compose dùng kết quả đó để đánh dấu runner healthy/unhealthy mà không chặn API khởi động. Runner cần Linux container; `runner/server.py` không chạy trực tiếp trên Windows.

Khi Docker engine hoạt động, kiểm tra isolation trước khi chạy runner:

```powershell
docker pull python:3.13-alpine
docker build -t codekid-runner runner
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock codekid-runner python -m unittest test_runner test_sandbox -v
```

Chạy runner cục bộ với secret ngẫu nhiên dài ít nhất 32 ký tự:

```powershell
$env:RUNNER_SECRET = '<secret ngẫu nhiên riêng>'
docker run --rm --name codekid-runner-dev -p 127.0.0.1:8091:8091 -e RUNNER_SECRET -v /var/run/docker.sock:/var/run/docker.sock codekid-runner
```

Trong terminal API, đặt `Runner__Secret` bằng cùng secret và `Runner__Url=http://127.0.0.1:8091`, sau đó khởi động API. Không đưa runner ra Internet. Docker socket cho runner quyền quản lý engine; production cần engine/host chấm code riêng, không chứa dữ liệu hoặc dịch vụ khác, image được pin bằng digest và phải kiểm toán isolation trước khi nhận code công khai.

**Trạng thái kiểm tra hiện tại:** Docker Engine 29.7.2 hoạt động. Đã build runner và chạy 7 kiểm thử sandbox thật, gồm giới hạn thời gian/đầu ra, chặn mạng và filesystem ghi. Smoke test `node scripts/smoke-compose.mjs` đã kiểm tra PostgreSQL migration/seed, runner production chấm một test thật và mạng API→runner trong `docker compose` thật; luồng nộp bài đầy đủ qua API với cấu hình triển khai (tài khoản/SMTP) chưa chạy. Khi runner chưa khởi động hoặc chưa có secret đúng, chạy/nộp trả 503, không báo đạt giả, không cấp XP và không mở bài tiếp theo.

## PostgreSQL và triển khai

Migration nằm trong `backend/CodeKid.Api/Migrations`. PostgreSQL dùng migration; SQLite Development dùng `EnsureCreated`.

```powershell
Copy-Item .env.example .env
# Điền mật khẩu DB/admin, runner secret, SMTP và tên miền HTTPS trong .env.
docker pull python:3.13-alpine
docker compose up --build -d
```

Frontend/API được đóng gói chung, cổng 8080 chỉ bind loopback; DB và runner không expose cổng. Cookie Production luôn `Secure`, nên đăng nhập cần reverse proxy HTTPS. Đặt `PUBLIC_URL` và `ALLOWED_HOSTS` theo tên miền thật. Ứng dụng mặc định không tin `X-Forwarded-For`; cần cấu hình trusted proxy cụ thể trước khi triển khai nhiều người dùng để rate limit nhận đúng IP.

Khóa Data Protection và PostgreSQL dùng volumes riêng. Giới hạn quyền volume khóa cho API; sao lưu DB/khóa và thử khôi phục. Bỏ `ADMIN_PASSWORD` khỏi cấu hình dài hạn sau bootstrap. Không reset Docker factory defaults để chạy thử vì có thể xóa dữ liệu khác.

## Cấu trúc thư mục

```text
CodeKid/
├── backend/CodeKid.Api/   # Identity, API, EF Core, seed và migrations
├── backend/CodeKid.Tests/ # Test xUnit cho Rules, mở chế độ và RunnerClient
├── frontend/              # React, TypeScript, trang học và browser tests
│   ├── public/videos/     # 12 video MP4 và phụ đề VTT
│   └── src/               # Trang, component, API client và styles
├── runner/                # Dịch vụ chấm bài Docker và kiểm tra sandbox
├── scripts/               # Khởi động phát triển, tạo video, smoke compose
├── tests/                 # API và kiểm tra curriculum
├── .github/workflows/     # CI chạy đủ bộ kiểm thử
├── docs/                  # Kiến trúc, yêu cầu và schema PostgreSQL
├── compose.yml            # PostgreSQL, API và runner
└── README.md
```

## Tài liệu

| Tệp | Nội dung |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Kiến trúc, luồng học và các giai đoạn |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | Đối chiếu yêu cầu, kiểm tra đã chạy và giới hạn |
| [docs/schema-postgresql.sql](docs/schema-postgresql.sql) | Schema PostgreSQL khởi tạo |

## Giới hạn đã biết

- Chưa kiểm chứng multi-replica, SMTP, HTTPS, khôi phục backup và luồng nộp bài đầy đủ với cấu hình triển khai; PostgreSQL migration/seed và mạng API→runner đã có smoke test compose.
- Chưa kiểm tra tải lớn, touch trên thiết bị thật, screen reader thực tế hoặc pentest.
- 12 video minh họa dài 30 giây, không lời thoại; có phụ đề tiếng Việt về mục tiêu, giải thích, ví dụ, ghi nhớ và thử thách.
- Chưa công bố Internet và chưa tuyên bố nền tảng production hoàn chỉnh.
