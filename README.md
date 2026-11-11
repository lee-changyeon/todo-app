# 📝 오늘의 할 일 (Todo App)

하루 10~20개의 할 일을 가볍게 관리하는 개인용 웹 앱입니다.
설치나 로그인 없이 브라우저에서 바로 쓸 수 있고, 새로고침해도 데이터가 유지됩니다.

## 🔗 바로 사용하기

| 앱 | 배포 주소 | 어떻게 만들었나 | 문서 |
|---|---|---|---|
| **todo-app** | [lee-changyeon.github.io/todo-app/](https://lee-changyeon.github.io/todo-app/) | 처음 만든 앱 | [PRD](PRD.md) · [TRD](TRD.md) · [TASKS](TASKS.md) |
| **todo-app2** | [lee-changyeon.github.io/todo-app/todo-app2/](https://lee-changyeon.github.io/todo-app/todo-app2/) | 새로 기획한 PRD로 다시 만든 앱 | [PRD](todo-app2/PRD.md) · [TRD](todo-app2/TRD.md) · [TASKS](todo-app2/TASKS.md) |
| **todo-app3** | [lee-changyeon.github.io/todo-app/todo-app3/](https://lee-changyeon.github.io/todo-app/todo-app3/) | todo-app2 PRD + [5단계 프롬프트](todo-app2/PROMPTS.md)로 만든 앱 | [TRD](todo-app3/TRD.md) · [TASKS](todo-app3/TASKS.md) (PRD는 todo-app2와 공유) |

- 세 앱은 기능이 거의 같고, 저장 키(`todos` · `todos2` · `todos3`)가 달라 할 일이 서로 섞이지 않습니다.
- 마지막 확인: 2026-11-11 — 세 주소 모두 정상 동작 (편집 관련 버그 수정 반영).

---

## 주요 기능

| 기능 | 설명 |
|---|---|
| ✅ 할 일 관리 | 추가 · 수정 · 삭제, 완료 체크 |
| 🏷️ 카테고리 | 업무 / 개인 / 공부 색상 배지, 카테고리별 필터 |
| 📊 진행률 | 전체 및 카테고리별 완료 개수 · 퍼센트 · 프로그레스 바 |
| 💾 자동 저장 | 모든 변경을 `localStorage`에 즉시 저장 |
| 📱 반응형 | 데스크톱과 모바일 모두 지원 |
| 🤖 자동 분류 | 할 일 내용의 키워드(회의 · 과제 · 운동 등)로 카테고리 자동 선택 — **todo-app2 · todo-app3** |

그 밖에 오늘 날짜 표시, 완료 항목 일괄 삭제, 마지막 필터 기억, 100% 달성 시 🎉 표시를 지원합니다.

## 사용 방법

| 하고 싶은 일 | 방법 |
|---|---|
| 할 일 추가 | 입력창에 쓰고 카테고리 선택 → **Enter** 또는 **추가** |
| 완료 체크 | 왼쪽 체크박스 클릭 (완료 항목은 아래로 이동) |
| 수정 | ✏️ 버튼 또는 텍스트 **더블클릭** → **Enter** 저장 / **Esc** 취소 |
| 삭제 | 🗑️ 버튼 → 확인 |
| 카테고리별 보기 | 상단 **전체 / 업무 / 개인 / 공부** 탭 |
| 완료 항목 정리 | 하단 **완료 항목 지우기** |

## 기술 스택

- **HTML5 · CSS3 · Vanilla JavaScript** — 프레임워크, 라이브러리, 빌드 도구 없음
- **localStorage** — 브라우저 로컬 저장
- **GitHub Pages + GitHub Actions** — `main`에 push하면 자동 배포

## 로컬에서 실행하기

```bash
git clone https://github.com/lee-changyeon/todo-app.git
cd todo-app
```

**방법 1.** `todo-app/index.html` 파일을 더블클릭해 브라우저로 엽니다.

**방법 2.** 로컬 서버로 실행합니다.

```bash
python -m http.server 5500 --directory todo-app
```

브라우저에서 http://localhost:5500 에 접속합니다. 다른 앱은 `todo-app` 대신 `todo-app2` 또는 `todo-app3`을 넣어 실행합니다.

## 프로젝트 구조

```
.
├── todo-app/
│   ├── index.html          # 화면 구조
│   ├── style.css           # 스타일 · 반응형
│   └── app.js              # 상태 관리 · 렌더링 · 저장 · 이벤트
├── todo-app2/              # 두 번째 앱 (index.html · style.css · app.js)
│   ├── PRD.md · TRD.md · TASKS.md   # todo-app2 기획 · 설계 · 작업 문서
│   └── PROMPTS.md          # PRD로 앱을 만드는 5단계 프롬프트
├── todo-app3/              # 5단계 프롬프트로 만든 앱 (index.html · style.css · app.js)
│   └── TRD.md · TASKS.md   # todo-app3 설계 · 작업 문서 (PRD는 todo-app2와 공유)
├── .github/workflows/
│   └── pages.yml           # GitHub Pages 자동 배포
├── .claude/launch.json     # 로컬 미리보기 서버 설정
├── PRD.md                  # 제품 요구사항 문서
├── TRD.md                  # 기술 요구사항 문서
├── TASKS.md                # 작업 체크리스트
└── README.md
```

## 문서

각 앱의 문서 링크는 맨 위 **바로 사용하기** 표에 있습니다. 문서 종류는 다음과 같습니다.

| 문서 | 내용 |
|---|---|
| PRD | 무엇을 만드는가 — 목표, 사용자 스토리, 기능 요구사항, 수용 기준 |
| TRD | 어떻게 만드는가 — 구조, 데이터 설계, 함수 설계, 테스트 결과, 수정 이력 |
| TASKS | 작업 단위 체크리스트와 진행 현황 |
| [PROMPTS](todo-app2/PROMPTS.md) | PRD로 앱을 만드는 5단계 프롬프트 (todo-app3 제작에 사용) |

## 배포

`main` 브랜치에 push하면 GitHub Actions가 세 앱을 GitHub Pages에 자동으로 배포합니다.

| 폴더 | 배포 주소 |
|---|---|
| `todo-app/` | https://lee-changyeon.github.io/todo-app/ (사이트 루트) |
| `todo-app2/` | https://lee-changyeon.github.io/todo-app/todo-app2/ |
| `todo-app3/` | https://lee-changyeon.github.io/todo-app/todo-app3/ |

`todo-app2/` · `todo-app3/`는 앱 파일 3개(`index.html`, `style.css`, `app.js`)만 배포되고 문서(`.md`)는 배포되지 않습니다.
진행 상황은 저장소의 **Actions** 탭에서 확인할 수 있습니다.

## 알아두기

- 데이터는 **사용하는 브라우저에만** 저장됩니다. 다른 브라우저 · 기기와 공유되지 않습니다.
- 브라우저의 사이트 데이터를 지우면 할 일도 함께 삭제됩니다.
- 로컬 파일과 배포된 사이트는 저장 공간이 서로 다릅니다.

## 앞으로 추가할 기능

다크 모드, 삭제 실행 취소, JSON 백업/복원, 드래그 정렬, 마감일 · 우선순위 등 — 자세한 내용은 각 앱 TASKS의 다음 버전 항목([todo-app](TASKS.md) M9 · [todo-app2](todo-app2/TASKS.md) M9 · [todo-app3](todo-app3/TASKS.md) M7)을 참고하세요.
