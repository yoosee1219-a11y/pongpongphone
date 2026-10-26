# 퐁퐁폰 SEO 수정 리스트

- 출처: 2026-10-26 Claude SEO 플러그인 1차 감사 (`/seo audit`), 종합 45/100
- 이 파일은 `.github/` 안에 있어서 GitHub Pages 사이트에는 올라가지 않는다(upload-pages-artifact 가 .github 를 제외함).
- 진행 방법: Claude 에게 "퐁퐁폰 SEO 수정리스트 진행해줘" 라고 하면 이 파일을 읽고 0단계부터 순서대로 한다.
- 상세 감사 원본(이 PC 에만 있음): `C:\Users\rocke\AppData\Local\Claude-Data\claude_pzs8sxrjxfjjc\side-session-notes\local_6c9d3918-19e0-4a9b-887d-7e805574675c\yoosee1219-a11y.github.io-audit\`

## 0단계: 사장님이 먼저 정할 것 (코드 작업 전)

- [ ] 상호 결정. "퐁퐁폰"은 이미 폰케이스 브랜드, 경산 휴대폰 매장(통신골목1st 퐁퐁폰 하양성지점), 커뮤니티 은어로 쓰여서 네이버 "퐁퐁폰" 검색에 남의 결과가 나온다. 사업자등록 신청 전에 KIPRIS 9/35/38류 상표 확인 후 결정.
- [ ] 자체 도메인 결정(예: pongpongphone.kr). 색인 후에 바꾸면 색인을 다시 해야 하므로 색인 전에 정한다. 정하면 저장소 루트에 `CNAME` 파일 추가.
- [ ] 사업자등록증 수령 후 준비: 상호, 대표자, 주소, 사업자등록번호, 통신판매업신고번호, 전화번호, 카카오톡 채널 주소, 이메일, SNS 주소.
- [ ] 선불폰·알뜰폰이 직접 MVNO 인지 판매 대리점인지 확인(구조화 데이터와 약관 문구에 영향).

## A. 등록증 나오면 채우기만 하면 되는 것

| 할 일 | 영향 | 파일 |
|---|---|---|
| 푸터 사업자 정보 "(입력 예정)" 7곳을 실제 값으로 | 신뢰 평가, 법적 표시 의무 | 9개 공개 페이지 푸터(index.html 283-309 와 같은 블록) |
| `tel:0000-0000`, `sms:0000-0000`, `href="#kakao"`(약 44곳), SNS `href="#"` 를 실제 값으로 | 문의 전환, 신뢰 | 9개 페이지 헤더·상담버튼·.fixbar·.m-tab·드로어·푸터, faq.html 답변 속 0000-0000 |
| `privacy.html`, `terms.html` 새로 만들고 `#privacy`, `#terms` 링크 연결 | 개인정보보호법, 신뢰 | 새 파일 2개, index.html:288 및 각 페이지 같은 줄, faq.html:175 "(준비 중)" |
| Organization 구조화 데이터에 주소·전화·로고·sameAs 추가 | 검색 결과 업체 정보 | index.html `<head>` (아래 C-5 블록에 필드 추가) |

완료 확인: 저장소에서 `0000-0000`, `href="#kakao"`, `(입력 예정)`, `(링크 입력 예정)` 검색 결과가 0.

처리방침·약관 본문은 등록증 전에 미리 써 두고 상호만 나중에 넣어도 된다.

## B. 색인 신청 직전에 할 것

- [ ] `sitemap.xml` 저장소 루트에 추가. admin.html, reviews.html 은 제외. lastmod 는 각 페이지 마지막 수정일. 포함할 URL 8개(도메인은 최종 도메인으로):
  - `/` (index.html 말고 디렉터리 형태)
  - sell.html, buy.html, process.html, mvno.html, prepaid.html, faq.html, about.html
- [ ] 자체 도메인이면 루트에 `robots.txt` 추가하고 `Sitemap:` 줄 넣기. github.io 하위 주소면 robots.txt 는 효과 없음.
- [ ] Google Search Console, 네이버 서치어드바이저에 사이트 등록 후 사이트맵 제출. 소유 확인 meta 태그는 index.html `<head>` 에.
- [ ] (선택) IndexNow 키 파일 추가(네이버·빙 즉시 알림).
- [ ] GitHub 저장소 About 의 Website 칸에 사이트 주소 입력.

완료 확인: 제출 2주 뒤 두 콘솔에서 색인된 페이지가 0 이 아니어야 한다.

## C. 등록증과 상관없이 고칠 것 (지금 해도 됨)

### 높음

- [ ] C-1. 홈 슬라이드 예시 카드의 "내폰팔기 완료", "알뜰폰 개통 완료", "선불폰 개통 완료" 태그 변경(실제 거래 0건이라 과장광고 소지). 예: "예시 매입가", "요금제 예시". 파일: assets/main.js:72, 75, 78
- [ ] C-2. "리뷰 준비 중" 옆 별 5개 제거. 파일: index.html:216
- [ ] C-3. canonical 추가, 홈 링크를 `href="index.html"` 에서 `href="./"` 로(페이지마다 약 4곳). 파일: 9개 페이지 `<head>`(7번째 줄 description 다음)
- [ ] C-4. 가격·요금제가 JS 실행 후에만 보이는 문제: 배포 시 data/*.js 를 HTML 에 미리 찍어 넣기. 파일: .github/workflows/pages.yml, sell.html(#modelGrid, 156), mvno.html(#planGrid, 174), prepaid.html, index.html, buy.html, assets/main.js

### 중간

- [ ] C-5. 구조화 데이터 추가(확인된 값만, 가격 넣지 않음)
  - index.html: Organization + WebSite `@graph` (name 퐁퐁폰, url, description, areaServed 대한민국, inLanguage ko-KR)
  - sell.html, mvno.html, prepaid.html: Service (name, serviceType, description, url, provider, areaServed). offers 는 넣지 않는다(가격이 예시라서).
  - FAQPage, HowTo, Review, AggregateRating 은 넣지 않는다(리치결과 없음, 후기 없음).
- [ ] C-6. H1 없는 3곳의 h2 를 h1 으로
  - about.html:122-123 -> "퐁퐁폰 이야기: 내 폰은 제값에, 통신비는 알뜰하게"
  - prepaid.html:129 -> "선불폰 개통, 본인 확인 후 신분증으로 비대면 개통"
  - reviews.html:122 -> "퐁퐁폰 고객 후기"
- [ ] C-7. 나머지 H1 에 검색어 넣기(슬로건은 아래 문단으로)
  - index.html:123 -> "중고폰 매입 · 판매와 알뜰폰 개통, 퐁퐁폰"
  - buy.html:123 -> "검수 마친 중고폰 구매, 끝까지 책임지는 퐁퐁폰"
  - sell.html:123 -> "중고폰 매입(내폰팔기), 투명하게 견적 받고 간편하게"
  - process.html:123 -> "중고폰 매입 절차: 신청부터 입금까지 6단계"
  - mvno.html:123 -> "알뜰폰 요금제, 약정 없이 번호 그대로 갈아타세요"
- [ ] C-8. og 태그와 파비콘. 9개 페이지 `<head>` 에 og:type, og:site_name, og:title, og:description, og:url, og:image, twitter:card, `<link rel="icon">`. 새 파일 assets/og-default.jpg(1200x630), assets/favicon.svg, assets/apple-touch-icon.png
- [ ] C-9. reviews.html: 실제 후기가 생길 때까지 `<meta name="robots" content="noindex">`, 제목에서 "(준비 중)" 제거(reviews.html:6)
- [ ] C-10. 선불폰 문구: "미납·연체 이력이 있어도 OK" 로 시작하는 설명에 본인 확인·명의대여 주의 추가. 파일: prepaid.html:7, 170, faq.html:160
- [ ] C-11. 내폰사기: 실제 상품 등록(data/products.js 의 샘플 2개는 숨김 상태), "(정책 확정 후 입력)" 반품·A/S 문구 확정. 파일: buy.html:128, 226, 227, 249
- [ ] C-12. 폰트 용량(페이지의 약 90%, 320-400KB): Pretendard 를 필요한 글자만 자체 호스팅하거나 시스템 폰트로. 최소한 `<link rel="preconnect" href="https://cdn.jsdelivr.net">`. 파일: 9개 페이지 8번째 줄, assets/style.css:37
- [ ] C-13. 모바일: 하단 고정바 2개(.fixbar 80px + .m-tab 56px)가 화면 16.7% 가림, 터치 영역 44px 미만 11-19곳(슬라이드 점, 푸터 링크, 필터칩), "예시" 라벨 10px. 파일: assets/style.css
- [ ] C-14. 관리자 GitHub 토큰 "기억하기"(localStorage 저장) 옵션 제거 검토. 파일: assets/admin.js 약 230-236, 586

### 낮음

- [ ] C-15. 메타 설명 줄이기(현재 135-137자): index.html:7, about.html:7
- [ ] C-16. 슬라이드 높이 미리 잡아 화면 흔들림(CLS) 줄이기: assets/style.css:94 (#heroCar), index.html:128, sell.html:128
- [ ] C-17. 필터 버튼 `role="tablist"` 를 `role="group"` 으로, 선택 상태는 `aria-pressed`. 파일: sell.html:149, mvno.html:157, 166, assets/main.js 약 458-466
- [ ] C-18. 스크립트에 `defer`: index.html:346-349 등 각 페이지 끝 script 태그
- [ ] C-19. sell.html:322 중복 H2 정리
- [ ] C-20. (선택) 404.html, llms.txt 추가. llms.txt 는 사업자 정보가 채워진 뒤에.

## D. 나중에 (2개월차, 검색 의도 맞추기)

검색 상위 페이지 형태와 비교한 결과:

| 검색어 | 상위 페이지 형태 | 해야 할 것 |
|---|---|---|
| 중고폰 매입 | 모델 -> 용량 -> 상태 선택 견적 계산기 | sell.html 상단에 견적 단계 UI |
| 중고폰 시세 | 날짜 붙은 실제 시세 조회 | 시세 페이지 신설, 최신 기종 추가(data/buyback.js) |
| 알뜰폰 요금제 추천 | 통신사별 요금제 비교 | mvno.html 에 통신사명·할인 종료 후 요금 표시(data/plans.js) |
| 선불폰 개통 | 준비물·소요시간 안내 글 | prepaid.html 을 안내 글 형태로 보강 |

- 실제 사진(검수 리포트, 데이터 삭제 확인서 샘플) 추가: sell.html, process.html, buy.html
- 네이버 블로그·카카오 채널 개설 후 사이트와 서로 링크

## 끝나면

`/seo audit https://<최종 도메인>/` 로 다시 감사해서 45점과 비교.
