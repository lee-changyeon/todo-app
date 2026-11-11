# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A personal todo web app (Korean UI) built with plain HTML5 / CSS3 / vanilla JavaScript (ES2020). There is no npm, no bundler, no framework, no module system, and no automated test suite. The app is the three files in `todo-app/` (`index.html`, `style.css`, `app.js`). The repo root holds the planning docs. `todo-app2/` is an empty placeholder and is not deployed.

## Commands

- **Run locally:** `python -m http.server 5500 --directory todo-app`, then open http://localhost:5500. The same command is configured in `.claude/launch.json`. Opening `todo-app/index.html` directly in a browser also works, but `file://` and `localhost` keep separate `localStorage` data.
- **Deploy:** pushing to `main` triggers `.github/workflows/pages.yml`, which uploads **only the `todo-app/` folder** to GitHub Pages (https://lee-changyeon.github.io/todo-app/).
- **Test:** testing is manual, in the browser, against the scenarios T-01 to T-13 in `TRD.md` §10.2. Inspect or edit stored data under DevTools → Application → Local Storage (keys `todos` and `todoFilter`).

## Architecture (`todo-app/app.js`)

Data flows one way, and the `todos` array is the single source of truth. The DOM holds no state.

1. An event handler calls a state mutator (`addTodo`, `updateTodo`, `deleteTodo`, `toggleTodo`, `clearCompleted`, `setFilter`).
2. Each mutator changes the in-memory state and then calls `commit()`, which runs `save()` and then `render()`.
3. `render()` rebuilds the progress bars, the filter tabs, and the entire list from state on every change. It does not patch the existing DOM.

Key details:
- **State:** `todos`, `currentFilter` (both persisted), and `editingId` (not persisted). They are loaded at startup through `loadTodos()` and `loadFilter()`. `loadTodos()` validates its input and drops malformed data, so corrupt JSON must produce an empty list, not an error.
- **The `CATEGORIES` constant** (`work` → 업무, `personal` → 개인, `study` → 공부) drives category validation, the dropdown options, and the per-category progress. To add a category, start there.
- **Event delegation:** list items are re-created on every render, so a single listener per event type sits on `#todoList`, and actions are routed by `data-action` (`toggle` / `edit` / `delete`). The item ID comes from `closest(".todo-item").dataset.id`. Never attach listeners to individual items.
- **Inline editing** finishes on Enter (save), Esc (cancel), or `focusout`. `focusout` checks `relatedTarget`, so moving focus between the input and the select inside the same item does not end the edit.
- **Rendering user text** must use `textContent`, never `innerHTML` (XSS).
- `app.js` loads just before `</body>` and accesses the DOM directly, without `DOMContentLoaded`. It depends on the IDs and classes defined in `index.html`.
- **Styling** uses CSS variables (design tokens) defined in `style.css`, plus state classes such as `.shake` for the empty-input animation.

## Project docs and workflow rules

`PRD.md` covers what to build (features F1–F8, acceptance criteria), `TRD.md` covers how (schema, function design, events, tests), and `TASKS.md` is the milestone checklist (M1–M9). These rules come from `TASKS.md`:

1. Add a new feature to `PRD.md` first, then reflect its design in `TRD.md`, then add tasks to `TASKS.md`.
2. Check off finished tasks in `TASKS.md` (`[ ]` → `[x]`).
3. After each feature, re-run the test cases in `TRD.md` §10.2.
4. When changing the Todo schema (`{id, text, category, completed, createdAt}`), give new fields defaults so existing `localStorage` data keeps loading.

The docs and the UI are written in Korean. Keep new user-facing text and doc updates in Korean.
