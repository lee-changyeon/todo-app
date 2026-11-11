// ===== 상수 =====
const STORAGE_KEY = "todos";
const FILTER_KEY = "todoFilter";
const MAX_LENGTH = 100;
const CATEGORIES = {
  work: "업무",
  personal: "개인",
  study: "공부",
};

// ===== 상태 =====
let todos = loadTodos();
let currentFilter = loadFilter();
let editingId = null;

// ===== DOM =====
const $ = (sel) => document.querySelector(sel);
const addForm = $("#addForm");
const addInput = $("#addInput");
const addCategory = $("#addCategory");
const todoList = $("#todoList");
const emptyList = $("#emptyList");
const filters = $(".filters");
const clearDoneBtn = $("#clearDone");

// ===== 저장 / 불러오기 =====
function loadTodos() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(data)) return [];
    return data.filter(
      (t) => t && typeof t.text === "string" && CATEGORIES[t.category]
    );
  } catch {
    return [];
  }
}

function loadFilter() {
  try {
    const f = localStorage.getItem(FILTER_KEY);
    return f === "all" || CATEGORIES[f] ? f : "all";
  } catch {
    return "all";
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    localStorage.setItem(FILTER_KEY, currentFilter);
  } catch (e) {
    console.error("저장 실패:", e);
  }
}

// ===== 상태 변경 =====
function addTodo(text, category) {
  todos.unshift({
    id: String(Date.now()) + Math.random().toString(36).slice(2, 6),
    text,
    category,
    completed: false,
    createdAt: Date.now(),
  });
  commit();
}

function updateTodo(id, changes) {
  todos = todos.map((t) => (t.id === id ? { ...t, ...changes } : t));
  commit();
}

function deleteTodo(id) {
  todos = todos.filter((t) => t.id !== id);
  commit();
}

function toggleTodo(id) {
  const todo = todos.find((t) => t.id === id);
  if (todo) updateTodo(id, { completed: !todo.completed });
}

function clearCompleted() {
  todos = todos.filter((t) => !t.completed);
  commit();
}

function setFilter(filter) {
  currentFilter = filter;
  commit();
}

function commit() {
  save();
  render();
}

// ===== 계산 =====
function getProgress(list) {
  const total = list.length;
  const done = list.filter((t) => t.completed).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, percent };
}

function getVisibleTodos() {
  const list =
    currentFilter === "all"
      ? todos
      : todos.filter((t) => t.category === currentFilter);
  // 미완료 먼저, 그 안에서는 최신순
  return [...list].sort(
    (a, b) => a.completed - b.completed || b.createdAt - a.createdAt
  );
}

// ===== 렌더링 =====
function render() {
  renderProgress();
  renderFilters();
  renderList();
  clearDoneBtn.disabled = !todos.some((t) => t.completed);
}

function renderProgress() {
  const section = $(".progress");
  const empty = todos.length === 0;
  $("#emptyProgress").hidden = !empty;
  $(".progress-total").hidden = empty;
  $("#categoryProgress").hidden = empty;
  if (empty) {
    section.classList.remove("is-done");
    return;
  }

  const total = getProgress(todos);
  $("#totalText").textContent = `${total.done} / ${total.total} (${total.percent}%)`;
  $("#totalBar").style.width = total.percent + "%";
  section.classList.toggle("is-done", total.percent === 100);

  const catList = $("#categoryProgress");
  catList.replaceChildren();
  for (const [key, name] of Object.entries(CATEGORIES)) {
    const p = getProgress(todos.filter((t) => t.category === key));
    const li = document.createElement("li");
    li.className = key;
    li.textContent = `${name} ${p.done}/${p.total}` + (p.total ? ` · ${p.percent}%` : "");
    const bar = document.createElement("div");
    bar.className = "bar";
    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = p.percent + "%";
    bar.appendChild(fill);
    li.appendChild(bar);
    catList.appendChild(li);
  }
}

function renderFilters() {
  filters.querySelectorAll("button").forEach((btn) => {
    btn.setAttribute("aria-selected", btn.dataset.filter === currentFilter);
  });
}

function renderList() {
  const visible = getVisibleTodos();
  todoList.replaceChildren(...visible.map(createTodoItem));

  emptyList.hidden = visible.length > 0;
  if (visible.length === 0) {
    emptyList.textContent =
      currentFilter === "all"
        ? "아직 할 일이 없어요. 위에서 추가해 보세요!"
        : `${CATEGORIES[currentFilter]} 카테고리에 할 일이 없어요.`;
  }

  if (editingId) {
    const input = todoList.querySelector(".edit-input");
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }
}

function createTodoItem(todo) {
  const li = document.createElement("li");
  li.className = "todo-item" + (todo.completed ? " completed" : "");
  li.dataset.id = todo.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = todo.completed;
  checkbox.dataset.action = "toggle";
  checkbox.setAttribute("aria-label", `${todo.text} 완료`);
  li.appendChild(checkbox);

  if (todo.id === editingId) {
    li.classList.add("editing"); // 좁은 화면에서 편집 행을 두 줄로 배치하기 위한 클래스
    const select = document.createElement("select");
    select.className = "edit-select";
    select.setAttribute("aria-label", "카테고리 수정");
    for (const [key, name] of Object.entries(CATEGORIES)) {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = name;
      opt.selected = key === todo.category;
      select.appendChild(opt);
    }

    const input = document.createElement("input");
    input.className = "edit-input";
    input.type = "text";
    input.maxLength = MAX_LENGTH;
    input.value = todo.text;
    input.setAttribute("aria-label", "할 일 수정");

    li.append(select, input);
    return li;
  }

  const badge = document.createElement("span");
  badge.className = "badge " + todo.category;
  badge.textContent = CATEGORIES[todo.category];

  const text = document.createElement("span");
  text.className = "todo-text";
  text.textContent = todo.text;
  text.dataset.action = "edit";

  const actions = document.createElement("div");
  actions.className = "todo-actions";
  actions.append(
    createIconButton("✏️", "edit", `${todo.text} 수정`),
    createIconButton("🗑️", "delete", `${todo.text} 삭제`)
  );

  li.append(badge, text, actions);
  return li;
}

function createIconButton(icon, action, label) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "icon-btn";
  btn.textContent = icon;
  btn.dataset.action = action;
  btn.setAttribute("aria-label", label);
  btn.title = label;
  return btn;
}

// ===== 편집 =====
function startEdit(id) {
  editingId = id;
  render();
}

function finishEdit(saveChanges) {
  if (!editingId) return;
  const id = editingId;
  const li = todoList.querySelector(`[data-id="${id}"]`);
  editingId = null;

  const input = li?.querySelector(".edit-input");
  const select = li?.querySelector(".edit-select");
  if (saveChanges && input && select) {
    const text = input.value.trim().slice(0, MAX_LENGTH);
    const category = select.value;
    if (text) {
      updateTodo(id, { text, category });
      return;
    }
  }
  render();
}

// ===== 이벤트 =====
addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = addInput.value.trim();
  if (!text) {
    addInput.classList.remove("shake");
    void addInput.offsetWidth; // 애니메이션 재시작
    addInput.classList.add("shake");
    addInput.value = "";
    addInput.focus();
    return;
  }
  addTodo(text.slice(0, MAX_LENGTH), addCategory.value);
  addInput.value = "";
  addInput.focus();
});

addInput.addEventListener("animationend", () => addInput.classList.remove("shake"));

// 편집 중에 다른 컨트롤(체크박스 · 버튼, 필터 탭)을 누르면 mousedown 때 포커스가 빠져나가며
// focusout → 저장 → 다시 그리기가 먼저 일어나 누른 요소가 사라지고 click이 무시된다.
// 그래서 포커스 이동을 막고, 저장은 click 처리에서 finishEdit(true)로 먼저 한 뒤 원래 동작을 실행한다.
document.addEventListener("mousedown", (e) => {
  if (!editingId) return;
  if (e.target.closest("button[data-action], input[data-action], [data-filter]")) e.preventDefault();
});

todoList.addEventListener("click", (e) => {
  const action = e.target.dataset.action;
  const li = e.target.closest(".todo-item");
  if (!action || !li) return;
  const id = li.dataset.id;
  // 편집 중이면 먼저 저장한다 (id · action은 다시 그리기 전에 읽어 둠)
  if (action !== "edit" || e.target.tagName === "BUTTON") finishEdit(true);

  if (action === "toggle") toggleTodo(id);
  if (action === "edit" && e.target.tagName === "BUTTON") startEdit(id);
  if (action === "delete") {
    const todo = todos.find((t) => t.id === id);
    if (todo && confirm(`"${todo.text}" 을(를) 삭제할까요?`)) deleteTodo(id);
  }
});

todoList.addEventListener("dblclick", (e) => {
  if (e.target.dataset.action !== "edit") return;
  startEdit(e.target.closest(".todo-item").dataset.id);
});

todoList.addEventListener("keydown", (e) => {
  if (!e.target.classList.contains("edit-input") && !e.target.classList.contains("edit-select")) return;
  if (e.key === "Enter") {
    e.preventDefault();
    finishEdit(true);
  } else if (e.key === "Escape") {
    finishEdit(false);
  }
});

// 편집 입력창 · 카테고리에서 포커스가 항목 밖으로 나가면 저장.
// 편집 컨트롤에서 나간 경우만 본다 — ✏️ 버튼처럼 다시 그리기로 사라지는 요소의 focusout까지
// 편집 종료로 처리하면, 편집기가 그려지기 전에 finishEdit이 불려 오류가 났다.
todoList.addEventListener("focusout", (e) => {
  if (!editingId) return;
  if (!e.target.matches(".edit-input, .edit-select")) return;
  const li = e.target.closest(".todo-item");
  if (li && !li.contains(e.relatedTarget)) finishEdit(true);
});

filters.addEventListener("click", (e) => {
  const filter = e.target.dataset.filter;
  if (!filter) return;
  finishEdit(true); // 편집 중이었다면 저장
  setFilter(filter);
});

clearDoneBtn.addEventListener("click", () => {
  const count = todos.filter((t) => t.completed).length;
  if (count && confirm(`완료된 항목 ${count}개를 지울까요?`)) clearCompleted();
});

// ===== 시작 =====
$("#today").textContent = new Date().toLocaleDateString("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
});
render();
