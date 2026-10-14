import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Code2,
  LockKeyhole,
  Moon,
  Rocket,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Volume2,
} from "lucide-react";
import { api, useLoad } from "../api";
import { useAuth, usePreferences } from "../context";
import {
  Avatar,
  Button,
  Card,
  modeNames,
  Pill,
  ProgressBar,
  Robot,
  State,
} from "../components/ui";
import { PageHeading } from "./Public";
import type { Badge, Course, Dashboard, Roadmap } from "../types";
export function StudentDashboard({
  badgesOnly = false,
}: {
  badgesOnly?: boolean;
}) {
  const { user } = useAuth();
  const q = useLoad<Dashboard>("/dashboard");
  const map = useLoad<Roadmap>(
    q.data?.courses[0] ? `/courses/${q.data.courses[0].id}` : null,
  );
  if (q.loading || q.error || !q.data)
    return (
      <div className="container page">
        <State loading={q.loading} error={q.error} retry={q.reload} />
      </div>
    );
  const d = q.data;
  const next = map.data?.lessons.find((x) => x.open && !x.progress?.challenge);
  const completed = d.progress.filter((x) => x.challenge).length;
  return (
    <div className="container page">
      <PageHeading
        eyebrow={badgesOnly ? "BỘ SƯU TẬP CỦA BẠN" : "TRUNG TÂM KHÁM PHÁ"}
        title={
          badgesOnly
            ? "Mỗi huy hiệu, một bước tiến"
            : `Xin chào, ${user?.nickname}!`
        }
        text={
          badgesOnly
            ? "Luyện tập theo nhịp của mình để mở thêm huy hiệu."
            : "Một điều mới đang chờ bạn hôm nay. Cùng khám phá nhé!"
        }
        action={
          <Button asChild variant="outline">
            <Link to="/profile">
              <Settings size={17} /> Hồ sơ
            </Link>
          </Button>
        }
      />
      {!badgesOnly && (
        <>
          <div className="stats-grid">
            <motion.div whileHover={{ y: -6, scale: 1.02 }} transition={{ duration: 0.2 }}>
              <Card>
                <span className="stat-icon purple">
                  <Star />
                </span>
                <small>Tổng kinh nghiệm</small>
                <strong>
                  {user?.xp ?? 0}
                  <span> XP</span>
                </strong>
                <ProgressBar
                  value={(user?.xp ?? 0) % 100}
                  label="Tiến độ lên cấp"
                />
              </Card>
            </motion.div>
            <motion.div whileHover={{ y: -6, scale: 1.02 }} transition={{ duration: 0.2 }}>
              <Card>
                <span className="stat-icon blue">
                  <Rocket />
                </span>
                <small>Cấp độ hiện tại</small>
                <strong>
                  {user?.level ?? 1}
                  <span> Nhà thám hiểm</span>
                </strong>
                <p>{100 - ((user?.xp ?? 0) % 100)} XP đến cấp tiếp theo</p>
              </Card>
            </motion.div>
            <motion.div whileHover={{ y: -6, scale: 1.02 }} transition={{ duration: 0.2 }}>
              <Card>
                <span className="stat-icon green">
                  <BookOpen />
                </span>
                <small>Bài học hoàn thành</small>
                <strong>
                  {completed}
                  <span> bài học</span>
                </strong>
                <p>Từng bước tiến đều đáng tự hào</p>
              </Card>
            </motion.div>
            <motion.div whileHover={{ y: -6, scale: 1.02 }} transition={{ duration: 0.2 }}>
              <Card>
                <span className="stat-icon orange">
                  <Trophy />
                </span>
                <small>Huy hiệu đã nhận</small>
                <strong>
                  {d.badges.filter((x) => x.earned).length}
                  <span> / {d.badges.length}</span>
                </strong>
                <p>Thành quả của sự tò mò</p>
              </Card>
            </motion.div>
          </div>
          <div className="dashboard-grid">
            <div>
              <Card className="continue-card">
                <div>
                  <Pill color="green">
                    <Sparkles size={14} /> Hành trình đang tiếp diễn
                  </Pill>
                  <h2>
                    {next?.title ??
                      (completed
                        ? "Bạn đã hoàn thành các bài đang mở!"
                        : "Bắt đầu cùng Python")}
                  </h2>
                  <p>
                    {next
                      ? "Học một chút, thực hành một chút. Kiki đồng hành cùng bạn."
                      : "Khám phá lộ trình và chọn một hoạt động để luyện tập."}
                  </p>
                  <Button asChild>
                    <Link to={next ? `/lessons/${next.id}` : "/courses"}>
                      {next ? "Tiếp tục học" : "Xem khóa học"}{" "}
                      <ArrowRight size={17} />
                    </Link>
                  </Button>
                </div>
                <Robot small />
              </Card>
              <h2 className="subheading">Ngôn ngữ đang khám phá</h2>
              {d.courses.map((c) => (
                <Card className="course-progress" key={c.id}>
                  <span className="language-logo">Py</span>
                  <div>
                    <h3>{c.title}</h3>
                    <p>
                      {c.completed} / {c.total} bài hoàn thành · {c.language}
                    </p>
                    <ProgressBar
                      value={c.total ? ((c.completed ?? 0) / c.total) * 100 : 0}
                      label={`Tiến độ ${c.title}`}
                    />
                  </div>
                  <Button asChild variant="ghost" aria-label={`Xem ${c.title}`}>
                    <Link to={`/courses/${c.id}`}>
                      <ArrowRight />
                    </Link>
                  </Button>
                </Card>
              ))}
            </div>
            <Card className="tasks-card">
              <span className="eyebrow">KHÔNG CẦN VỘI VÀNG</span>
              <h2>Nhiệm vụ nhỏ</h2>
              <p>Một vài ý tưởng để bạn thử. Hoàn thành khi bạn sẵn sàng.</p>
              {d.tasks.map((t) => (
                <div className="task" key={t.title}>
                  <span className={t.done ? "task-check done" : "task-check"}>
                    {t.done && <Check size={14} />}
                  </span>
                  {t.title}
                </div>
              ))}
              <div className="encouragement">
                <Sparkles size={20} />
                <span>
                  Sai một chút cũng không sao.
                  <br />
                  Bạn đang học thêm một điều mới!
                </span>
              </div>
            </Card>
          </div>
        </>
      )}
      <div className="section-heading compact">
        <h2>Huy hiệu của bạn</h2>
        {!badgesOnly && (
          <Link to="/achievements">
            Xem bộ sưu tập <ArrowRight size={15} />
          </Link>
        )}
      </div>
      <div className="badge-grid">
        {d.badges.map((b) => (
          <BadgeCard key={b.id} badge={b} xp={user?.xp ?? 0} />
        ))}
      </div>
      {!badgesOnly && (
        <>
          <h2 className="subheading">Dấu chân khám phá</h2>
          <Card className="history-card">
            {d.history.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Bài học</th>
                      <th>Hoạt động</th>
                      <th>Kết quả</th>
                      <th>Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.history.map((h) => (
                      <tr key={h.id}>
                        <td>
                          <Link to={`/lessons/${h.lessonId}`}>
                            {h.lessonTitle}
                          </Link>
                        </td>
                        <td>{modeNames[h.mode]}</td>
                        <td>
                          <Pill color={h.score >= 80 ? "green" : "orange"}>
                            {h.score}%
                          </Pill>
                        </td>
                        <td>{new Date(h.createdAt).toLocaleString("vi-VN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <State empty="Chưa có lịch sử. Bắt đầu bài đầu tiên để để lại dấu chân của bạn!" />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
function BadgeCard({ badge: b, xp }: { badge: Badge; xp: number }) {
  const Icon =
    b.icon === "rocket"
      ? Rocket
      : b.icon === "trophy"
        ? Trophy
        : b.icon === "code"
          ? Code2
          : Star;
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={b.earned ? "badge-card earned badge-unlocked" : "badge-card"}>
        <span className="badge-medal">
          <Icon size={29} />
        </span>
        <h3>{b.title}</h3>
        <p>{b.description}</p>
        <Pill color={b.earned ? "green" : "neutral"}>
          {b.earned ? (
            <>
              <Check size={12} /> Đã nhận
            </>
          ) : (
            <>
              <LockKeyhole size={12} /> {b.requiredXp} XP
            </>
          )}
        </Pill>
        {!b.earned && (
          <ProgressBar
            value={(xp / b.requiredXp) * 100}
            label={`Tiến độ huy hiệu ${b.title}`}
          />
        )}
      </Card>
    </motion.div>
  );
}
export function RoadmapPage({ id }: { id: string }) {
  const { user } = useAuth();
  const q = useLoad<Roadmap>(`/courses/${id}`);
  if (q.loading || q.error || !q.data)
    return (
      <div className="container page">
        <State loading={q.loading} error={q.error} retry={q.reload} />
      </div>
    );
  const d = q.data;
  const completed = d.lessons.filter((l) => l.progress?.challenge).length;
  return (
    <div className="container page">
      <Link to="/courses" className="breadcrumb">
        Khóa học / {d.language}
      </Link>
      <PageHeading
        eyebrow="LỘ TRÌNH CỦA BẠN"
        title={d.title}
        text={d.description}
      />
      <Card className="roadmap-summary">
        <span className="language-logo">Py</span>
        <div>
          <b>
            {completed} / {d.lessons.length} bài học hoàn thành
          </b>
          <ProgressBar
            value={d.lessons.length ? (completed / d.lessons.length) * 100 : 0}
            label="Tiến độ khóa học"
          />
        </div>
        <Pill>3 chế độ / bài học</Pill>
      </Card>
      {!user && (
        <div className="note">
          <ShieldCheck size={20} />
          Đăng nhập để lưu tiến độ và mở hành trình.
          <Button asChild size="sm">
            <Link to="/login">Đăng nhập</Link>
          </Button>
        </div>
      )}
      <div className="roadmap">
        {d.lessons.map((l, i) => (
          <div key={l.id}>
            {(i === 0 || l.chapter !== d.lessons[i - 1].chapter) && (
              <h2 className="chapter-heading">{l.chapter}</h2>
            )}
            <Card
              className={`lesson-row ${l.open ? "open" : "locked"} ${l.progress?.challenge ? "completed" : ""}`}
            >
              <span className="lesson-number">
                {l.progress?.challenge ? (
                  <Check />
                ) : !l.open && user ? (
                  <LockKeyhole size={18} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              <div>
                <h3>{l.title}</h3>
                <p>
                  {l.progress?.challenge
                    ? "Đã chinh phục · Có thể luyện lại"
                    : l.open
                      ? "Sẵn sàng khám phá"
                      : user
                        ? "Hoàn thành bài trước để mở khóa"
                        : "Đăng nhập để bắt đầu"}
                </p>
                <div className="lesson-modes">
                  {["theory", "drag", "memory", "challenge"].map((m) => (
                    <span
                      key={m}
                      className={
                        l.progress?.[m as keyof typeof l.progress] ? "done" : ""
                      }
                    >
                      {l.progress?.[m as keyof typeof l.progress] ? (
                        <Check size={12} />
                      ) : (
                        <span className="tiny-dot" />
                      )}
                      {modeNames[m]}
                    </span>
                  ))}
                </div>
              </div>
              {l.open ? (
                <Button
                  asChild
                  variant={l.progress?.challenge ? "outline" : "default"}
                >
                  <Link to={`/lessons/${l.id}`}>
                    {l.progress?.challenge ? "Luyện lại" : "Bắt đầu"}
                    <ArrowRight size={16} />
                  </Link>
                </Button>
              ) : (
                <Button disabled variant="outline">
                  <LockKeyhole size={14} />
                  Chưa mở
                </Button>
              )}
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
export function Profile({ settingsOnly = false }: { settingsOnly?: boolean }) {
  const { user, refresh } = useAuth();
  const prefs = usePreferences();
  const [nick, setNick] = useState(user?.nickname ?? "");
  const [avatar, setAvatar] = useState(user?.avatar ?? "robot");
  const [leader, setLeader] = useState(user?.leaderboardOptIn ?? false);
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function save(e: FormEvent, changePassword = false) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (changePassword && password !== confirm) {
      setError("Hai mật khẩu mới chưa khớp.");
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ message: string }>(
        changePassword ? "/profile/password" : "/profile",
        changePassword ? "POST" : "PUT",
        changePassword
          ? { currentPassword: current, newPassword: password }
          : { nickname: nick, avatar, leaderboardOptIn: leader },
      );
      setMessage(r.message);
      await refresh();
      if (changePassword) {
        setCurrent("");
        setPassword("");
        setConfirm("");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container page narrow">
      <PageHeading
        eyebrow="GÓC CỦA RIÊNG BẠN"
        title={settingsOnly ? "Cài đặt học tập" : "Hồ sơ & cài đặt"}
        text="Một biệt danh, một avatar, một hành trình riêng."
      />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="form-success" role="status">
          <CheckCircle2 size={17} />
          {message}
        </p>
      )}
      {!settingsOnly && user && (
        <Card className="profile-card">
          <form onSubmit={(e) => void save(e)}>
            <div className="profile-identity">
              <Avatar name={avatar} size={80} />
              <div>
                <h2>{user.nickname}</h2>
                <Pill>
                  Cấp {user.level} · {user.xp} XP
                </Pill>
              </div>
            </div>
            <label>
              Biệt danh
              <input
                value={nick}
                onChange={(e) => setNick(e.target.value)}
                minLength={2}
                maxLength={24}
                required
              />
            </label>
            <fieldset>
              <legend>Chọn bạn đồng hành</legend>
              <div className="avatar-options">
                {["robot", "cat", "rocket", "fox", "astronaut", "dragon"].map(
                  (a) => (
                    <button
                      key={a}
                      type="button"
                      className={avatar === a ? "selected" : ""}
                      aria-label={`Chọn avatar ${a}`}
                      aria-pressed={avatar === a}
                      onClick={() => setAvatar(a)}
                    >
                      <Avatar name={a} />
                    </button>
                  ),
                )}
              </div>
            </fieldset>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={leader}
                onChange={(e) => setLeader(e.target.checked)}
              />
              <span>
                Tham gia bảng xếp hạng bằng biệt danh. Bạn có thể tắt bất cứ lúc
                nào.
              </span>
            </label>
            <div className="note small">
              <ShieldCheck size={18} />
              Email {user.email} chỉ hiển thị cho bạn và quản trị viên.
            </div>
            <Button disabled={busy}>{busy ? "Đang lưu…" : "Lưu hồ sơ"}</Button>
          </form>
        </Card>
      )}
      <Card className="settings-card">
        <h2>Học theo cách của bạn</h2>
        <div className="setting-row">
          <div>
            <Moon />
            <span>
              <b>Chế độ tối</b>
              <small>Dịu mắt hơn khi học buổi tối.</small>
            </span>
          </div>
          <button
            className="switch"
            role="switch"
            aria-label="Chế độ tối"
            aria-checked={prefs.dark}
            onClick={prefs.toggleDark}
          >
            <span />
          </button>
        </div>
        <div className="setting-row">
          <div>
            <Volume2 />
            <span>
              <b>Âm thanh trả lời</b>
              <small>Âm thanh nhẹ khi kéo đúng hoặc sai.</small>
            </span>
          </div>
          <button
            className="switch"
            role="switch"
            aria-label="Âm thanh trả lời"
            aria-checked={prefs.sound}
            onClick={prefs.toggleSound}
          >
            <span />
          </button>
        </div>
        <p className="muted">
          Hiệu ứng tự giảm khi thiết bị bật tùy chọn giảm chuyển động. Cài đặt
          được lưu trên thiết bị này.
        </p>
      </Card>
      {!settingsOnly && user && (
        <Card className="settings-card">
          <h2>Đổi mật khẩu</h2>
          <form onSubmit={(e) => void save(e, true)}>
            <label>
              Mật khẩu hiện tại
              <input
                type="password"
                required
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                maxLength={128}
              />
            </label>
            <label>
              Mật khẩu mới
              <input
                type="password"
                required
                autoComplete="new-password"
                minLength={10}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label>
              Nhập lại mật khẩu mới
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                maxLength={128}
              />
            </label>
            <Button disabled={busy}>Đổi mật khẩu</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
export function ChallengeList() {
  const { user } = useAuth();
  const courses = useLoad<Course[]>("/courses");
  const map = useLoad<Roadmap>(
    courses.data?.[0] ? `/courses/${courses.data[0].id}` : null,
  );
  return (
    <div className="container page">
      <PageHeading
        eyebrow="SÂN CHƠI TƯ DUY"
        title="Thử thách Python"
        text="Học lý thuyết, kéo thả và tự gõ để mở thử thách của mỗi chủ đề."
      />
      {!user ? (
        <Card className="center-card">
          <Rocket size={40} />
          <h2>Đăng nhập để khám phá thử thách</h2>
          <Button asChild>
            <Link to="/login">
              Đăng nhập <ArrowRight size={16} />
            </Link>
          </Button>
        </Card>
      ) : courses.loading || courses.error || map.loading || map.error ? (
        <State
          loading={courses.loading || map.loading}
          error={courses.error || map.error}
          retry={() => {
            courses.reload();
            map.reload();
          }}
        />
      ) : (
        <div className="challenge-grid">
          {map.data?.lessons.map((l, i) => (
            <Card key={l.id}>
              <span className="challenge-index">
                #{String(i + 1).padStart(2, "0")}
              </span>
              <h3>{l.title}</h3>
              <p>
                {l.progress?.memory
                  ? "Chế độ viết code đã mở. Sẵn sàng thử sức?"
                  : "Hoàn thành hai chế độ luyện tập để mở khóa."}
              </p>
              <Button
                asChild
                variant={l.progress?.memory ? "default" : "outline"}
              >
                <Link
                  to={`/lessons/${l.id}${l.progress?.memory ? "/practice/challenge" : ""}`}
                >
                  {l.progress?.memory ? "Viết code" : "Đến bài học"}
                  {l.progress?.memory ? (
                    <ArrowRight size={16} />
                  ) : (
                    <LockKeyhole size={16} />
                  )}
                </Link>
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
