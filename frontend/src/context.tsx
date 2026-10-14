import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError, resetCsrf } from "./api";
import type { User } from "./types";
const Auth = createContext<{
  user: User | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}>(null!);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      setUser(await api<User>("/auth/me"));
      setError("");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setUser(null);
        setError("");
      } else setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  async function login(email: string, password: string) {
    const u = await api<User>("/auth/login", "POST", { email, password });
    resetCsrf();
    setUser(u);
    setError("");
    return u;
  }
  async function logout() {
    await api("/auth/logout", "POST", {});
    resetCsrf();
    setUser(null);
  }
  return (
    <Auth.Provider value={{ user, loading, error, refresh, login, logout }}>
      {children}
    </Auth.Provider>
  );
}
export const useAuth = () => useContext(Auth);
const Preferences = createContext<{
  dark: boolean;
  sound: boolean;
  toggleDark: () => void;
  toggleSound: () => void;
}>(null!);
function saved(key: string, fallback: boolean) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value === "true";
  } catch {
    return fallback;
  }
}
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(() =>
    saved("codekid-dark", matchMedia("(prefers-color-scheme: dark)").matches),
  );
  const [sound, setSound] = useState(() => saved("codekid-sound", false));
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    try {
      localStorage.setItem("codekid-dark", String(dark));
      localStorage.setItem("codekid-sound", String(sound));
    } catch {
      /* Storage can be disabled by the browser. */
    }
  }, [dark, sound]);
  return (
    <Preferences.Provider
      value={{
        dark,
        sound,
        toggleDark: () => setDark((x) => !x),
        toggleSound: () => setSound((x) => !x),
      }}
    >
      {children}
    </Preferences.Provider>
  );
}
export const usePreferences = () => useContext(Preferences);
export function playSound(correct: boolean) {
  try {
    const audio = new AudioContext();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.frequency.value = correct ? 660 : 240;
    gain.gain.setValueAtTime(0.07, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.18);
    osc.start();
    osc.stop(audio.currentTime + 0.18);
    osc.onended = () => {
      void audio.close();
    };
  } catch {
    /* Optional sound is unavailable on some devices. */
  }
}
