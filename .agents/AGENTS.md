# [Project Rules] Steam Game Price Search Web App

## 1. Project Background & Core Philosophy
- 이 프로젝트는 **Cloudflare Pages + Cloudflare Functions(서버리스)** 기반의 스팀 게임 가격 검색 웹 애플리케이션입니다.
- **최우선 원칙**: 이미 수많은 시행착오 끝에 완성된 **핵심 API 연동 및 한글 검색 알고리즘(`functions/api.js`)은 사용자의 명확한 요청이 없는 한 절대로 수정하거나 임의로 단순화하지 마십시오.**

---

## 2. Protected Code & Core Logic (절대 수정 금지 구역)

### A. Cloudflare Functions (`functions/api.js`)
- **스팀 한글 검색 파라미터 (`l=koreana`, `cc=KR`)**: 스팀 API 고유의 규격이므로 영문이나 일반 `korean`으로 변경하지 마십시오.
- **헤더 설정 (`Accept-Language: ko-KR`, `User-Agent`)**: 스팀 API의 CORS 및 한글 응답 보장을 위해 필수적인 헤더입니다. 제거하거나 변경하지 마십시오.
- **2단계 검색 로직 (Fallback Mechanism)**:
  1. 1차 시도: 사용자가 입력한 검색어 그대로 검색
  2. 2차 시도: 결과가 없을 경우 공백(띄어쓰기)을 제거하고 재검색 (`term.replace(/\s+/g, '')`)
  - 이 2단계 한글 검색 알고리즘 구조는 한글 게임명(예: `사이버 펑크` -> `사이버펑크`) 검색의 핵심이므로 **절대 삭제하거나 통합하지 마십시오.**

### B. Cloudflare 배포 설정 (`wrangler.toml`)
- `pages_build_output_dir = "./"` 설정은 Cloudflare Pages의 루트 디렉토리 빌드를 위한 필수 값이므로 절대 변경하지 마십시오.

---

## 3. Development & Refactoring Guidelines (개발 시 준수 사항)

1. **기능 추가 및 UI 개선 위주로 진행**:
   - 프론트엔드(`index.html`)의 디자인/CSS 개선, 새로운 기능 추가(예: 즐겨찾기, 최근 검색어, 원화 외 타 통화 변경 등)를 중심으로 개발합니다.
2. **백엔드 함수(`functions/api.js`) 수정 필요 시 미리 확인**:
   - 백엔드 로직 수정이 반드시 필요한 경우, 기존 한글 검색 파라미터와 2단계 fallback 알고리즘을 유지한 채 기능만 확장하십시오.
3. **Vanilla JS 유지**:
   - 복잡한 프레임워크(React, Next.js 등)를 도입하여 빌드 설정을 복잡하게 만들지 말고, 가벼운 순수 HTML/CSS/JavaScript 구조를 유지하십시오.

---

## 4. Response Guidelines for AI
- 코드를 생성하거나 수정안을 제안할 때는 기존에 잘 작동하던 스팀 API 통신 부분이 훼손되지 않았음을 명시해 주십시오.
- 에러가 발생하더라도 검증된 스팀 API 파라미터를 먼저 의심하여 원복하지 말고, 네트워크 처리나 예외 처리 구문 위주로 보완하십시오.

---

## 5. Automatic Git Commit & Push Workflow
- **코드 수정 시 필수 수행**: 코드 생성, 수정, 또는 파일 변경점이 발생한 경우 작업의 마지막 단계에서 반드시 자동으로 `git add`, `git commit`, `git push`를 수행하십시오.
- 사용자가 별도로 "푸시해줘"라고 요청하지 않더라도 파일 변경 작업 완료 후 원격 저장소(`origin/main`) 반영을 보장해야 합니다.
