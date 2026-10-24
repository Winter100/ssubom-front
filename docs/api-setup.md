# API 사용 준비

앱 전체에 TanStack Query Provider가 연결되어 있습니다. 브라우저에서는 QueryClient를 재사용하고 서버 렌더링에서는 요청 간 캐시를 공유하지 않습니다. 조회 데이터의 기본 staleTime은 1분이며 나머지는 라이브러리 기본값을 사용합니다.

Axios 공통 인스턴스는 `@/lib/api`에서 가져옵니다. `.env.local`에 `NEXT_PUBLIC_API_URL=https://실제-백엔드-주소`를 지정하고 개발 서버를 다시 시작하세요. 미설정 시 브라우저의 동일 출처 `/api`를 사용합니다. 현재 프로젝트에는 API 라우트가 없으므로 실제 API 주소와 경로를 준비해야 합니다. 서버에서 호출할 때는 절대 URL을 설정해야 합니다.

클라이언트 컴포넌트의 사용 예시입니다. 아래 경로와 응답 타입은 설명용이며 실제 백엔드 계약에 맞춰 변경하세요.

```tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

type ReviewSummary = { id: number; title: string };

export const useReviews = () =>
  useQuery({
    queryKey: ['reviews'],
    queryFn: async ({ signal }): Promise<ReviewSummary[]> => {
      const { data } = await api.get<ReviewSummary[]>('/reviews', { signal });
      return data;
    },
  });
```

요청 제한 시간은 10초입니다. 인증·쿠키·토큰 갱신은 백엔드 계약이 확인되면 추가합니다. 현재 홈은 기존 예시 데이터를 계속 사용합니다.
