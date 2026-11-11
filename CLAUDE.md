# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A personal todo web app (Korean UI) built with plain HTML5 / CSS3 / vanilla JavaScript (ES2020). There is no npm, no bundler, no framework, no module system, and no automated test suite. There are three independent versions of the app, each made of `index.html`, `style.css`, and `app.js`:

- `todo-app/` — the original app. Its PRD/TRD/TASKS docs are at the repo root. Deployed at the site root.
- `todo-app2/` — a rewrite planned from scratch, with its own `PRD.md`, `TRD.md`, and `TASKS.md` inside the folder. Deployed under `/todo-app2/`. Because both apps share one origin, they share `localStorage`; it uses the `localStorage` keys `todos2` / `todos2Filter`, so its data never mixes with `todo-app/` (`todos` / `todoFilter`).
- `todo-app3/` — built from `todo-app2/PRD.md` by following the 5-step prompts in `todo-app2/PROMPTS.md`. It shares todo-app2's PRD but has its own `TRD.md` and `TASKS.md` (its TRD §9 lists how its code differs from todo-app2). Deployed under `/todo-app3/`. It uses the keys `todos3` / `todos3Filter`; its DOM ids and class names differ from `todo-app2/` (e.g. `#list`, `.item`, `.is-done`).

All versions share the architecture described below. When working on one, update that version's own docs.

## Commands

- **Run locally:** `python -m http.server 5500 --directory todo-app` (or `todo-app2` / `todo-app3`), then open http://localhost:5500. The same command is configured in `.claude/launch.json`. Opening `todo-app/index.html` directly in a browser also works, but `file://` and `localhost` keep separate `localStorage` data.
- **Deploy:** pushing to `main` triggers `.github/workflows/pages.yml`, which assembles a `_site/` folder (`todo-app/` at the root, plus only `index.html` / `style.css` / `app.js` from `todo-app2/` and `todo-app3/` under same-named subfolders) and publishes it to GitHub Pages: https://lee-changyeon.github.io/todo-app/, `.../todo-app/todo-app2/`, and `.../todo-app/todo-app3/`. Any other file added to `todo-app2/` or `todo-app3/` is not deployed until it is added to the `cp` line in the workflow.
- **Test:** testing is manual, in the browser, against the scenarios in `TRD.md` §10.2 (`todo-app/`) or `todo-app2/TRD.md` §8.2. Inspect or edit stored data under DevTools → Application → Local Storage (keys `todos` / `todoFilter`, `todos2` / `todos2Filter`, or `todos3` / `todos3Filter`).

## Architecture (`app.js`, both versions)

Data flows one way, and the `todos` array is the single source of truth. The DOM holds no state.

1. An event handler calls a state mutator (`addTodo`, `updateTodo`, `deleteTodo`, `toggleTodo`, `clearCompleted`, `setFilter`).
2. Each mutator changes the in-memory state and then calls `commit()`, which runs `save()` and then `render()`.
3. `render()` rebuilds the progress bars, the filter tabs, and the entire list from state on every change. It does not patch the existing DOM.

Key details:
- **State:** `todos`, `currentFilter` (both persisted), and `editingId` (not persisted). They are loaded at startup through `loadTodos()` and `loadFilter()`. `loadTodos()` validates its input and drops malformed data, so corrupt JSON must produce an empty list, not an error.
- **The `CATEGORIES` constant** (`work` → 업무, `personal` → 개인, `study` → 공부) drives category validation, the dropdown options, and the per-category progress. To add a category, start there. In `todo-app2/` and `todo-app3/`, also add keywords to `CATEGORY_KEYWORDS` (keyword-based auto-categorization of the add form, PRD F9: `guessCategory()` picks the category with the most substring keyword matches, no change on tie; a manual pick in the add form's select locks auto-categorization until the todo is added).
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
