# Mai Pen Rai vs. 빨리빨리: 배포 가이드

## 폴더 구성
- `index.html`: 참가자용 (예: https://내프로젝트.vercel.app)
- `presenter.html`: 발표자용 (예: https://내프로젝트.vercel.app/presenter)
- `api/state.js`, `api/act.js`: 실시간 투표용 서버 함수
- `vercel.json`: `/presenter`처럼 .html 없이 접속되게 하는 설정

## 1단계. 배포하기
GitHub에 새 저장소를 만들어 이 폴더의 파일을 모두 올린 뒤(api 폴더 포함),
vercel.com에서 Add New → Project → 저장소 Import → Framework Preset은 Other → Deploy.
(터미널을 쓴다면 이 폴더에서 `npx vercel --prod` 한 줄로도 됩니다.)

## 2단계. 데이터베이스 연결 (무료)
1. Vercel 프로젝트 화면 → Storage 탭 → Create Database → **Upstash for Redis** 선택 → 무료 플랜으로 생성
2. 이 프로젝트에 Connect 하면 환경 변수(UPSTASH_REDIS_REST_URL / TOKEN 또는 KV_REST_API_URL / TOKEN)가 자동으로 추가돼요
3. Deployments 탭 → 가장 최근 배포 → Redeploy (환경 변수 반영을 위해 한 번 필요)

연결이 끝나면 발표자 화면 상단 칩이 "Offline mode"에서 "Live"로 바뀌고, 첫 화면에 참가자용 QR 코드가 나타나요.

## 3단계 (선택). 발표자 키 설정
누군가 참가자 링크로 발표자 기능을 건드리는 걸 막고 싶다면
Settings → Environment Variables에 `PRESENTER_KEY`를 원하는 값으로 추가하고 Redeploy 하세요.
발표자 화면에서 처음 슬라이드를 넘길 때 한 번만 키를 물어봐요.

## 사용 팁
- 매주 다른 그룹이 쓰면 주소 뒤에 `?room=이름`을 붙이세요. 예: `/presenter?room=hrd1023` (참가자 QR에도 자동 반영)
- 발표자 화면의 "Reset room" 버튼으로 투표와 아이디어를 모두 지울 수 있어요 (접속자 명단은 유지).
- 참가자는 기본적으로 발표자 화면을 따라가고, 상단의 "Following the host" 버튼으로 혼자 둘러보기를 켤 수 있어요.
- 데이터는 3일 뒤 자동으로 지워져요.
- 데이터베이스 없이 열면 자동으로 "Offline mode"가 되어, 진행자가 손든 수를 클릭으로 집계하는 방식으로 작동해요.
