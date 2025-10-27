# Focus Feedback Loop

Aplicaci�n React (Vite + TypeScript) para gestionar el ciclo de retroalimentaci�n de asignaturas, temas y ejercicios con la API de Groq.

## Scripts

- `npm install` para instalar dependencias.
- `npm run dev` para entorno local.
- `npm run lint` para verificar reglas ESLint.
- `npm run build` para compilar producci�n.

## Configuraci�n Groq

Define la variable `GROQ_API_KEY` (archivo `.env`) o ingr�sala en Ajustes dentro de la interfaz. Desde Ajustes tambi�n puedes listar modelos y elegir el que se usar� en las llamadas.

## Notas

- L�mite de 5 ciclos por intento (`attempt_id`). Se muestra aviso al alcanzarlo.
- Respuestas del modelo se validan estrictamente contra los esquemas JSON requeridos. Si falla, se ofrece modo manual.
- Se gener� `dist/` al ejecutar `npm run build` (ignorados por git).

