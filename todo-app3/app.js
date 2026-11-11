"use strict";

// ───── 설정 ─────
const KEY_TODOS = "todos3";
const KEY_FILTER = "todos3Filter";
const TEXT_LIMIT = 100;
const CATEGORIES = { work: "업무", personal: "개인", study: "공부" };
const FILTERS = { all: "전체", ...CATEGORIES };

// 키워드 자동 분류 (PRD F9). 소문자로 적고, 할 일 내용에 "포함"되면 일치로 본다.
// 한 글자 · 너무 흔한 말(예: "책", "집", "문제")은 다른 단어에 섞여 오분류되기 쉬워 넣지 않는다.
const CATEGORY_KEYWORDS = {
  work: [
    "회의", "미팅", "보고서", "메일", "결재", "기획", "발표", "프로젝트", "고객", "거래처",
    "견적", "계약", "출근", "출장", "야근", "업무", "회사", "팀장", "부장", "ppt", "엑셀", "제안서",
  ],
  personal: [
    "장보기", "장 보기", "마트", "운동", "헬스", "산책", "병원", "치과", "약속", "청소", "빨래",
    "설거지", "요리", "은행", "택배", "생일", "가족", "친구", "쇼핑", "미용실", "영화", "여행", "이사",
  ],
  study: [
    "공부", "과제", "숙제", "시험", "강의", "인강", "수업", "복습", "예습", "독서", "도서관", "논문",
    "레포트", "리포트", "알고리즘", "코딩", "영어", "단어", "자격증", "스터디", "학원", "문제집", "토익",
  ],
};

// ───── 상태 (화면은 항상 이 값으로부터 그린다) ─────
const state = {
  todos: readTodos(),
  filter: readFilter(),
  editingId: null, // 저장하지 않음 — 새로고침하면 편집 해제
  // 키워드 자동 분류 (저장하지 않음) — 입력할 때마다 항상 자동 분류한다
  baseCategory: "work", // 사용자가 직접 골랐거나 마지막으로 쓴 카테고리 — 키워드가 없으면 이 값
};

// ───── DOM ─────
const el = (id) => document.getElementById(id);
const composer = el("composer");
const newText = el("newText");
const newCategory = el("newCategory");
const list = el("list");
const empty = el("empty");
const tabs = el("tabs");
const statsText = el("statsText");
const track = el("track");
const trackFill = el("trackFill");
const catStats = el("catStats");
const party = el("party");
const clearDone = el("clearDone");
const autoHint = el("autoHint");

// ───── 저장소 ─────
function isValidTodo(t) {
  return (
    t !== null &&
    typeof t === "object" &&
    typeof t.id === "string" &&
    typeof t.text === "string" &&
    t.text.trim() !== "" &&
    Object.hasOwn(CATEGORIES, t.category)
  );
}

function readTodos() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY_TODOS) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidTodo).map((t) => ({
      id: t.id,
      text: t.text.trim().slice(0, TEXT_LIMIT),
      category: t.category,
      completed: t.completed === true,
      createdAt: Number.isFinite(t.createdAt) ? t.createdAt : 0,
    }));
  } catch {
    return [];
  }
}

function readFilter() {
  try {
    const saved = localStorage.getItem(KEY_FILTER);
    return Object.hasOwn(FILTERS, saved ?? "") ? saved : "all";
  } catch {
    return "all";
  }
}

function persist() {
  try {
    localStorage.setItem(KEY_TODOS, JSON.stringify(state.todos));
    localStorage.setItem(KEY_FILTER, state.filter);
  } catch (err) {
    console.warn("할 일을 저장하지 못했습니다.", err);
  }
}

// ───── 상태 변경 → commit ─────
function commit() {
  persist();
  render();
}

function newId() {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
}

function addTodo(text, category) {
  state.todos.push({ id: newId(), text, category, completed: false, createdAt: Date.now() });
  commit();
}

function removeTodo(id) {
  state.todos = state.todos.filter((t) => t.id !== id);
  commit();
}

function updateTodo(id, changes) {
  state.todos = state.todos.map((t) => (t.id === id ? { ...t, ...changes } : t));
  commit();
}

function toggleTodo(id) {
  const todo = findTodo(id);
  if (todo) updateTodo(id, { completed: !todo.completed });
}

function clearCompleted() {
  state.todos = state.todos.filter((t) => !t.completed);
  commit();
}

function setFilter(filter) {
  if (!Object.hasOwn(FILTERS, filter)) return;
  state.filter = filter;
  state.editingId = null;
  commit();
}

// ───── 편집 ─────
function beginEdit(id) {
  if (!findTodo(id)) return;
  state.editingId = id;
  render();
}

// editingId를 먼저 비우므로, 다시 그리는 도중 생기는 focusout이 또 호출해도 무시된다
function endEdit(save) {
  const id = state.editingId;
  if (!id) return;
  state.editingId = null;

  const row = list.querySelector(".item.is-editing");
  if (save && row) {
    const text = row.querySelector(".edit-text").value.trim().slice(0, TEXT_LIMIT);
    const category = row.querySelector(".edit-category").value;
    if (text) {
      updateTodo(id, { text, category });
      return;
    }
  }
  render(); // 취소했거나 빈 값이면 원래 내용으로
}

// ───── 조회 ─────
function findTodo(id) {
  return state.todos.find((t) => t.id === id);
}

function inCategory(category) {
  return category === "all" ? state.todos : state.todos.filter((t) => t.category === category);
}

// 미완료가 위, 그 안에서는 최근 추가가 위
function sortedTodos(todos) {
  return [...todos].sort((a, b) => Number(a.completed) - Number(b.completed) || b.createdAt - a.createdAt);
}

function progressOf(todos) {
  const total = todos.length;
  const done = todos.filter((t) => t.completed).length;
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
}

// 일치한 키워드가 가장 많은 카테고리 키를 돌려준다. 일치가 없거나 1등이 동점이면 null.
function guessCategory(text) {
  const lower = text.toLowerCase();
  const scores = Object.entries(CATEGORY_KEYWORDS)
    .map(([category, words]) => [category, words.filter((w) => lower.includes(w)).length])
    .sort((a, b) => b[1] - a[1]);
  const [[top, topScore], [, secondScore]] = scores;
  return topScore > 0 && topScore > secondScore ? top : null;
}

// ───── 렌더링 ─────
function render() {
  renderStats();
  renderTabs();
  renderList();
}

function renderStats() {
  const { total, done, percent } = progressOf(state.todos);
  statsText.textContent = `완료 ${done} / ${total} (${percent}%)`;
  trackFill.style.width = `${percent}%`;
  track.setAttribute("aria-valuenow", String(percent));
  party.hidden = !(total > 0 && done === total);
  clearDone.disabled = done === 0;

  catStats.replaceChildren(
    ...Object.entries(CATEGORIES).map(([key, label]) => {
      const p = progressOf(inCategory(key));
      const li = document.createElement("li");
      const dot = document.createElement("span");
      dot.className = `cat-dot ${key}`;
      li.append(dot, `${label} ${p.done}/${p.total} (${p.percent}%)`);
      return li;
    })
  );
}

function renderTabs() {
  tabs.replaceChildren(
    ...Object.entries(FILTERS).map(([key, label]) => {
      const active = key === state.filter;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tab" + (active ? " is-active" : "");
      btn.dataset.filter = key;
      btn.setAttribute("aria-pressed", String(active));
      const count = document.createElement("span");
      count.className = "tab-count";
      count.textContent = String(inCategory(key).length);
      btn.append(label, count);
      return btn;
    })
  );
}

function renderList() {
  const items = sortedTodos(inCategory(state.filter));
  list.replaceChildren(
    ...items.map((t) => (t.id === state.editingId ? buildEditor(t) : buildItem(t)))
  );
  empty.hidden = items.length > 0;
  empty.textContent =
    state.todos.length === 0
      ? "할 일을 추가해 보세요 ✍️"
      : `${FILTERS[state.filter]} 할 일이 없어요`;

  const editor = list.querySelector(".edit-text");
  if (editor) {
    editor.focus();
    editor.setSelectionRange(editor.value.length, editor.value.length);
  }
}

function buildCategorySelect(selected) {
  const select = document.createElement("select");
  for (const [value, label] of Object.entries(CATEGORIES)) {
    select.add(new Option(label, value, false, value === selected));
  }
  return select;
}

function buildEditor(todo) {
  const li = document.createElement("li");
  li.className = "item is-editing";
  li.dataset.id = todo.id;

  const input = document.createElement("input");
  input.type = "text";
  input.className = "edit-text";
  input.maxLength = TEXT_LIMIT;
  input.value = todo.text;
  input.setAttribute("aria-label", "할 일 내용 수정");

  const select = buildCategorySelect(todo.category);
  select.className = "edit-category";
  select.setAttribute("aria-label", "카테고리 수정");

  li.append(input, select);
  return li;
}

function buildItem(todo) {
  const li = document.createElement("li");
  li.className = "item" + (todo.completed ? " is-done" : "");
  li.dataset.id = todo.id;

  const check = document.createElement("input");
  check.type = "checkbox";
  check.className = "item-check";
  check.checked = todo.completed;
  check.dataset.action = "toggle";
  check.setAttribute("aria-label", `완료: ${todo.text}`);

  const tag = document.createElement("span");
  tag.className = `tag ${todo.category}`;
  tag.textContent = CATEGORIES[todo.category];

  const text = document.createElement("span");
  text.className = "item-text";
  text.textContent = todo.text;
  text.title = "더블클릭하면 수정할 수 있어요";

  // 체크박스(22px)를 40×40px 라벨로 감싸 누르는 영역을 넓힌다. 라벨 클릭은 체크박스 클릭으로 전달된다.
  const checkWrap = document.createElement("label");
  checkWrap.className = "check-wrap";
  checkWrap.append(check);

  li.append(
    checkWrap,
    tag,
    text,
    buildIconButton("✏️", "edit", "수정"),
    buildIconButton("🗑️", "remove", "삭제")
  );
  return li;
}

function buildIconButton(symbol, action, label) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "icon";
  btn.textContent = symbol;
  btn.dataset.action = action;
  btn.title = label;
  btn.setAttribute("aria-label", label);
  return btn;
}

// ───── 이벤트 ─────
function flagInvalid(input) {
  input.classList.remove("is-invalid");
  void input.offsetWidth; // 애니메이션을 다시 시작하기 위한 리플로우
  input.classList.add("is-invalid");
}

composer.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = newText.value.trim().slice(0, TEXT_LIMIT);
  if (!text) {
    flagInvalid(newText);
    newText.focus();
    return;
  }
  addTodo(text, newCategory.value);
  newText.value = "";
  resetAutoCategory();
  newText.focus();
});

newText.addEventListener("animationend", () => newText.classList.remove("is-invalid"));

// ───── 키워드 자동 분류 (PRD F9) ─────
function showAutoHint(category) {
  autoHint.hidden = !category;
  autoHint.textContent = category ? `🤖 자동 분류: ${CATEGORIES[category]}` : "";
}

function applyAutoCategory() {
  const guess = guessCategory(newText.value.trim());
  newCategory.value = guess ?? state.baseCategory;
  showAutoHint(guess);
}

function resetAutoCategory() {
  state.baseCategory = newCategory.value;
  showAutoHint(null);
}

newText.addEventListener("input", applyAutoCategory);

// 직접 고른 값은 키워드가 없을 때의 기준이 되고, 다음 입력 전까지 그대로 유지된다
// (입력을 마친 뒤 고르고 Enter → 그 카테고리로 추가)
newCategory.addEventListener("change", () => {
  state.baseCategory = newCategory.value;
  showAutoHint(null);
});

// 편집 중에 다시 그려지는 컨트롤(다른 항목의 체크박스 · 버튼, 필터 탭)을 누르면
// mousedown 때 포커스가 빠져나가며 focusout → 저장 → 다시 그리기가 먼저 일어나
// 누른 요소가 사라지고 click이 무시된다. 그래서 포커스 이동을 막고,
// 저장은 click 처리에서 endEdit(true)로 먼저 한 뒤 원래 동작을 실행한다.
document.addEventListener("mousedown", (event) => {
  if (!state.editingId) return;
  const control = event.target.closest("button[data-action], input[data-action], .check-wrap, [data-filter]");
  if (control && !control.closest(".is-editing")) event.preventDefault();
});

// 항목은 매번 새로 그려지므로 목록 하나에 위임한다
list.addEventListener("click", (event) => {
  let target = event.target.closest("[data-action]");
  // 체크박스 둘레(.check-wrap 라벨 여백)를 누른 경우: 브라우저의 라벨 동작은 "체크박스로 포커스 이동 → 클릭"인데,
  // 편집 중이면 포커스 이동 때 저장 · 다시 그리기가 일어나 클릭이 사라진다. 기본 동작을 막고 직접 체크 처리한다.
  const wrap = event.target.closest(".check-wrap");
  if (!target && wrap) {
    event.preventDefault();
    target = wrap.querySelector("[data-action]");
  }
  if (!target || !list.contains(target) || target.closest(".is-editing")) return;
  const id = target.closest(".item")?.dataset.id;
  const action = target.dataset.action;
  // 다른 항목을 편집 중이면 먼저 저장한다 (id · action은 다시 그리기 전에 읽어 둠)
  endEdit(true);
  const todo = findTodo(id);
  if (!todo) return;

  switch (action) {
    case "toggle":
      toggleTodo(id);
      break;
    case "edit":
      beginEdit(id);
      break;
    case "remove":
      if (confirm(`"${todo.text}" 할 일을 삭제할까요?`)) removeTodo(id);
      break;
  }
});

list.addEventListener("dblclick", (event) => {
  const text = event.target.closest(".item-text");
  if (text) beginEdit(text.closest(".item").dataset.id);
});

list.addEventListener("keydown", (event) => {
  if (!event.target.closest(".is-editing")) return;
  if (event.key === "Enter") {
    event.preventDefault();
    endEdit(true);
  } else if (event.key === "Escape") {
    event.preventDefault();
    endEdit(false);
  }
});

list.addEventListener("focusout", (event) => {
  const row = event.target.closest(".is-editing");
  if (!row) return;
  // 입력창 ↔ 카테고리처럼 같은 항목 안에서 포커스가 움직이면 편집을 계속한다
  if (row.contains(event.relatedTarget)) return;
  endEdit(true);
});

tabs.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-filter]");
  if (!tab) return;
  endEdit(true); // 편집 중이었다면 저장 (setFilter는 편집을 저장 없이 해제하므로)
  setFilter(tab.dataset.filter);
});

clearDone.addEventListener("click", () => {
  const count = state.todos.filter((t) => t.completed).length;
  if (count > 0 && confirm(`완료한 할 일 ${count}개를 모두 지울까요?`)) clearCompleted();
});

// ───── 시작 ─────
const today = new Date();
const dateLabel = el("dateLabel");
// toISOString()은 UTC라서 한국 시간 오전 9시 전에는 전날이 된다 → 현지 날짜로 만든다
const pad2 = (n) => String(n).padStart(2, "0");
dateLabel.dateTime = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;
dateLabel.textContent = today.toLocaleDateString("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
});
// 다른 <select>에서 옵션을 옮겨 오면 선택 상태가 유지되지 않아 마지막 옵션(공부)이 선택됐었다 → 값을 직접 지정
newCategory.replaceChildren(...buildCategorySelect("work").options);
newCategory.value = "work";
state.baseCategory = newCategory.value;
render();
newText.focus();
