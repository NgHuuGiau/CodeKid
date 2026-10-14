# CodeKid Academy

Website tiếng Việt cho học sinh 9–16 tuổi: 12 bài Python, lý thuyết/video, kéo thả, tự gõ và viết code. Dự án mới tại `D:\Web giáo dục` vì thư mục ban đầu trống. Xem [kiến trúc](docs/ARCHITECTURE.md) và [đối chiếu yêu cầu](docs/REQUIREMENTS.md).

## Chạy cục bộ

Cần Node 22.12+ (đã dùng Node 24), .NET SDK 10. Python 3.13 dùng cho kiểm thử nội dung.

```powershell
cd 'D:\Web giáo dục'
npm.cmd --prefix frontend ci
dotnet restore backend/CodeKid.Api
npm.cmd start
```

Mở **http://127.0.0.1:5173** sau khi hai server sẵn sàng. Ctrl+C dừng các tiến trình do script tạo. Nếu cổng bận, dừng phiên CodeKid trước đó. Có thể dùng hai terminal riêng: `npm.cmd run api` và `npm.cmd run dev`.

API ở 127.0.0.1:5080; SQLite lưu tại `backend/CodeKid.Api/codekid.db`, giữ tiến độ sau reload/restart.

| Vai trò | Email thử nghiệm | Mật khẩu |
|---|---|---|
| Student | student@codekid.local | CodeKid2026! |
| Teacher | teacher@codekid.local | CodeKid2026! |
| Admin | admin@codekid.local | CodeKid2026! |

Các tài khoản mẫu chỉ có trong Development/Testing. Production tạo admin từ biến SeedAdmin.

Tài khoản mới phải xác minh email; nhóm 9–12 dùng email phụ huynh và xác nhận đồng ý. Development chưa có SMTP lưu email vào `backend/CodeKid.Api/mailbox/<SHA256-email>.txt`: mở file lấy liên kết. Mailbox và key bị gitignore, không phục vụ qua HTTP. Production bắt buộc cấu hình SMTP thật.

## Kiểm thử

```powershell
dotnet build backend/CodeKid.Api
npm.cmd run build
npm.cmd test
npm.cmd run test:ui
python -m unittest discover -s runner -p 'test_runner.py' -v
python -m unittest discover -s tests -p '*_test.py' -v
```

API test dùng SQLite tạm và runner giả lập **giao thức**, không thực thi code. Browser test dùng Edge headless, server/database riêng, cổng 5088/5199. Trên Linux có Chrome, đặt `BROWSER_CHANNEL=chrome`. Ảnh QA ở `artifacts/`.

## Sandbox Python thực tế

API không thực thi Python; runner riêng tạo container cho từng test: user không root, không mạng, root filesystem chỉ đọc, 64 MB RAM, 0.5 CPU, 32 PID, CPU 2 giây, wall time 5 giây và đầu ra 8 KB. Tối đa 12.000 ký tự code, 10 test/job và 2 job đồng thời. Runner cần Linux container, không chạy server.py trực tiếp trên Windows.

Khi Docker hoạt động, kiểm tra isolation trước:

```powershell
docker pull python:3.13-alpine
docker build -t codekid-runner runner
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock codekid-runner python -m unittest test_runner test_sandbox -v
```

Chạy runner cục bộ với secret ngẫu nhiên ít nhất 32 ký tự:

```powershell
$env:RUNNER_SECRET = '<secret ngẫu nhiên riêng>'
docker run --rm --name codekid-runner-dev -p 127.0.0.1:8091:8091 -e RUNNER_SECRET -v /var/run/docker.sock:/var/run/docker.sock codekid-runner
```

Ở terminal API, đặt `Runner__Secret` cùng giá trị và `Runner__Url=http://127.0.0.1:8091` rồi chạy API. Không expose runner Internet. Docker socket cho runner quyền quản lý engine: production cần engine/host chấm code riêng, không chứa dữ liệu/dịch vụ khác, image pin digest và kiểm toán isolation trước nhận code công khai.

**Máy hiện tại:** Docker Desktop lỗi ở `sailor-ingest.sock`, chưa tạo được Linux engine. Vì vậy chưa kiểm chứng PostgreSQL và sandbox thật. Chế độ 3 có editor/đề bài; chạy/nộp trả 503 khi runner chưa sẵn sàng, không báo đạt giả hoặc cấp XP/mở bài tiếp theo.

## PostgreSQL và triển khai

Migration nằm ở `backend/CodeKid.Api/Migrations`; PostgreSQL dùng Migrate, SQLite Development dùng EnsureCreated.

```powershell
Copy-Item .env.example .env
# Điền mật khẩu DB/admin, runner secret, SMTP và tên miền HTTPS.
docker pull python:3.13-alpine
docker compose up --build -d
```

Frontend/API đóng gói chung, cổng 8080 bind loopback; DB/runner không expose cổng. Cookie Production luôn Secure: **đăng nhập HTTP không hoạt động**, cần proxy HTTPS. PUBLIC_URL và ALLOWED_HOSTS phải đúng tên miền. App mặc định không tin X-Forwarded-For; cấu hình trusted proxy cụ thể trước triển khai nhiều người dùng, nếu không rate limit sẽ tính theo IP proxy.

Khóa Data Protection và PostgreSQL dùng volumes riêng. Giới hạn quyền volume keys cho API; sao lưu DB/key và kiểm tra khôi phục. Bỏ ADMIN_PASSWORD khỏi cấu hình dài hạn sau bootstrap. Không reset Docker factory defaults để chạy thử vì có thể mất dữ liệu khác.

## Quản lý nội dung

- Seed: `backend/CodeKid.Api/seed/python.json`, chỉ seed khi DB chưa có ngôn ngữ. Nội dung đã tồn tại sửa qua Admin/Teacher.
- Admin: tài khoản/vai trò/lock, ngôn ngữ, khóa/chương/bài/video, câu hỏi/đáp án, thử thách/test, XP/huy hiệu, lớp và báo cáo.
- Teacher: nội dung khóa được giao, tiến độ học sinh trong lớp; Admin xếp học sinh vào lớp.
- Bỏ Xuất bản để ẩn nội dung; giữ bài đã có tiến độ. Thử thách đã có submissions giữ nguyên test để bảo toàn lịch sử.
- 12 video MP4 gốc, 18 giây/video không lời thoại, kèm VTT. Tạo lại bằng `node scripts/generate-videos.mjs`; thay video dài qua quản trị.

Chưa kiểm chứng Docker/PostgreSQL, SMTP, HTTPS, tải lớn/nhiều replica, backup restore, touch thiết bị thật và pentest. Chưa công bố Internet; chưa tuyên bố production hoàn chỉnh.
