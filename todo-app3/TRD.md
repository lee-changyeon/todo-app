# TRD: 할 일 관리 앱 (Todo App 3)

| 항목 | 내용 |
|---|---|
| 문서 버전 | v1.1 (11장 키워드 자동 분류) |
| 작성일 | 2026-11-11 |
| 관련 문서 | [PRD](../todo-app2/PRD.md) (todo-app2와 같은 PRD) · [5단계 프롬프트](../todo-app2/PROMPTS.md) · [TASKS.md](TASKS.md) |
| 구현 위치 | `todo-app3/` |
| 배포 주소 | https://lee-changyeon.github.io/todo-app/todo-app3/ |

> 이 TRD는 PRD를 **어떻게** 구현했는지 정리합니다. 현재 `todo-app3/` 코드를 기준으로 작성했습니다.
> todo-app3는 [PROMPTS.md](../todo-app2/PROMPTS.md)의 5단계 프롬프트를 순서대로 실행해 만든 앱입니다.

---

## 1. 기술 개요

### 1.1 기술 스택
| 영역 | 기술 | 비고 |
|---|---|---|
| 마크업 | HTML5 | `main`, `header`, `section`, `nav`, `footer`, `time` |
| 스타일 | CSS3 | CSS 변수, Flexbox, 미디어 쿼리 |
| 로직 | JavaScript (ES2022) | `"use strict"`, `Object.hasOwn` 사용. 라이브러리 · 모듈 · 빌드 도구 없음 |
| 저장소 | `localStorage` | 브라우저 로컬 저장 |
| 서버 | 없음 | 정적 파일 3개 |

### 1.2 설계 원칙
1. **무의존성:** `index.html` · `style.css` · `app.js` 3개 파일로 동작한다.
2. **단방향 데이터 흐름:** 이벤트 → 상태 변경 함수 → `commit()` = `persist()` + `render()`.
3. **단일 진실 공급원:** 모든 상태는 `state` 객체 하나에 있고, 화면은 매번 `state`로부터 새로 그린다.
4. **안전한 렌더링:** 사용자 입력은 `textContent` · `new Option()`으로만 출력한다 (`innerHTML` 미사용).

---

## 2. 시스템 구조

### 2.1 구성도
```
 index.html ──link──> style.css
     │
  script (</body> 직전)
     ▼
 app.js
 ┌───────────┐  호출  ┌─────────────────┐  commit()  ┌───────────┐
 │ 이벤트 처리 │ ────> │ 상태 변경 함수    │ ─────────> │ persist() │──> localStorage
 └───────────┘       │ state.todos     │            └───────────┘
      ▲              │ state.filter    │            ┌───────────┐
      │ 사용자 입력    │ state.editingId │            │ render()  │──> DOM
      └───────────── └─────────────────┘ <───────── └───────────┘
```

### 2.2 데이터 흐름
1. 사용자가 입력 · 클릭 · 키보드 조작을 한다.
2. 이벤트 처리기가 상태 변경 함수(`addTodo`, `toggleTodo`, `setFilter` 등)를 호출한다.
3. 상태 변경 함수가 `state`를 바꾸고 `commit()`을 호출한다.
4. `commit()`이 `persist()`로 저장한 뒤 `render()`로 진행률 · 탭 · 목록을 모두 다시 그린다.

시작 시: `state`를 만들면서 `readTodos()` · `readFilter()`로 저장값을 읽고 → 날짜 표시 · 카테고리 옵션 생성 → `render()`.

### 2.3 파일 책임
| 파일 | 줄 수 | 책임 |
|---|---|---|
| `index.html` | 약 50 | 고정 레이아웃, 추가 폼, 빈 컨테이너(`#tabs`, `#list`, `#catStats`), 인라인 SVG 파비콘 |
| `style.css` | 약 240 | 색상 토큰, 레이아웃, 컴포넌트, 상태 클래스, 반응형 |
| `app.js` | 약 390 | 상태, 저장/복원, 렌더링, 이벤트 |

`app.js`는 `</body>` 직전에 로드되므로 `DOMContentLoaded` 없이 DOM에 바로 접근한다.

---

## 3. 데이터 설계

### 3.1 Todo 스키마 (PRD 4.1)
```js
{
  id: "mh7x2k9q-a3f9k",      // string: Date.now() 36진수 + "-" + 랜덤 5자
  text: "보고서 초안 작성",    // string: trim 후 1~100자
  category: "work",           // "work" | "personal" | "study"
  completed: false,           // boolean
  createdAt: 1762828800000    // number: 생성 시각(ms), 정렬 기준
}
```

### 3.2 상태 객체
```js
const state = {
  todos: readTodos(),   // Todo[]               — 저장 (todos3)
  filter: readFilter(), // "all" | 카테고리 키   — 저장 (todos3Filter)
  editingId: null,      // string | null        — 저장 안 함
};
```

### 3.3 상수
```js
const KEY_TODOS  = "todos3";
const KEY_FILTER = "todos3Filter";
const TEXT_LIMIT = 100;
const CATEGORIES = { work: "업무", personal: "개인", study: "공부" };
const FILTERS    = { all: "전체", ...CATEGORIES };
```
`CATEGORIES` 하나가 데이터 검증, 추가 폼 · 편집용 선택 상자, 배지, 탭, 카테고리별 진행률에 모두 쓰인다.
카테고리를 추가하려면 이 객체와 `style.css`의 `--cat-*` 색 · `.tag.*` / `.cat-dot.*` 규칙을 추가한다.

### 3.4 localStorage
| 키 | 값 | 예시 |
|---|---|---|
| `todos3` | `JSON.stringify(Todo[])` | `[{"id":"...","text":"장보기",...}]` |
| `todos3Filter` | 문자열 | `"work"` |

배포 사이트에서 todo-app(`todos`) · todo-app2(`todos2`)와 같은 출처(origin)를 쓰므로 키 이름으로 데이터를 구분한다.

### 3.5 불러오기 검증 (`isValidTodo` · `readTodos`)
| 상황 | 처리 |
|---|---|
| 키 없음 | `"[]"`로 간주 → 빈 목록 |
| JSON 파싱 오류 · 배열 아님 | 빈 목록 |
| 객체가 아님(`null`, 숫자 등) · `id`/`text`가 문자열 아님 · `text`가 공백뿐 | 해당 항목 제외 |
| `category`가 `CATEGORIES`에 없음 | 해당 항목 제외 |
| `text` 앞뒤 공백 · 100자 초과 | trim 후 100자로 자름 |
| `completed`가 `true`가 아님 | `false` |
| `createdAt`이 유한한 숫자가 아님 | `0` |

`readFilter()`는 저장값이 `FILTERS`에 없으면 `"all"`. `persist()`는 저장 실패를 `try/catch`로 잡아 `console.warn`만 남긴다.

---

## 4. 함수 설계 (`app.js`)

### 4.1 저장 계층
| 함수 | 설명 |
|---|---|
| `isValidTodo(t)` | 항목 하나의 형식 검사 |
| `readTodos()` | 읽기 + 3.5 규칙으로 정리 |
| `readFilter()` | 저장된 탭 읽기 |
| `persist()` | `todos` · `filter` 저장 |

### 4.2 상태 변경 계층 (마지막에 `commit()`)
| 함수 | 설명 |
|---|---|
| `commit()` | `persist()` + `render()` |
| `newId()` | 고유 ID 생성 |
| `addTodo(text, category)` | 새 항목을 배열 끝에 추가 (화면 순서는 정렬로 결정) |
| `updateTodo(id, changes)` | 일부 필드 변경 |
| `removeTodo(id)` | 삭제 |
| `toggleTodo(id)` | 완료 반전 (`updateTodo` 사용) |
| `clearCompleted()` | 완료 항목 모두 삭제 |
| `setFilter(filter)` | 탭 변경, 편집 중이면 해제 |

### 4.3 편집 제어
| 함수 | 설명 |
|---|---|
| `beginEdit(id)` | `state.editingId` 설정 후 `render()` |
| `endEdit(save)` | `editingId`를 **먼저** `null`로 비운 뒤, 저장이면 입력값으로 `updateTodo`. 취소 · 빈 값이면 `render()`만 해서 원래 내용 표시 |

`editingId`를 먼저 비우므로, 다시 그리는 과정에서 편집 입력창이 사라지며 생기는 `focusout`이 `endEdit`을 또 불러도 아무 일도 하지 않는다.

### 4.4 조회 · 계산 (순수 함수)
| 함수 | 설명 |
|---|---|
| `findTodo(id)` | ID로 항목 찾기 |
| `inCategory(category)` | `"all"`이면 전체, 아니면 해당 카테고리 항목 |
| `sortedTodos(todos)` | **미완료 먼저**, 같은 그룹 안에서는 `createdAt` 내림차순(최근 추가가 위) |
| `progressOf(todos)` | `{ total, done, percent }`, 0개면 0% |

### 4.5 렌더링
| 함수 | 설명 |
|---|---|
| `render()` | `renderStats()` → `renderTabs()` → `renderList()` |
| `renderStats()` | 전체 진행률 텍스트 · 바 너비 · `aria-valuenow`, 🎉 표시, "완료 항목 지우기" 활성 여부, 카테고리별 진행률 |
| `renderTabs()` | 탭 버튼 생성 (개수 표시, `.is-active`, `aria-pressed`) |
| `renderList()` | 현재 탭 항목을 정렬해 그림, 편집 중인 항목은 편집기로, 빈 목록 문구 2종, 편집 입력창에 포커스 · 커서 끝으로 |
| `buildItem(todo)` | 체크박스 · 배지 · 텍스트 · ✏️ · 🗑️ |
| `buildEditor(todo)` | 편집 입력창(`.edit-text`) + 카테고리 선택(`.edit-category`) |
| `buildCategorySelect(selected)` | `CATEGORIES`로 `<select>` 생성 (추가 폼 옵션에도 재사용) |
| `buildIconButton(symbol, action, label)` | `data-action` · `aria-label` · `title`이 붙은 아이콘 버튼 |
| `flagInvalid(input)` | `.is-invalid`를 다시 붙여 흔들림 애니메이션 재시작 |

모든 영역은 `replaceChildren()`으로 통째로 다시 그린다. 하루 20개 규모에서 체크 1회 약 0.5ms (8.2 참고).

---

## 5. 이벤트 설계

### 5.1 이벤트 위임
목록 항목은 렌더할 때마다 새로 만들어지므로 리스너를 **`#list`에 한 번만** 등록하고 `data-action`으로 구분한다.
항목 ID는 `closest(".item").dataset.id`로 얻고, `findTodo`로 존재를 확인한 뒤 처리한다.

| `data-action` | 요소 | 동작 |
|---|---|---|
| `toggle` | 체크박스 | `toggleTodo(id)` |
| `edit` | ✏️ 버튼 | `beginEdit(id)` |
| `remove` | 🗑️ 버튼 | `confirm()` 후 `removeTodo(id)` |

### 5.2 이벤트 목록
| 대상 | 이벤트 | 처리 |
|---|---|---|
| `#composer` | `submit` | 기본 동작 막기 → trim · 100자 자르기 → 빈 값이면 `flagInvalid`, 아니면 `addTodo` 후 입력창 비우고 포커스 유지 |
| `#newText` | `animationend` | `.is-invalid` 제거 |
| `document` | `mousedown` | 편집 중에 다른 항목의 체크박스 · 버튼이나 필터 탭을 누르면 `preventDefault()`로 포커스 이동을 막는다 (5.3) |
| `#list` | `click` | 편집 중이면 `endEdit(true)`로 먼저 저장 → 5.1 표 |
| `#list` | `dblclick` | `.item-text` 더블클릭 시 `beginEdit` |
| `#list` | `keydown` | 편집 중 `Enter` → `endEdit(true)`, `Escape` → `endEdit(false)` |
| `#list` | `focusout` | 포커스가 편집 항목 밖으로 나가면 `endEdit(true)`. `relatedTarget`이 같은 항목 안이면 무시 |
| `#tabs` | `click` | 편집 중이면 `endEdit(true)`로 먼저 저장 → `data-filter` 값으로 `setFilter` |
| `#clearDone` | `click` | 완료 개수를 보여 주는 `confirm()` 후 `clearCompleted` |

### 5.3 편집 중 다른 컨트롤 클릭
목록과 필터 탭은 매번 다시 그려진다. 편집 중에 다른 항목의 버튼을 누르면 `mousedown` 순간 포커스가 빠져나가
`focusout` → 저장 → 다시 그리기가 먼저 일어나고, 손을 떼는 `click` 때는 누른 요소가 이미 사라져 클릭이 무시됐다.

이를 막기 위해:
1. `mousedown`에서 대상이 다시 그려지는 컨트롤(`button[data-action]`, `input[data-action]`, `[data-filter]`)이고 편집 항목 밖이면 `preventDefault()`로 포커스 이동을 막는다. → `focusout`이 일어나지 않는다.
2. `click` 처리에서 `id` · `action`을 먼저 읽어 둔 뒤 `endEdit(true)`로 편집을 저장하고, 그다음 원래 동작을 실행한다.

빈 곳 · 추가 입력창처럼 다시 그려지지 않는 곳을 누르면 이전처럼 `focusout`으로 저장된다. (todo-app2와 같은 방식)

---

## 6. UI / 스타일 설계

### 6.1 화면 요소 (`index.html`)
| ID | 역할 |
|---|---|
| `#dateLabel` | 오늘 날짜 (`<time>`) |
| `#statsText`, `#track`, `#trackFill`, `#catStats`, `#party` | 진행률 텍스트 · 바 · 카테고리별 진행률 · 🎉 |
| `#composer`, `#newText`, `#newCategory` | 추가 폼 |
| `#tabs` | 필터 탭 |
| `#list`, `#empty` | 목록 · 빈 목록 안내 |
| `#clearDone` | 완료 항목 지우기 |

### 6.2 디자인 토큰 (`:root`)
| 변수 | 용도 |
|---|---|
| `--page`, `--surface`, `--ink`, `--ink-soft`, `--border` | 배경 · 카드 · 글자 · 보조 글자 · 테두리 |
| `--accent`, `--accent-strong` | 추가 버튼 · 진행률 바 · 선택 탭 |
| `--warn` | 입력 오류 테두리 · 지우기 버튼 강조 |
| `--cat-work`, `--cat-personal`, `--cat-study` | 카테고리 배지 · 점 (파랑 · 초록 · 보라) |
| `--r` | 카드 모서리 둥글기 |

### 6.3 상태 클래스
| 클래스 | 의미 |
|---|---|
| `.is-done` | 완료 항목 (취소선, 흐린 색, 배지 반투명) |
| `.is-editing` | 편집 중인 항목 |
| `.is-active` | 선택된 탭 |
| `.is-invalid` | 빈 입력 경고 (빨간 테두리 + 흔들림) |

### 6.4 반응형
- 기본: 최대 폭 640px 카드, 가운데 정렬.
- 480px 이하: 카드 여백 · 그림자 제거, 추가 폼과 편집 행이 두 줄로 줄바꿈.
- 아이콘 버튼 36×36px.

---

## 7. 보안 및 접근성
| 구분 | 내용 |
|---|---|
| XSS | 사용자 텍스트는 `textContent` · `new Option()`으로만 출력 |
| 저장 데이터 | 3.5 검증으로 깨지거나 조작된 데이터에도 앱이 멈추지 않음 |
| 키보드 | 추가(Enter), 체크(Space), 수정(✏️ → Enter / Esc), 삭제, 탭 이동 모두 가능 |
| 스크린 리더 | 입력창 · 선택 상자 · 체크박스 · 아이콘 버튼에 `aria-label`, 진행률 바 `role="progressbar"` + `aria-valuenow`, 탭 `aria-pressed` |
| 지원 브라우저 | `Object.hasOwn` 때문에 Chrome · Edge 93+, Firefox 92+, Safari 15.4+ 필요 |

---

## 8. 실행 및 테스트

### 8.1 실행
- **파일로 열기:** `todo-app3/index.html` 더블클릭
- **로컬 서버:** 저장소 루트에서
  ```bash
  python -m http.server 5500 --directory todo-app3
  ```
  후 http://localhost:5500 접속
- **배포:** `main`에 push하면 앱 파일 3개가 `/todo-app/todo-app3/`에 배포된다 (문서 `*.md`는 배포 안 함).

### 8.2 테스트 결과 (PRD 7장 수용 기준)
2026-11-11, Playwright로 Microsoft Edge(헤드리스)를 자동 조작해 수행했다.

| ID | 시나리오 | 기대 결과 | 결과 |
|---|---|---|---|
| AC-01 | 텍스트 입력 후 Enter | 선택한 카테고리로 목록 맨 위에 추가, 입력창 비움 · 포커스 유지 | 통과 |
| AC-02 | 공백만 입력 후 Enter | 추가 안 됨, 입력창 흔들림 | 통과 |
| AC-03 | 수정 후 Enter / Esc | Enter 저장, Esc 원래 내용 유지 | 통과 |
| AC-04 | 삭제 → 확인 / 취소 | 확인 시 삭제, 취소 시 유지 | 통과 |
| AC-05 | 체크박스 클릭 | 취소선 · 아래로 이동 · 진행률 즉시 갱신 | 통과 |
| AC-06 | "업무" 탭 → 새로고침 | 업무 항목만 표시, 탭 유지 | 통과 |
| AC-07 | 진행률 | 전체 · 카테고리별 개수와 % 정확, 100%면 🎉 | 통과 |
| AC-08 | 할 일 0개 | 안내 문구 표시 | 통과 |
| AC-09 | 새로고침 | 항목 · 완료 상태 유지 | 통과 |
| AC-10 | `todos3`에 깨진 JSON / 잘못된 항목 | 오류 없이 빈 목록 / 잘못된 항목만 제외 | 통과 |
| AC-11 | 할 일 25개 | 체크 1회 평균 0.54ms | 통과 |
| AC-12 | 화면 폭 360px (편집 중 포함) | 가로 스크롤 없음 | 통과 |
| AC-13 | 브라우저 콘솔 | 오류 없음 | 통과 |
| 추가 | 키보드만 사용 | 추가 · 체크 · 수정 가능 | 통과 |

배포 후 실제 주소에서도 추가 → 새로고침 유지, 콘솔 오류 없음을 확인했다. Chromium 158(Chrome의 기반 오픈소스 브라우저, Playwright)에서도 AC-01~AC-13 · 키보드 사용(14개)과 편집 중 클릭 시나리오 8개 모두 통과했다. Chrome 자체는 테스트 PC에 설치되어 있지 않아 Chromium으로 대신 확인했다.

### 8.3 수동 테스트 팁
개발자 도구(F12) → **Application** → **Local Storage**에서 `todos3` 값을 직접 보고 고치거나 지울 수 있다.

---

## 9. todo-app2와 다른 점
같은 PRD로 만들었지만 구현 세부가 다르다. 두 앱을 함께 고칠 때 참고한다.

| 항목 | todo-app2 | todo-app3 |
|---|---|---|
| 상태 | 전역 변수 `todos`, `currentFilter`, `editingId` | `state` 객체 하나 |
| 저장 키 | `todos2`, `todos2Filter` | `todos3`, `todos3Filter` |
| 새 항목 위치 | 배열 맨 앞(`unshift`) | 배열 맨 끝(`push`), 화면 순서는 정렬로 결정 |
| 삭제 동작 이름 | `data-action="delete"` | `data-action="remove"` |
| 주요 ID · 클래스 | `#todoList`, `.todo-item`, `.completed`, `.editing`, `.active`, `.shake` | `#list`, `.item`, `.is-done`, `.is-editing`, `.is-active`, `.is-invalid` |
| 언어 수준 | ES2020 | ES2022 (`Object.hasOwn`), `"use strict"` |

---

## 10. 알려진 제약 및 향후 과제
| 항목 | 내용 |
|---|---|
| 데이터 범위 | 사용하는 브라우저에만 저장, 다른 기기와 공유 안 됨 |
| 향후 과제 | 다크 모드, 삭제 실행 취소, JSON 백업/복원, 드래그 정렬, 마감일 |

### 10.1 수정 이력
| 날짜 | 내용 |
|---|---|
| 2026-11-11 | 날짜 `<time>`의 `datetime` 속성을 `toISOString()`(UTC) 대신 현지 연·월·일로 만들도록 수정. 이전에는 한국 시간 오전 9시 전에 전날 날짜가 들어갔음 (화면 표시는 원래 정상). 08:30 · 23:50 · 1월 5일 00:10(KST)에서 확인 |
| 2026-11-11 | 편집 중 다른 항목의 체크박스 · ✏️ · 🗑️나 필터 탭을 누르면 편집만 저장되고 그 클릭이 무시되던 문제 수정 (5.3). 편집 중 클릭 시나리오 8개: 수정 전 3개 → 수정 후 8개 통과, 기존 테스트 14개 통과 |
| 2026-11-11 | v1.1: 키워드 자동 분류 추가 (PRD F9, 11장) |
| 2026-11-11 | 추가 폼 카테고리 기본값이 "업무"가 아니라 "공부"로 시작하던 문제 수정. 다른 `<select>`에서 옵션을 옮겨 오며 선택 상태가 유지되지 않았음 → `newCategory.value = "work"`로 직접 지정 |

---

## 11. 키워드 자동 분류 (PRD F9 · v1.1)

> 2026-11-11 변경: 처음에는 카테고리를 직접 고르면 그 할 일을 추가할 때까지 자동 분류를 멈췄으나(잠금), "두어 번 뒤 자동 분류가 안 된다"는 피드백으로 잠금을 없애고 **입력할 때마다 항상** 자동 분류하도록 바꿨다.

### 11.1 동작 요약
할 일 입력창(`#newText`)에 글자를 입력할 때마다 내용 속 키워드를 검사해, 추가 폼의 카테고리 선택(`#newCategory`)을 자동으로 바꾼다.
자동으로 바뀌면 입력창 아래 `#autoHint`에 `🤖 자동 분류: 공부`처럼 표시한다 (`aria-live="polite"`).

### 11.2 데이터
- `CATEGORY_KEYWORDS` 상수 — `CATEGORIES`와 같은 키(`work` · `personal` · `study`)마다 소문자 키워드 배열 (각 22~23개).
- 한 글자 · 너무 흔한 말(예: "책", "집", "문제")은 다른 단어에 섞여 오분류되기 쉬워 넣지 않았다 ("책임", "집중" 등).
- 카테고리를 추가할 때는 `CATEGORIES`와 함께 이 상수에도 키워드를 추가한다.
- 상태 (저장하지 않음): `state.baseCategory`(사용자가 직접 골랐거나 마지막으로 쓴 카테고리 — 키워드가 없을 때 돌아갈 값)

### 11.3 함수 · 이벤트
| 이름 | 설명 |
|---|---|
| `guessCategory(text)` | 순수 함수. 소문자로 바꾼 내용에 **포함된** 키워드 수를 카테고리별로 센다. 1등 카테고리 키를 반환하고, 일치가 없거나 1등이 동점이면 `null` |
| `applyAutoCategory()` | `#newText`의 `input` 이벤트 — **입력할 때마다 항상** 실행. `guessCategory` 결과로, 없으면 기준 카테고리로 선택 상자를 바꾸고 안내 표시/숨김 |
| `resetAutoCategory()` | 할 일을 추가한 직후 호출. 기준 카테고리 = 방금 쓴 카테고리, 안내 숨김 |
| `showAutoHint(category)` | 안내 문구를 `textContent`로 설정하거나 숨김 |
| `#newCategory` `change` | 사용자가 직접 고름 → 기준 카테고리 갱신 + 안내 숨김. 다음 입력 전까지 그 값이 유지되므로, 입력을 마친 뒤 고르고 Enter하면 그 카테고리로 추가된다 |

- "포함" 방식이라 "보고서를", "헬스장"처럼 조사 · 접미어가 붙어도 일치한다.
- 수정(인라인 편집) 중에는 자동 분류하지 않는다.
- 서버 · 외부 AI 없이 동작하며, 입력 1회당 키워드 약 70개 `includes` 검사라 성능 영향은 없다.

### 11.4 테스트 결과 (2026-11-11, Edge 헤드리스)
| ID | 시나리오 | 결과 |
|---|---|---|
| AC-14 | "회의 자료 준비" → 업무 자동 선택 · 안내 · Enter로 업무 할 일 추가 | 통과 |
| AC-15 | "수학 과제"→공부, "헬스장 가기"→개인, "PPT 만들기"(대소문자)→업무, "영어 단어 외우기"→공부 | 통과 |
| AC-16 | 키워드 없음 → 원래 카테고리 유지 · 안내 없음 (키워드를 썼다 지워도 원래대로) | 통과 |
| AC-17 | 직접 고른 뒤에도 입력하면 다시 자동 분류, 입력 후 직접 고르고 Enter → 그 카테고리로 추가, 키워드 없으면 직접 고른 값 | 통과 |
| AC-18 | "회의 끝나고 운동"(동점) → 바꾸지 않음, "회의 보고서 쓰고 운동"(2:1) → 업무 | 통과 |
| — | 수정 중 자동 분류 안 함 · 특수문자 입력 안전 · 콘솔 오류 없음 | 통과 |
| — | 데스크톱 · 360px에서 안내 문구 표시, 가로 스크롤 없음 | 통과 |
| — | 기존 테스트 · 편집 중 클릭 시나리오 회귀 | 통과 |
