# Calendario de Pareja ❤️ (Final)

Frontend multipágina con **login/registro**, **Realtime** y diseño oscuro con degradados.
Listo para subir a **GitHub** y desplegar en **Vercel**, conectado a **Supabase**.

## Estructura
- `public/login.html` — inicio de sesión / registro
- `public/index.html` — dashboard
- `public/events.html` — eventos
- `public/tasks.html` — tareas (kanban)
- `public/notes.html` — notas de amor
- `public/settings.html` — ajustes
- `public/404.html` — 404 romántico
- `config/supabaseClient.js` — **usa TU URL y ANON KEY** (ya integrado)
- `src/*.js` — módulos (auth, guard, calendar, tasks, notes, settings)
- `vercel.json` — configuración para servir `/public`

## Despliegue en Vercel
1. Sube a GitHub.
2. Importa en Vercel, Framework: *Other*, Build: *(vacío)*, Output Dir: `public`.
3. (Opcional) Añade ruta 404 automática (Vercel la detecta en `/public/404.html`).

## Supabase
- Ya debes tener las tablas + RLS + policies creadas (ver scripts anteriores).
- Activa **Realtime** en `events`, `tasks`, `love_notes`.
