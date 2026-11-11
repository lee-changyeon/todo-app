# TRD: 개인용 할 일 관리 앱 (Todo App)

| 항목 | 내용 |
|---|---|
| 문서 버전 | v1.0 |
| 작성일 | 2026-11-11 |
| 관련 문서 | [PRD.md](PRD.md) |
| 구현 위치 | [todo-app/](todo-app/) |

> PRD가 **무엇을** 만들지 정의한다면, 이 TRD는 **어떻게** 만드는지 정의합니다.
> 이 문서는 현재 `todo-app/` 구현을 기준으로 작성되었습니다.

---

## 1. 기술 개요

### 1.1 기술 스택
| 영역 | 기술 | 비고 |
|---|---|---|
| 마크업 | HTML5 | 시맨틱 태그 (`main`, `header`, `section`, `nav`, `footer`) |
| 스타일 | CSS3 | CSS 변수, Flexbox, Grid, 미디어 쿼리 |
| 로직 | JavaScript (ES2020) | 외부 라이브러리 없음, 모듈 시스템 없음 |
| 저장소 | Web Storage API (`localStorage`) | 브라우저 로컬 저장 |
| 서버 | 없음 | 정적 파일만으로 동작 |

### 1.2 설계 원칙
1. **무의존성:** npm, 번들러, 프레임워크 없이 파일 3개로 동작
2. **단방향 데이터 흐름:** 상태 변경 → 저장 → 전체 다시 그리기
3. **단일 진실 공급원:** 화면은 항상 `todos` 배열에서 만들어지며, DOM에 상태를 따로 두지 않음
4. **안전한 렌더링:** 사용자 입력은 `textContent`로만 출력 (XSS 방지)

---

## 2. 시스템 아키텍처

### 2.1 구성도
```
┌──────────────────────── 브라우저 ────────────────────────┐
│                                                          │
│   index.html ──(link)──> style.css                       │
│       │                                                  │
│    (script)                                              │
│       ▼                                                  │
│   app.js                                                 │
│   ┌──────────┐   변경    ┌──────────┐   commit()         │
│   │ 이벤트    │ ───────> │  상태     │ ─────────┐         │
│   │ 핸들러    │          │ todos    │          │         │
│   └──────────┘          │ filter   │          ▼         │
│        ▲                │ editingId│     ┌─────────┐    │
│        │                └──────────┘     │ save()  │──┐ │
│   사용자 입력                              └─────────┘  │ │
│        │                                 ┌─────────┐  │ │
│   ┌──────────┐ <──────────────────────── │render() │  │ │
│   │   DOM    │                           └─────────┘  │ │
│   └──────────┘                                        ▼ │
│                                          ┌────────────┐ │
│                                          │localStorage│ │
│                                          └────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 2.2 데이터 흐름
1. 사용자가 버튼 클릭 / 입력 / 체크
2. 이벤트 핸들러가 상태 변경 함수(`addTodo`, `toggleTodo` 등) 호출
3. 상태 변경 함수가 `todos` 배열을 수정한 뒤 `commit()` 호출
4. `commit()` = `save()` + `render()`
5. `render()`가 진행률, 필터 탭, 목록을 상태로부터 다시 그림

앱 시작 시: `loadTodos()` / `loadFilter()` → `render()`

---

## 3. 파일 구조

```
todo-app/
├── index.html   # 정적 마크업 (빈 목록 컨테이너 포함)
├── style.css    # 전체 스타일 (약 250줄)
└── app.js       # 전체 로직 (약 330줄)
```

| 파일 | 책임 | 의존 |
|---|---|---|
| `index.html` | 고정 레이아웃, 폼, 필터 버튼, 빈 `<ul>` 컨테이너 제공 | `style.css`, `app.js` |
| `style.css` | 색상 토큰, 레이아웃, 컴포넌트 스타일, 반응형 | 없음 |
| `app.js` | 상태 관리, 저장/복원, 렌더링, 이벤트 처리 | DOM ID/클래스 (`index.html`) |

`app.js`는 `</body>` 직전에 로드되므로 `DOMContentLoaded` 대기 없이 DOM에 바로 접근합니다.

---

## 4. 데이터 설계

### 4.1 Todo 스키마
```js
{
  id: "1731300000000k3f9",   // string: Date.now() + 랜덤 4자 (같은 ms 충돌 방지)
  text: "보고서 초안 작성",    // string: trim 후 1~100자
  category: "work",           // "work" | "personal" | "study"
  completed: false,           // boolean
  createdAt: 1731300000000    // number: 생성 시각(ms), 정렬 기준
}
```

### 4.2 애플리케이션 상태 (메모리)
| 변수 | 타입 | 설명 | 저장 여부 |
|---|---|---|---|
| `todos` | `Todo[]` | 전체 할 일 목록 | O (`todos`) |
| `currentFilter` | `"all" \| "work" \| "personal" \| "study"` | 선택된 필터 탭 | O (`todoFilter`) |
| `editingId` | `string \| null` | 인라인 편집 중인 항목 ID | X (새로고침 시 해제) |

### 4.3 상수
```js
const STORAGE_KEY = "todos";
const FILTER_KEY  = "todoFilter";
const MAX_LENGTH  = 100;
const CATEGORIES  = { work: "업무", personal: "개인", study: "공부" };
```
`CATEGORIES`는 카테고리 검증, 드롭다운 생성, 진행률 계산에 공통으로 사용됩니다.

### 4.4 localStorage 명세
| 키 | 값 형식 | 예시 |
|---|---|---|
| `todos` | `JSON.stringify(Todo[])` | `[{"id":"...","text":"장보기",...}]` |
| `todoFilter` | 문자열 | `"work"` |

### 4.5 데이터 검증 (불러오기 시)
`loadTodos()`는 다음 경우 빈 배열 `[]`을 반환하거나 해당 항목을 제외합니다.

| 상황 | 처리 |
|---|---|
| 키 없음 (`null`) | `[]` |
| JSON 파싱 실패 | `try/catch` → `[]` |
| 배열이 아님 | `[]` |
| `text`가 문자열이 아니거나 `category`가 허용값이 아닌 항목 | 해당 항목만 제외 |
| `localStorage` 접근 자체가 막힘 (사생활 보호 모드 등) | `[]` |

`loadFilter()`도 허용값이 아니면 `"all"`로 되돌립니다.

---

## 5. 모듈(함수) 설계

### 5.1 저장 계층
| 함수 | 입력 | 출력 | 설명 |
|---|---|---|---|
| `loadTodos()` | – | `Todo[]` | localStorage에서 읽고 검증 |
| `loadFilter()` | – | `string` | 마지막 필터 복원 |
| `save()` | – | – | `todos`, `currentFilter` 저장. 실패 시 `console.error`만 남기고 앱은 계속 동작 |

### 5.2 상태 변경 계층
모든 함수는 마지막에 `commit()`을 호출합니다.

| 함수 | 동작 |
|---|---|
| `addTodo(text, category)` | 배열 맨 앞에 새 Todo 추가 (`unshift`) |
| `updateTodo(id, changes)` | 해당 항목에 `changes` 병합 (불변 방식 `map`) |
| `deleteTodo(id)` | 해당 항목 제거 (`filter`) |
| `toggleTodo(id)` | `completed` 반전 → `updateTodo` 위임 |
| `clearCompleted()` | 완료 항목 일괄 제거 |
| `setFilter(filter)` | `currentFilter` 변경 |
| `commit()` | `save()` 후 `render()` |

### 5.3 계산 계층 (순수 함수)
| 함수 | 반환 | 설명 |
|---|---|---|
| `getProgress(list)` | `{ done, total, percent }` | `total`이 0이면 `percent`는 0. `percent`는 반올림 정수 |
| `getVisibleTodos()` | `Todo[]` | 필터 적용 → 정렬 (원본 배열은 바꾸지 않음) |

**정렬 규칙:** ① 미완료 → 완료 순, ② 같은 그룹 안에서는 `createdAt` 내림차순(최신 먼저)
```js
(a, b) => a.completed - b.completed || b.createdAt - a.createdAt
```

### 5.4 렌더링 계층
| 함수 | 대상 DOM | 설명 |
|---|---|---|
| `render()` | 전체 | 아래 세 함수 호출 + "완료 항목 지우기" 버튼 활성/비활성 |
| `renderProgress()` | `.progress` | 0개면 안내 문구만, 아니면 전체 바 + 카테고리별 3칸 그리드. 100%면 `.is-done` 클래스 |
| `renderFilters()` | `.filters button` | `aria-selected` 갱신 |
| `renderList()` | `#todoList`, `#emptyList` | `replaceChildren()`로 목록 교체, 빈 상태 문구, 편집 중이면 입력창에 포커스 |
| `createTodoItem(todo)` | – | `<li>` 생성. `editingId`와 같으면 편집 모드(select + input), 아니면 일반 모드(체크박스 + 배지 + 텍스트 + 버튼) |
| `createIconButton(icon, action, label)` | – | ✏️ / 🗑 버튼 생성 |

**렌더링 방식:** 매번 목록 전체를 다시 만듭니다. PRD 기준 하루 10~20개 규모에서는 가상 DOM이나 부분 갱신 없이도 충분히 빠릅니다.

### 5.5 편집 제어
| 함수 | 설명 |
|---|---|
| `startEdit(id)` | `editingId` 설정 후 렌더 → 해당 항목이 편집 모드로 그려짐 |
| `finishEdit(saveChanges)` | `editingId`를 먼저 `null`로 바꾼 뒤(중복 호출 방지) 저장 또는 취소. 빈 텍스트면 원래 값 유지 |

---

## 6. 이벤트 처리 설계

### 6.1 이벤트 위임
목록 항목은 렌더할 때마다 새로 만들어지므로, 리스너를 각 항목이 아닌 **부모 컨테이너(`#todoList`)에 한 번만** 등록합니다. 클릭된 요소의 `data-action` 속성으로 동작을 구분합니다.

| `data-action` | 요소 | 동작 |
|---|---|---|
| `toggle` | 체크박스 | `toggleTodo(id)` |
| `edit` | ✏️ 버튼 (클릭) / 텍스트 (더블클릭) | `startEdit(id)` |
| `delete` | 🗑 버튼 | `confirm()` 후 `deleteTodo(id)` |

항목 ID는 `e.target.closest(".todo-item").dataset.id`로 얻습니다.

### 6.2 이벤트 목록
| 대상 | 이벤트 | 처리 |
|---|---|---|
| `#addForm` | `submit` | 기본 동작 막기 → trim → 빈 값이면 `.shake` 애니메이션, 아니면 `addTodo` 후 입력창 비우고 포커스 유지 |
| `#addInput` | `animationend` | `.shake` 클래스 제거 |
| `document` | `mousedown` | 편집 중에 체크박스 · 버튼이나 필터 탭을 누르면 `preventDefault()`로 포커스 이동을 막음 (6.3) |
| `#todoList` | `click` | 편집 중이면 `finishEdit(true)`로 먼저 저장 → 6.1 표 참고 |
| `#todoList` | `dblclick` | 텍스트 더블클릭 시 편집 시작 |
| `#todoList` | `keydown` | 편집 중 `Enter` → 저장, `Esc` → 취소 |
| `#todoList` | `focusout` | **편집 입력창 · 카테고리 선택**에서 포커스가 항목 밖으로 나가면 저장 (`relatedTarget`으로 판단, 같은 항목 안의 select ↔ input 이동은 무시). 다른 요소의 `focusout`은 무시 (6.3) |
| `.filters` | `click` | 편집 중이면 `finishEdit(true)`로 먼저 저장 → `data-filter` 값으로 `setFilter` |
| `#clearDone` | `click` | 완료 개수 표시한 `confirm()` 후 `clearCompleted` |

### 6.3 편집 관련 버그 수정 (2026-11-11)
1. **✏️ 버튼으로 편집을 시작하면 오류가 나던 문제**
   ✏️ 버튼에 포커스가 있는 상태에서 목록을 다시 그리면 사라지는 버튼에서 `focusout`이 발생한다 (현재 Edge · Chrome 동작).
   이전 `focusout` 처리는 어떤 요소에서 나간 포커스든 편집 종료로 보고 `finishEdit`을 불러, 편집기가 그려지기 전에
   `.edit-input`을 읽다가 `Cannot read properties of null` 오류가 났다. 그 결과 고친 내용이 저장되지 않았다
   (텍스트 더블클릭으로 시작한 편집은 정상).
   → `focusout`은 `.edit-input` · `.edit-select`에서 나간 경우만 처리하고, `finishEdit`은 편집기 요소가 없으면 값을 읽지 않도록 했다.
2. **편집 중 다른 컨트롤 클릭이 무시되던 문제**
   편집 중에 다른 항목의 체크박스 · ✏️ · 🗑를 누르면 `mousedown` 때 `focusout` → 저장 → 다시 그리기가 먼저 일어나
   누른 요소가 사라지고 클릭이 무시됐다.
   → `mousedown`에서 `button[data-action]` · `input[data-action]` · `[data-filter]`이면 포커스 이동을 막고,
   `click` 처리에서 편집을 먼저 저장한 뒤 원래 동작을 실행한다. 편집 중인 항목 자신의 체크박스를 눌러도 고친 내용이 저장된 뒤 완료 처리된다.

---

## 7. UI / 스타일 설계

### 7.1 디자인 토큰 (CSS 변수)
| 변수 | 값 | 용도 |
|---|---|---|
| `--primary` | `#4f46e5` | 주요 버튼, 전체 진행 바, 선택된 탭, 포커스 링 |
| `--work` | `#3b82f6` | 업무 배지·바 |
| `--personal` | `#22c55e` | 개인 배지·바 |
| `--study` | `#f59e0b` | 공부 배지·바 |
| `--danger` | `#ef4444` | 입력 오류, "완료 항목 지우기" hover |
| `--text` / `--muted` / `--line` / `--bg` / `--card` | 회색 계열 | 텍스트, 보조 텍스트, 구분선, 배경 |

### 7.2 상태별 클래스
| 클래스 | 적용 대상 | 효과 |
|---|---|---|
| `.completed` | `.todo-item` | 텍스트 취소선 + 흐림, 배지 투명도 50% |
| `.is-done` | `.progress` | 전체 100% 시 퍼센트 옆에 🎉 |
| `.shake` | `#addInput` | 빈 입력 시 좌우 흔들림 + 빨간 테두리 |
| `[aria-selected="true"]` | 필터 버튼 | 채워진 강조 스타일 |

### 7.3 반응형
| 화면 폭 | 레이아웃 |
|---|---|
| 481px 이상 | 최대 600px 중앙 카드, 입력창·카테고리·추가 버튼 한 줄 |
| 480px 이하 | 카드가 화면 전체를 채움, 입력창 한 줄 + (카테고리, 추가 버튼) 한 줄 |

- **2026-11-11 UI 점검 후 보강** (320 · 360 · 390 · 768 · 1280px 측정):
  - 480px 이하 목록 항목을 CSS Grid로 `체크박스 | (배지 위 · 내용 아래) | 버튼` 배치 → 320px에서 내용 칸이 약 100px로 좁아 글자가 잘게 줄바꿈되던 문제 해결.
  - 480px 이하 필터 탭 4개를 같은 너비로 한 줄에 배치 → 320px에서 마지막 탭이 잘리던 문제 해결.
  - 터치 대상: 아이콘 버튼 40×40px, 탭 · "완료 항목 지우기" 높이 40px 이상.
  - 체크박스: 보이는 크기 22px, 누르는 영역은 `<label class="check-wrap">`(40×40px)로 감싸 넓힘. 바깥 여백을 -9px로 줄여 배치는 그대로.
    라벨 여백을 누르면 브라우저 기본 라벨 동작(체크박스로 포커스 이동 → 클릭)을 막고 앱이 직접 체크 처리한다 —
    편집 중일 때 포커스 이동으로 저장 · 다시 그리기가 먼저 일어나 체크가 사라지던 문제를 막기 위함. `mousedown` 포커스 방지 대상에도 `.check-wrap` 추가.
  - 입력창 · 선택 상자 글자 16px (16px 미만이면 iOS에서 누를 때 화면이 확대됨).
  - 결과: 5개 폭 모두 가로 스크롤 · 화면 밖 요소 없음 (편집 중 포함). 기존 기능 테스트 회귀 통과.
  - todo-app 추가: 카테고리별 진행률을 한 줄에 하나씩(글자 · 막대 나란히) 배치 — 320px에서 "업무 0/2 · / 0%"처럼 끊기던 문제 해결.
  - todo-app 추가: 편집 행을 `체크박스 · 카테고리` / `입력창(전체 너비)` 두 줄로 — 편집 중 항목에 `.editing` 클래스를 붙임 (`createTodoItem`).

---

## 8. 보안 및 접근성

### 8.1 보안
| 위협 | 대응 |
|---|---|
| XSS (할 일 텍스트에 `<script>` 등 입력) | `innerHTML` 사용 안 함. 모든 사용자 데이터는 `textContent`로 출력 |
| 조작된 localStorage 데이터 | 불러올 때 타입·허용값 검증 (4.5 참고) |
| 과도한 입력 | `maxlength="100"` + JS에서 `slice(0, 100)` 이중 제한 |

서버 통신이 없으므로 인증·전송 구간 보안은 해당 없습니다.

### 8.2 접근성
- 모든 입력·체크박스·아이콘 버튼에 `aria-label` 제공 (예: "장보기 완료", "장보기 삭제")
- 필터 탭은 `role="tablist"` / `role="tab"` + `aria-selected`
- 카테고리는 색상과 함께 **텍스트 배지**로도 구분
- 키보드 조작: Tab 이동, Enter 추가·저장, Space 체크, Esc 편집 취소
- `:focus` / `:focus-visible`에 2px 포커스 링

---

## 9. 비기능 요구사항 대응

| 항목 (PRD 7장) | 기술적 대응 |
|---|---|
| 성능 (100개까지 지연 없음) | 전체 렌더 방식이지만 DOM 노드 수가 적어 충분. `replaceChildren()` 한 번으로 목록 교체 |
| 신뢰성 (새로고침 시 100% 유지) | 모든 상태 변경이 `commit()`을 거쳐 즉시 저장 |
| 오류 내성 | 저장·불러오기 모두 `try/catch`. 저장 실패해도 메모리 상태로 계속 동작 |
| 유지보수 | 계층별 함수 분리 (저장 / 상태 변경 / 계산 / 렌더 / 이벤트) |

### 9.1 지원 브라우저
최신 Chrome, Edge, Firefox, Safari. 사용한 기능 중 가장 최신은 다음과 같습니다.
- `Element.replaceChildren()` (Chrome 86+, Safari 14+)
- `form.requestSubmit()` (테스트 시에만 사용)
- 객체 전개 연산자 `{...obj}`, 매개변수 없는 `catch {}`

### 9.2 제약 사항
- `localStorage`는 **브라우저·도메인별**로 저장되어 다른 브라우저나 기기와 공유되지 않음
- 용량 한도 약 5MB (할 일 1개 ≈ 150바이트 → 수만 개 수준이라 실사용에 문제 없음)
- 브라우저 데이터 삭제 시 할 일도 함께 삭제됨 (백업은 PRD P2 범위)
- 일부 미리보기 환경(`data:` URL)에서는 localStorage가 막혀 저장되지 않음 → 실제 파일 또는 로컬 서버로 열어야 함

---

## 10. 실행 및 테스트

### 10.1 실행 방법
**방법 1 — 파일로 열기:** `todo-app/index.html`을 더블클릭

**방법 2 — 로컬 서버:** 프로젝트 루트에서
```bash
python -m http.server 5500 --directory todo-app
```
이후 브라우저에서 `http://localhost:5500` 접속 ([.claude/launch.json](.claude/launch.json)에 같은 설정이 있음)

### 10.2 테스트 케이스 (PRD 8장 수용 기준 대응)
| ID | 시나리오 | 기대 결과 | 결과 |
|---|---|---|---|
| T-01 | 텍스트 입력 후 Enter | 선택한 카테고리로 목록 맨 위에 추가 | 통과 |
| T-02 | 공백만 입력 후 Enter | 추가 안 됨, 입력창 흔들림 | 통과 |
| T-03 | ✏️ 클릭 → 수정 → Enter | 내용 변경됨 | 통과 |
| T-04 | ✏️ 클릭 → 수정 → Esc | 원래 내용 유지 | 통과 |
| T-05 | 🗑 클릭 → 확인 | 항목 삭제 | 통과 |
| T-06 | 체크박스 클릭 | 취소선, 아래로 이동, 진행률 즉시 갱신 | 통과 |
| T-07 | "업무" 탭 클릭 | 업무 항목만 표시 | 통과 |
| T-08 | 진행률 표시 | 전체 `1 / 4 (25%)`, 카테고리별 개수·% 정확 | 통과 |
| T-09 | 할 일 0개 | "할 일을 추가해 보세요" 안내 | 통과 |
| T-10 | 새로고침 | 항목·완료 상태 유지 | 통과 |
| T-11 | `localStorage.todos`에 깨진 JSON 저장 후 새로고침 | 오류 없이 빈 목록 | 통과 |
| T-12 | 좁은 화면 (약 450px) | 레이아웃 깨짐 없음 | 통과 |
| T-13 | 콘솔 오류 | 없음 | 통과 |

> **2026-11-11 재검증:** Playwright로 Edge(헤드리스)를 자동 조작해 다시 확인한 결과, 수정 전 코드는 **T-03(✏️ 클릭 → 수정 → Enter)이 실패**했다 (6.3의 1번 버그).
> 6.3 수정 후 T-01 ~ T-13 통과, 편집 중 클릭 시나리오 9개 통과.

### 10.3 수동 테스트 팁
브라우저 개발자 도구(F12) → **Application** 탭 → **Local Storage**에서 `todos` 값을 직접 보고 수정·삭제할 수 있습니다.

---

## 11. 향후 기술 과제
| 과제 | 기술 방향 |
|---|---|
| 백업/복원 (PRD P2) | `Blob` + `URL.createObjectURL`로 JSON 내보내기, `<input type="file">` + `FileReader`로 가져오기 |
| 삭제 실행 취소 (PRD P2) | 마지막 삭제 항목을 임시 보관 후 토스트에서 복원 |
| 다크 모드 (PRD P2) | `prefers-color-scheme` 미디어 쿼리로 CSS 변수 재정의 |
| 드래그 정렬 (PRD P2) | HTML5 Drag and Drop API + `order` 필드 추가 |
| 마감일·우선순위 | Todo 스키마에 `dueDate`, `priority` 추가, 기존 데이터는 기본값으로 마이그레이션 |
| 오프라인 설치 (PWA) | `manifest.json` + Service Worker로 정적 파일 캐시 |
| 자동 테스트 | 계산 함수(`getProgress`, `getVisibleTodos`)를 분리해 단위 테스트 작성 |
