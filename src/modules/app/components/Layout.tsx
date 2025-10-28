import { ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";
import "./layout.css";

interface AppShellProps {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}

export const AppShell = ({ title, subtitle, left, right, children }: AppShellProps) => {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__slot">{left}</div>
        <div className="app-shell__titles">
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <div className="app-shell__slot app-shell__slot--right">
          <ThemeToggle />
          {right}
        </div>
      </header>
      <main className="app-shell__content">{children}</main>
    </div>
  );
};
