import { useMemo } from "react";
import { useAppStore } from "../state/appStore";

const LABELS: Record<"light" | "dark", { title: string; short: string; icon: string }> = {
  light: { title: "Tema claro", short: "Claro", icon: "☀️" },
  dark: { title: "Tema oscuro", short: "Oscuro", icon: "🌙" },
};

export const ThemeToggle = () => {
  const themeMode = useAppStore((state) => state.settings.themeMode ?? "dark");
  const setThemeMode = useAppStore((state) => state.setThemeMode);

  const nextMode = useMemo<"light" | "dark">(() => (themeMode === "light" ? "dark" : "light"), [themeMode]);

  const label = LABELS[themeMode];
  const nextLabel = LABELS[nextMode];

  return (
    <button
      type="button"
      className="ghost theme-toggle"
      onClick={() => setThemeMode(nextMode)}
      aria-label={`Cambiar a ${nextLabel.title}`}
      title={nextLabel.title}
    >
      <span aria-hidden="true">{nextLabel.icon}</span>
      <span>{label.short}</span>
    </button>
  );
};

