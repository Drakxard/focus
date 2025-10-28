export type AttemptStatus =
  | "draft"
  | "submitted"
  | "analyzing"
  | "reviewed"
  | "exercise_generated"
  | "answered";

export interface AttemptFeedbackError {
  id: string;
  point: string;
  counterexample: string;
}

export interface AttemptFeedback {
  feedbackId: string;
  attemptId: string;
  summary: string;
  errors: AttemptFeedbackError[];
  suggestion: string;
  model: string;
  raw: string;
  source: "model" | "manual";
  createdAt: string;
  version: number;
}

export type ExerciseType = "analitico" | "proposicion";

export interface ExercisePayload {
  exerciseId: string;
  attemptId: string;
  type: ExerciseType;
  payload: string;
  createdAt: string;
  model: string;
}

export interface AttemptVersion {
  version: number;
  content: string;
  createdAt: string;
  exerciseId?: string;
  type: "initial" | "exercise" | "feedback";
}

export interface Attempt {
  attemptId: string;
  topicId: string;
  themeId: string;
  status: AttemptStatus;
  latestVersion: number;
  versions: AttemptVersion[];
  feedbackHistory: AttemptFeedback[];
  pendingExercise?: ExercisePayload;
  cycles: number;
  createdAt: string;
  updatedAt: string;
}

export interface Theme {
  themeId: string;
  topicId: string;
  title: string;
  attempts: Attempt[];
  createdAt: string;
  updatedAt: string;
}

export interface Topic {
  topicId: string;
  userId: string;
  subject: string;
  themes: Theme[];
  createdAt: string;
  updatedAt: string;
}

export interface AppMetadata {
  userId: string;
  topics: Topic[];
}

export type AutosaveStatus = "idle" | "guardando" | "guardado" | "error";

export interface ApiModel {
  id: string;
  contextLength?: number;
  description?: string;
}

export type PropositionPromptKind = "initial" | "reciprocal" | "inverse" | "contraReciprocal";

export type PropositionPrompts = Record<PropositionPromptKind, string>;

export interface SettingsState {
  apiKey: string;
  selectedModel: string;
  availableModels: ApiModel[];
  status: "idle" | "loading" | "error";
  error?: string;
  propositionPrompts: PropositionPrompts;
  themeMode: "dark" | "light";
}

export interface PromptBundle {
  prompt: string;
  context: string;
}
