import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Cat,
  Check,
  ChevronRight,
  Code2,
  Flame,
  LockKeyhole,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
export const cn = (...values: Parameters<typeof clsx>) => twMerge(clsx(values));
const buttonVariants = cva("btn", {
  variants: {
    variant: {
      default: "btn-primary",
      outline: "btn-outline",
      ghost: "btn-ghost",
      secondary: "btn-secondary",
    },
    size: { default: "", sm: "btn-sm", lg: "btn-lg" },
  },
  defaultVariants: { variant: "default", size: "default" },
});
export function Button({
  className,
  variant,
  size,
  asChild,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card", className)} {...props} />;
}
export function Pill({
  children,
  color = "purple",
}: {
  children: ReactNode;
  color?: string;
}) {
  return <span className={`pill pill-${color}`}>{children}</span>;
}
export function ProgressBar({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div style={{ width: Math.max(0, Math.min(100, value)) + "%" }} />
    </div>
  );
}
export function State({
  loading,
  error,
  retry,
  empty,
}: {
  loading?: boolean;
  error?: string;
  retry?: () => void;
  empty?: string;
}) {
  return (
    <div className="state" role={error ? "alert" : "status"}>
      {loading ? (
        <>
          <div className="spinner" />
          Đang chuẩn bị hành trình…
        </>
      ) : error ? (
        <>
          <AlertCircle />
          <p>{error}</p>
          {retry && (
            <Button variant="outline" onClick={retry}>
              Thử lại
            </Button>
          )}
        </>
      ) : (
        <>
          <Sparkles />
          <p>{empty ?? "Chưa có nội dung."}</p>
        </>
      )}
    </div>
  );
}
export const modeNames: Record<string, string> = {
  theory: "Lý thuyết",
  drag: "Kéo thả",
  memory: "Tự gõ",
  challenge: "Viết code",
};
export const Icons = {
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  Code2,
  Flame,
  LockKeyhole,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
};
export function Avatar({
  name = "robot",
  size = 44,
}: {
  name?: string;
  size?: number;
}) {
  const Icon =
    name === "cat"
      ? Cat
      : name === "rocket"
        ? Rocket
        : name === "fox"
          ? Flame
          : name === "dragon"
            ? Sparkles
            : name === "astronaut"
              ? Star
              : Bot;
  return (
    <span
      className={`avatar avatar-${name}`}
      style={{ width: size, height: size }}
    >
      <Icon size={size * 0.55} />
    </span>
  );
}
export function Robot({ small = false }: { small?: boolean }) {
  return (
    <svg
      className={small ? "robot-small" : "robot-mascot"}
      viewBox="0 0 360 380"
      role="img"
      aria-label="Kiki, robot đồng hành học lập trình"
    >
      <defs>
        <linearGradient id="body" x2="1" y2="1">
          <stop stopColor="#fff" />
          <stop offset="1" stopColor="#dce5ff" />
        </linearGradient>
        <linearGradient id="face" x2="1" y2="1">
          <stop stopColor="#25285e" />
          <stop offset="1" stopColor="#3c4382" />
        </linearGradient>
      </defs>
      <ellipse
        cx="181"
        cy="350"
        rx="106"
        ry="17"
        fill="#6366f1"
        opacity=".12"
      />
      <path
        d="M93 227 Q35 222 48 177"
        stroke="#a5b4fc"
        strokeWidth="22"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M267 227 Q314 213 308 170"
        stroke="#a5b4fc"
        strokeWidth="22"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="48" cy="167" r="18" fill="url(#body)" />
      <circle cx="306" cy="159" r="18" fill="url(#body)" />
      <rect x="137" y="291" width="33" height="48" rx="14" fill="#c7d2fe" />
      <rect x="192" y="291" width="33" height="48" rx="14" fill="#c7d2fe" />
      <rect x="127" y="323" width="52" height="20" rx="10" fill="#818cf8" />
      <rect x="183" y="323" width="52" height="20" rx="10" fill="#818cf8" />
      <rect
        x="101"
        y="201"
        width="160"
        height="113"
        rx="42"
        fill="url(#body)"
        stroke="#c7d2fe"
        strokeWidth="3"
      />
      <path
        d="M170 249 l-14 10 14 10 M192 249 l14 10-14 10"
        stroke="#6366f1"
        strokeWidth="7"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M187 244 l-10 30" stroke="#6366f1" strokeWidth="5" />
      <rect x="164" y="69" width="32" height="32" rx="10" fill="#c7d2fe" />
      <path d="M180 70 V49" stroke="#818cf8" strokeWidth="7" />
      <circle cx="180" cy="39" r="13" fill="#fbbf24" />
      <rect x="66" y="113" width="23" height="63" rx="11" fill="#818cf8" />
      <rect x="273" y="113" width="23" height="63" rx="11" fill="#818cf8" />
      <rect
        x="82"
        y="87"
        width="196"
        height="130"
        rx="42"
        fill="url(#body)"
        stroke="#c7d2fe"
        strokeWidth="3"
      />
      <rect x="104" y="111" width="152" height="83" rx="27" fill="url(#face)" />
      <path
        d="M130 146 Q143 131 156 146 M203 146 Q216 131 230 146"
        stroke="#67e8f9"
        strokeWidth="7"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M166 161 Q181 180 197 161"
        stroke="#67e8f9"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx="129" cy="167" rx="10" ry="5" fill="#fb7185" opacity=".6" />
      <ellipse cx="231" cy="167" rx="10" ry="5" fill="#fb7185" opacity=".6" />
      <path
        d="M318 62 l4 10 11 1-8 7 2 11-9-5-9 5 2-11-8-7 11-1z M33 262 l4 10 11 1-8 7 2 11-9-5-9 5 2-11-8-7 11-1z"
        fill="#fbbf24"
      />
    </svg>
  );
}
export function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="code-block">
      <code>
        {code
          .split(
            /("[^"\n]*"|'[^'\n]*'|\b(?:print|input|int|str|len|range|list|map|if|else|for|while|def|return|in)\b|\b\d+\b|#[^\n]*)/g,
          )
          .map((p, i) => (
            <span
              key={i}
              className={
                p.startsWith("#")
                  ? "syntax-comment"
                  : /^['"]/.test(p)
                    ? "syntax-string"
                    : /^\d+$/.test(p)
                      ? "syntax-number"
                      : /^(print|input|int|str|len|range|list|map|if|else|for|while|def|return|in)$/.test(
                            p,
                          )
                        ? "syntax-keyword"
                        : ""
              }
            >
              {p}
            </span>
          ))}
      </code>
    </pre>
  );
}
