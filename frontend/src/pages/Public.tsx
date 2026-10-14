import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Code2,
  Grip,
  Keyboard,
  LockKeyhole,
  Play,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Terminal,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { useLoad } from "../api";
import { useAuth } from "../context";
import {
  Avatar,
  Button,
  Card,
  Pill,
  ProgressBar,
  Robot,
  State,
} from "../components/ui";
import type { Course, Language } from "../types";
const modes = [
  {
    n: "01",
    title: "Kéo thả khám phá",
    text: "Ghép những mảnh code và làm quen với cú pháp. Mỗi mảnh đúng là một bước tiến!",
    icon: Grip,
    color: "purple",
    sample: 'print ( "Xin chào!" )',
  },
  {
    n: "02",
    title: "Gõ code ghi nhớ",
    text: "Tự nhớ và gõ vào ô trống. Gợi ý nhỏ luôn sẵn sàng khi bạn cần.",
    icon: Keyboard,
    color: "blue",
    sample: "name = input ( )",
  },
  {
    n: "03",
    title: "Tự viết, tự chinh phục",
    text: "Viết chương trình của riêng mình. Chạy thử, sửa lỗi và khám phá lời giải.",
    icon: Terminal,
    color: "green",
    sample: "for idea in imagination:",
  },
];
export function Landing() {
  const { user } = useAuth();
  const langs = useLoad<Language[]>("/languages");
  const courses = useLoad<Course[]>("/courses");
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <Pill>
              <Sparkles size={14} /> Sẵn sàng cho một cuộc phiêu lưu mới?
            </Pill>
            <h1>
              Học lập trình thật vui.
              <br />
              <span>Thế giới Code</span>
              <br />
              đang chờ bạn!
            </h1>
            <p>
              Biến sự tò mò thành những dòng code đầu tiên. Cùng Kiki học, chơi
              và chinh phục Python theo cách của riêng mình.
            </p>
            <div className="hero-buttons">
              <Button asChild size="lg">
                <Link to={user ? "/dashboard" : "/register"}>
                  Bắt đầu học miễn phí <ArrowRight size={18} />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#learning-modes">
                  <Play size={17} /> Khám phá cách học
                </a>
              </Button>
            </div>
            <div className="hero-trust">
              <span>
                <Check size={16} /> Học theo nhịp của bạn
              </span>
              <span>
                <ShieldCheck size={16} /> Dành cho 9–16 tuổi
              </span>
            </div>
            <div className="hero-stats">
              <div>
                <strong>12</strong>
                <span>Bài học Python</span>
              </div>
              <div>
                <strong>3</strong>
                <span>Chế độ thực hành</span>
              </div>
              <div>
                <strong>∞</strong>
                <span>Ý tưởng sáng tạo</span>
              </div>
            </div>
          </div>
          <div className="hero-art">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="art-grid" />
            <motion.div
              className="floating-code"
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <span className="window-dots">● ● ●</span>
              <code>
                <span>print</span>(<b>"Hello, world!"</b>)
              </code>
              <small>
                <Check size={13} /> Một ý tưởng vừa thành hiện thực
              </small>
            </motion.div>
            <Robot />
            <div className="xp-float">
              <span>
                <Star size={22} />
              </span>
              <div>
                <b>+10 XP</b>
                <small>Từng bước nhỏ đều đáng tự hào</small>
              </div>
            </div>
            <span className="art-label">
              <Sparkles size={15} /> Xin chào, mình là Kiki!
            </span>
            <Code2 className="art-symbol code-symbol" />
            <Rocket className="art-symbol rocket-symbol" />
            <span className="art-spark spark-one">✦</span>
            <span className="art-spark spark-two">✦</span>
          </div>
        </div>
        <div className="container hero-strip">
          <span>
            <BookOpen />
            Kiến thức nhỏ, dễ hiểu
          </span>
          <span>
            <Grip />
            Thực hành qua trò chơi
          </span>
          <span>
            <Trophy />
            Mỗi bước tiến một phần thưởng
          </span>
          <span>
            <Users />
            Học sinh là trung tâm
          </span>
        </div>
      </section>
      <section className="section" id="learning-modes">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">HỌC BẰNG CÁCH CHƠI</span>
              <h2>Ba bước nhỏ. Một hành trình lớn.</h2>
            </div>
            <p>
              Từ làm quen đến tự tin viết code,
              <br />
              mỗi chế độ giúp bạn tiến thêm một bước.
            </p>
          </div>
          <div className="mode-grid">
            {modes.map((m) => (
              <Card key={m.n} className={`mode-card mode-${m.color}`}>
                <div className="mode-top">
                  <span className="mode-icon">
                    <m.icon size={25} />
                  </span>
                  <span className="mode-number">{m.n}</span>
                </div>
                <h3>{m.title}</h3>
                <p>{m.text}</p>
                <div className="mini-code">
                  <code>{m.sample}</code>
                  <span>▍</span>
                </div>
                <span className="mode-unlock">
                  {m.n === "01" ? (
                    <>
                      <Zap size={14} /> Mở sau khi học lý thuyết
                    </>
                  ) : (
                    <>
                      <LockKeyhole size={14} /> Mở khi hoàn thành bước trước
                    </>
                  )}
                </span>
              </Card>
            ))}
          </div>
        </div>
      </section>
      <section className="section language-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">CHỌN THẾ GIỚI CỦA BẠN</span>
              <h2>Bắt đầu với một ngôn ngữ.</h2>
            </div>
            <Button asChild variant="ghost">
              <Link to="/languages">
                Xem tất cả <ArrowRight size={17} />
              </Link>
            </Button>
          </div>
          {langs.loading || langs.error ? (
            <State
              loading={langs.loading}
              error={langs.error}
              retry={langs.reload}
            />
          ) : (
            <div className="language-grid">
              {langs.data?.map((l) => (
                <LanguageCard key={l.id} l={l} />
              ))}
            </div>
          )}
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">HÀNH TRÌNH ĐẦU TIÊN</span>
              <h2>Một khóa học, thật nhiều khám phá.</h2>
            </div>
          </div>
          {courses.loading || courses.error ? (
            <State
              loading={courses.loading}
              error={courses.error}
              retry={courses.reload}
            />
          ) : courses.data?.length ? (
            courses.data.map((c) => <CourseCard key={c.id} c={c} />)
          ) : (
            <State empty="Khóa học đang được chuẩn bị." />
          )}
          <div className="steps">
            {[
              "Chọn hành trình",
              "Học một điều mới",
              "Thực hành & khám phá",
              "Nhận XP, mở bài tiếp",
            ].map((s, i) => (
              <div key={s}>
                <span>{i + 1}</span>
                <b>{s}</b>
                {i < 3 && <ChevronRight size={20} />}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="container final-cta">
        <div>
          <span className="eyebrow">MỖI CHUYÊN GIA TỪNG LÀ NGƯỜI MỚI</span>
          <h2>Dòng code đầu tiên của bạn là gì?</h2>
          <p>Không cần biết trước. Chỉ cần tò mò và sẵn sàng thử.</p>
          <Button asChild size="lg">
            <Link to={user ? "/dashboard" : "/register"}>
              Bắt đầu hành trình <ArrowRight size={18} />
            </Link>
          </Button>
        </div>
        <Robot small />
      </section>
    </>
  );
}
export function LanguageCard({ l }: { l: Language }) {
  const { user } = useAuth();
  return (
    <Card
      className={
        l.available ? "language-card available" : "language-card coming"
      }
    >
      <div className="language-card-top">
        <span
          className="language-logo"
          style={{ color: l.color, background: l.color + "18" }}
        >
          {l.slug === "python"
            ? "Py"
            : l.name === "JavaScript"
              ? "JS"
              : l.name === "HTML"
                ? "</>"
                : l.name === "CSS"
                  ? "{ }"
                  : l.name}
        </span>
        <Pill color={l.available ? "green" : "neutral"}>
          {l.available ? "Sẵn sàng học" : "Sắp ra mắt"}
        </Pill>
      </div>
      <h3>{l.name}</h3>
      <p>{l.description}</p>
      <div className="language-meta">
        <span>{l.difficulty}</span>
        <span>{l.available ? `${l.lessons} bài học` : "Đang chuẩn bị"}</span>
      </div>
      {l.available && user && (
        <div className="language-progress">
          <small>
            {l.completed} / {l.lessons} bài hoàn thành
          </small>
          <ProgressBar
            value={l.lessons ? (l.completed / l.lessons) * 100 : 0}
            label={`Tiến độ ${l.name}`}
          />
        </div>
      )}
      {l.available ? (
        <Button asChild variant="outline" className="full">
          <Link to="/courses">
            Bắt đầu học <ArrowRight size={16} />
          </Link>
        </Button>
      ) : (
        <Button disabled variant="outline" className="full">
          <LockKeyhole size={14} /> Sắp ra mắt
        </Button>
      )}
    </Card>
  );
}
export function CourseCard({ c }: { c: Course }) {
  return (
    <Card className="course-feature">
      <div className="course-art">
        <span className="python-mark">
          Py<span>thon</span>
        </span>
        <Code2 size={68} />
        <div className="course-art-dot" />
      </div>
      <div className="course-description">
        <Pill color="green">Dành cho người mới bắt đầu</Pill>
        <h3>{c.title}</h3>
        <p>{c.description}</p>
        <div className="course-meta">
          <span>
            <BookOpen size={16} />
            {c.lessons ?? c.total} bài học
          </span>
          <span>
            <Grip size={16} />3 chế độ
          </span>
          <span>
            <Star size={16} />
            XP & huy hiệu
          </span>
        </div>
        <Button asChild>
          <Link to={`/courses/${c.id}`}>
            Khám phá khóa học <ArrowRight size={17} />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
export function Courses({ languages = false }: { languages?: boolean }) {
  const courses = useLoad<Course[]>("/courses");
  const langs = useLoad<Language[]>("/languages");
  const q = languages ? langs : courses;
  return (
    <div className="container page">
      <PageHeading
        eyebrow="BẢN ĐỒ KHÁM PHÁ"
        title={
          languages ? "Bạn muốn học ngôn ngữ nào?" : "Chọn hành trình của bạn"
        }
        text="Bắt đầu với Python. Những thế giới mới sẽ mở ra trong tương lai."
      />
      {q.loading || q.error ? (
        <State loading={q.loading} error={q.error} retry={q.reload} />
      ) : languages ? (
        <div className="language-grid">
          {langs.data?.map((l) => (
            <LanguageCard key={l.id} l={l} />
          ))}
        </div>
      ) : courses.data?.length ? (
        <div className="course-list">
          {courses.data.map((c) => (
            <CourseCard key={c.id} c={c} />
          ))}
        </div>
      ) : (
        <State empty="Chưa có khóa học được xuất bản." />
      )}
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  text,
  action,
}: {
  eyebrow: string;
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {text && <p>{text}</p>}
      </div>
      {action}
    </div>
  );
}
export function Leaderboard() {
  const q =
    useLoad<{ nickname: string; avatar: string; xp: number; level: number }[]>(
      "/leaderboard",
    );
  return (
    <div className="container page narrow">
      <PageHeading
        eyebrow="CÙNG NHAU TIẾN BỘ"
        title="Những nhà thám hiểm Code"
        text="Chỉ hiển thị biệt danh của người chọn tham gia. Mỗi hành trình có một nhịp riêng."
      />
      <Card className="leaderboard">
        {q.loading || q.error ? (
          <State loading={q.loading} error={q.error} retry={q.reload} />
        ) : q.data?.length ? (
          q.data.map((u, i) => (
            <div className="rank-row" key={i}>
              <span className={`rank rank-${i}`}>
                {i < 3 ? <Trophy size={22} /> : i + 1}
              </span>
              <Avatar name={u.avatar} />
              <div>
                <b>{u.nickname}</b>
                <small>Cấp {u.level}</small>
              </div>
              <span className="xp-label">
                <Star size={16} />
                {u.xp} XP
              </span>
            </div>
          ))
        ) : (
          <State empty="Chưa có người tham gia. Bạn có thể bật bảng xếp hạng trong hồ sơ khi sẵn sàng." />
        )}
      </Card>
      <div className="note">
        <ShieldCheck size={19} />
        Email, nhóm tuổi và kết quả chi tiết luôn được giữ riêng tư.
      </div>
    </div>
  );
}
export function About({ privacy = false }: { privacy?: boolean }) {
  return (
    <div className="container page narrow">
      <PageHeading
        eyebrow={privacy ? "HỌC AN TOÀN" : "VỀ CODEKID"}
        title={
          privacy
            ? "Quyền riêng tư & phụ huynh"
            : "Tò mò hôm nay, sáng tạo ngày mai."
        }
      />
      <Card className="prose">
        {privacy ? (
          <>
            <h2>Dữ liệu chúng tôi lưu</h2>
            <p>
              Email để đăng nhập và khôi phục tài khoản, biệt danh, nhóm tuổi
              9–12 hoặc 13–16, avatar và kết quả học tập. Chúng tôi không yêu
              cầu ngày sinh, địa chỉ nhà hay số điện thoại.
            </p>
            <h2>Học sinh 9–12 tuổi</h2>
            <p>
              Phụ huynh cần đọc thông tin và đồng ý, dùng email của mình và mở
              liên kết xác minh trước khi tài khoản có thể đăng nhập. Phụ huynh
              nên đồng hành trong lúc học.
            </p>
            <h2>Ai có thể xem kết quả?</h2>
            <p>
              Học sinh xem kết quả của mình; giáo viên xem tiến độ học sinh
              thuộc lớp được phân công; quản trị viên quản lý tài khoản và nội
              dung. Bảng xếp hạng chỉ dùng biệt danh và chỉ xuất hiện khi bạn
              chọn tham gia.
            </p>
            <h2>Video và cài đặt</h2>
            <p>
              Video mẫu của CodeKid được phục vụ từ website. Nội dung do giáo
              viên thêm có thể nhúng YouTube ở chế độ hạn chế cookie và chỉ tải
              sau khi bạn bấm mở. Chế độ tối và âm thanh được lưu trên thiết bị,
              không gửi lên máy chủ.
            </p>
            <h2>Yêu cầu hỗ trợ dữ liệu</h2>
            <p>
              Phụ huynh có thể liên hệ người quản trị đơn vị triển khai để yêu
              cầu xuất hoặc xóa dữ liệu. Bản cục bộ này chưa có bộ phận hỗ trợ
              trực tuyến.
            </p>
          </>
        ) : (
          <>
            <Robot small />
            <h2>Lập trình là một cách khám phá</h2>
            <p>
              CodeKid Academy dành cho học sinh 9–16 tuổi. Mỗi bài học kết hợp
              giải thích dễ hiểu, ví dụ và ba bước thực hành: kéo thả, tự gõ, tự
              viết chương trình.
            </p>
            <h2>Mỗi bước tiến đều đáng tự hào</h2>
            <p>
              Học theo nhịp của mình, thử lại khi cần và nhận huy hiệu theo tiến
              bộ. Không mất XP vì trả lời sai, không cần giữ chuỗi ngày học,
              không bị ép cạnh tranh.
            </p>
            <h2>Bắt đầu cùng Python</h2>
            <p>
              12 bài học tạo nền tảng vững chắc từ lệnh đầu tiên đến hàm, danh
              sách và bài tổng hợp. Các ngôn ngữ khác sẽ được mở khi có nội dung
              và bộ chấm phù hợp.
            </p>
            <Button asChild>
              <Link to="/courses">
                Xem khóa học <ArrowDown size={16} />
              </Link>
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
