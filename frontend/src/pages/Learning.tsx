import { lazy, Suspense, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  GripVertical,
  Lightbulb,
  LockKeyhole,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Star,
} from "lucide-react";
import { api, useLoad } from "../api";
import { useAuth, usePreferences, playSound } from "../context";
import { fireConfetti, fireLevelUp, fireStars } from "../confetti";
import {
  Button,
  Card,
  CodeBlock,
  modeNames,
  Pill,
  ProgressBar,
  Robot,
  State,
} from "../components/ui";
import type {
  Challenge,
  CheckResult,
  CodeResult,
  Exercise,
  Lesson,
} from "../types";
const CodeEditor = lazy(() => import("../components/CodeEditor"));
export function LessonPage({ id, mode }: { id: string; mode?: string }) {
  const [version, setVersion] = useState(0);
  const q = useLoad<Lesson>(`/lessons/${id}`, `${mode ?? "theory"}-${version}`);
  const [answer, setAnswer] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [videoOpen, setVideoOpen] = useState(false);
  useEffect(() => {
    setAnswer(null);
    setFeedback("");
    setError("");
    setVideoOpen(false);
  }, [id]);
  if (q.loading || q.error || !q.data)
    return (
      <div className="container page">
        <State loading={q.loading} error={q.error} retry={q.reload} />
      </div>
    );
  const l = q.data;
  const p = l.progress;
  const exercise = l.exercises.find((x) => x.mode === mode);
  const open = {
    theory: true,
    drag: !!p?.theory,
    memory: !!p?.drag,
    challenge: !!p?.memory,
  };
  const step = Math.max(0, Object.keys(open).indexOf(mode ?? "theory")) + 1;
  const stepHelp: Record<string, string> = {
    theory: "Đọc ví dụ, thử trả lời câu hỏi rồi bắt đầu thực hành.",
    drag: "Ghép các mảnh code để xem từng lệnh hoạt động ra sao.",
    memory: "Tự gõ phần còn thiếu. Bạn có thể mở gợi ý bất cứ lúc nào.",
    challenge: "Viết chương trình, chạy thử với dữ liệu mẫu rồi nộp bài.",
  };
  async function checkTheory() {
    setBusy(true);
    setError("");
    try {
      const r = await api<{ correct: boolean; message: string }>(
        `/lessons/${id}/theory`,
        "POST",
        { answer },
      );
      setFeedback(r.message);
      if (r.correct) {
        fireStars();
        setVersion((v) => v + 1);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container page learning-page">
      <Link to={`/courses/${l.courseId}`} className="breadcrumb">
        <ArrowLeft size={14} /> Lộ trình Python
      </Link>
      <div className="learning-title">
        <div>
          <span className="eyebrow">MỘT CHỦ ĐỀ, BA CÁCH KHÁM PHÁ</span>
          <h1>{l.title}</h1>
        </div>
        <Pill>
          <Star size={14} /> Học theo nhịp của bạn
        </Pill>
      </div>
      <nav className="mode-tabs" aria-label="Các bước học">
        {Object.entries(open).map(([m, unlocked], i) =>
          unlocked ? (
            <Link
              key={m}
              className={(mode ?? "theory") === m ? "active" : ""}
              to={`/lessons/${id}${m === "theory" ? "" : `/practice/${m}`}`}
            >
              <span>{i + 1}</span>
              {modeNames[m]}
              {p?.[m as keyof typeof p] && <Check size={15} />}
            </Link>
          ) : (
            <button disabled key={m}>
              <LockKeyhole size={14} />
              {modeNames[m]}
            </button>
          ),
        )}
      </nav>
      <div className="lesson-step-card">
        <span className="lesson-step-number">BƯỚC {step} / 4</span>
        <div className="lesson-step-copy">
          <strong>{modeNames[mode ?? "theory"]}</strong>
          <p>{stepHelp[mode ?? "theory"]}</p>
        </div>
        <ProgressBar value={(step / 4) * 100} label={`Bước ${step} trên 4`} />
      </div>
      {mode && !open[mode as keyof typeof open] ? (
        <State error="Hoàn thành bước trước để mở chế độ này." />
      ) : mode === "challenge" ? (
        <CodingChallenge key={`${id}-code`} id={l.challengeId} />
      ) : mode === "drag" || mode === "memory" ? (
        exercise ? (
          <ExerciseGame
            key={`${id}-${mode}`}
            id={exercise.id}
            next={`/lessons/${id}/practice/${mode === "drag" ? "memory" : "challenge"}`}
          />
        ) : (
          <State empty="Hoạt động này chưa có nội dung." />
        )
      ) : mode ? (
        <State error="Chế độ học không hợp lệ." />
      ) : (
        <div className="lesson-content-grid">
          <div>
            <Card className="lesson-content">
              <Pill color="blue">
                <BookOpen size={14} /> Mục tiêu bài học
              </Pill>
              <p className="objectives">{l.content.objectives}</p>
              <h2>Cùng khám phá</h2>
              <p className="lesson-explanation">{l.content.explanation}</p>
              <h3>Thử đọc đoạn code này</h3>
              <CodeBlock code={l.content.example} />
              <div className="lesson-note">
                <Lightbulb size={21} />
                <div>
                  <b>Ghi chú của Kiki</b>
                  <p>{l.content.notes}</p>
                </div>
              </div>
              <h3>Minh họa từng bước</h3>
              {l.video ? (
                l.video.url.startsWith("/videos/") ? (
                  <>
                    <video
                      className="lesson-video"
                      controls
                      preload="metadata"
                      aria-label={l.video.title}
                    >
                      <source src={l.video.url} type="video/mp4" />
                      <track
                        kind="captions"
                        src={l.video.url.replace(".mp4", ".vtt")}
                        srcLang="vi"
                        label="Tiếng Việt"
                        default
                      />
                      Trình duyệt không hỗ trợ video. Hãy đọc ví dụ và giải thích
                      phía trên.
                    </video>
                    <p className="video-caption-note">
                      Video không có lời thoại. Bật phụ đề tiếng Việt hoặc dừng
                      lại để đọc từng phần.
                    </p>
                  </>
                ) : videoOpen ? (
                  <iframe
                    className="lesson-video"
                    src={l.video.url}
                    title={l.video.title}
                    allowFullScreen
                    referrerPolicy="no-referrer"
                    sandbox="allow-scripts allow-same-origin allow-presentation"
                  />
                ) : (
                  <Button variant="outline" onClick={() => setVideoOpen(true)}>
                    <Play size={16} />
                    Mở video từ YouTube
                  </Button>
                )
              ) : (
                <div className="note">
                  Video đang được chuẩn bị. Nội dung và ví dụ phía trên giúp bạn
                  bắt đầu ngay.
                </div>
              )}
            </Card>
          </div>
          <Card className="quiz-card">
            <span className="eyebrow">DỪNG MỘT CHÚT, NHỚ MỘT ĐIỀU</span>
            <h2>Câu hỏi nhỏ</h2>
            <p>{l.content.quiz}</p>
            <fieldset>
              <legend className="sr-only">Chọn đáp án</legend>
              {l.content.quizOptions.map((a, i) => (
                <label
                  className={
                    answer === i ? "quiz-option selected" : "quiz-option"
                  }
                  key={i}
                >
                  <input
                    type="radio"
                    name="quiz"
                    checked={answer === i}
                    onChange={() => setAnswer(i)}
                  />
                  <span>{a}</span>
                </label>
              ))}
            </fieldset>
            {feedback && (
              <p className="feedback" role="status">
                {feedback}
              </p>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {p?.theory ? (
              <>
                <p className="form-success">
                  <CheckCircle2 size={17} />
                  Bạn đã hoàn thành lý thuyết.
                </p>
                <Button asChild className="full">
                  <Link to={`/lessons/${id}/practice/drag`}>
                    Bắt đầu kéo thả <ArrowRight size={16} />
                  </Link>
                </Button>
              </>
            ) : (
              <Button
                className="full"
                disabled={answer === null || busy}
                onClick={() => void checkTheory()}
              >
                {busy ? "Đang kiểm tra…" : "Kiểm tra & mở thực hành"}
                <ArrowRight size={16} />
              </Button>
            )}
            <p className="muted">Sai cũng không mất XP. Hãy thử lại nhé!</p>
          </Card>
        </div>
      )}
    </div>
  );
}
function DraggableToken({
  id,
  text,
  busy,
  selected,
  onSelect,
}: {
  id: number;
  text: string;
  busy: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `option-${id}`,
    data: { value: text },
    disabled: busy,
  });
  return (
    <button
      ref={setNodeRef}
      className={`code-token ${isDragging ? "dragging" : ""} ${selected ? "selected" : ""}`}
      {...attributes}
      {...listeners}
      disabled={busy}
      onClick={onSelect}
      style={{ touchAction: "none" }}
      aria-label={`Mảnh code ${text}. Kéo thả, hoặc chọn rồi chọn ô trống.`}
    >
      <GripVertical size={14} />
      {text}
    </button>
  );
}
function DropBlank({
  pos,
  value,
  disabled,
  onSelect,
  feedback,
}: {
  pos: number;
  value?: string;
  disabled: boolean;
  onSelect: () => void;
  feedback?: { correct: boolean; sequence: number };
}) {
  const controls = useAnimationControls();
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (!feedback || reduceMotion) return;
    void controls.start(
      feedback.correct
        ? { scale: [1, 1.12, 1], transition: { duration: 0.3 } }
        : { x: [0, -5, 5, -3, 0], transition: { duration: 0.28 } },
    );
  }, [feedback, reduceMotion, controls]);
  const { setNodeRef, isOver } = useDroppable({
    id: `blank-${pos}`,
    data: { pos },
    disabled: disabled || !!value,
  });
  return (
    <motion.button
      ref={setNodeRef}
      animate={controls}
      className={`code-blank drop-blank ${value ? "filled" : ""} ${isOver ? "over" : ""} ${feedback && !feedback.correct ? "miss" : ""}`}
      onClick={onSelect}
      disabled={disabled || !!value}
      aria-label={`Ô trống ${pos + 1}${value ? `, đã điền ${value}` : ""}`}
      aria-live="polite"
    >
      {value ? (
        <>
          <Check size={13} aria-hidden="true" />
          {value}
        </>
      ) : (
        <span>ô {pos + 1}</span>
      )}
    </motion.button>
  );
}
function Template({
  template,
  blank,
}: {
  template: string;
  blank: (position: number) => ReactNode;
}) {
  return (
    <div className="code-stage">
      <div className="code-stage-toolbar">
        <span className="stage-window-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>bai-tap.py</span>
        <span className="stage-language">Python</span>
      </div>
      <div className="exercise-code" aria-label="Đoạn code cần hoàn thành">
        {template.split("\n").map((line, i) => (
          <div className="code-line" key={i}>
            <span className="line-number" aria-hidden="true">
              {i + 1}
            </span>
            <div>
              {line.split(/(\{\{\d+\}\})/g).map((p, j) =>
                /^\{\{\d+\}\}$/.test(p) ? (
                  <span key={j}>{blank(Number(p.slice(2, -2)))}</span>
                ) : (
                  <span key={j} className="code-text">
                    {p}
                  </span>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function ExerciseGame({ id, next }: { id: number; next: string }) {
  const q = useLoad<Exercise>(`/exercises/${id}`);
  const { refresh } = useAuth();
  const { sound } = usePreferences();
  const [values, setValues] = useState<Record<number, string>>({});
  const [result, setResult] = useState<CheckResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [hint, setHint] = useState(0);
  const [active, setActive] = useState("");
  const [selected, setSelected] = useState<{
    id: number;
    value: string;
  } | null>(null);
  const [dropFeedback, setDropFeedback] = useState<{
    pos: number;
    correct: boolean;
    sequence: number;
  } | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    }),
  );
  const [attempts, setAttempts] = useState(0);
  useEffect(() => {
    if (q.data) setAttempts(q.data.attempts);
  }, [q.data]);
  if (q.loading || q.error || !q.data)
    return <State loading={q.loading} error={q.error} retry={q.reload} />;
  const e = q.data;
  async function drop(pos: number, value: string) {
    if (busy || values[pos]) return;
    setBusy(true);
    setError("");
    setResult(null);
    setSelected(null);
    try {
      const r = await api<CheckResult>(`/exercises/${id}/check`, "POST", {
        values: { [pos]: value },
        preview: true,
      });
      const correct = r.correctPositions.includes(pos);
      setDropFeedback((previous) => ({
        pos,
        correct,
        sequence: (previous?.sequence ?? 0) + 1,
      }));
      if (correct) {
        setValues((v) => ({ ...v, [pos]: value }));
        setMessage(`Đúng rồi! Ô ${pos + 1} đã được điền.`);
      } else
        setMessage(
          `Chưa đúng ở ô ${pos + 1}. Mảnh code đã quay về ngân hàng; thử một mảnh khác nhé.`,
        );
      if (sound) playSound(correct);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function end(event: DragEndEvent) {
    setActive("");
    if (event.over)
      void drop(
        Number(event.over.data.current?.pos),
        String(event.active.data.current?.value),
      );
  }
  async function check() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await api<CheckResult>(`/exercises/${id}/check`, "POST", {
        values,
      });
      setResult(r);
      setAttempts(r.attempts);
      if (sound) playSound(r.passed);
      if (r.passed) {
        fireConfetti();
        await refresh();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function reset() {
    setValues({});
    setResult(null);
    setMessage("");
    setError("");
    setSelected(null);
    setHint(0);
    setDropFeedback(null);
  }
  const inputs = e.blanks.every((b) => values[b.position]?.trim());
  const filled = e.blanks.filter(b => values[b.position]?.trim()).length;
  return (
    <div className="practice-grid">
      <Card className="game-card">
        <div className="practice-kicker">
          <span>
            <Sparkles size={14} /> PHÒNG THỰC HÀNH
          </span>
          <span>Thử · Khám phá · Tiến bộ</span>
        </div>
        <div className="game-heading">
          <Pill color={e.mode === "drag" ? "purple" : "blue"}>
            {modeNames[e.mode]} · Cấp {e.level}
          </Pill>
          <span className="xp-label">
            <Star size={16} /> +{e.xp} XP lần đầu
          </span>
        </div>
        <h2>{e.prompt}</h2>
        <p>
          {e.mode === "drag"
            ? "Giữ và kéo mảnh code vào ô. Mảnh sai sẽ tự quay về."
            : "Tự gõ cú pháp vào ô, dùng Tab để chuyển sang ô tiếp theo."}
        </p>
        <div className="puzzle-progress">
          <div>
            <span>
              {e.mode === "drag" ? "Mảnh code đã ghép" : "Ô đã điền"}
            </span>
            <b>
              {filled} / {e.blanks.length}
            </b>
          </div>
          <ProgressBar
            value={(filled / e.blanks.length) * 100}
            label={
              e.mode === "drag" ? "Tiến độ ghép code" : "Tiến độ điền ô"
            }
          />
        </div>
        {e.mode === "drag" ? (
          <DndContext
            sensors={sensors}
            onDragStart={(event) => {
              setActive(String(event.active.data.current?.value));
              setSelected(null);
            }}
            onDragEnd={end}
            onDragCancel={() => {
              setActive("");
              setMessage("Đã hủy kéo. Mảnh code đã trở về ngân hàng.");
            }}
            accessibility={{
              screenReaderInstructions: {
                draggable:
                  "Nhấn phím cách để bắt đầu kéo, phím mũi tên để di chuyển, phím cách để thả và Escape để hủy. Hoặc chọn mảnh code rồi chọn ô trống.",
              },
              announcements: {
                onDragStart: ({ active }) =>
                  `Đang kéo ${active.data.current?.value}.`,
                onDragOver: ({ over }) =>
                  over
                    ? `Trên ô ${Number(over.data.current?.pos) + 1}.`
                    : "Di chuyển đến ô trống.",
                onDragEnd: ({ over }) =>
                  over
                    ? "Đang kiểm tra đáp án."
                    : "Đã trả mảnh code về ngân hàng.",
                onDragCancel: () => "Đã hủy kéo.",
              },
            }}
          >
            <Template
              template={e.template}
              blank={(pos) => (
                <DropBlank
                  pos={pos}
                  value={values[pos]}
                  disabled={busy}
                  feedback={dropFeedback?.pos === pos ? dropFeedback : undefined}
                  onSelect={() => {
                    if (selected) void drop(pos, selected.value);
                  }}
                />
              )}
            />
            <div className="answer-bank">
              <div className="bank-heading">
                <span className="eyebrow">NGÂN HÀNG MẢNH CODE</span>
                <span>
                  <GripVertical size={13} /> Kéo để khám phá
                </span>
              </div>
              <div>
                {e.options?.map((o) => (
                  <DraggableToken
                    key={o.id}
                    id={o.id}
                    text={o.value}
                    busy={busy}
                    selected={selected?.id === o.id}
                    onSelect={() =>
                      setSelected((s) => (s?.id === o.id ? null : o))
                    }
                  />
                ))}
              </div>
              <small>
                {selected
                  ? `Đã chọn “${selected.value}”. Chọn một ô trống để điền.`
                  : "Bàn phím: chọn mảnh code bằng Enter, rồi Tab đến ô trống và Enter. Hoặc Space và các phím mũi tên để kéo."}
              </small>
              <span className="bank-reuse">Một mảnh code có thể dùng ở nhiều ô.</span>
            </div>
            {createPortal(
              <DragOverlay
                dropAnimation={{
                  duration: 220,
                  easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
                }}
              >
                {active && (
                  <span className="code-token overlay">
                    <GripVertical size={14} />
                    {active}
                  </span>
                )}
              </DragOverlay>,
              document.body,
            )}
          </DndContext>
        ) : (
          <Template
            template={e.template}
            blank={(pos) => (
              <input
                className={`code-blank typing-blank ${result ? (result.correctPositions.includes(pos) ? "correct" : "incorrect") : ""}`}
                aria-label={`Ô trống ${pos + 1}`}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={200}
                value={values[pos] ?? ""}
                disabled={busy}
                onChange={(ev) => {
                  setValues((v) => ({ ...v, [pos]: ev.target.value }));
                  setResult(null);
                }}
                style={{
                  width:
                    Math.max(5, Math.min(24, (values[pos]?.length ?? 0) + 2)) +
                    "ch",
                }}
              />
            )}
          />
        )}
        <AnimatePresence mode="wait">{message && (
          <motion.p
            key={message}
            className={`feedback game-feedback ${dropFeedback?.correct ? "feedback-correct" : ""}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="status"
          >
            {dropFeedback?.correct ? <CheckCircle2 size={17}/> : <Lightbulb size={17}/>}
            {message}
          </motion.p>
        )}</AnimatePresence>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="game-actions">
          <Button variant="outline" disabled={busy} onClick={reset}>
            <RotateCcw size={16} /> Làm lại
          </Button>
          <Button disabled={busy || !inputs} onClick={() => void check()}>
            {busy ? "Đang kiểm tra…" : "Kiểm tra bài làm"}
            <CheckCircle2 size={17} />
          </Button>
        </div>
        {result && (
          <ResultBanner
            passed={result.passed}
            score={result.score}
            xp={result.xp}
            next={next}
          />
        )}
      </Card>
      <Card className="practice-help">
        <div className="kiki-coach">
          <span className="coach-orbit" />
          <Robot small />
          <Pill color="blue">
            <Sparkles size={12} /> Bạn đồng hành của bạn
          </Pill>
        </div>
        <Lightbulb size={29} />
        <h3>Gợi ý của Kiki</h3>
        <p>
          {e.mode === "memory"
            ? "Thử nhớ lại trước. Khi cần, một gợi ý nhỏ có thể giúp bạn."
            : "Chú ý tên lệnh, dấu ngoặc và vị trí của từng mảnh code."}
        </p>
        <Button
          variant="outline"
          className="full"
          disabled={hint >= 3}
          onClick={() => setHint((h) => h + 1)}
        >
          {hint >= 3 ? "Đã xem hết gợi ý" : `Gợi ý mức ${hint + 1}`}
        </Button>
        {hint > 0 && (
          <ul className="hint-list">
            {e.blanks.map((b) => (
              <li key={b.position}>
                <b>Ô {b.position + 1}:</b>{" "}
                {b.hints[Math.min(hint - 1, b.hints.length - 1)]}
              </li>
            ))}
          </ul>
        )}
        <div className="attempt-note">Số lần thử: {attempts}</div>
        {attempts >= 3 && !result?.passed && (
          <Button asChild variant="ghost">
            <Link to={`/lessons/${e.lessonId}`}>
              <BookOpen size={15} /> Ôn lại bài học
            </Link>
          </Button>
        )}
        <div className="note small">
          Không mất XP khi sai. Đạt 80% để mở bước tiếp theo.
        </div>
      </Card>
    </div>
  );
}
function ResultBanner({
  passed,
  score,
  xp,
  next,
}: {
  passed: boolean;
  score: number;
  xp: number;
  next?: string;
}) {
  return (
    <motion.div
      className={`result-banner ${passed ? "success" : "retry"}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      role="status"
    >
      {passed && xp > 0 && <RewardBurst />}
      <span className="result-icon">
        {passed ? <Sparkles /> : <Lightbulb />}
      </span>
      <div>
        <h3>
          {passed
            ? "Bạn đã chinh phục hoạt động này!"
            : "Thêm một chút nữa nhé!"}
        </h3>
        <p>
          {score}% chính xác ·{" "}
          {passed
            ? xp > 0
              ? `+${xp} XP đã được lưu`
              : "Đã hoàn thành trước đó, XP giữ nguyên"
            : "Cần từ 80%. Đọc gợi ý và thử lại."}
        </p>
        {passed && xp > 0 && (
          <span className="reward-xp">
            <Star size={15} />
            <b>+{xp} XP</b>
            <span>Giỏi lắm, nhà thám hiểm!</span>
          </span>
        )}
      </div>
      {passed && next && (
        <Button asChild>
          <Link to={next}>
            Tiếp theo <ArrowRight size={16} />
          </Link>
        </Button>
      )}
    </motion.div>
  );
}
function RewardBurst() {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 1800);
    return () => clearTimeout(timer);
  }, []);
  if (!visible || reduceMotion) return null;
  const colors = ["#818cf8", "#38bdf8", "#fbbf24", "#34d399", "#fb7185"];
  return (
    <span className="reward-burst" aria-hidden="true">
      {Array.from({ length: 18 }, (_, i) => (
        <i
          key={i}
          style={
            {
              "--piece-x": `${8 + ((i * 37) % 84)}%`,
              "--piece-drift": `${(i * 19) % 100 - 50}px`,
              "--piece-delay": `${(i % 4) * 0.07}s`,
              "--piece-turn": `${i * 43 + 120}deg`,
              background: colors[i % colors.length],
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}
function CodingChallenge({ id }: { id: number }) {
  const q = useLoad<Challenge>(`/challenges/${id}`);
  const { refresh, user } = useAuth();
  const { dark } = usePreferences();
  const draftKey = `codekid:draft:${user?.id ?? "guest"}:${id}`;
  const [code, setCode] = useState<string | null>(() => {
    try {
      return localStorage.getItem(draftKey);
    } catch {
      return null;
    }
  });
  const [draftSaved, setDraftSaved] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CodeResult | null>(null);
  function saveDraft(value: string) {
    setCode(value);
    try {
      localStorage.setItem(draftKey, value);
      setDraftSaved(true);
    } catch {
      setDraftSaved(false);
    }
  }
  if (q.loading || q.error || !q.data)
    return <State loading={q.loading} error={q.error} retry={q.reload} />;
  const c = q.data;
  async function run(practice: boolean) {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const r = await api<CodeResult>(`/challenges/${id}/submit`, "POST", {
        code: code ?? c.starterCode,
        practice,
      });
      setResult(r);
      if (r.passed && !practice) {
        fireLevelUp();
        await refresh();
        try {
          localStorage.removeItem(draftKey);
        } catch {
          setDraftSaved(false);
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="challenge-workspace">
      <Card className="challenge-brief">
        <Pill color="green">Chế độ 3 · Viết code</Pill>
        <h2>{c.title}</h2>
        <p>{c.description}</p>
        <h3>Dữ liệu mẫu</h3>
        {c.tests.map((t, i) => (
          <div className="sample-case" key={i}>
            <span>Mẫu {i + 1}</span>
            <div>
              <b>Đầu vào</b>
              <pre>{t.input || "(không có)"}</pre>
            </div>
            <div>
              <b>Đầu ra</b>
              <pre>{t.expected || "(không in gì)"}</pre>
            </div>
          </div>
        ))}
        <div className="lesson-note">
          <Lightbulb />
          <p>
            Không in lời nhắc nhập dữ liệu. Chạy thử dùng test mẫu; nộp bài dùng
            cả test ẩn. Đạt 80% để hoàn thành bài.
          </p>
        </div>
        <p className="muted">
          {c.totalTests} test case · +{c.xp} XP thử thách +50 XP bài học lần
          đầu.
        </p>
      </Card>
      <div>
        <Card className="editor-card">
          <div className="editor-toolbar">
            <span>
              <span className="tiny-dot green" /> bai-lam.py
            </span>
            <select aria-label="Ngôn ngữ lập trình" value="python" disabled>
              <option value="python">Python 3</option>
            </select>
            <span
              className={`draft-status ${draftSaved ? "" : "draft-warning"}`}
              role="status"
            >
              {draftSaved
                ? "Tự lưu trên thiết bị này"
                : "Không lưu được · đừng tải lại trang"}
            </span>
          </div>
          <Suspense fallback={<State loading />}>
            <CodeEditor
              value={code ?? c.starterCode}
              onChange={saveDraft}
              dark={dark}
              disabled={busy}
            />
          </Suspense>
          <div className="editor-actions">
            <Button
              variant="outline"
              disabled={busy || !(code ?? c.starterCode).trim()}
              onClick={() => void run(true)}
            >
              <Play size={16} />
              {busy ? "Đang chạy…" : "Chạy thử"}
            </Button>
            <Button
              disabled={busy || !(code ?? c.starterCode).trim()}
              onClick={() => void run(false)}
            >
              <Send size={16} />
              Nộp bài
            </Button>
          </div>
        </Card>
        {error && (
          <div className="form-error runner-error" role="alert">
            {error}
          </div>
        )}
        {result && (
          <Card className="test-results">
            <h3>
              {result.practice ? "Kết quả chạy thử" : "Kết quả chấm bài"} ·{" "}
              {result.score}%
            </h3>
            {result.results.map((t, i) => (
              <div
                className={`test-result ${t.passed ? "passed" : "failed"}`}
                key={i}
              >
                <b>
                  {t.passed ? (
                    <CheckCircle2 size={17} />
                  ) : (
                    <Lightbulb size={17} />
                  )}
                  Test {i + 1} {t.sample ? "· mẫu" : "· ẩn"} ·{" "}
                  {t.passed ? "Đạt" : "Chưa đạt"}
                </b>
                {t.output && <pre>{t.output}</pre>}
                {t.error && <pre className="test-error">{t.error}</pre>}
              </div>
            ))}
            {!result.practice && (
              <ResultBanner
                passed={result.passed}
                score={result.score}
                xp={result.xp}
                next="/dashboard"
              />
            )}
            <Button asChild variant="ghost">
              <Link to={`/results/${result.submissionId}`}>
                Xem bài nộp đã lưu <ArrowRight size={15} />
              </Link>
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
export function SubmissionPage({ id }: { id: string }) {
  const q = useLoad<{
    id: number;
    score: number;
    isPractice: boolean;
    createdAt: string;
    code: string;
    results: { passed: boolean; output: string; error: string }[];
  }>(`/submissions/${id}`);
  return (
    <div className="container page narrow">
      <Link to="/dashboard" className="breadcrumb">
        <ArrowLeft size={15} /> Góc học tập
      </Link>
      <h1>Kết quả bài nộp #{id}</h1>
      {q.loading || q.error || !q.data ? (
        <State loading={q.loading} error={q.error} retry={q.reload} />
      ) : (
        <Card className="submission-card">
          <Pill color={q.data.score >= 80 ? "green" : "orange"}>
            {q.data.score}% · {q.data.isPractice ? "Chạy thử" : "Bài nộp"}
          </Pill>
          <p>{new Date(q.data.createdAt).toLocaleString("vi-VN")}</p>
          <CodeBlock code={q.data.code} />
          {q.data.results.map((r, i) => (
            <div className="test-result" key={i}>
              <b>
                Test {i + 1} · {r.passed ? "Đạt" : "Chưa đạt"}
              </b>
              {r.output && <pre>{r.output}</pre>}
              {r.error && <pre>{r.error}</pre>}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
