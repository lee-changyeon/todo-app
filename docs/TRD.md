# TRD: 할 일 앱 프로젝트 (todo-app · todo-app2 · todo-app3)

| 항목 | 내용 |
|---|---|
| 문서 버전 | v1.0 |
| 작성일 | 2026-11-11 |
| 범위 | 저장소 전체의 공통 구조 · 배포 · 테스트 · 세션 중 기술 결정과 버그 수정 |
| 관련 문서 | [PRD.md](PRD.md) · [TASKS.md](TASKS.md) |

> 앱별 함수 · 이벤트 세부 설계는 각 앱 TRD에 있습니다: [todo-app](../TRD.md) · [todo-app2](../todo-app2/TRD.md) · [todo-app3](../todo-app3/TRD.md).

---

## 1. 기술 스택
| 영역 | 기술 |
|---|---|
| 앱 | HTML5 · CSS3 · Vanilla JavaScript (todo-app · todo-app2: ES2020, todo-app3: ES2022 `Object.hasOwn`) |
| 저장 | `localStorage` |
| 배포 | GitHub Pages + GitHub Actions (`.github/workflows/pages.yml`) |
| 로컬 실행 | `python -m http.server 5500 --directory <앱 폴더>` 또는 `index.html` 더블클릭 |
| 테스트 | Playwright(Python) + Microsoft Edge 헤드리스 / Chromium 158 — 작업용 임시 폴더의 가상환경에 설치 (저장소에는 없음) |

---

## 2. 저장소 구조
```
.
├── todo-app/        # 첫 앱 (사이트 루트로 배포)
├── todo-app2/       # 두 번째 앱 + PRD · TRD · TASKS · PROMPTS
├── todo-app3/       # 5단계 프롬프트로 만든 앱 + TRD · TASKS
├── docs/            # 프로젝트 전체 PRD · TRD · TASKS (이 문서)
├── .github/workflows/pages.yml
├── PRD.md · TRD.md · TASKS.md   # todo-app 문서
├── README.md · CLAUDE.md
```

---

## 3. 공통 아키텍처 (세 앱 동일)
```
이벤트 → 상태 변경 함수 → commit() = save() + render()
                                        └→ 진행률 · 탭 · 목록을 상태로부터 전부 다시 그림
```
- **단일 진실 공급원:** 화면은 항상 할 일 배열로부터 새로 만든다 (`replaceChildren`).
- **이벤트 위임:** 목록 컨테이너 하나에 리스너, `data-action`(`toggle` · `edit` · `delete`/`remove`)으로 구분.
- **안전한 렌더링:** 사용자 입력은 `textContent` · `new Option()`으로만 출력.
- **불러오기 검증:** 깨진 JSON · 잘못된 항목을 걸러 빈 목록으로 시작.

### 3.1 앱별 차이
| 항목 | todo-app | todo-app2 | todo-app3 |
|---|---|---|---|
| 상태 | 전역 변수 | 전역 변수 | `state` 객체 |
| 목록 · 항목 | `#todoList` · `.todo-item` | `#todoList` · `.todo-item` | `#list` · `.item` |
| 완료 · 편집 클래스 | `.completed` · `.editing` | `.completed` · `.editing` | `.is-done` · `.is-editing` |
| 필터 탭 | HTML 고정 (`aria-selected`) | JS로 생성 (`.active`) | JS로 생성 (`.is-active`) |
| 자동 분류 | 없음 | 있음 | 있음 |

---

## 4. 배포 설계
워크플로가 `_site/` 폴더를 만들어 한 번에 올린다.
```bash
mkdir _site
cp -r todo-app/. _site/                      # 사이트 루트
for app in todo-app2 todo-app3; do
  mkdir "_site/$app"
  cp "$app/index.html" "$app/style.css" "$app/app.js" "_site/$app/"   # 앱 파일 3개만
done
```
- 기획 문서 `*.md`는 배포되지 않는다 (배포 후 `PRD.md` 주소 404로 확인).
- `todo-app2` · `todo-app3`에 새 파일을 추가하면 이 `cp` 줄에도 넣어야 배포된다.
- 세 앱이 같은 출처(origin)라 `localStorage`를 공유하므로 **저장 키를 앱마다 다르게** 했다 (`todos` · `todos2` · `todos3`).
- push 후 반영까지 보통 약 20초. 배포 확인은 파일 내용에 새 코드가 들어갔는지 `curl`로 확인한 뒤 실제 주소에서 Playwright 테스트를 다시 돌렸다.

---

## 5. 키워드 자동 분류 (todo-app2 · todo-app3)
| 요소 | 설계 |
|---|---|
| `CATEGORY_KEYWORDS` | 카테고리별 소문자 키워드 22~23개. "책" · "집" · "문제"처럼 짧거나 흔한 말은 오분류("책임", "집중") 때문에 제외 |
| `guessCategory(text)` | 순수 함수. 소문자 내용에 **포함된** 키워드 수를 세어 1등 카테고리 반환, 일치 없음 · 동점이면 `null` |
| `applyAutoCategory()` | 입력창 `input` 이벤트마다 실행. 결과가 있으면 그 카테고리, 없으면 기준 카테고리로 선택 상자 변경 + 안내 표시 |
| 기준 카테고리 | `baseCategory` — 사용자가 직접 고른 값 또는 마지막으로 추가한 카테고리 |
| 선택 상자 `change` | 기준 카테고리 갱신, 안내 숨김 (잠금 없음 — 다음 입력에서 다시 자동 분류) |

> 첫 구현의 `categoryLocked`(직접 고르면 추가할 때까지 멈춤)는 사용자 피드백으로 제거했다.

---

## 6. 반응형 · 접근성 설계
| 항목 | 설계 |
|---|---|
| 목록 항목 (≤480px) | CSS Grid `체크박스 \| (배지 위 · 내용 아래) \| 버튼` — `grid-template-areas`로 DOM 변경 없이 배치 |
| 필터 탭 (≤480px) | `flex: 1 1 0`으로 4개 같은 너비 한 줄 |
| todo-app 진행률 (≤480px) | 카테고리별 한 줄씩, 글자 · 막대 나란히 |
| todo-app 편집 행 (≤480px) | `.editing` 클래스(JS 한 줄 추가)로 `체크박스 · 카테고리` / `입력창` 두 줄 |
| 터치 대상 | 아이콘 버튼 40×40, 탭 · "완료 항목 지우기" 높이 40px 이상 |
| 체크박스 | 보이는 크기 22px, `<label class="check-wrap">` 40×40px로 감싸고 `margin: 0 -9px`로 배치 유지 |
| 글자 크기 | 입력창 · 선택 상자 16px (iOS 확대 방지) |
| 기존 CSS | 덮어쓰지 않고 각 `style.css` 끝에 "반응형 보강" 블록으로 추가 |

---

## 7. 세션 중 기술 결정 · 버그 수정

| # | 앱 | 문제 | 원인 | 해결 |
|---|---|---|---|---|
| 1 | 2 | 콘솔 404 | 파비콘 없음 | `index.html`에 SVG 이모지 파비콘 (todo-app에도 적용) |
| 2 | 2 · 1 | 🗑 아이콘이 흐린 흑백 | 이모지 표시 문자(U+FE0F) 없음 | `🗑️`로 변경 |
| 3 | 3 | `<time datetime>`이 오전 9시 전에 전날 | `toISOString()`이 UTC | 현지 연 · 월 · 일로 생성 |
| 4 | 2 · 3 · 1 | 편집 중 다른 항목 체크 · 수정 · 삭제 · 탭 클릭이 무시됨 | `mousedown` 때 `focusout` → 저장 → 다시 그리기가 먼저 일어나 누른 요소가 사라짐 | `mousedown`에서 다시 그려지는 컨트롤이면 `preventDefault()`, `click`에서 먼저 저장 후 동작 실행 |
| 5 | 1 | ✏️ 버튼으로 편집 시작 시 오류, 수정 내용 저장 안 됨 | 다시 그리기로 사라지는 ✏️ 버튼의 `focusout`을 편집 종료로 처리 → 편집기 생성 전 `null.value` | `focusout`은 `.edit-input` · `.edit-select`에서 나간 경우만, `finishEdit`은 요소 없으면 읽지 않음 |
| 6 | 3 | 추가 폼 카테고리 기본값이 "공부" | 다른 `<select>`에서 옵션을 옮겨 오며 선택 상태 유실 | `newCategory.value = "work"` 직접 지정 |
| 7 | 2 · 3 | 자동 분류가 직접 선택 후 멈춤 | `categoryLocked` 설계 | 잠금 제거 (요구사항 변경) |
| 8 | 1 · 2 · 3 | 편집 중 체크박스 라벨 여백 클릭 시 체크 안 됨 | 라벨 기본 동작(체크박스로 포커스 → 클릭) 중 포커스 이동으로 다시 그리기 | 라벨 여백 클릭은 기본 동작을 막고 직접 체크 처리, `mousedown` 방지 대상에 `.check-wrap` 추가 |

> 루트 TRD에 "통과"로 적혀 있던 todo-app T-03(✏️ 수정)은 재검증에서 실패했고(#5), 수정 후 통과로 바로잡았다.

---

## 8. 테스트 설계
모두 Playwright로 실제 브라우저(Edge 헤드리스)를 조작한다. 로컬 정적 서버 또는 배포 주소를 대상으로 같은 스크립트를 돌렸다.

| 테스트 | 대상 | 항목 수 | 내용 |
|---|---|---|---|
| 기능 회귀 | todo-app / 2 / 3 | 11 / 17 / 14 | 각 앱 TRD 테스트 케이스 (추가 · 수정 · 삭제 · 체크 · 필터 · 진행률 · 저장 · 깨진 데이터 · 360px · 콘솔) |
| 편집 중 클릭 | todo-app / 2 / 3 | 9 / 8 / 8 | 편집 중 다른 항목 체크 · ✏️ · 🗑 · 필터 탭 · 빈 곳 · 입력창 클릭 |
| 자동 분류 | todo-app2 / 3 | 8 / 8 | AC-14 ~ AC-18, 수정 중 미적용, 특수문자, 콘솔 |
| UI 점검 | 세 앱 × 5개 폭 | 15 조합 | 가로 스크롤 · 화면 밖 요소 · 40px 미만 터치 대상 · 16px 미만 입력 글자 · 탭 잘림 (일반 · 편집 중) |
| 체크박스 영역 | 세 앱 × 360 · 1000px | 6 | 라벨 모서리로 체크 · 해제, 편집 중 클릭 |
| 날짜 | todo-app3 (+ 1 · 2 확인) | 3 시각 | KST 08:30 · 23:50 · 1월 5일 00:10에서 화면 날짜 · `datetime` 일치 |

- 수정 전 코드로도 같은 테스트를 돌려 **문제가 실제로 재현되는지** 먼저 확인한 뒤 고쳤다 (예: 편집 중 클릭 3/8 → 8/8).
- Chrome은 테스트 PC에 없어 Chromium 158로 대신 확인했다.
- 테스트 스크립트는 저장소에 넣지 않았다 (다음 과제: 저장소에 테스트 추가).

---

## 9. 알려진 제약
| 항목 | 내용 |
|---|---|
| 데이터 범위 | 브라우저별 저장, 기기 간 공유 안 됨. 파일로 연 앱과 서버로 연 앱의 저장 공간도 다름 |
| 자동 분류 | 키워드 목록 기반이라 목록에 없는 말은 분류하지 못함 |
| 테스트 | 자동 테스트가 저장소 밖(작업용 임시 폴더)에 있음 |
| 브라우저 | Chrome · Safari · 실제 모바일 기기는 직접 확인하지 않음 |
