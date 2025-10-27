import { AutosaveStatus } from "../types";
import "./status-badge.css";

interface StatusBadgeProps {
  status: AutosaveStatus;
}

const LABELS: Record<AutosaveStatus, string> = {
  idle: "Sin cambios",
  guardando: "Guardando…",
  guardado: "Guardado",
  error: "Error",
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  return <span className={`status-badge status-badge--${status}`}>{LABELS[status]}</span>;
};
