# TASKS: 개인용 할 일 관리 앱 (Todo App)

| 항목 | 내용 |
|---|---|
| 문서 버전 | v1.0 |
| 작성일 | 2026-11-11 |
| 관련 문서 | [PRD.md](PRD.md) · [TRD.md](TRD.md) |
| 구현 위치 | [todo-app/](todo-app/) |

> PRD의 기능과 TRD의 설계를 실제 작업 단위로 나눈 체크리스트입니다.
> `[x]` = 완료, `[ ]` = 남은 작업. 우선순위 P0(필수) / P1(있으면 좋음) / P2(추후)는 PRD와 같습니다.

---

## 진행 현황

| 단계 | 내용 | 우선순위 | 상태 |
|---|---|---|---|
| M1 | 프로젝트 준비 · HTML 뼈대 · 기본 CSS | P0 | ✅ 완료 |
| M2 | 상태 관리 · 저장/불러오기 | P0 | ✅ 완료 |
| M3 | 추가 · 삭제 · 완료 체크 | P0 | ✅ 완료 |
| M4 | 수정 · 카테고리 | P0 | ✅ 완료 |
| M5 | 필터 · 진행률 | P0 | ✅ 완료 |
| M6 | 사용성 개선 | P1 | ✅ 완료 |
| M7 | 테스트 · 문서화 | P0 | ✅ 완료 |
| M8 | 배포 · 버전 관리 | P1 | ✅ 완료 |
| M9 | 추가 기능 | P2 | ⬜ 남음 |

**P0 / P1 기능과 배포까지 모두 완료**되었고, 실사용 테스트(T7-9, T7-10)와 P2 기능이 남아 있습니다.

---

## M1. 프로젝트 준비 · HTML 뼈대 · 기본 CSS

- [x] **T1-1** `todo-app/` 폴더와 파일 3개 만들기 (`index.html`, `style.css`, `app.js`)
- [x] **T1-2** `index.html` 기본 구조 작성 (`lang="ko"`, `charset`, `viewport`)
- [x] **T1-3** 헤더: 제목 "📝 오늘의 할 일" + 날짜 자리 (`#today`)
- [x] **T1-4** 진행률 영역: 전체 바, 카테고리별 목록, 빈 상태 안내 문구
- [x] **T1-5** 입력 폼: 텍스트 입력(`maxlength=100`) + 카테고리 `select` + 추가 버튼
- [x] **T1-6** 필터 탭 4개 (전체/업무/개인/공부)
- [x] **T1-7** 빈 목록 `<ul id="todoList">` + 빈 상태 문구 + "완료 항목 지우기" 버튼
- [x] **T1-8** CSS 변수(색상 토큰) 정의, 중앙 카드 레이아웃(최대 600px)

**완료 조건:** 브라우저에서 열었을 때 정적인 화면이 보인다.

---

## M2. 상태 관리 · 저장/불러오기

- [x] **T2-1** 상수 정의: `STORAGE_KEY`, `FILTER_KEY`, `MAX_LENGTH`, `CATEGORIES`
- [x] **T2-2** 상태 변수: `todos`, `currentFilter`, `editingId`
- [x] **T2-3** `loadTodos()` — JSON 파싱 + `try/catch` + 배열·항목 검증
- [x] **T2-4** `loadFilter()` — 허용값이 아니면 `"all"`
- [x] **T2-5** `save()` — `todos`, `currentFilter` 저장, 실패 시 콘솔 기록만
- [x] **T2-6** `commit()` = `save()` + `render()` 단방향 흐름 만들기

**완료 조건:** 깨진 데이터가 저장돼 있어도 오류 없이 빈 목록으로 시작한다.

---

## M3. 추가 · 삭제 · 완료 체크 (PRD F1, F3, F4)

- [x] **T3-1** `addTodo(text, category)` — 고유 `id`(시간 + 랜덤), `createdAt` 포함
- [x] **T3-2** 폼 `submit` 처리: trim, 빈 값이면 `.shake` 애니메이션, 추가 후 입력창 비우고 포커스 유지
- [x] **T3-3** `createTodoItem()` — 체크박스, 텍스트(`textContent`), ✏️ / 🗑 버튼
- [x] **T3-4** `renderList()` — `replaceChildren()`로 목록 교체
- [x] **T3-5** 목록 이벤트 위임 (`data-action`: `toggle` / `edit` / `delete`)
- [x] **T3-6** `deleteTodo(id)` + `confirm()` 확인창
- [x] **T3-7** `toggleTodo(id)` + 완료 스타일 (취소선, 흐림)
- [x] **T3-8** 정렬: 미완료 먼저, 같은 그룹 안에서 최신순

**완료 조건:** 추가·삭제·체크가 되고, 새로고침해도 유지된다.

---

## M4. 수정 · 카테고리 (PRD F2, F5)

- [x] **T4-1** 카테고리 배지 (업무 파랑 / 개인 초록 / 공부 주황)
- [x] **T4-2** `startEdit(id)` — ✏️ 클릭 또는 텍스트 더블클릭으로 편집 모드
- [x] **T4-3** 편집 모드 UI: 카테고리 `select` + 텍스트 `input`, 자동 포커스
- [x] **T4-4** `finishEdit(saveChanges)` — Enter 저장, Esc 취소, 빈 값이면 원래 값 유지
- [x] **T4-5** 포커스가 항목 밖으로 나가면 저장 (`focusout` + `relatedTarget`)
- [x] **T4-6** `updateTodo(id, changes)` — 불변 방식 병합

**완료 조건:** 텍스트와 카테고리를 모두 수정할 수 있다.

---

## M5. 필터 · 진행률 (PRD F5, F6)

- [x] **T5-1** `setFilter()` + 필터 탭 클릭 이벤트
- [x] **T5-2** `renderFilters()` — `aria-selected`로 선택 탭 강조
- [x] **T5-3** `getVisibleTodos()` — 필터 적용 + 정렬
- [x] **T5-4** `getProgress(list)` — `{ done, total, percent }`, 0개일 때 0%
- [x] **T5-5** 전체 진행률: `완료 / 전체 (퍼센트%)` + 프로그레스 바
- [x] **T5-6** 카테고리별 진행률: 3칸 그리드 + 미니 바
- [x] **T5-7** 할 일 0개일 때 "할 일을 추가해 보세요" 안내

**완료 조건:** 체크할 때마다 전체·카테고리별 진행률이 즉시 바뀐다.

---

## M6. 사용성 개선 (PRD P1)

- [x] **T6-1** 오늘 날짜 표시 (`toLocaleDateString("ko-KR")`)
- [x] **T6-2** 빈 목록 문구 (전체 / 카테고리별로 다르게)
- [x] **T6-3** "완료 항목 지우기" — 완료 개수 확인창, 완료 항목 없으면 버튼 비활성
- [x] **T6-4** 마지막 선택 필터 기억 (`todoFilter`)
- [x] **T6-5** 100% 달성 시 🎉 표시
- [x] **T6-6** 반응형: 480px 이하에서 전체 화면 카드 + 입력 폼 두 줄
- [x] **T6-7** 접근성: `aria-label`, `role="tablist"`, 포커스 링

---

## M7. 테스트 · 문서화

- [x] **T7-1** 로컬 서버 실행 설정 ([.claude/launch.json](.claude/launch.json), python 5500번 포트)
- [x] **T7-2** 기능 테스트: 추가 / 빈 값 / 수정(Enter·Esc) / 삭제 / 체크 / 필터 / 진행률
- [x] **T7-3** 새로고침 후 데이터 유지 확인
- [x] **T7-4** 깨진 localStorage 데이터 처리 확인
- [x] **T7-5** 좁은 화면 레이아웃 확인, 콘솔 오류 없음 확인
- [x] **T7-6** [PRD.md](PRD.md) 작성
- [x] **T7-7** [TRD.md](TRD.md) 작성 (테스트 결과 T-01~T-13 포함)
- [x] **T7-8** TASKS.md 작성 (이 문서), README.md 작성
- [ ] **T7-9** 실제 브라우저 여러 곳(Chrome, Edge, 모바일)에서 직접 사용해 보기
- [ ] **T7-10** 할 일 20개 이상 넣고 하루 실사용해 보기

---

## M8. 배포 · 버전 관리

- [x] **T8-1** 변경 사항 git 커밋 (`PRD.md`, `TRD.md`, `TASKS.md`, `todo-app/`, `.claude/launch.json`)
- [x] **T8-2** GitHub 원격 저장소에 push ([lee-changyeon/todo-app](https://github.com/lee-changyeon/todo-app))
- [x] **T8-3** GitHub Pages로 배포 (https://lee-changyeon.github.io/todo-app/, GitHub Actions 자동 배포)
- [x] **T8-4** `README.md` 작성 — 기능, 사용법, 실행 방법, 구조

---

## M9. 추가 기능 (PRD P2 · 향후 확장)

| ID | 작업 | 관련 문서 | 난이도 |
|---|---|---|---|
| [ ] **T9-1** | 삭제 실행 취소 토스트 | PRD F3, TRD 11장 | 중 |
| [ ] **T9-2** | 다크 모드 (`prefers-color-scheme`) | PRD F8 | 하 |
| [ ] **T9-3** | JSON 내보내기 / 가져오기 백업 | PRD F8 | 중 |
| [ ] **T9-4** | 드래그로 순서 변경 (`order` 필드 추가) | PRD F8 | 상 |
| [ ] **T9-5** | 마감일 · 우선순위 필드 | PRD 10장 | 중 |
| [ ] **T9-6** | 어제 미완료 항목 오늘로 이월 | PRD 10장 | 중 |
| [ ] **T9-7** | 사용자 정의 카테고리 | PRD 10장 | 상 |
| [ ] **T9-8** | PWA (오프라인 설치) | PRD 10장, TRD 11장 | 상 |

**추천 순서:** T9-2 다크 모드 → T9-1 실행 취소 → T9-3 백업 (쉬운 것부터, 데이터 안전 관련 먼저)

---

## 작업 규칙

1. 작업 하나를 끝내면 `[ ]`를 `[x]`로 바꾼다.
2. 새 기능은 PRD에 먼저 추가 → TRD에 설계 반영 → 이 문서에 작업 추가 순서로 진행한다.
3. 기능을 추가할 때마다 TRD 10.2의 테스트 케이스를 다시 확인한다.
4. Todo 스키마를 바꿀 때는 기존 localStorage 데이터가 깨지지 않게 기본값을 넣는다.
