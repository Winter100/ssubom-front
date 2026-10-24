# API 사용 준비

앱 전체에 TanStack Query Provider가 연결되어 있습니다. 조회 데이터의 기본 staleTime은 1분이며 나머지는 라이브러리 기본값을 사용합니다.

Axios 공통 인스턴스는 `@/lib/api`에서 가져옵니다. `.env.local`에 `NEXT_PUBLIC_API_URL=https://실제-백엔드-주소`를 지정하고 개발 서버를 다시 시작하세요. 미설정 시 브라우저의 동일 출처 `/api`를 사용합니다. 현재 프로젝트에는 API 라우트가 없으므로 실제 API 주소와 경로를 준비해야 합니다. 서버에서 호출할 때는 절대 URL을 설정해야 합니다.

홈은 브라우저에서 `useReviews({ page: 1, size: 5, sort: 'latest' })`로 최신 리뷰 5개를 요청합니다. URL 조건과 무관하게 응답 순서대로 표시하며 카테고리 API를 호출하지 않습니다. `next/dynamic`의 `ssr: false`로 서버 렌더링·빌드에서는 조회하지 않습니다.

`/reviews`는 `ReviewSearchFeed`로 검색·카테고리·페이지네이션을 표시합니다. 공통 헤더의 ‘리뷰 둘러보기’와 홈의 ‘전체 리뷰 보기’에서 이동할 수 있습니다. 홈과 같은 `app/_hooks/use-reviews.ts`의 `useReviews`를 사용합니다. 해당 파일의 `REVIEWS_API_URL`이 비어 있으면 요청하지 않고 설정 오류를 발생시킵니다. 절대 URL 또는 공통 인스턴스의 baseURL에 붙일 상대 경로를 사용할 수 있습니다.

`useReviews`는 `useSuspenseQuery`를 사용하므로 호출 컴포넌트 위에 Query Provider와 `ReviewsQueryBoundary`가 필요합니다. 아래 `ReviewCount`도 해당 경계 아래에서 렌더링해야 합니다. 경계는 QueryErrorResetBoundary → ErrorBoundary → Suspense 순서입니다. 최초 로딩은 카드 스켈레톤(홈 5개, 검색 목록은 요청 크기)으로, 최초 실패는 재시도 버튼으로 처리합니다.

리뷰는 staleTime=0, refetchOnMount=always, retry=false를 사용합니다. 캐시가 있으면 기존 데이터를 보여주며 재조회하고, 백그라운드 조회 실패 시 카드를 유지합니다. 폴링은 하지 않습니다. 다른 쿼리의 기본 staleTime은 1분으로 유지합니다.

```tsx
'use client';

import { useReviews } from '@/app/_hooks/use-reviews';

const ReviewCount = () => {
  const { data } = useReviews({ page: 1, size: 3 });
  return <span>{data.totalElements}</span>;
};
```

응답은 `{ content: ReviewType[], page, size, totalElements, totalPages }` 구조입니다. 목록 조건은 URL에서 읽습니다. 예: `/reviews?page=2&categoryId=3&query=의자`. 목록은 항상 size=10, sort=latest를 사용하며 URL의 size와 sort는 무시하고 조건 갱신 시 제거합니다. 잘못된 페이지는 1로, 잘못된 categoryId는 전체로 처리합니다. 범위 밖 페이지는 서버의 마지막 유효 페이지로 replace 이동하고, 전체 결과가 없으면 1페이지로 정리합니다.

서버에 page, size, categoryId, query, sort를 전달하며 모든 조건으로 캐시를 구분합니다. categoryId와 query가 없으면 요청에서 생략합니다. sort는 latest 또는 rating이며 서버가 제목·작성자 검색, 카테고리 필터, 정렬 후 페이지네이션을 처리해야 합니다. 클라이언트는 content 순서를 그대로 표시합니다.

검색은 Enter 또는 검색 버튼으로 적용합니다. 검색·카테고리 변경은 1페이지로 돌아가며, 페이지 이동은 다른 조건을 유지합니다. 변경 이력은 브라우저 뒤로가기·앞으로가기로 복원됩니다. 목록 조건과 무관한 URL 파라미터와 해시는 유지합니다. 페이지 번호는 처음·마지막·현재 페이지 주변 2개씩만 표시합니다.

카테고리는 `useCategories`를 통해 `apiPathCategory.list`에서 `{ id: number, category: string }[]`로 받습니다. 카테고리 조회 실패와 리뷰 조회는 독립적으로 처리합니다.

대표 이미지 URL은 카드의 `imageSrc` prop으로 전달합니다. imageSrc가 없거나 빈 문자열이면 직접 제작한 로컬 `/reviews/no-image.svg`를 표시합니다. `mainImageKey`의 URL 변환 규칙은 미정이며 저장소 키를 이미지 경로로 취급하지 않습니다. 상세 페이지는 기존 예시 데이터를 사용하므로 데이터가 없는 ID는 404를 표시합니다.

요청 제한 시간은 10초입니다. 인증·쿠키·토큰 갱신은 백엔드 계약이 확인되면 추가합니다.
