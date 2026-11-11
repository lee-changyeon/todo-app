# TRD: 할 일 관리 앱 (Todo App 2)

| 항목 | 내용 |
|---|---|
| 문서 버전 | v1.0 |
| 작성일 | 2026-11-11 |
| 관련 문서 | [PRD.md](PRD.md) · [TASKS.md](TASKS.md) |
| 구현 위치 | `todo-app2/` |

> PRD가 **무엇을** 만들지 정의한다면, 이 TRD는 **어떻게** 만드는지 정의합니다.
> 현재 `todo-app2/` 구현을 기준으로 작성했습니다.

---

## 1. 기술 개요

### 1.1 기술 스택
| 영역 | 기술 | 비고 |
|---|---|---|
| 마크업 | HTML5 | `main`, `header`, `section`, `nav`, `footer` 시맨틱 태그 |
| 스타일 | CSS3 | CSS 변수, Flexbox, 미디어 쿼리 |
| 로직 | JavaScript (ES2020) | 외부 라이브러리 · 모듈 시스템 · 빌드 도구 없음 |
| 저장소 | `localStorage` | 브라우저 로컬 저장 |
| 서버 | 없음 | 정적 파일만으로 동작 |

### 1.2 설계 원칙
1. **무의존성:** 파일 3개만으로 동작한다. `index.html`을 더블클릭해도 실행된다.
2. **단방향 데이터 흐름:** 이벤트 → 상태 변경 → `commit()`(저장 + 다시 그리기).
3. **단일 진실 공급원:** 화면은 항상 `todos` 배열로부터 새로 만든다. DOM에 상태를 따로 두지 않는다.
4. **안전한 렌더링:** 사용자 입력은 `textContent`로만 출력한다. `innerHTML`은 쓰지 않는다 (XSS 방지).

---

## 2. 시스템 구조

### 2.1 구성도
```
 index.html ──link──> style.css
     │
  script (</body> 직전)
     ▼
 app.js
 ┌──────────┐  호출  ┌──────────────┐  commit()  ┌────────┐
 │이벤트 핸들러│ ────> │상태 변경 함수  │ ─────────> │ save() │──> localStorage
 └──────────┘       │todos/filter  │            └────────┘
      ▲             └──────────────┘            ┌────────┐
      │ 사용자 입력                                │render()│──> DOM
      └──────────────────────────────────────── └────────┘
```

### 2.2 데이터 흐름
1. 사용자가 입력 · 클릭 · 체크한다.
2. 이벤트 핸들러가 상태 변경 함수(`addTodo`, `toggleTodo` 등)를 호출한다.
3. 상태 변경 함수가 `todos` / `currentFilter`를 바꾼 뒤 `commit()`을 호출한다.
4. `commit()` = `save()` + `render()`.
5. `render()`가 진행률 · 필터 탭 · 목록을 상태로부터 전부 다시 그린다.

시작 시: `loadTodos()` · `loadFilter()`로 상태를 만들고 → `init()`이 날짜 표시 · 카테고리 옵션 생성 후 `render()`.

### 2.3 파일 책임
| 파일 | 책임 | 의존 |
|---|---|---|
| `index.html` | 고정 레이아웃, 추가 폼, 빈 컨테이너(`#filters`, `#todoList`, `#categoryProgress`) | `style.css`, `app.js` |
| `style.css` | 색상 토큰, 레이아웃, 컴포넌트, 상태 클래스, 반응형 | 없음 |
| `app.js` | 상태, 저장/복원, 렌더링, 이벤트 | `index.html`의 ID |

`app.js`는 `</body>` 직전에 로드되므로 `DOMContentLoaded`를 기다리지 않고 DOM에 바로 접근한다.

---

## 3. 데이터 설계

### 3.1 Todo 스키마
```js
{
  id: "mh7x2k9qa3f",       // string: Date.now() 36진수 + 랜덤 4자 (같은 ms 충돌 방지)
  text: "보고서 초안 작성",  // string: trim 후 1~100자
  category: "work",         // "work" | "personal" | "study"
  completed: false,         // boolean
  createdAt: 1762828800000  // number: 생성 시각(ms), 정렬 기준
}
```

### 3.2 애플리케이션 상태
| 변수 | 타입 | 설명 | 저장 |
|---|---|---|---|
| `todos` | `Todo[]` | 전체 할 일 | O (`todos2`) |
| `currentFilter` | `"all" \| "work" \| "personal" \| "study"` | 선택된 탭 | O (`todos2Filter`) |
| `editingId` | `string \| null` | 편집 중인 항목 ID | X |

### 3.3 상수
```js
const STORAGE_KEY = "todos2";
const FILTER_KEY  = "todos2Filter";
const MAX_LENGTH  = 100;
const CATEGORIES  = { work: "업무", personal: "개인", study: "공부" };
const FILTERS     = { all: "전체", ...CATEGORIES };
```
`CATEGORIES`는 데이터 검증, 드롭다운 옵션, 배지, 카테고리별 진행률에 공통으로 쓰인다. 카테고리를 추가하려면 이 객체와 `style.css`의 배지 색만 추가하면 된다.

### 3.4 localStorage
| 키 | 값 | 예시 |
|---|---|---|
| `todos2` | `JSON.stringify(Todo[])` | `[{"id":"...","text":"장보기",...}]` |
| `todos2Filter` | 문자열 | `"work"` |

기존 `todo-app/`(`todos`, `todoFilter`)과 키를 달리해 같은 주소에서 실행해도 데이터가 섞이지 않는다.

### 3.5 불러오기 검증 (`loadTodos`)
| 상황 | 처리 |
|---|---|
| 키 없음 · JSON 파싱 오류 · 배열 아님 | 빈 배열 반환 |
| `id`/`text`가 문자열이 아니거나 `text`가 빈 문자열 | 해당 항목 제외 |
| `category`가 `CATEGORIES`에 없음 | 해당 항목 제외 |
| `text`가 100자 초과 | 100자로 자름 |
| `completed` · `createdAt` 타입 이상 | `Boolean()` / `Number() \|\| 0`으로 보정 |

`loadFilter()`는 저장값이 `FILTERS`에 없으면 `"all"`을 반환한다. `save()`는 저장 실패(용량 초과, 저장소 차단)를 `try/catch`로 잡아 콘솔 경고만 남긴다.

---

## 4. 함수 설계 (`app.js`)

### 4.1 저장 계층
| 함수 | 설명 |
|---|---|
| `loadTodos()` | localStorage에서 읽고 3.5 규칙으로 검증 |
| `loadFilter()` | 저장된 탭 읽기 |
| `save()` | `todos`와 `currentFilter` 저장 |

### 4.2 상태 변경 계층 (모두 마지막에 `commit()`)
| 함수 | 설명 |
|---|---|
| `addTodo(text, category)` | 새 항목을 배열 맨 앞에 추가 |
| `updateTodo(id, changes)` | 항목 일부 필드 변경 |
| `deleteTodo(id)` | 항목 삭제 |
| `toggleTodo(id)` | 완료 상태 반전 (`updateTodo` 사용) |
| `clearCompleted()` | 완료 항목 모두 삭제 |
| `setFilter(filter)` | 탭 변경, 편집 중이면 편집 해제 |

### 4.3 계산 계층 (순수 함수)
| 함수 | 설명 |
|---|---|
| `getProgress(list)` | `{ total, done, percent }` 반환, 0개면 0% |
| `getVisibleTodos()` | 현재 탭으로 거른 뒤 **미완료 먼저, 같은 그룹은 최근 추가 순**으로 정렬 |

### 4.4 렌더링 계층
| 함수 | 설명 |
|---|---|
| `render()` | 아래 세 함수 호출 |
| `renderProgress()` | 전체 진행률 텍스트 · 바 · `aria-valuenow`, 카테고리별 진행률, 🎉 표시, "완료 항목 지우기" 활성 여부 |
| `renderFilters()` | 탭 버튼(항목 개수 포함) 생성, 선택 탭에 `.active` · `aria-pressed` |
| `renderList()` | 목록 생성, 빈 목록 안내 문구, 편집 중이면 입력창에 포커스 |
| `createTodoItem(todo)` | 체크박스 · 배지 · 텍스트 · ✏️ · 🗑 |
| `createEditItem(todo)` | 편집용 입력창 + 카테고리 선택 |
| `createIconButton(icon, action, label)` | `data-action`, `aria-label`이 붙은 아이콘 버튼 |
| `createCategorySelect(selected)` | `CATEGORIES`로 `<select>` 생성 |

모든 렌더링은 `replaceChildren()`으로 컨테이너 내용을 통째로 바꾼다. 하루 20개 규모에서는 부분 갱신 없이도 충분히 빠르다.

### 4.5 편집 제어
| 함수 | 설명 |
|---|---|
| `startEdit(id)` | `editingId` 설정 후 `render()` |
| `finishEdit(saveChanges)` | `editingId`를 먼저 `null`로 바꾼 뒤, 저장이면 입력값을 읽어 `updateTodo`. 빈 값이면 저장하지 않고 원래대로 다시 그림 |

`editingId`를 먼저 비우기 때문에, 다시 그리는 중에 발생하는 `focusout`이 `finishEdit`을 또 호출해도 아무 일도 하지 않는다.

---

## 5. 이벤트 설계

### 5.1 이벤트 위임
목록 항목은 렌더할 때마다 새로 만들어지므로 리스너를 **`#todoList`에 한 번만** 등록하고, `data-action` 값으로 동작을 구분한다. 항목 ID는 `closest(".todo-item").dataset.id`로 얻는다.

| `data-action` | 요소 | 동작 |
|---|---|---|
| `toggle` | 체크박스 | `toggleTodo(id)` |
| `edit` | ✏️ 버튼 (click) / 텍스트 (dblclick) | `startEdit(id)` |
| `delete` | 🗑 버튼 | `confirm()` 후 `deleteTodo(id)` |

### 5.2 이벤트 목록
| 대상 | 이벤트 | 처리 |
|---|---|---|
| `#addForm` | `submit` | 기본 동작 막기 → trim → 빈 값이면 `.shake`, 아니면 `addTodo` 후 입력창 비우고 포커스 유지 |
| `#addInput` | `animationend` | `.shake` 제거 |
| `document` | `mousedown` | 편집 중에 다른 항목의 체크박스 · 버튼이나 필터 탭을 누르면 `preventDefault()`로 포커스 이동을 막는다 (5.3) |
| `#filters` | `click` | 편집 중이면 `finishEdit(true)`로 먼저 저장 → `data-filter` 값으로 `setFilter` |
| `#todoList` | `click` | 편집 중이면 `finishEdit(true)`로 먼저 저장 → 5.1 표 |
| `#todoList` | `dblclick` | `.todo-text` 더블클릭 시 편집 시작 |
| `#todoList` | `keydown` | 편집 중 `Enter` → 저장, `Esc` → 취소 |
| `#todoList` | `focusout` | 포커스가 편집 항목 밖으로 나가면 저장. `relatedTarget`이 같은 항목 안(입력창 ↔ 카테고리)이면 무시 |
| `#clearDone` | `click` | 완료 개수를 보여 주는 `confirm()` 후 `clearCompleted` |

### 5.3 편집 중 다른 컨트롤 클릭
목록과 필터 탭은 매번 다시 그려진다. 편집 중에 다른 항목의 버튼을 누르면 `mousedown` 순간 포커스가 빠져나가
`focusout` → 저장 → 다시 그리기가 먼저 일어나고, 손을 떼는 `click` 때는 누른 요소가 이미 사라져 클릭이 무시됐다.

이를 막기 위해:
1. `mousedown`에서 대상이 다시 그려지는 컨트롤(`button[data-action]`, `input[data-action]`, `[data-filter]`)이고 편집 항목 밖이면 `preventDefault()`로 포커스 이동을 막는다. → `focusout`이 일어나지 않는다.
2. `click` 처리에서 `id` · `action`을 먼저 읽어 둔 뒤 `finishEdit(true)`로 편집을 저장하고, 그다음 원래 동작을 실행한다.

빈 곳 · 추가 입력창처럼 다시 그려지지 않는 곳을 누르면 이전처럼 `focusout`으로 저장된다.

---

## 6. UI / 스타일 설계

### 6.1 디자인 토큰 (`:root`)
| 변수 | 용도 |
|---|---|
| `--bg`, `--card`, `--text`, `--muted`, `--line` | 배경 · 카드 · 글자 · 보조 글자 · 구분선 |
| `--primary`, `--primary-dark` | 버튼 · 진행률 바 · 선택 탭 |
| `--danger` | 오류 테두리 · 삭제 강조 |
| `--work`, `--personal`, `--study` | 카테고리 배지 · 점 색 (파랑 · 초록 · 보라) |

### 6.2 상태 클래스
| 클래스 | 의미 |
|---|---|
| `.completed` | 완료 항목 (취소선, 흐린 색) |
| `.editing` | 편집 중인 항목 |
| `.active` | 선택된 필터 탭 |
| `.shake` | 빈 입력 경고 애니메이션 |

### 6.3 반응형
- 기본: 최대 폭 640px 카드, 가운데 정렬.
- 480px 이하: 카드 여백 · 그림자 제거, 추가 폼과 편집 행이 두 줄로 줄바꿈.
- 아이콘 버튼은 36×36px.

---

## 7. 보안 및 접근성
| 구분 | 내용 |
|---|---|
| XSS | 사용자 텍스트는 `textContent`와 `new Option()`으로만 출력 |
| 셀렉터 | 항목 검색 시 `CSS.escape(id)` 사용 |
| 저장 데이터 | 3.5의 검증으로 깨진 데이터에도 앱이 멈추지 않음 |
| 키보드 | 추가(Enter), 체크(Space), 수정(✏️ 버튼 → Enter/Esc), 삭제를 모두 키보드로 사용 가능 |
| 스크린 리더 | 아이콘 버튼 · 체크박스 · 입력창에 `aria-label`, 진행률 바에 `role="progressbar"`, 탭에 `aria-pressed` |

---

## 8. 실행 및 테스트

### 8.1 실행
- **파일로 열기:** `todo-app2/index.html` 더블클릭
- **로컬 서버:** 저장소 루트에서
  ```bash
  python -m http.server 5500 --directory todo-app2
  ```
  후 http://localhost:5500 접속

> 파일로 연 경우와 서버로 연 경우는 `localStorage`가 서로 다르다.

### 8.2 테스트 케이스 (PRD 7장 수용 기준)
| ID | 시나리오 | 기대 결과 | 결과 |
|---|---|---|---|
| T-01 | 텍스트 입력 후 Enter | 선택한 카테고리로 목록 맨 위에 추가 | 통과 |
| T-02 | 공백만 입력 후 Enter | 추가 안 됨, 입력창 흔들림 | 통과 |
| T-03 | ✏️ → 수정 → Enter / Esc | Enter 저장, Esc 원래 내용 유지 | 통과 |
| T-04 | 수정 중 카테고리 변경 후 바깥 클릭 | 내용 · 카테고리 저장 | 통과 |
| T-05 | 🗑 → 확인 / 취소 | 확인 시 삭제, 취소 시 유지 | 통과 |
| T-06 | 체크박스 클릭 | 취소선 · 아래로 이동 · 진행률 즉시 갱신 | 통과 |
| T-07 | "업무" 탭 → 새로고침 | 업무 항목만 표시, 탭 유지 | 통과 |
| T-08 | 진행률 | 전체 · 카테고리별 개수와 % 정확, 전부 완료 시 🎉 | 통과 |
| T-09 | 할 일 0개 | "할 일을 추가해 보세요" 안내 | 통과 |
| T-10 | 새로고침 | 항목 · 완료 상태 유지 | 통과 |
| T-11 | `localStorage.todos2`에 깨진 JSON 저장 후 새로고침 | 오류 없이 빈 목록 | 통과 |
| T-12 | 할 일 20개 이상 | 조작 시 지연 없음 | 통과 |
| T-13 | 화면 폭 360px | 레이아웃 깨짐 · 가로 스크롤 없음 | 통과 |
| T-14 | 브라우저 콘솔 | 오류 없음 | 통과 |

**테스트 기록 (2026-11-11)**
- 방법: Playwright로 Microsoft Edge(헤드리스)를 자동 조작해 T-01~T-14를 수행. 추가로 완료 항목 일괄 삭제, 잘못된 항목만 걸러내기, 키보드만으로 추가 · 체크 · 수정도 확인 (17개 검사 모두 통과).
- T-12: 할 일 25개에서 체크 1회당 평균 약 0.6ms.
- 테스트 중 발견해 수정한 문제:
  - 파비콘이 없어 콘솔에 404 오류 → `index.html`에 SVG 이모지 파비콘을 넣음.
  - 삭제 아이콘 `🗑`이 흐린 흑백 글자로 보임 → 이모지 표시 문자를 붙인 `🗑️`로 변경.
- 2026-11-11 추가: Chromium 158(Chrome의 기반 오픈소스 브라우저, Playwright)에서도 같은 테스트 17개와 편집 중 클릭 시나리오 8개 모두 통과. Chrome 자체는 테스트 PC에 설치되어 있지 않아 Chromium으로 대신 확인함.

### 8.3 수동 테스트 팁
개발자 도구(F12) → **Application** → **Local Storage**에서 `todos2` 값을 직접 보고 고치거나 지울 수 있다.

---

## 9. 알려진 제약 및 향후 과제
| 항목 | 내용 |
|---|---|
| 데이터 범위 | 사용하는 브라우저에만 저장, 다른 기기와 공유 안 됨 |
| 향후 과제 | 다크 모드, 삭제 실행 취소, JSON 백업/복원, 드래그 정렬, 마감일 |

### 9.1 수정 이력
| 날짜 | 내용 |
|---|---|
| 2026-11-11 | 편집 중 다른 항목의 체크박스 · ✏️ · 🗑나 필터 탭을 누르면 편집만 저장되고 그 클릭이 무시되던 문제 수정 (5.3). 편집 중 클릭 시나리오 8개와 기존 테스트 17개 통과 |
