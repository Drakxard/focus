import { useEffect, useState } from "react";
import { AutosaveStatus } from "../types";
import { useAppStore } from "../state/appStore";

const AUTOSAVE_DELAY = 600;

export const useAutosaveDraft = (draftId: string, initialValue = "") => {
  const draft = useAppStore((state) => state.drafts[draftId]);
  const setDraftValue = useAppStore((state) => state.setDraftValue);
  const setDraftStatus = useAppStore((state) => state.setDraftStatus);
  const clearDraft = useAppStore((state) => state.clearDraft);

  const [value, setValue] = useState(() => draft?.value ?? initialValue);
  const status: AutosaveStatus = draft?.status ?? "idle";
  const error = draft?.error;

  useEffect(() => {
    if (draft && draft.value !== value) {
      setValue(draft.value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.value]);

  useEffect(() => {
    setDraftValue(draftId, value);
    setDraftStatus(draftId, "guardando");
    const timer = window.setTimeout(() => {
      setDraftStatus(draftId, "guardado");
    }, AUTOSAVE_DELAY);
    return () => window.clearTimeout(timer);
  }, [draftId, setDraftStatus, setDraftValue, value]);

  return {
    value,
    setValue,
    status,
    error,
    clear: () => clearDraft(draftId),
  };
};
