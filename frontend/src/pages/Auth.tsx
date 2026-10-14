import { useState, type FormEvent } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { api } from "../api";
import { useAuth } from "../context";
import { Button, Card, Pill, Robot } from "../components/ui";
export function AuthPage({
  mode,
}: {
  mode: "login" | "register" | "forgot" | "reset" | "verify";
}) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [nickname, setNickname] = useState("");
  const [ageBand, setAgeBand] = useState("13-16");
  const [consent, setConsent] = useState(false);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const title = {
    login: "Chào mừng bạn trở lại!",
    register: "Hành trình bắt đầu từ đây.",
    forgot: "Lấy lại chìa khóa của bạn",
    reset: "Tạo mật khẩu mới",
    verify: "Xác minh tài khoản",
  }[mode];
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (["register", "reset"].includes(mode) && password !== confirm) {
      setError("Hai mật khẩu chưa khớp.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") {
        const u = await login(email, password);
        const from = (location.state as { from?: string } | null)?.from;
        navigate(
          from?.startsWith("/") && !from.startsWith("//")
            ? from
            : u.roles.some((r) => ["Teacher", "Admin"].includes(r))
              ? "/manage"
              : "/dashboard",
          { replace: true },
        );
      } else {
        const result = await api<{ message: string }>(`/auth/${mode}`, "POST", {
          email,
          password,
          nickname,
          ageBand,
          guardianConsent: consent,
          token: params.get("token") ?? "",
        });
        setMessage(result.message);
        setPassword("");
        setConfirm("");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    setBusy(true);
    setError("");
    try {
      setMessage(
        (
          await api<{ message: string }>("/auth/resend", "POST", {
            email,
            password: "",
          })
        ).message,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container auth-page">
      <div className="auth-intro">
        <Pill>
          <ShieldCheck size={14} /> Không cần biết lập trình trước
        </Pill>
        <h1>
          Một chút tò mò.
          <br />
          Một hành trình
          <br />
          <span>đầy bất ngờ.</span>
        </h1>
        <Robot />
        <p>Kiki luôn ở đây để cùng bạn thử, sai và học thêm một điều mới.</p>
      </div>
      <Card className="auth-card">
        <h2>{title}</h2>
        <p>
          {mode === "login"
            ? "Tiếp tục khám phá thế giới Code cùng Kiki."
            : mode === "register"
              ? "Tạo tài khoản miễn phí. Chỉ cần một biệt danh và email."
              : "Làm theo hướng dẫn để trở lại hành trình của bạn."}
        </p>
        <form onSubmit={submit}>
          {mode === "register" && (
            <>
              <label>
                Biệt danh
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  required
                  minLength={2}
                  maxLength={24}
                  autoComplete="nickname"
                  placeholder="Ví dụ: Robot Tò Mò"
                />
                <UserRound className="field-icon" size={18} />
              </label>
              <label>
                Nhóm tuổi
                <select
                  value={ageBand}
                  onChange={(e) => setAgeBand(e.target.value)}
                >
                  <option value="13-16">13–16 tuổi</option>
                  <option value="9-12">9–12 tuổi</option>
                </select>
              </label>
            </>
          )}
          <label>
            {mode === "register" && ageBand === "9-12"
              ? "Email của phụ huynh"
              : "Email"}
            <input
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ban@example.com"
              readOnly={mode === "verify" || mode === "reset"}
            />
            <Mail className="field-icon" size={18} />
          </label>
          {["login", "register", "reset"].includes(mode) && (
            <>
              <label>
                Mật khẩu
                <div className="password-field">
                  <input
                    type={show ? "text" : "password"}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={mode === "login" ? 1 : 10}
                    maxLength={128}
                  />
                  <button
                    type="button"
                    aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    onClick={() => setShow((x) => !x)}
                  >
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
              {mode !== "login" && (
                <>
                  <small className="muted">
                    Ít nhất 10 ký tự, có chữ hoa, chữ thường và số.
                  </small>
                  <label>
                    Nhập lại mật khẩu
                    <input
                      type="password"
                      autoComplete="new-password"
                      required
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      maxLength={128}
                    />
                  </label>
                </>
              )}
            </>
          )}
          {mode === "register" && (
            <>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>
                  {ageBand === "9-12"
                    ? "Tôi là phụ huynh và đồng ý cho học sinh sử dụng CodeKid."
                    : "Tôi đã đọc và đồng ý với thông tin về quyền riêng tư."}{" "}
                  <Link to="/privacy">Xem chi tiết</Link>
                </span>
              </label>
              {ageBand === "9-12" && (
                <div className="note small">
                  Phụ huynh cần mở email xác minh để tài khoản được hoạt động.
                </div>
              )}
            </>
          )}
          {mode === "verify" && (
            <div className="note">
              {params.get("token")
                ? "Bấm xác minh để xác nhận email và sự đồng ý của phụ huynh nếu học sinh 9–12 tuổi."
                : "Mở liên kết trong email xác minh trước."}
            </div>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="form-success" role="status">
              <CheckCircle2 size={18} />
              {message}
            </p>
          )}
          <Button
            className="full"
            disabled={
              busy ||
              (mode === "verify" && !params.get("token")) ||
              (mode === "reset" && !params.get("token"))
            }
          >
            {busy
              ? "Đang xử lý…"
              : {
                  login: "Đăng nhập",
                  register: "Tạo tài khoản miễn phí",
                  forgot: "Gửi email đặt lại",
                  reset: "Lưu mật khẩu mới",
                  verify: "Xác minh email",
                }[mode]}
            <ArrowRight size={17} />
          </Button>
          {["login", "register", "forgot"].includes(mode) && (
            <button
              className="text-button"
              type="button"
              disabled={busy || !email}
              onClick={() => void resend()}
            >
              Gửi lại email xác minh
            </button>
          )}
        </form>
        <div className="auth-links">
          {mode === "login" ? (
            <>
              <Link to="/forgot">Quên mật khẩu?</Link>
              <span>
                Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
              </span>
            </>
          ) : (
            <Link to="/login">
              <LockKeyhole size={14} /> Trở về đăng nhập
            </Link>
          )}
        </div>
        {import.meta.env.DEV && mode === "login" && (
          <details className="demo-info">
            <summary>Tài khoản thử nghiệm cục bộ</summary>
            <p>
              student@codekid.local
              <br />
              teacher@codekid.local
              <br />
              admin@codekid.local
            </p>
            <p>
              Mật khẩu: <code>CodeKid2026!</code>
            </p>
            <small>
              Email đăng ký mới được lưu trong thư mục
              backend/CodeKid.Api/mailbox khi chưa cấu hình SMTP.
            </small>
          </details>
        )}
      </Card>
    </div>
  );
}
