import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BookOpen,
  ChevronDown,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { Avatar, Button } from "./components/ui";
import { useAuth, usePreferences } from "./context";
export default function Layout() {
  const { user, logout, error, refresh } = useAuth();
  const { dark, toggleDark } = usePreferences();
  const [menu, setMenu] = useState(false);
  const [account, setAccount] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const navigate = useNavigate();
  return (
    <>
      <a className="skip-link" href="#main">
        Đến nội dung chính
      </a>
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="brand" aria-label="CodeKid Academy trang chủ">
            <span className="brand-mark">
              <GraduationCap size={26} />
            </span>
            <span>
              Code<span className="brand-accent">Kid</span>
              <small>ACADEMY</small>
            </span>
          </Link>
          <nav
            className={menu ? "nav nav-open" : "nav"}
            aria-label="Điều hướng chính"
            onClick={() => setMenu(false)}
          >
            <NavLink to="/" end>
              Trang chủ
            </NavLink>
            <NavLink to="/courses">Khóa học</NavLink>
            <NavLink to="/challenges">Thử thách</NavLink>
            <NavLink to="/leaderboard">Bảng xếp hạng</NavLink>
            {user && <NavLink to="/dashboard">Góc học tập</NavLink>}
          </nav>
          <div className="header-actions">
            <Button
              variant="ghost"
              className="icon-btn"
              onClick={toggleDark}
              aria-label={dark ? "Bật chế độ sáng" : "Bật chế độ tối"}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </Button>
            {user ? (
              <div className="account">
                <button
                  className="account-toggle"
                  onClick={() => setAccount((x) => !x)}
                  aria-expanded={account}
                  aria-label="Mở menu tài khoản"
                >
                  <Avatar name={user.avatar} size={35} />
                  <span>{user.nickname}</span>
                  <ChevronDown size={15} />
                </button>
                {account && (
                  <div
                    className="account-menu"
                    onClick={() => setAccount(false)}
                  >
                    <Link to="/dashboard">
                      <LayoutDashboard size={17} />
                      Góc học tập
                    </Link>
                    <Link to="/profile">
                      <Settings size={17} />
                      Hồ sơ & cài đặt
                    </Link>
                    {user.roles.some((r) =>
                      ["Teacher", "Admin"].includes(r),
                    ) && (
                      <Link to="/manage">
                        <ShieldCheck size={17} />
                        Quản lý học tập
                      </Link>
                    )}
                    <button
                      onClick={async () => {
                        try {
                          await logout();
                          navigate("/");
                        } catch (e) {
                          setLogoutError((e as Error).message);
                        }
                      }}
                    >
                      <LogOut size={17} />
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link className="login-link" to="/login">
                  Đăng nhập
                </Link>
                <Button asChild size="sm">
                  <Link to="/register">Bắt đầu miễn phí</Link>
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              className="icon-btn mobile-menu"
              onClick={() => setMenu((x) => !x)}
              aria-expanded={menu}
              aria-label={menu ? "Đóng menu" : "Mở menu"}
            >
              {menu ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
      </header>
      {(error || logoutError) && (
        <div className="connection-banner" role="alert">
          {error || logoutError}
          <button
            onClick={() => {
              setLogoutError("");
              void refresh();
            }}
          >
            Thử kết nối lại
          </button>
        </div>
      )}
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container footer-grid">
          <div>
            <Link to="/" className="brand">
              <span className="brand-mark">
                <GraduationCap size={23} />
              </span>
              <span>
                CodeKid<small>ACADEMY</small>
              </span>
            </Link>
            <p>
              Một dòng code nhỏ.
              <br />
              Một thế giới sáng tạo lớn.
            </p>
            <span className="safe-note">
              <ShieldCheck size={16} /> Học an toàn, lớn lên tự tin.
            </span>
          </div>
          <div>
            <strong>Khám phá</strong>
            <Link to="/courses">
              <BookOpen size={15} />
              Khóa học
            </Link>
            <Link to="/challenges">
              <Zap size={15} />
              Thử thách
            </Link>
            <Link to="/leaderboard">
              <Trophy size={15} />
              Bảng xếp hạng
            </Link>
          </div>
          <div>
            <strong>CodeKid Academy</strong>
            <Link to="/about">Giới thiệu</Link>
            <Link to="/privacy">Quyền riêng tư</Link>
            <Link to="/settings">Cài đặt học tập</Link>
          </div>
          <div className="footer-motto">
            <span>
              Được tạo cho những
              <br />
              <b>trí tò mò không giới hạn.</b>
            </span>
            <div className="footer-dots">
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>
        <div className="container footer-bottom">
          © {new Date().getFullYear()} CodeKid Academy{" "}
          <span>Dành cho học sinh 9–16 tuổi · Tiếng Việt</span>
        </div>
      </footer>
    </>
  );
}
