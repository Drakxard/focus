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

  const normalized = payload.replace(/\r/g, "");
  const stripPrefix = (line: string) =>
    line.replace(/^\s*(?:[-*•]\s+|(?:\d+|[a-z]|[ivxlcdm]+)[\.\)\]]\s+)/i, "").trim();

  const fromNewLines = Array.from(
    new Set(
      normalized
        .split(/\n+/)
        .map((line) => stripPrefix(line))
        .filter(Boolean)
    )
  );

  if (fromNewLines.length >= 3) {
    return fromNewLines.slice(0, 3);
  }

  const fromSemicolons = Array.from(
    new Set(
      normalized
        .split(/\s*;\s*/)
        .map((fragment) => stripPrefix(fragment))
        .filter(Boolean)
    )
  );

  if (fromSemicolons.length >= 3) {
    return fromSemicolons.slice(0, 3);
  }

  if (fromNewLines.length) {
    return fromNewLines;
  }

  if (fromSemicolons.length) {
    return fromSemicolons;
  }

  const trimmed = normalized.trim();
  return trimmed ? [trimmed] : [];
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
