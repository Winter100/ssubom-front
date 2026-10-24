# 로그인 API 연결

`app/_constant/api-path.ts`의 `apiPathAuth`에 로그인(`login`), 회원가입(`signup`), 토큰 재발급(`refresh`), 내 정보(`currentUser`) 경로를 입력합니다. 기본 주소는 기존 `NEXT_PUBLIC_API_URL`입니다. 경로가 비어 있으면 네트워크 요청 없이 설정 안내가 표시됩니다.

| API | 메서드 | 요청 | 성공 응답 |
| --- | --- | --- | --- |
| login | POST | `{ email, password }` | `{ member: { id: number, email: string, nickname: string }, accessToken: string }` |
| signup | POST | `{ email, password, nickname }` | 응답 본문 미사용 |
| refresh | POST | refreshToken 쿠키, 본문 없음 | `{ accessToken: string }` |
| currentUser | GET | Authorization: Bearer 토큰 | `{ id: number, email: string, nickname: string }` |

실패 응답의 `{ message: string }`을 화면에 표시합니다. 다른 형태면 기본 메시지를 표시합니다. 인증 만료는 401로 응답해야 합니다. 로그인·재발급은 쿠키 전송을 활성화하며 백엔드는 refreshToken을 HttpOnly 쿠키로 설정해야 합니다. 다른 출처의 API를 사용하면 백엔드에서 정확한 프론트 출처와 credentials를 허용하고, 배포 환경에 맞는 Secure/SameSite/Path 설정을 적용해야 합니다. 쿠키 Path는 재발급 경로를 포함해야 합니다.

accessToken은 Provider에 연결된 클라이언트 메모리에만 유지합니다. 새로고침하면 재발급 후 내 정보를 조회합니다. 인증 요청은 `useAuth().client.request<T>(config)`를 사용합니다. 이 요청만 Bearer 토큰과 401 재발급을 사용하며 기존 공개 `api` 요청은 영향을 받지 않습니다. 동시에 발생한 401은 재발급 요청을 공유하고, 각 원래 요청은 한 번만 재시도합니다.

조회용 `useCurrentUser`, 요청용 `useLogin`, `useSignup`, `useRefreshToken` 훅을 제공합니다. 자동 로그인 복구와 인증 요청의 재발급도 같은 인증 클라이언트를 공유합니다. 네트워크·서버 장애로 로그인 복구가 실패하면 안내를 표시하며, 사용자가 로그인 페이지에서 다시 로그인할 수 있습니다.

로그인 후 헤더의 닉네임을 누르면 `/mypage`로 이동합니다. 마이페이지는 이메일·닉네임을 읽기 전용으로 표시하고 최신 내 정보를 조회합니다. 헤더와 마이페이지는 동일한 사용자 캐시를 읽습니다. 비로그인 상태는 `/login`으로 이동하고 인증 확인 장애는 오류 안내를 표시합니다. 모든 액세스 토큰 응답 필드명은 `accessToken`입니다.

검증: `node --test tests/auth.test.mjs tests/auth-form.test.mjs`. 브라우저 검증은 개발 서버(기본 3000)와 별도 Chromium 디버깅 포트(기본 9230)를 실행한 뒤 `node tests/auth.browser.mjs`로 수행합니다. 브라우저 테스트는 `member/login`, `member/refresh`, `member/currentUser` 요청을 모의 응답으로 처리합니다. 실제 백엔드 JWT·쿠키 연동은 별도로 확인해야 합니다.
