import { useState, type FormEvent } from "react";
import {
  BookOpen,
  CheckCircle2,
  FileText,
  GraduationCap,
  Layers,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  Star,
  Users,
  X,
} from "lucide-react";
import { api, useLoad } from "../api";
import { useAuth } from "../context";
import { Button, Card, Pill, State, modeNames } from "../components/ui";
import { PageHeading } from "./Public";
type Row = { id: number; [key: string]: unknown };
type Content = Record<string, Row[]>;
interface StaffUser {
  id: string;
  nickname: string;
  email: string;
  xp: number;
  emailConfirmed: boolean;
  locked: boolean;
  roles: string[];
}
interface Classroom {
  id: number;
  name: string;
  teacherId: string;
  students: {
    id: string;
    nickname: string;
    xp: number;
    completed: number;
    attempts: number;
  }[];
}
type Field = {
  key: string;
  label: string;
  type?:
    "text" | "number" | "textarea" | "check" | "lines" | "select" | "color";
  source?: string;
  choices?: string[];
  max?: number;
  help?: string;
};
const schemas: Record<
  string,
  { title: string; fields: Field[]; defaults: Record<string, unknown> }
> = {
  languages: {
    title: "Ngôn ngữ",
    defaults: {
      name: "",
      slug: "",
      description: "",
      color: "#6366F1",
      difficulty: "Dễ bắt đầu",
      available: false,
    },
    fields: [
      { key: "name", label: "Tên" },
      { key: "slug", label: "Mã ngôn ngữ" },
      { key: "description", label: "Mô tả", type: "textarea" },
      { key: "color", label: "Màu sắc", type: "color" },
      { key: "difficulty", label: "Độ khó" },
      { key: "available", label: "Đã có nội dung và bộ chấm", type: "check" },
    ],
  },
  courses: {
    title: "Khóa học",
    defaults: {
      languageId: 1,
      title: "",
      description: "",
      teacherId: "",
      published: false,
    },
    fields: [
      {
        key: "languageId",
        label: "Ngôn ngữ",
        type: "select",
        source: "languages",
      },
      { key: "title", label: "Tên khóa học" },
      { key: "description", label: "Mô tả", type: "textarea" },
      {
        key: "teacherId",
        label: "Giáo viên phụ trách",
        type: "select",
        source: "teachers",
      },
      {
        key: "published",
        label: "Xuất bản khóa học (bỏ chọn để ẩn)",
        type: "check",
      },
    ],
  },
  chapters: {
    title: "Chương",
    defaults: { courseId: 1, title: "", position: 1 },
    fields: [
      { key: "courseId", label: "Khóa học", type: "select", source: "courses" },
      { key: "title", label: "Tên chương" },
      { key: "position", label: "Thứ tự", type: "number" },
    ],
  },
  lessons: {
    title: "Bài giảng & video",
    defaults: {
      chapterId: 1,
      title: "",
      position: 1,
      published: false,
      objectives: "",
      explanation: "",
      example: "",
      notes: "",
      quiz: "",
      quizOptions: ["", ""],
      quizAnswer: 0,
      videoUrl: "",
      videoTitle: "",
    },
    fields: [
      { key: "chapterId", label: "Chương", type: "select", source: "chapters" },
      { key: "title", label: "Tiêu đề" },
      { key: "position", label: "Thứ tự", type: "number" },
      { key: "objectives", label: "Mục tiêu", type: "textarea" },
      { key: "explanation", label: "Giải thích", type: "textarea", max: 12000 },
      { key: "example", label: "Ví dụ Python", type: "textarea", max: 12000 },
      { key: "notes", label: "Ghi chú cần nhớ", type: "textarea" },
      { key: "quiz", label: "Câu hỏi ôn tập" },
      {
        key: "quizOptions",
        label: "Lựa chọn ôn tập, mỗi dòng một lựa chọn",
        type: "lines",
      },
      {
        key: "quizAnswer",
        label: "Số thứ tự đáp án đúng (bắt đầu từ 0)",
        type: "number",
      },
      {
        key: "videoUrl",
        label: "Địa chỉ video",
        help: "/videos/lesson-1.mp4 hoặc https://www.youtube-nocookie.com/embed/…",
      },
      { key: "videoTitle", label: "Tiêu đề video" },
      {
        key: "published",
        label: "Xuất bản khi đã có đủ 3 chế độ",
        type: "check",
      },
    ],
  },
  exercises: {
    title: "Câu hỏi kéo thả / tự gõ",
    defaults: {
      lessonId: 1,
      mode: "drag",
      prompt: "Kéo các mảnh code vào đúng ô trống.",
      template: '{{0}}("Hello World")',
      level: 1,
      xp: 10,
      blanks: [
        {
          position: 0,
          answers: ["print"],
          hints: [
            "Hãy nhớ lệnh hiển thị nội dung.",
            "Lệnh có 5 ký tự.",
            "Bắt đầu bằng p.",
          ],
        },
      ],
      options: ["print", "input", "while", "return"],
    },
    fields: [
      { key: "lessonId", label: "Bài học", type: "select", source: "lessons" },
      {
        key: "mode",
        label: "Chế độ",
        type: "select",
        choices: ["drag", "memory"],
      },
      { key: "prompt", label: "Hướng dẫn", type: "textarea" },
      {
        key: "template",
        label: "Mẫu code",
        type: "textarea",
        max: 8000,
        help: "Dùng {{0}}, {{1}}… cho từng ô trống; mỗi ô xuất hiện một lần.",
      },
      { key: "level", label: "Cấp độ bài tập", type: "number" },
      { key: "xp", label: "XP lần đầu", type: "number" },
      {
        key: "options",
        label: "Ngân hàng mảnh code, mỗi dòng một mảnh (chỉ kéo thả)",
        type: "lines",
      },
    ],
  },
  challenges: {
    title: "Thử thách & test case",
    defaults: {
      lessonId: 1,
      title: "",
      description: "",
      starterCode: "# Viết chương trình tại đây\n",
      xp: 30,
      tests: [
        { input: "", expected: "", isSample: true },
        { input: "", expected: "", isSample: false },
      ],
    },
    fields: [
      { key: "lessonId", label: "Bài học", type: "select", source: "lessons" },
      { key: "title", label: "Tên thử thách" },
      {
        key: "description",
        label: "Đề bài và yêu cầu",
        type: "textarea",
        max: 6000,
      },
      {
        key: "starterCode",
        label: "Code khởi đầu",
        type: "textarea",
        max: 12000,
      },
      { key: "xp", label: "XP lần đầu", type: "number" },
    ],
  },
  achievements: {
    title: "Huy hiệu",
    defaults: { title: "", description: "", icon: "star", requiredXp: 100 },
    fields: [
      { key: "title", label: "Tên huy hiệu" },
      { key: "description", label: "Mô tả", type: "textarea" },
      {
        key: "icon",
        label: "Biểu tượng",
        type: "select",
        choices: ["star", "rocket", "trophy", "code"],
      },
      { key: "requiredXp", label: "XP cần đạt", type: "number" },
    ],
  },
};
export default function Manage() {
  const { user } = useAuth();
  const admin = !!user?.roles.includes("Admin");
  const [tab, setTab] = useState("overview");
  const [version, setVersion] = useState(0);
  const content = useLoad<Content>("/manage/content", version);
  const users = useLoad<StaffUser[]>(admin ? "/manage/users" : null, version);
  const classes = useLoad<Classroom[]>("/manage/classes", version);
  const overview = useLoad<{
    users: number;
    courses: number;
    classes: number;
    attempts: { mode: string; total: number; passed: number }[];
    commonErrors: { lessonId: number; mode: string; count: number }[];
  }>("/manage/overview", version);
  const [edited, setEdited] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [className, setClassName] = useState("");
  const [classTeacher, setClassTeacher] = useState("");
  const resources = admin
    ? Object.keys(schemas)
    : ["courses", "chapters", "lessons", "exercises", "challenges"];
  async function action(path: string, method: string, body: unknown) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api(path, method, body);
      setVersion((v) => v + 1);
      setEdited(null);
      setMessage("Đã lưu thay đổi.");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  function changeTab(t: string) {
    setTab(t);
    setEdited(null);
    setError("");
    setMessage("");
  }
  const teacherOptions =
    users.data?.filter((u) => u.roles.includes("Teacher")) ?? [];
  return (
    <div className="container page manage-page">
      <PageHeading
        eyebrow={admin ? "KHU VỰC QUẢN TRỊ" : "GÓC GIÁO VIÊN"}
        title={admin ? "Quản lý CodeKid Academy" : "Cùng học sinh khám phá"}
        text={
          admin
            ? "Quản lý tài khoản, nội dung được xuất bản và tiến độ học tập."
            : "Chỉ hiển thị khóa học được giao và học sinh trong lớp của bạn."
        }
        action={
          <Pill color="blue">
            <ShieldCheck size={14} />
            {admin ? "Admin" : "Teacher"}
          </Pill>
        }
      />
      <div className="manage-layout">
        <nav className="manage-nav" aria-label="Quản lý">
          <button
            className={tab === "overview" ? "active" : ""}
            onClick={() => changeTab("overview")}
          >
            <Layers size={17} />
            Tổng quan & báo cáo
          </button>
          {resources.map((r) => (
            <button
              key={r}
              className={tab === r ? "active" : ""}
              onClick={() => changeTab(r)}
            >
              {r === "courses" ? (
                <BookOpen size={17} />
              ) : r === "achievements" ? (
                <Star size={17} />
              ) : (
                <FileText size={17} />
              )}{" "}
              {schemas[r].title}
            </button>
          ))}
          <button
            className={tab === "classes" ? "active" : ""}
            onClick={() => changeTab("classes")}
          >
            <GraduationCap size={17} />
            Lớp & tiến độ học sinh
          </button>
          {admin && (
            <button
              className={tab === "users" ? "active" : ""}
              onClick={() => changeTab("users")}
            >
              <Users size={17} />
              Người dùng & vai trò
            </button>
          )}
        </nav>
        <div className="manage-main">
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
          {tab === "overview" ? (
            overview.loading || overview.error || !overview.data ? (
              <State
                loading={overview.loading}
                error={overview.error}
                retry={overview.reload}
              />
            ) : (
              <>
                <div className="stats-grid manage-stats">
                  {[
                    [
                      overview.data.users,
                      admin ? "Tài khoản" : "Học sinh trong lớp",
                    ],
                    [overview.data.courses, "Khóa học"],
                    [overview.data.classes, "Lớp học"],
                  ].map(([n, label]) => (
                    <Card key={label}>
                      <small>{label}</small>
                      <strong>{n}</strong>
                    </Card>
                  ))}
                </div>
                <Card className="manage-table">
                  <h2>Kết quả theo hoạt động</h2>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Hoạt động</th>
                          <th>Lần thử</th>
                          <th>Đạt ≥80%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.data.attempts.map((a) => (
                          <tr key={a.mode}>
                            <td>{modeNames[a.mode]}</td>
                            <td>{a.total}</td>
                            <td>{a.passed}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!overview.data.attempts.length && (
                    <State empty="Chưa có lượt học để báo cáo." />
                  )}
                  <h3>Chủ đề cần hỗ trợ thêm</h3>
                  {overview.data.commonErrors.map((e, i) => (
                    <div className="report-row" key={i}>
                      <span>
                        {String(
                          content.data?.lessons.find((l) => l.id === e.lessonId)
                            ?.title ?? `Bài ${e.lessonId}`,
                        )}{" "}
                        · {modeNames[e.mode]}
                      </span>
                      <Pill color="orange">{e.count} lần chưa đạt</Pill>
                    </div>
                  ))}
                </Card>
              </>
            )
          ) : tab === "users" ? (
            users.loading || users.error ? (
              <State
                loading={users.loading}
                error={users.error}
                retry={users.reload}
              />
            ) : (
              <Card className="manage-table">
                <h2>Người dùng & phân quyền</h2>
                <p>
                  Đổi vai trò sẽ yêu cầu người dùng đăng nhập lại. Khóa học và
                  lớp phải được chuyển trước khi bỏ vai trò giáo viên.
                </p>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Tài khoản</th>
                        <th>Vai trò</th>
                        <th>Trạng thái</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.data?.map((u) => (
                        <tr key={u.id}>
                          <td>
                            <b>{u.nickname}</b>
                            <small>{u.email}</small>
                            <small>{u.xp} XP</small>
                          </td>
                          <td>
                            <select
                              aria-label={`Vai trò của ${u.nickname}`}
                              disabled={busy || u.id === user?.id}
                              value={u.roles[0]}
                              onChange={(e) =>
                                void action(
                                  `/manage/users/${u.id}/role`,
                                  "PUT",
                                  { role: e.target.value },
                                )
                              }
                            >
                              {["Student", "Teacher", "Admin"].map((r) => (
                                <option key={r}>{r}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <Pill
                              color={
                                u.locked
                                  ? "orange"
                                  : u.emailConfirmed
                                    ? "green"
                                    : "neutral"
                              }
                            >
                              {u.locked
                                ? "Đã khóa"
                                : u.emailConfirmed
                                  ? "Đã xác minh"
                                  : "Chờ xác minh"}
                            </Pill>
                          </td>
                          <td>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={
                                busy ||
                                u.id === user?.id ||
                                u.roles.includes("Admin")
                              }
                              onClick={() =>
                                void action(
                                  `/manage/users/${u.id}/lock?locked=${!u.locked}`,
                                  "PUT",
                                  {},
                                )
                              }
                            >
                              {u.locked ? "Mở khóa" : "Khóa tài khoản"}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )
          ) : tab === "classes" ? (
            classes.loading || classes.error ? (
              <State
                loading={classes.loading}
                error={classes.error}
                retry={classes.reload}
              />
            ) : (
              <>
                <Card className="manage-table">
                  <h2>Tạo lớp học</h2>
                  <form
                    className="inline-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void action("/manage/classes/0", "PUT", {
                        name: className,
                        teacherId: classTeacher || null,
                      }).then((ok) => {
                        if (ok) setClassName("");
                      });
                    }}
                  >
                    <label>
                      Tên lớp
                      <input
                        required
                        value={className}
                        maxLength={100}
                        onChange={(e) => setClassName(e.target.value)}
                      />
                    </label>
                    {admin && (
                      <label>
                        Giáo viên
                        <select
                          required
                          value={classTeacher}
                          onChange={(e) => setClassTeacher(e.target.value)}
                        >
                          <option value="">Chọn giáo viên</option>
                          {teacherOptions.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.nickname}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <Button disabled={busy}>
                      <Plus size={16} />
                      Tạo lớp
                    </Button>
                  </form>
                </Card>
                {classes.data?.map((c) => (
                  <Card className="manage-table" key={c.id}>
                    <div className="section-heading compact">
                      <h2>{c.name}</h2>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEdited({
                            id: c.id,
                            name: c.name,
                            teacherId: c.teacherId,
                          })
                        }
                      >
                        <Pencil size={14} />
                        Sửa lớp
                      </Button>
                    </div>
                    {edited?.id === c.id && (
                      <form
                        className="inline-form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void action(`/manage/classes/${c.id}`, "PUT", edited);
                        }}
                      >
                        <label>
                          Tên lớp
                          <input
                            required
                            value={String(edited.name)}
                            onChange={(e) =>
                              setEdited({ ...edited, name: e.target.value })
                            }
                          />
                        </label>
                        {admin && (
                          <label>
                            Giáo viên
                            <select
                              value={String(edited.teacherId)}
                              onChange={(e) =>
                                setEdited({
                                  ...edited,
                                  teacherId: e.target.value,
                                })
                              }
                            >
                              {teacherOptions.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.nickname}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        <Button disabled={busy}>Lưu</Button>
                      </form>
                    )}
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Học sinh</th>
                            <th>XP</th>
                            <th>Bài hoàn thành</th>
                            <th>Lần thử</th>
                            {admin && <th>Thao tác</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {c.students.map((s) => (
                            <tr key={s.id}>
                              <td>{s.nickname}</td>
                              <td>{s.xp}</td>
                              <td>{s.completed}</td>
                              <td>{s.attempts}</td>
                              {admin && (
                                <td>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={busy}
                                    onClick={() =>
                                      void action(
                                        `/manage/classes/${c.id}/students/${s.id}`,
                                        "DELETE",
                                        undefined,
                                      )
                                    }
                                  >
                                    Bỏ khỏi lớp
                                  </Button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {!c.students.length && (
                      <State empty="Lớp chưa có học sinh." />
                    )}
                    {admin && (
                      <label>
                        Thêm học sinh
                        <select
                          value=""
                          disabled={busy}
                          onChange={(e) => {
                            if (e.target.value)
                              void action(
                                `/manage/classes/${c.id}/enroll`,
                                "POST",
                                { studentId: e.target.value },
                              );
                          }}
                        >
                          <option value="">Chọn học sinh</option>
                          {users.data
                            ?.filter(
                              (u) =>
                                u.roles.includes("Student") &&
                                !c.students.some((s) => s.id === u.id),
                            )
                            .map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.nickname} · {u.email}
                              </option>
                            ))}
                        </select>
                      </label>
                    )}
                  </Card>
                ))}
              </>
            )
          ) : content.loading || content.error || !content.data ? (
            <State
              loading={content.loading}
              error={content.error}
              retry={content.reload}
            />
          ) : (
            <>
              <div className="section-heading compact">
                <h2>{schemas[tab]?.title}</h2>
                <Button
                  onClick={() =>
                    setEdited({
                      id: 0,
                      ...structuredClone(schemas[tab].defaults),
                    })
                  }
                >
                  <Plus size={16} />
                  Thêm mới
                </Button>
              </div>
              {edited ? (
                <ContentForm
                  key={`${tab}-${edited.id}`}
                  resource={tab}
                  initial={edited}
                  data={content.data}
                  teachers={teacherOptions}
                  admin={admin}
                  busy={busy}
                  onCancel={() => setEdited(null)}
                  onSave={(row) =>
                    action(`/manage/${tab}/${row.id}`, "PUT", row)
                  }
                />
              ) : (
                <Card className="manage-table">
                  {content.data[tab]?.length ? (
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Nội dung</th>
                            <th>Trạng thái / thông tin</th>
                            <th>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {content.data[tab].map((row) => (
                            <tr key={row.id}>
                              <td>
                                <b>
                                  {String(
                                    row.title ??
                                      row.name ??
                                      `${modeNames[String(row.mode)]} · Bài ${row.lessonId}`,
                                  )}
                                </b>
                                <small>#{row.id}</small>
                              </td>
                              <td>
                                {"published" in row ? (
                                  <Pill
                                    color={row.published ? "green" : "neutral"}
                                  >
                                    {row.published
                                      ? "Đã xuất bản"
                                      : "Bản nháp / đã ẩn"}
                                  </Pill>
                                ) : "available" in row ? (
                                  <Pill
                                    color={row.available ? "green" : "neutral"}
                                  >
                                    {row.available ? "Đang mở" : "Sắp ra mắt"}
                                  </Pill>
                                ) : "xp" in row ? (
                                  `${row.xp} XP`
                                ) : "requiredXp" in row ? (
                                  `${row.requiredXp} XP`
                                ) : (
                                  `Thứ tự ${row.position}`
                                )}
                              </td>
                              <td>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setEdited(structuredClone(row))
                                  }
                                >
                                  <Pencil size={14} />
                                  Chỉnh sửa
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <State empty="Chưa có nội dung. Tạo mới để bắt đầu." />
                  )}
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
function ContentForm({
  resource,
  initial,
  data,
  teachers,
  admin,
  busy,
  onCancel,
  onSave,
}: {
  resource: string;
  initial: Row;
  data: Content;
  teachers: StaffUser[];
  admin: boolean;
  busy: boolean;
  onCancel: () => void;
  onSave: (row: Row) => Promise<boolean>;
}) {
  const [row, setRow] = useState(initial);
  const schema = schemas[resource];
  function update(key: string, value: unknown) {
    setRow((r) => ({ ...r, [key]: value }));
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    void onSave(row);
  }
  const blanks = (row.blanks ?? []) as {
    position: number;
    answers: string[];
    hints: string[];
  }[];
  const tests = (row.tests ?? []) as {
    input: string;
    expected: string;
    isSample: boolean;
  }[];
  return (
    <Card className="content-form">
      <div className="section-heading compact">
        <h3>
          {row.id ? "Chỉnh sửa" : "Tạo mới"} · {schema.title}
        </h3>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          aria-label="Đóng chỉnh sửa"
        >
          <X size={18} />
        </Button>
      </div>
      <form onSubmit={submit}>
        {schema.fields
          .filter((f) => admin || f.key !== "teacherId")
          .map((f) => (
            <label
              key={f.key}
              className={f.type === "check" ? "checkbox-label" : ""}
            >
              {f.type === "check" ? (
                <>
                  <input
                    type="checkbox"
                    checked={!!row[f.key]}
                    onChange={(e) => update(f.key, e.target.checked)}
                  />
                  <span>{f.label}</span>
                </>
              ) : (
                <>
                  {f.label}
                  {f.type === "select" ? (
                    <select
                      required={f.key !== "teacherId"}
                      value={String(row[f.key] ?? "")}
                      onChange={(e) =>
                        update(
                          f.key,
                          f.key === "teacherId"
                            ? e.target.value || null
                            : f.source
                              ? Number(e.target.value)
                              : e.target.value,
                        )
                      }
                    >
                      {f.key === "teacherId" && (
                        <option value="">Chưa giao giáo viên</option>
                      )}
                      {f.source === "teachers"
                        ? teachers.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.nickname}
                            </option>
                          ))
                        : f.source
                          ? (data[f.source] ?? []).map((r) => (
                              <option key={r.id} value={r.id}>
                                {String(r.title ?? r.name)}
                              </option>
                            ))
                          : f.choices?.map((c) => (
                              <option key={c} value={c}>
                                {modeNames[c] ?? c}
                              </option>
                            ))}
                    </select>
                  ) : f.type === "textarea" || f.type === "lines" ? (
                    <textarea
                      aria-label={f.label}
                      rows={f.key === "example" || f.key === "template" ? 6 : 3}
                      maxLength={f.max ?? 12000}
                      required={f.key !== "options"}
                      className={
                        ["example", "template", "starterCode"].includes(f.key)
                          ? "mono"
                          : ""
                      }
                      value={
                        f.type === "lines"
                          ? ((row[f.key] as string[]) ?? []).join("\n")
                          : String(row[f.key] ?? "")
                      }
                      onChange={(e) =>
                        update(
                          f.key,
                          f.type === "lines"
                            ? e.target.value.split("\n")
                            : e.target.value,
                        )
                      }
                    />
                  ) : (
                    <input
                      type={
                        f.type === "number"
                          ? "number"
                          : f.type === "color"
                            ? "color"
                            : "text"
                      }
                      required={
                        f.key !== "videoTitle" && f.key !== "starterCode"
                      }
                      maxLength={f.max ?? 2000}
                      min={f.key === "quizAnswer" ? 0 : 1}
                      value={String(row[f.key] ?? "")}
                      onChange={(e) =>
                        update(
                          f.key,
                          f.type === "number"
                            ? Number(e.target.value)
                            : e.target.value,
                        )
                      }
                    />
                  )}
                </>
              )}
              {f.help && <small className="muted">{f.help}</small>}
            </label>
          ))}
        {resource === "exercises" && (
          <fieldset>
            <legend>Ô trống & đáp án hợp lệ</legend>
            <p className="muted">
              Mỗi dòng đáp án là một cách viết được chấp nhận. Gợi ý đi từ nhẹ
              đến rõ hơn.
            </p>
            {blanks.map((b, i) => (
              <div className="nested-form" key={i}>
                <b>
                  Ô {i + 1} · {`{{${i}}}`}
                </b>
                <label>
                  Đáp án hợp lệ, mỗi dòng một đáp án
                  <textarea
                    required
                    rows={2}
                    value={b.answers.join("\n")}
                    onChange={(e) =>
                      update(
                        "blanks",
                        blanks.map((x, j) =>
                          j === i
                            ? { ...x, answers: e.target.value.split("\n") }
                            : x,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Gợi ý theo mức, mỗi dòng một mức
                  <textarea
                    required
                    rows={3}
                    value={b.hints.join("\n")}
                    onChange={(e) =>
                      update(
                        "blanks",
                        blanks.map((x, j) =>
                          j === i
                            ? { ...x, hints: e.target.value.split("\n") }
                            : x,
                        ),
                      )
                    }
                  />
                </label>
              </div>
            ))}
            <div className="game-actions">
              <Button
                type="button"
                variant="outline"
                disabled={blanks.length >= 12}
                onClick={() =>
                  update("blanks", [
                    ...blanks,
                    { position: blanks.length, answers: [""], hints: [""] },
                  ])
                }
              >
                <Plus size={14} />
                Thêm ô
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={blanks.length <= 1}
                onClick={() => update("blanks", blanks.slice(0, -1))}
              >
                Bỏ ô cuối
              </Button>
            </div>
          </fieldset>
        )}
        {resource === "challenges" && (
          <fieldset>
            <legend>Test case (2–10 test)</legend>
            {tests.map((t, i) => (
              <div className="nested-form" key={i}>
                <b>Test {i + 1}</b>
                <label>
                  Đầu vào
                  <textarea
                    rows={3}
                    value={t.input}
                    maxLength={4000}
                    onChange={(e) =>
                      update(
                        "tests",
                        tests.map((x, j) =>
                          j === i ? { ...x, input: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Đầu ra mong đợi
                  <textarea
                    rows={3}
                    value={t.expected}
                    maxLength={4000}
                    onChange={(e) =>
                      update(
                        "tests",
                        tests.map((x, j) =>
                          j === i ? { ...x, expected: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={t.isSample}
                    onChange={(e) =>
                      update(
                        "tests",
                        tests.map((x, j) =>
                          j === i ? { ...x, isSample: e.target.checked } : x,
                        ),
                      )
                    }
                  />
                  <span>Test mẫu công khai</span>
                </label>
              </div>
            ))}
            <div className="game-actions">
              <Button
                type="button"
                variant="outline"
                disabled={tests.length >= 10}
                onClick={() =>
                  update("tests", [
                    ...tests,
                    { input: "", expected: "", isSample: false },
                  ])
                }
              >
                <Plus size={14} />
                Thêm test
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={tests.length <= 2}
                onClick={() => update("tests", tests.slice(0, -1))}
              >
                Bỏ test cuối
              </Button>
            </div>
            <p className="muted">
              Thử thách đã có bài nộp giữ nguyên test để bảo toàn lịch sử. Khi
              cần đề khác, tạo bài học mới.
            </p>
          </fieldset>
        )}
        <div className="game-actions">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onCancel}
          >
            Hủy
          </Button>
          <Button disabled={busy}>
            <Save size={16} />
            {busy ? "Đang lưu…" : "Lưu nội dung"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
