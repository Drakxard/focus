import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  Attempt,
  AttemptFeedback,
  AttemptStatus,
  AttemptVersion,
  AutosaveStatus,
  ExercisePayload,
  PropositionPromptKind,
  PropositionPrompts,
  SettingsState,
  Theme,
  Topic,
} from "../types";

const makeTimestamp = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();

interface DraftState {
  value: string;
  status: AutosaveStatus;
  error?: string;
  updatedAt: string;
}

interface AppState {
  userId: string;
  topics: Topic[];
  drafts: Record<string, DraftState>;
  settings: SettingsState;
  setDraftValue: (id: string, value: string) => void;
  setDraftStatus: (id: string, status: AutosaveStatus, error?: string) => void;
  clearDraft: (id: string) => void;
  upsertTopic: (subject: string, topicId?: string) => Topic;
  addTheme: (topicId: string, title: string) => Theme;
  updateThemeTitle: (topicId: string, themeId: string, title: string) => void;
  removeTheme: (topicId: string, themeId: string) => void;
  deleteTopic: (topicId: string) => void;
  createAttempt: (params: { topicId: string; themeId: string; content: string }) => Attempt;
  pushAttemptVersion: (params: {
    attemptId: string;
    content: string;
    type: AttemptVersion["type"];
    exerciseId?: string;
  }) => Attempt | undefined;
  setAttemptStatus: (attemptId: string, status: AttemptStatus) => void;
  attachFeedback: (feedback: AttemptFeedback) => void;
  setPendingExercise: (attemptId: string, exercise: ExercisePayload | undefined) => void;
  incrementAttemptCycle: (attemptId: string) => void;
  setApiKey: (apiKey: string) => void;
  setAvailableModels: (models: SettingsState["availableModels"]) => void;
  setSelectedModel: (modelId: string) => void;
  setSettingsStatus: (status: SettingsState["status"], error?: string) => void;
  setPropositionPrompt: (kind: PropositionPromptKind, prompt: string) => void;
  setLatexFontScale: (scale: number) => void;
  exportTopic: (topicId: string) => string | null;
  setThemeMode: (mode: SettingsState["themeMode"]) => void;
}

export const DEFAULT_PROPOSITION_PROMPTS: PropositionPrompts = {
  initial:
    "Toma este texto y genera una proposicion clara y critica. Conserva exactamente cualquier LaTeX presente. Devuelve solo la proposicion.\n\n{{condicion}}",
  reciprocal:
    "Identifica hipotesis y tesis. Forma la reciproca intercambiando hipotesis y tesis (q -> p), cambiando lo minimo. Manten el LaTeX intacto. Devuelve solo la proposicion.\n\n{{condicion}}",
  inverse:
    "Identifica hipotesis y tesis. Forma el inverso (~p -> ~q), cambiando lo minimo. Manten el LaTeX intacto. Devuelve solo la proposicion.\n\n{{condicion}}",
  contraReciprocal:
    "Identifica hipotesis y tesis. Forma la contra-reciproca (~q -> ~p), cambiando lo minimo. Manten el LaTeX intacto. Devuelve solo la proposicion.\n\n{{condicion}}",
};

const initialSettings: SettingsState = {
  apiKey: import.meta.env.GROQ_API_KEY ?? "",
  selectedModel: "",
  availableModels: [],
  status: "idle",
  propositionPrompts: { ...DEFAULT_PROPOSITION_PROMPTS },
  themeMode: "dark",
  latexFontScale: 1,
};

const findAttempt = (topics: Topic[], attemptId: string): { attempt: Attempt; theme: Theme; topic: Topic } | null => {
  for (const topic of topics) {
    for (const theme of topic.themes) {
      const attempt = theme.attempts.find((item) => item.attemptId === attemptId);
      if (attempt) {
        return { attempt, theme, topic };
      }
    }
  }
  return null;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      userId: "user-local",
      topics: [],
      drafts: {},
      settings: initialSettings,
      setDraftValue: (id, value) => {
        set((state) => ({
          drafts: {
            ...state.drafts,
            [id]: {
              value,
              status: "guardando",
              updatedAt: makeTimestamp(),
              error: undefined,
            },
          },
        }));
      },
      setDraftStatus: (id, status, error) => {
        set((state) => ({
          drafts: {
            ...state.drafts,
            [id]: {
              ...(state.drafts[id] ?? { value: "", updatedAt: makeTimestamp() }),
              status,
              error,
              updatedAt: makeTimestamp(),
            },
          },
        }));
      },
      clearDraft: (id) => {
        set((state) => {
          const next = { ...state.drafts };
          delete next[id];
          return { drafts: next };
        });
      },
      upsertTopic: (subject, topicId) => {
        let createdTopic: Topic | undefined;
        set((state) => {
          const now = makeTimestamp();
          if (topicId) {
            return {
              topics: state.topics.map((topic) =>
                topic.topicId === topicId
                  ? {
                      ...topic,
                      subject,
                      updatedAt: now,
                    }
                  : topic
              ),
            };
          }

          createdTopic = {
            topicId: uuid(),
            userId: state.userId,
            subject,
            themes: [],
            createdAt: now,
            updatedAt: now,
          };

          return {
            topics: [createdTopic, ...state.topics],
          };
        });

        return createdTopic ?? get().topics.find((topic) => topic.topicId === topicId)!;
      },
      addTheme: (topicId, title) => {
        let createdTheme: Theme | undefined;
        set((state) => {
          const now = makeTimestamp();
          return {
            topics: state.topics.map((topic) => {
              if (topic.topicId !== topicId) return topic;
              const nextTheme: Theme = {
                themeId: uuid(),
                topicId,
                title,
                attempts: [],
                createdAt: now,
                updatedAt: now,
              };
              createdTheme = nextTheme;
              return {
                ...topic,
                themes: [...topic.themes, nextTheme],
                updatedAt: now,
              };
            }),
          };
        });

        if (!createdTheme) {
          throw new Error("No se cre├│ el tema");
        }
        return createdTheme;
      },
      updateThemeTitle: (topicId, themeId, title) => {
        set((state) => ({
          topics: state.topics.map((topic) => {
            if (topic.topicId !== topicId) return topic;
            return {
              ...topic,
              themes: topic.themes.map((theme) =>
                theme.themeId === themeId
                  ? {
                      ...theme,
                      title,
                      updatedAt: makeTimestamp(),
                    }
                  : theme
              ),
              updatedAt: makeTimestamp(),
            };
          }),
        }));
      },
      createAttempt: ({ topicId, themeId, content }) => {
        let createdAttempt: Attempt | undefined;
        set((state) => ({
          topics: state.topics.map((topic) => {
            if (topic.topicId !== topicId) return topic;
            return {
              ...topic,
              themes: topic.themes.map((theme) => {
                if (theme.themeId !== themeId) return theme;
                const now = makeTimestamp();
                const attempt: Attempt = {
                  attemptId: uuid(),
                  topicId,
                  themeId,
                  status: "submitted",
                  latestVersion: 1,
                  versions: [
                    {
                      version: 1,
                      content,
                      createdAt: now,
                      type: "initial",
                    },
                  ],
                  feedbackHistory: [],
                  pendingExercise: undefined,
                  cycles: 0,
                  createdAt: now,
                  updatedAt: now,
                };
                createdAttempt = attempt;
                return {
                  ...theme,
                  attempts: [attempt, ...theme.attempts],
                  updatedAt: now,
                };
              }),
              updatedAt: makeTimestamp(),
            };
          }),
        }));

        if (!createdAttempt) {
          throw new Error("No se cre├│ el attempt");
        }
        return createdAttempt;
      },
      pushAttemptVersion: ({ attemptId, content, type, exerciseId }) => {
        let nextAttempt: Attempt | undefined;
        set((state) => ({
          topics: state.topics.map((topic) => ({
            ...topic,
            themes: topic.themes.map((theme) => ({
              ...theme,
              attempts: theme.attempts.map((attempt) => {
                if (attempt.attemptId !== attemptId) return attempt;
                const now = makeTimestamp();
                const version: AttemptVersion = {
                  version: attempt.latestVersion + 1,
                  content,
                  createdAt: now,
                  exerciseId,
                  type,
                };
                const next: Attempt = {
                  ...attempt,
                  latestVersion: version.version,
                  versions: [version, ...attempt.versions],
                  updatedAt: now,
                };
                nextAttempt = next;
                return next;
              }),
            })),
          })),
        }));
        return nextAttempt;
      },
      setAttemptStatus: (attemptId, status) => {
        set((state) => ({
          topics: state.topics.map((topic) => ({
            ...topic,
            themes: topic.themes.map((theme) => ({
              ...theme,
              attempts: theme.attempts.map((attempt) =>
                attempt.attemptId === attemptId
                  ? {
                      ...attempt,
                      status,
                      updatedAt: makeTimestamp(),
                    }
                  : attempt
              ),
            })),
          })),
        }));
      },
      attachFeedback: (feedback) => {
        set((state) => ({
          topics: state.topics.map((topic) => ({
            ...topic,
            themes: topic.themes.map((theme) => ({
              ...theme,
              attempts: theme.attempts.map((attempt) => {
                if (attempt.attemptId !== feedback.attemptId) return attempt;
                return {
                  ...attempt,
                  feedbackHistory: [feedback, ...attempt.feedbackHistory],
                  updatedAt: makeTimestamp(),
                  status: "reviewed",
                };
              }),
            })),
          })),
        }));
      },
      setPendingExercise: (attemptId, exercise) => {
        set((state) => ({
          topics: state.topics.map((topic) => ({
            ...topic,
            themes: topic.themes.map((theme) => ({
              ...theme,
              attempts: theme.attempts.map((attempt) =>
                attempt.attemptId === attemptId
                  ? {
                      ...attempt,
                      pendingExercise: exercise,
                      status: exercise ? "exercise_generated" : attempt.status,
                      updatedAt: makeTimestamp(),
                    }
                  : attempt
              ),
            })),
          })),
        }));
      },
      incrementAttemptCycle: (attemptId) => {
        set((state) => ({
          topics: state.topics.map((topic) => ({
            ...topic,
            themes: topic.themes.map((theme) => ({
              ...theme,
              attempts: theme.attempts.map((attempt) =>
                attempt.attemptId === attemptId
                  ? {
                      ...attempt,
                      cycles: attempt.cycles + 1,
                      updatedAt: makeTimestamp(),
                    }
                  : attempt
              ),
            })),
          })),
        }));
      },
      setApiKey: (apiKey) => {
        set((state) => ({
          settings: {
            ...state.settings,
            apiKey,
          },
        }));
      },
      setAvailableModels: (availableModels) => {
        set((state) => ({
          settings: {
            ...state.settings,
            availableModels,
          },
        }));
      },
      setSelectedModel: (selectedModel) => {
        set((state) => ({
          settings: {
            ...state.settings,
            selectedModel,
          },
        }));
      },
      setSettingsStatus: (status, error) => {
        set((state) => ({
          settings: {
            ...state.settings,
            status,
            error,
          },
        }));
      },
      removeTheme: (topicId, themeId) => {
        set((state) => {
          let removed = false;
          const topics = state.topics.map((topic) => {
            if (topic.topicId !== topicId) return topic;
            const nextThemes = topic.themes.filter((theme) => {
              if (theme.themeId === themeId) {
                removed = true;
                return false;
              }
              return true;
            });
            if (!removed) return topic;
            return {
              ...topic,
              themes: nextThemes,
              updatedAt: makeTimestamp(),
            };
          });
          if (!removed) {
            return { topics: state.topics };
          }
          return { topics };
        });
      },
      deleteTopic: (topicId) => {
        set((state) => ({
          topics: state.topics.filter((topic) => topic.topicId !== topicId),
        }));
      },
      setPropositionPrompt: (kind, prompt) => {
        set((state) => ({
          settings: {
            ...state.settings,
            propositionPrompts: {
              ...(state.settings.propositionPrompts ?? DEFAULT_PROPOSITION_PROMPTS),
              [kind]: prompt,
            },
          },
        }));
      },
      setLatexFontScale: (scale) => {
        const normalized = Number.isFinite(scale) ? Math.min(2, Math.max(0.6, scale)) : 1;
        set((state) => ({
          settings: {
            ...state.settings,
            latexFontScale: normalized,
          },
        }));
      },
      setThemeMode: (mode) => {
        set((state) => ({
          settings: {
            ...state.settings,
            themeMode: mode,
          },
        }));
      },
      exportTopic: (topicId) => {
        const { topics } = get();
        const topic = topics.find((t) => t.topicId === topicId);
        if (!topic) return null;
        const data = {
          topicId: topic.topicId,
          subject: topic.subject,
          userId: topic.userId,
          createdAt: topic.createdAt,
          updatedAt: topic.updatedAt,
          themes: topic.themes.map((theme) => ({
            themeId: theme.themeId,
            title: theme.title,
            createdAt: theme.createdAt,
            updatedAt: theme.updatedAt,
            attempts: theme.attempts.map((attempt) => ({
              attemptId: attempt.attemptId,
              status: attempt.status,
              latestVersion: attempt.latestVersion,
              cycles: attempt.cycles,
              createdAt: attempt.createdAt,
              updatedAt: attempt.updatedAt,
              versions: attempt.versions,
              feedbackHistory: attempt.feedbackHistory,
              pendingExercise: attempt.pendingExercise,
            })),
          })),
        };
        return JSON.stringify(data, null, 2);
      },
    }),
    {
      name: "focus-app-state",
      version: 1,
      partialize: (state) => ({
        userId: state.userId,
        topics: state.topics,
        drafts: state.drafts,
        settings: state.settings,
      }),
    }
  )
);

export const getAttempt = (attemptId: string) => findAttempt(useAppStore.getState().topics, attemptId);





