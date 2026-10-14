export interface User {
  id: string;
  email: string;
  nickname: string;
  avatar: string;
  ageBand: string;
  leaderboardOptIn: boolean;
  xp: number;
  level: number;
  roles: string[];
}
export interface Language {
  id: number;
  name: string;
  slug: string;
  description: string;
  color: string;
  difficulty: string;
  available: boolean;
  lessons: number;
  completed: number;
}
export interface Course {
  id: number;
  title: string;
  description: string;
  language: string;
  color?: string;
  lessons?: number;
  total?: number;
  completed?: number;
}
export interface Progress {
  lessonId: number;
  theory: boolean;
  drag: boolean;
  memory: boolean;
  challenge: boolean;
}
export interface RoadmapLesson {
  id: number;
  title: string;
  position: number;
  chapter: string;
  open: boolean;
  progress: Progress | null;
}
export interface Roadmap extends Omit<Course, "lessons"> {
  lessons: RoadmapLesson[];
}
export interface Lesson {
  id: number;
  title: string;
  position: number;
  courseId: number;
  content: {
    objectives: string;
    explanation: string;
    example: string;
    notes: string;
    quiz: string;
    quizOptions: string[];
  };
  video: { url: string; title: string } | null;
  progress: Progress | null;
  exercises: { id: number; mode: string; level: number }[];
  challengeId: number;
}
export interface Badge {
  id: number;
  title: string;
  description: string;
  icon: string;
  requiredXp: number;
  earned: boolean;
}
export interface Dashboard {
  progress: Progress[];
  history: {
    id: number;
    mode: string;
    score: number;
    createdAt: string;
    lessonId: number;
    lessonTitle: string;
  }[];
  badges: Badge[];
  courses: Course[];
  tasks: { title: string; done: boolean }[];
}
export interface Exercise {
  id: number;
  lessonId: number;
  mode: string;
  prompt: string;
  template: string;
  level: number;
  xp: number;
  blanks: { position: number; hints: string[] }[];
  options: { id: number; value: string }[] | null;
  attempts: number;
}
export interface CheckResult {
  score: number;
  correctPositions: number[];
  passed: boolean;
  xp: number;
  attempts: number;
}
export interface Challenge {
  id: number;
  lessonId: number;
  title: string;
  description: string;
  starterCode: string;
  xp: number;
  tests: { input: string; expected: string }[];
  totalTests: number;
}
export interface CodeResult {
  submissionId: number;
  score: number;
  passed: boolean;
  xp: number;
  practice: boolean;
  results: {
    passed: boolean;
    output: string;
    error: string;
    sample: boolean;
  }[];
}
