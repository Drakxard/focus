import { useEffect } from "react";
import { useAppStore } from "../state/appStore";
import { AutosaveStatus } from "../types";

const AUTOSAVE_DELAY = 600;

export const useAutosaveList = (draftId: string, payload: unknown) => {
  const drafts = useAppStore((state) => state.drafts);
  const setDraftValue = useAppStore((state) => state.setDraftValue);
  const setDraftStatus = useAppStore((state) => state.setDraftStatus);
  const status: AutosaveStatus = drafts[draftId]?.status ?? "idle";
  const error = drafts[draftId]?.error;

  useEffect(() => {
    const serialized = JSON.stringify(payload);
    setDraftValue(draftId, serialized);
    setDraftStatus(draftId, "guardando");
    const timer = window.setTimeout(() => {
      setDraftStatus(draftId, "guardado");
    }, AUTOSAVE_DELAY);
    return () => window.clearTimeout(timer);
  }, [draftId, payload, setDraftStatus, setDraftValue]);

  return { status, error };
};
