// ===== 상수 =====
const STORAGE_KEY = "todos2";
const FILTER_KEY = "todos2Filter";
const MAX_LENGTH = 100;
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

// ===== 상태 =====
let todos = loadTodos();
let currentFilter = loadFilter();
let editingId = null;

// ===== DOM =====
const $ = (sel) => document.querySelector(sel);
const addForm = $("#addForm");
const addInput = $("#addInput");
const addCategory = $("#addCategory");
const filtersNav = $("#filters");
const todoList = $("#todoList");
const emptyMessage = $("#emptyMessage");
const clearDoneBtn = $("#clearDone");
const progressText = $("#progressText");
const progressBar = $("#progressBar");
const progressFill = $("#progressFill");
const categoryProgress = $("#categoryProgress");
const celebrate = $("#celebrate");
const autoHint = $("#autoHint");

// ===== 저장 / 불러오기 =====
function loadTodos() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(data)) return [];
    return data.filter(
      (t) =>
        t &&
        typeof t.id === "string" &&
        typeof t.text === "string" &&
        t.text.trim() !== "" &&
        t.category in CATEGORIES
    ).map((t) => ({
      id: t.id,
      text: t.text.slice(0, MAX_LENGTH),
      category: t.category,
      completed: Boolean(t.completed),
      createdAt: Number(t.createdAt) || 0,
    }));
  } catch {
    return [];
  }
}

function loadFilter() {
  try {
    const saved = localStorage.getItem(FILTER_KEY);
    return saved in FILTERS ? saved : "all";
  } catch {
    return "all";
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    localStorage.setItem(FILTER_KEY, currentFilter);
  } catch (err) {
    console.warn("저장하지 못했습니다:", err);
  }
}

// ===== 상태 변경 (변경 후 항상 commit) =====
function commit() {
  save();
  render();
}

function addTodo(text, category) {
  todos.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
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
  if (!(filter in FILTERS)) return;
  currentFilter = filter;
  editingId = null;
  commit();
}

// ===== 계산 =====
function getProgress(list) {
  const total = list.length;
  const done = list.filter((t) => t.completed).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, percent };
}

function getVisibleTodos() {
  const list =
    currentFilter === "all" ? todos : todos.filter((t) => t.category === currentFilter);
  // 미완료 먼저, 같은 그룹 안에서는 최근 추가 순
  return [...list].sort(
    (a, b) => a.completed - b.completed || b.createdAt - a.createdAt
  );
}

// 일치한 키워드가 가장 많은 카테고리 키를 돌려준다. 일치가 없거나 1등이 동점이면 null.
function guessCategory(text) {
  const lower = text.toLowerCase();
  let best = null;
  let bestScore = 0;
  let tied = false;
  for (const [category, words] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = words.filter((word) => lower.includes(word)).length;
    if (score > bestScore) {
      best = category;
      bestScore = score;
      tied = false;
    } else if (score > 0 && score === bestScore) {
      tied = true;
    }
  }
  return best && !tied ? best : null;
}

// ===== 렌더링 =====
function render() {
  renderProgress();
  renderFilters();
  renderList();
}

function renderProgress() {
  const { total, done, percent } = getProgress(todos);
  progressText.textContent = `완료 ${done} / ${total} (${percent}%)`;
  progressFill.style.width = percent + "%";
  progressBar.setAttribute("aria-valuenow", percent);
  celebrate.hidden = !(total > 0 && done === total);
  clearDoneBtn.disabled = done === 0;

  categoryProgress.replaceChildren(
    ...Object.entries(CATEGORIES).map(([key, label]) => {
      const p = getProgress(todos.filter((t) => t.category === key));
      const li = document.createElement("li");
      const dot = document.createElement("span");
      dot.className = `dot ${key}`;
      li.append(dot, `${label} ${p.done}/${p.total} (${p.percent}%)`);
      return li;
    })
  );
}

function renderFilters() {
  filtersNav.replaceChildren(
    ...Object.entries(FILTERS).map(([key, label]) => {
      const count =
        key === "all" ? todos.length : todos.filter((t) => t.category === key).length;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "filter" + (key === currentFilter ? " active" : "");
      btn.dataset.filter = key;
      btn.setAttribute("aria-pressed", key === currentFilter);
      const countEl = document.createElement("span");
      countEl.className = "count";
      countEl.textContent = count;
      btn.append(label, countEl);
      return btn;
    })
  );
}

function renderList() {
  const visible = getVisibleTodos();
  todoList.replaceChildren(
    ...visible.map((t) => (t.id === editingId ? createEditItem(t) : createTodoItem(t)))
  );
  emptyMessage.hidden = visible.length > 0;
  emptyMessage.textContent =
    todos.length === 0
      ? "할 일을 추가해 보세요 ✍️"
      : `${FILTERS[currentFilter]} 카테고리에 할 일이 없어요`;

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

  const badge = document.createElement("span");
  badge.className = `badge ${todo.category}`;
  badge.textContent = CATEGORIES[todo.category];

  const text = document.createElement("span");
  text.className = "todo-text";
  text.dataset.action = "edit";
  text.textContent = todo.text;
  text.title = "더블클릭해서 수정";

  li.append(
    checkbox,
    badge,
    text,
    createIconButton("✏️", "edit", "수정"),
    createIconButton("🗑️", "delete", "삭제")
  );
  return li;
}

function createEditItem(todo) {
  const li = document.createElement("li");
  li.className = "todo-item editing";
  li.dataset.id = todo.id;

  const input = document.createElement("input");
  input.type = "text";
  input.className = "edit-input";
  input.maxLength = MAX_LENGTH;
  input.value = todo.text;
  input.setAttribute("aria-label", "할 일 수정");

  const select = createCategorySelect(todo.category);
  select.className = "edit-category";
  select.setAttribute("aria-label", "카테고리 수정");

  li.append(input, select);
  return li;
}

function createIconButton(icon, action, label) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "icon-btn";
  btn.dataset.action = action;
  btn.textContent = icon;
  btn.setAttribute("aria-label", label);
  btn.title = label;
  return btn;
}

function createCategorySelect(selected) {
  const select = document.createElement("select");
  for (const [key, label] of Object.entries(CATEGORIES)) {
    select.add(new Option(label, key, false, key === selected));
  }
  return select;
}

// ===== 편집 제어 =====
function startEdit(id) {
  editingId = id;
  render();
}

function finishEdit(saveChanges) {
  if (!editingId) return;
  const id = editingId;
  const item = todoList.querySelector(`.todo-item[data-id="${CSS.escape(id)}"]`);
  editingId = null;

  if (saveChanges && item) {
    const text = item.querySelector(".edit-input").value.trim();
    const category = item.querySelector(".edit-category").value;
    if (text) {
      updateTodo(id, { text: text.slice(0, MAX_LENGTH), category });
      return;
    }
  }
  render();
}

function getItemId(el) {
  return el.closest(".todo-item")?.dataset.id;
}

// ===== 이벤트 =====
addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = addInput.value.trim();
  if (!text) {
    addInput.classList.remove("shake");
    void addInput.offsetWidth; // 애니메이션 재시작
    addInput.classList.add("shake");
    addInput.focus();
    return;
  }
  addTodo(text.slice(0, MAX_LENGTH), addCategory.value);
  addInput.value = "";
  resetAutoCategory();
  addInput.focus();
});

addInput.addEventListener("animationend", () => addInput.classList.remove("shake"));

// ===== 키워드 자동 분류 (PRD F9) =====
// 입력할 때마다 항상 자동 분류한다.
// baseCategory: 사용자가 직접 골랐거나 마지막으로 쓴 카테고리. 키워드가 없으면 이 값으로 둔다.
// 직접 고른 값은 다음 입력 전까지 유지된다 (입력을 마친 뒤 고르고 Enter → 그 카테고리로 추가).
let baseCategory = "work";

function showAutoHint(category) {
  autoHint.hidden = !category;
  autoHint.textContent = category ? `🤖 자동 분류: ${CATEGORIES[category]}` : "";
}

function applyAutoCategory() {
  const guess = guessCategory(addInput.value.trim());
  addCategory.value = guess ?? baseCategory;
  showAutoHint(guess);
}

function resetAutoCategory() {
  baseCategory = addCategory.value;
  showAutoHint(null);
}

addInput.addEventListener("input", applyAutoCategory);

addCategory.addEventListener("change", () => {
  // 직접 고른 값은 키워드가 없을 때의 기준이 되고, 다음 입력 전까지 그대로 유지된다
  baseCategory = addCategory.value;
  showAutoHint(null);
});

// 편집 중에 다시 그려지는 컨트롤(다른 항목의 체크박스 · 버튼, 필터 탭)을 누르면
// mousedown 때 포커스가 빠져나가며 focusout → 저장 → 다시 그리기가 먼저 일어나
// 누른 요소가 사라지고 click이 무시된다. 그래서 포커스 이동을 막고,
// 저장은 아래 click 처리에서 finishEdit(true)로 먼저 한 뒤 원래 동작을 실행한다.
document.addEventListener("mousedown", (e) => {
  if (!editingId) return;
  const control = e.target.closest("button[data-action], input[data-action], [data-filter]");
  if (control && !control.closest(".editing")) e.preventDefault();
});

filtersNav.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-filter]");
  if (!btn) return;
  finishEdit(true); // 편집 중이었다면 저장 (setFilter는 편집을 저장 없이 해제하므로)
  setFilter(btn.dataset.filter);
});

// 목록은 매번 다시 그려지므로 부모 하나에만 리스너를 둔다 (이벤트 위임)
todoList.addEventListener("click", (e) => {
  const target = e.target.closest("[data-action]");
  if (!target) return;
  const id = getItemId(target);
  const action = target.dataset.action;
  if (target.closest(".editing")) return;
  // 다른 항목을 편집 중이면 먼저 저장한다 (id · action은 다시 그리기 전에 읽어 둠)
  finishEdit(true);

  if (action === "toggle") {
    toggleTodo(id);
  } else if (action === "edit" && target.tagName === "BUTTON") {
    startEdit(id);
  } else if (action === "delete") {
    const todo = todos.find((t) => t.id === id);
    if (todo && confirm(`"${todo.text}"을(를) 삭제할까요?`)) deleteTodo(id);
  }
});

todoList.addEventListener("dblclick", (e) => {
  const text = e.target.closest(".todo-text");
  if (text) startEdit(getItemId(text));
});

todoList.addEventListener("keydown", (e) => {
  if (!editingId || !e.target.closest(".editing")) return;
  if (e.key === "Enter") {
    e.preventDefault();
    finishEdit(true);
  } else if (e.key === "Escape") {
    finishEdit(false);
  }
});

todoList.addEventListener("focusout", (e) => {
  const item = e.target.closest(".editing");
  if (!item) return;
  // 같은 항목 안(입력창 ↔ 카테고리)으로 포커스가 옮겨 가면 편집 유지
  if (e.relatedTarget && item.contains(e.relatedTarget)) return;
  finishEdit(true);
});

clearDoneBtn.addEventListener("click", () => {
  const done = todos.filter((t) => t.completed).length;
  if (done > 0 && confirm(`완료한 할 일 ${done}개를 지울까요?`)) clearCompleted();
});

// ===== 초기화 =====
function init() {
  const now = new Date();
  $("#today").textContent = now.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  for (const [key, label] of Object.entries(CATEGORIES)) {
    addCategory.add(new Option(label, key));
  }
  baseCategory = addCategory.value;
  render();
  addInput.focus();
}

init();
