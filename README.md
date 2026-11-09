# 박원찬 — Portfolio (General IT)

AI 엔지니어 포트폴리오 웹사이트. 정적 HTML/CSS/JS로 빌드 도구 없이 동작합니다.

## 로컬 실행

```bash
python -m http.server 5173
```

브라우저에서 http://localhost:5173 을 엽니다.

## 배포 (GitHub Pages)

`main` 브랜치 루트를 그대로 GitHub Pages로 서빙합니다 (기존 `Matail/Portfolio`와 같은 방식).

- 주소: https://matail.github.io/Portfolio-IT/
- 설정: Settings → Pages → Source `Deploy from a branch` → Branch `main` / `(root)`
- `.nojekyll`이 있어 Jekyll 빌드 없이 파일을 그대로 올립니다.
- 모든 경로가 상대 경로라 `/Portfolio-IT/` 하위 경로에서도 그대로 동작합니다.
