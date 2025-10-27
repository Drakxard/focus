# Focus Feedback Loop

Aplicación React (Vite + TypeScript) para gestionar el ciclo de retroalimentación de asignaturas, temas y ejercicios con la API de Groq.

## Scripts

- `npm install` para instalar dependencias.
- `npm run dev` para entorno local.
- `npm run lint` para verificar reglas ESLint.
- `npm run build` para compilar producción.

## Configuración Groq

Define la variable `VITE_GROQ_API_KEY` (archivo `.env`) o ingrésala en Ajustes dentro de la interfaz. Desde Ajustes también puedes listar modelos y elegir el que se usará en las llamadas.

## Notas

- Límite de 5 ciclos por intento (`attempt_id`). Se muestra aviso al alcanzarlo.
- Respuestas del modelo se validan estrictamente contra los esquemas JSON requeridos. Si falla, se ofrece modo manual.
- Se generó `dist/` al ejecutar `npm run build` (ignorados por git).
