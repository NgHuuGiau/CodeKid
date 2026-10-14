import confetti from "canvas-confetti";

export function fireConfetti() {
  try {
    // Left burst
    confetti({
      particleCount: 40,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: ["#6366f1", "#ec4899", "#3b82f6", "#10b981", "#f59e0b"],
    });
    // Right burst
    confetti({
      particleCount: 40,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: ["#6366f1", "#ec4899", "#3b82f6", "#10b981", "#f59e0b"],
    });
  } catch {
    // Graceful fallback if canvas is unsupported
  }
}

export function fireStars() {
  try {
    confetti({
      particleCount: 30,
      spread: 360,
      startVelocity: 25,
      origin: { x: 0.5, y: 0.5 },
      shapes: ["star"],
      colors: ["#f59e0b", "#fbbf24", "#e11d48", "#6366f1", "#06b6d4"],
    });
  } catch {
    // Graceful fallback
  }
}

export function fireLevelUp() {
  try {
    const end = Date.now() + 1000;
    const interval: ReturnType<typeof setInterval> = setInterval(() => {
      if (Date.now() > end) {
        clearInterval(interval);
        return;
      }
      confetti({
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        origin: { x: Math.random(), y: Math.random() - 0.2 },
        colors: ["#8b5cf6", "#ec4899", "#10b981", "#f59e0b", "#3b82f6"],
      });
    }, 200);
  } catch {
    // Graceful fallback
  }
}
