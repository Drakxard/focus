import { useCallback, useEffect, useMemo, useState } from "react";



import { DEFAULT_PROPOSITION_PROMPTS, useAppStore } from "./state/appStore";



import { SubjectPage } from "./pages/SubjectPage";



import { ThemesPage } from "./pages/ThemesPage";



import { HomePage } from "./pages/HomePage";



import { ThemeAttemptPage } from "./pages/ThemeAttemptPage";



import { AnalyzingPage } from "./pages/AnalyzingPage";



import { FeedbackPage } from "./pages/FeedbackPage";



import { ConceptPage } from "./pages/ConceptPage";



import { ExerciseAnalyticalPage } from "./pages/ExerciseAnalyticalPage";



import { ExercisePropositionPage } from "./pages/ExercisePropositionPage";



import { Attempt, AttemptFeedback, ExercisePayload, PromptBundle, Theme, Topic } from "./types";



import {
  buildAnalyticalExercisePrompt,
  buildConceptPrompt,
  buildFeedbackPrompt,
} from "./services/promptBuilder";
import { parseExerciseJson, parseFeedbackJson } from "./services/validators";
import {
  requestConcept,
  requestExercise,
  requestFeedback,
  listGroqModels,
  requestPropositionText,
} from "./services/groqService";


import { SettingsModal } from "./components/SettingsModal";







const MAX_RETRIES = 1;

const MAX_CYCLES = 5;

const PROPOSITION_VARIANTS = [
  { kind: "reciprocal", label: "reciproco" },
  { kind: "inverse", label: "inverso" },
  { kind: "contraReciprocal", label: "contra-reciproco" },
] as const;

type PropositionVariantKind = (typeof PROPOSITION_VARIANTS)[number]["kind"];

const replaceConditionPlaceholder = (template: string, condition: string) => {
  const marker = /{{\s*condicion\s*}}/gi;
  if (template.match(marker)) {
    return template.replace(marker, condition);
  }
  const trimmed = template.trim();
  if (!trimmed) {
    return condition;
  }
  return `${trimmed}\n\n${condition}`;
};

const buildCritiqueForPrompt = (feedback: AttemptFeedback) => {
  const lines = [
    `Resumen: ${feedback.summary}`,
    `Sugerencia: ${feedback.suggestion}`,
  ];
  if (feedback.errors.length) {
    lines.push("Errores:");
    feedback.errors.forEach((error, index) => {
      lines.push(`${index + 1}. ${error.point} -> ${error.counterexample}`);
    });
  }
  return lines.join("\n");
};

const makeExerciseId = () => {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch (error) {
    // ignore
  }
  return `exercise-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

type Route =



  | { name: "home" }



  | { name: "subject"; topicId?: string }



  | { name: "themes"; topicId: string }



  | { name: "attempt"; topicId: string; themeId: string }



  | { name: "analyzing"; attemptId: string; prompt: PromptBundle; retries: number }



  | { name: "feedback"; attemptId: string; raw: string; model: string }



  | { name: "concept"; attemptId: string; feedbackId: string }



  | { name: "exercise-analytical"; attemptId: string; exercise: ExercisePayload }



  | { name: "exercise-proposition"; attemptId: string; exercise: ExercisePayload };







interface ConceptState {



  text: string;



  loading: boolean;



  error?: string;



}







const DEFAULT_CONCEPT: ConceptState = { text: "", loading: false };







const findTheme = (topic: Topic | undefined, themeId: string): Theme | undefined =>



  topic?.themes.find((theme) => theme.themeId === themeId);







const findAttemptGlobal = (topics: Topic[], attemptId: string): { topic: Topic; theme: Theme; attempt: Attempt } | null => {



  for (const topic of topics) {



    for (const theme of topic.themes) {



      const attempt = theme.attempts.find((item) => item.attemptId === attemptId);



      if (attempt) {



        return { topic, theme, attempt };



      }



    }



  }



  return null;



};







const copyToClipboard = async (text: string) => {



  if (navigator.clipboard) {



    await navigator.clipboard.writeText(text);



    return;



  }



  const textarea = document.createElement("textarea");



  textarea.value = text;



  document.body.appendChild(textarea);



  textarea.select();



  document.execCommand("copy");



  document.body.removeChild(textarea);



};







export const App = () => {



  const topics = useAppStore((state) => state.topics);



  const upsertTopic = useAppStore((state) => state.upsertTopic);



  const addTheme = useAppStore((state) => state.addTheme);



  const createAttempt = useAppStore((state) => state.createAttempt);



  const pushAttemptVersion = useAppStore((state) => state.pushAttemptVersion);



  const setAttemptStatus = useAppStore((state) => state.setAttemptStatus);



  const attachFeedback = useAppStore((state) => state.attachFeedback);



  const incrementAttemptCycle = useAppStore((state) => state.incrementAttemptCycle);



  const setPendingExercise = useAppStore((state) => state.setPendingExercise);



  const exportTopic = useAppStore((state) => state.exportTopic);



  const clearDraft = useAppStore((state) => state.clearDraft);



  const drafts = useAppStore((state) => state.drafts);



  const settings = useAppStore((state) => state.settings);



  const setApiKey = useAppStore((state) => state.setApiKey);



  const setAvailableModels = useAppStore((state) => state.setAvailableModels);



  const setSelectedModel = useAppStore((state) => state.setSelectedModel);



  const setSettingsStatus = useAppStore((state) => state.setSettingsStatus);




  const setPropositionPrompt = useAppStore((state) => state.setPropositionPrompt);







  const [history, setHistory] = useState<Route[]>([{ name: "home" }]);



  const [conceptCache, setConceptCache] = useState<Record<string, ConceptState>>({});



  const [settingsOpen, setSettingsOpen] = useState(false);



  const [analysisError, setAnalysisError] = useState<string | null>(null);



  const [toast, setToast] = useState<{ message: string; tone: "info" | "error" } | null>(null);







  const currentRoute = history[history.length - 1];







  const goBack = useCallback(() => {



    setHistory((previous) => (previous.length > 1 ? previous.slice(0, -1) : previous));



  }, []);







  const pushRoute = useCallback((route: Route) => {



    setHistory((previous) => [...previous, route]);



  }, []);







  const replaceRoute = useCallback((route: Route) => {



    setHistory((previous) => [...previous.slice(0, -1), route]);



  }, []);







  const goHome = useCallback(() => {



    setHistory([{ name: "home" }]);



  }, []);







  const topicMap = useMemo(() => {



    const map = new Map<string, Topic>();



    for (const topic of topics) {



      map.set(topic.topicId, topic);



    }



    return map;



  }, [topics]);







  const conceptRouteState = useMemo(() => {



    if (currentRoute.name !== "concept") return null;



    const attemptData = findAttemptGlobal(topics, currentRoute.attemptId);



    if (!attemptData) return null;



    const feedback = attemptData.attempt.feedbackHistory.find(



      (item) => item.feedbackId === currentRoute.feedbackId



    );



    if (!feedback) return null;



    const cacheKey = `${attemptData.attempt.attemptId}-${feedback.feedbackId}`;



    return {



      attempt: attemptData.attempt,



      feedback,



      concept: conceptCache[cacheKey],



      cacheKey,



    };



  }, [conceptCache, currentRoute, topics]);







  useEffect(() => {



    if (!toast) return;



    const timer = window.setTimeout(() => setToast(null), 4000);



    return () => window.clearTimeout(timer);



  }, [toast]);







  const showToast = (message: string, tone: "info" | "error" = "info") => {



    setToast({ message, tone });



  };







  const handleCreateTopic = (subject: string, topicId?: string) => {



    const topic = upsertTopic(subject, topicId);



    clearDraft(`subject-${topicId ?? "new"}`);



    pushRoute({ name: "themes", topicId: topic.topicId });



  };







  const handleConfirmThemes = (topicId: string, themes: string[]) => {



    const topic = topicMap.get(topicId);



    if (!topic) return;



    const existingTitles = new Set(topic.themes.map((theme) => theme.title.toLowerCase()));



    themes.forEach((title) => {



      if (!existingTitles.has(title.toLowerCase())) {



        addTheme(topicId, title);



      }



    });



    clearDraft(`themes-${topicId}`);



    goHome();



  };







  const handleOpenTheme = (topicId: string, themeId: string) => {



    pushRoute({ name: "attempt", topicId, themeId });



  };







  const ensureModelSelected = useCallback(() => {



    if (!settings.apiKey) {



      throw new Error("Configura la API key de Groq en Ajustes.");



    }



    if (!settings.selectedModel) {



      throw new Error("Selecciona un modelo en Ajustes.");



    }



  }, [settings.apiKey, settings.selectedModel]);







  const handleAttemptSubmit = (topicId: string, themeId: string, content: string) => {



    const attempt = createAttempt({ topicId, themeId, content });



    if (attempt.cycles >= MAX_CYCLES) {



      showToast("Este intento alcanzo el limite de ciclos.", "error");



      return;



    }



    setAttemptStatus(attempt.attemptId, "analyzing");



    incrementAttemptCycle(attempt.attemptId);



    const themeTitle = findTheme(topicMap.get(topicId), themeId)?.title ?? "Tema";



    const promptText = buildFeedbackPrompt({



      themeTitle,



      userContent: content,



      attemptId: attempt.attemptId,



    });



    const prompt: PromptBundle = {



      prompt: promptText,



      context: content,



    };



    clearDraft(`attempt-draft-${themeId}`);



    setAnalysisError(null);



    replaceRoute({ name: "analyzing", attemptId: attempt.attemptId, prompt, retries: 0 });



  };







  const fetchFeedback = useCallback(



    async (attemptId: string, bundle: PromptBundle) => {



      ensureModelSelected();



      const raw = await requestFeedback({



        apiKey: settings.apiKey,



        model: settings.selectedModel,



        prompt: bundle.prompt,



      });



      parseFeedbackJson(raw, {



        model: settings.selectedModel,



        expectedAttemptId: attemptId,



        source: "model",



      });



      replaceRoute({ name: "feedback", attemptId, raw, model: settings.selectedModel });



    },



    [ensureModelSelected, replaceRoute, settings.apiKey, settings.selectedModel]



  );







  const handleRetry = () => {



    setHistory((previous) => {



      const next = [...previous];



      const current = next[next.length - 1];



      if (current && current.name === "analyzing") {



        next[next.length - 1] = { ...current, retries: current.retries + 1 };



      }



      return next;



    });



  };







  const handleManualCopy = async (prompt: string) => {



    try {



      await copyToClipboard(prompt);



      showToast("Prompt copiado al portapapeles.");



    } catch (error) {



      showToast("Copia manualmente el prompt mostrado.", "error");



    }



  };







  const handleFeedbackConfirm = (attemptId: string, feedback: AttemptFeedback) => {



    pushAttemptVersion({ attemptId, content: feedback.raw, type: "feedback" });



    attachFeedback(feedback);



    setAttemptStatus(attemptId, "reviewed");



    replaceRoute({ name: "concept", attemptId, feedbackId: feedback.feedbackId });



  };







  const requestConceptForAttempt = useCallback(



    async (attempt: Attempt, feedback: AttemptFeedback) => {



      try {



        ensureModelSelected();



      } catch (error) {



        showToast(error instanceof Error ? error.message : String(error), "error");



        return;



      }



      const cacheKey = `${attempt.attemptId}-${feedback.feedbackId}`;



      setConceptCache((state) => ({



        ...state,



        [cacheKey]: { text: state[cacheKey]?.text ?? "", loading: true, error: undefined },



      }));



      try {



        const themeTitle = findTheme(topicMap.get(attempt.topicId), attempt.themeId)?.title ?? "Tema";



        const prompt = buildConceptPrompt({



          feedback,



          themeTitle,



        });



        const text = await requestConcept({



          apiKey: settings.apiKey,



          model: settings.selectedModel,



          prompt,



        });



        setConceptCache((state) => ({



          ...state,



          [cacheKey]: { text, loading: false, error: undefined },



        }));



      } catch (error) {



        const message = error instanceof Error ? error.message : String(error);



        setConceptCache((state) => ({



          ...state,



          [cacheKey]: { text: state[cacheKey]?.text ?? "", loading: false, error: message },



        }));



        showToast(message, "error");



      }



    },



    [ensureModelSelected, settings.apiKey, settings.selectedModel, topicMap]



  );







  const handleGenerateExercise = async (attempt: Attempt, feedback: AttemptFeedback, type: "analitico" | "proposicion") => {
    try {
      ensureModelSelected();
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), "error");
      return;
    }

    if (attempt.cycles >= MAX_CYCLES) {
      showToast("Se alcanzo el limite de ciclos para este intento.", "error");
      return;
    }

    const conceptKey = `${attempt.attemptId}-${feedback.feedbackId}`;
    const conceptText = conceptCache[conceptKey]?.text ?? "";

    try {
      if (type === "analitico") {
        const prompt = buildAnalyticalExercisePrompt({ feedback, conceptText, attempt });
        const raw = await requestExercise({
          apiKey: settings.apiKey,
          model: settings.selectedModel,
          prompt,
          type,
        });
        const payload = parseExerciseJson(raw, { model: settings.selectedModel, attemptId: attempt.attemptId });
        setPendingExercise(attempt.attemptId, payload);
        replaceRoute({ name: "exercise-analytical", attemptId: attempt.attemptId, exercise: payload });
        return;
      }

      const critiqueText = buildCritiqueForPrompt(feedback);
      const prompts = settings.propositionPrompts ?? DEFAULT_PROPOSITION_PROMPTS;
      const basePrompt = replaceConditionPlaceholder(prompts.initial, critiqueText);
      const baseProposition = (
        await requestPropositionText({
          apiKey: settings.apiKey,
          model: settings.selectedModel,
          prompt: basePrompt,
        })
      ).trim();

      if (!baseProposition) {
        throw new Error("El modelo no devolvio una proposicion base.");
      }

      const statements: string[] = [];
      for (const variant of PROPOSITION_VARIANTS) {
        const template = prompts[variant.kind];
        const prompt = replaceConditionPlaceholder(template, baseProposition);
        const response = (
          await requestPropositionText({
            apiKey: settings.apiKey,
            model: settings.selectedModel,
            prompt,
          })
        ).trim();

        if (!response) {
          throw new Error(`No se pudo generar el ${variant.label}.`);
        }

        statements.push(response);
      }

      const payload: ExercisePayload = {
        exerciseId: makeExerciseId(),
        attemptId: attempt.attemptId,
        type: "proposicion",
        payload: JSON.stringify(statements),
        createdAt: new Date().toISOString(),
        model: settings.selectedModel,
      };

      setPendingExercise(attempt.attemptId, payload);
      replaceRoute({ name: "exercise-proposition", attemptId: attempt.attemptId, exercise: payload });
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), "error");
    }
  };







  const handleSubmitExerciseAnswer = (attemptId: string, answer: string, exercise: ExercisePayload) => {



    const attemptLocator = findAttemptGlobal(topics, attemptId);



    if (!attemptLocator) {



      goHome();



      return;



    }



    if (attemptLocator.attempt.cycles >= MAX_CYCLES) {



      showToast("Se alcanzo el limite de ciclos para este intento.", "error");



      return;



    }



    pushAttemptVersion({ attemptId, content: answer, type: "exercise", exerciseId: exercise.exerciseId });



    setPendingExercise(attemptId, undefined);



    setAttemptStatus(attemptId, "submitted");



    incrementAttemptCycle(attemptId);



    const refreshed = findAttemptGlobal(useAppStore.getState().topics, attemptId);



    const latestContent = refreshed?.attempt.versions[0]?.content ?? answer;



    const promptText = buildFeedbackPrompt({



      themeTitle: refreshed?.theme.title ?? "Tema",



      userContent: latestContent,



      attemptId,



    });



    replaceRoute({ name: "analyzing", attemptId, prompt: { prompt: promptText, context: latestContent }, retries: 0 });



  };







  const handleFetchModels = async () => {



    try {



      ensureModelSelected();



    } catch (error) {



      // ignore since ensureModelSelected throws if missing key/model, but we allow listing with key only



    }



    if (!settings.apiKey) {



      showToast("Ingresa tu API key antes de listar modelos.", "error");



      return;



    }



    try {



      setSettingsStatus("loading");



      const models = await listGroqModels(settings.apiKey);



      setAvailableModels(models);



      if (models.length && !models.find((model) => model.id === settings.selectedModel)) {



        setSelectedModel(models[0].id);



      }



      setSettingsStatus("idle");



      showToast(`Se cargaron ${models.length} modelos.`);



    } catch (error) {



      const message = error instanceof Error ? error.message : String(error);



      setSettingsStatus("error", message);



      showToast(message, "error");



    }



  };







  const handleExportTopic = (topicId: string) => {



    const data = exportTopic(topicId);



    if (!data) {



      showToast("No se encontr├│ informaci├│n para exportar.", "error");



      return;



    }



    const blob = new Blob([data], { type: "application/json" });



    const url = URL.createObjectURL(blob);



    const link = document.createElement("a");



    link.href = url;



    link.download = `topic-${topicId}.json`;



    document.body.appendChild(link);



    link.click();



    document.body.removeChild(link);



    URL.revokeObjectURL(url);



    showToast("Exportaci├│n lista en tus descargas.");



  };







  useEffect(() => {



    if (!conceptRouteState) return;



    const { attempt, feedback, concept } = conceptRouteState;



    if (!concept || (!concept.text && !concept.loading && !concept.error)) {



      queueMicrotask(() => {



        requestConceptForAttempt(attempt, feedback);



      });



    }



  }, [conceptRouteState, requestConceptForAttempt]);







  const renderRoute = () => {



    switch (currentRoute.name) {



      case "home":



        return (



          <HomePage



            topics={topics}



            onCreateTopic={() => pushRoute({ name: "subject" })}



            onOpenTheme={handleOpenTheme}



            onExportTopic={handleExportTopic}



            onOpenSettings={() => setSettingsOpen(true)}



          />



        );



      case "subject":



        return (



          <SubjectPage



            draftId={`subject-${currentRoute.topicId ?? "new"}`}



            initialValue={currentRoute.topicId ? topicMap.get(currentRoute.topicId)?.subject ?? "" : drafts[`subject-${currentRoute.topicId ?? "new"}`]?.value ?? ""}



            onConfirm={(subject) => handleCreateTopic(subject, currentRoute.topicId)}



            onBack={history.length > 1 ? goBack : undefined}



          />



        );



      case "themes": {



        const topic = topicMap.get(currentRoute.topicId);



        const draftId = `themes-${currentRoute.topicId}`;



        let initialThemes = topic?.themes.map((theme) => theme.title) ?? [];



        const storedDraft = drafts[draftId]?.value;



        if (storedDraft) {



          try {



            const parsed = JSON.parse(storedDraft);



            if (Array.isArray(parsed)) {



              initialThemes = parsed.map((item) => String(item));



            }



          } catch (error) {



            // ignore invalid cached draft



          }



        }



        return (



          <ThemesPage



            draftId={draftId}



            initialThemes={initialThemes}



            onConfirm={(themes) => handleConfirmThemes(currentRoute.topicId, themes)}



            onBack={goBack}



          />



        );



      }



      case "attempt": {



        const topic = topicMap.get(currentRoute.topicId);



        const theme = findTheme(topic, currentRoute.themeId);



        if (!topic || !theme) {



          goHome();



          return null;



        }
        const handleOpenReview = (attemptId: string, feedbackId: string) => {
          pushRoute({ name: "concept", attemptId, feedbackId });
        };





        return (



          <ThemeAttemptPage



            topic={topic}



            theme={theme}



            onBack={goBack}



            onSubmit={(content) => handleAttemptSubmit(topic.topicId, theme.themeId, content)}



            onOpenReview={handleOpenReview}



          />



        );



      }



      case "analyzing": {



        const { attemptId, prompt, retries } = currentRoute;



        const attemptData = findAttemptGlobal(topics, attemptId);



        if (!attemptData) {



          goHome();



          return null;



        }



        const attemptKey = `${attemptId}-${retries}`;



        const onFetch = async () => {



          try {



            await fetchFeedback(attemptId, prompt);



            setAnalysisError(null);



          } catch (error) {



            const message = error instanceof Error ? error.message : String(error);



            setAnalysisError(message);



            throw error;



          }



        };



        return (



          <AnalyzingPage



            context={prompt}



            attemptKey={attemptKey}



            onFetch={onFetch}



            onManualCopy={(rawPrompt) => handleManualCopy(rawPrompt)}



            onCancel={goHome}



            onRetry={handleRetry}



            retries={retries}



            maxRetries={MAX_RETRIES}



            errorMessage={analysisError ?? undefined}



          />



        );



      }



      case "feedback": {



        const attemptData = findAttemptGlobal(topics, currentRoute.attemptId);



        if (!attemptData) {



          goHome();



          return null;



        }



        return (



          <FeedbackPage



            attempt={attemptData.attempt}



            model={currentRoute.model}



            rawResponse={currentRoute.raw}



            onBack={goBack}



            onConfirm={(feedback) => handleFeedbackConfirm(attemptData.attempt.attemptId, feedback)}



          />



        );



      }



      case "concept": {



        if (!conceptRouteState) {



          goHome();



          return null;



        }



        const concept = conceptRouteState.concept ?? DEFAULT_CONCEPT;



        const attempt = conceptRouteState.attempt;



        const feedback = conceptRouteState.feedback;



        return (



          <ConceptPage



            attempt={attempt}



            feedback={feedback}



            conceptText={concept.text}



            isConceptLoading={concept.loading ?? false}



            conceptError={concept.error}



            onReloadConcept={() => requestConceptForAttempt(attempt, feedback)}



            onBack={goBack}



            onOpenAnalytical={() => void handleGenerateExercise(attempt, feedback, "analitico")}



            onOpenProposition={() => void handleGenerateExercise(attempt, feedback, "proposicion")}



            limitReached={attempt.cycles >= MAX_CYCLES}



          />



        );



      }



      case "exercise-analytical": {



        const attemptData = findAttemptGlobal(topics, currentRoute.attemptId);



        if (!attemptData) {



          goHome();



          return null;



        }



        return (



          <ExerciseAnalyticalPage



            attempt={attemptData.attempt}



            exercise={currentRoute.exercise}



            onBack={goBack}



            onSubmit={(answer) =>



              handleSubmitExerciseAnswer(attemptData.attempt.attemptId, answer, currentRoute.exercise)



            }



          />



        );



      }



      case "exercise-proposition": {



        const attemptData = findAttemptGlobal(topics, currentRoute.attemptId);



        if (!attemptData) {



          goHome();



          return null;



        }



        return (



          <ExercisePropositionPage



            attempt={attemptData.attempt}



            exercise={currentRoute.exercise}



            onBack={goBack}



            onSubmit={({ answer }) =>



              handleSubmitExerciseAnswer(attemptData.attempt.attemptId, answer, currentRoute.exercise)



            }



          />



        );



      }



      default:



        return null;



    }



  };







  return (



    <>



      {renderRoute()}



      <SettingsModal



        open={settingsOpen}



        settings={settings}



        onClose={() => setSettingsOpen(false)}



        onApiKeyChange={(apiKey) => setApiKey(apiKey)}



        onFetchModels={handleFetchModels}



        onSelectModel={(modelId) => setSelectedModel(modelId)}



        onPromptChange={(kind, value) => setPropositionPrompt(kind, value)}



      />



      {toast ? <div className={`toast toast--${toast.tone}`}>{toast.message}</div> : null}



    </>



  );



};























