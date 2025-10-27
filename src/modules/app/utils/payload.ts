export const parsePropositionPayload = (payload: string): string[] => {
  try {
    const parsed = JSON.parse(payload);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item));
    }
    if (typeof parsed === "object" && parsed !== null) {
      const bag = parsed as Record<string, unknown>;
      if (Array.isArray(bag.statements)) {
        return bag.statements.map((item) => String(item));
      }
    }
  } catch (error) {
    // ignore, fallback below
  }

  const cleaned = payload
    .replace(/\r/g, "")
    .split(/\n{2,}|\n-+\n|\n\d+\)|\d+\.\s/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  if (cleaned.length >= 3) {
    return cleaned.slice(0, 3);
  }

  return [payload];
};

export const parseAnalyticalPayload = (payload: string): string => {
  try {
    const parsed = JSON.parse(payload);
    if (typeof parsed === "string") {
      return parsed;
    }
    if (typeof parsed === "object" && parsed !== null) {
      const bag = parsed as Record<string, unknown>;
      if (typeof bag.exercise === "string") {
        return bag.exercise;
      }
    }
  } catch (error) {
    // ignore
  }
  return payload;
};
