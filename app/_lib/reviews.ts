export type Category = '전체' | '디지털' | '리빙' | '패션' | '뷰티';
export type Review = {
  id: number;
  title: string;
  product: string;
  category: Exclude<Category, '전체'>;
  image: string;
  author: string;
  initial: string;
  rating: number;
  date: string;
  views: number;
  duration: string;
  excerpt: string;
};

export const reviews: Review[] = [
  {
    id: 1,
    title: '출근길이 조용해졌어요. 한 달 써본 솔직한 이야기',
    product: '소니 WH-1000XM5',
    category: '디지털',
    image: '/reviews/headphones.svg',
    author: '지우의 취향',
    initial: '지',
    rating: 4.8,
    date: '2026-10-23',
    views: 1248,
    duration: '1개월 사용',
    excerpt: '노이즈 캔슬링부터 장시간 착용감까지. 매일 지하철에서 직접 써보며 느낀 장점과 조금 아쉬웠던 점을 담았어요.',
  },
  {
    id: 2,
    title: '매일 아침 커피를 내리는 일이 즐거워진 이유',
    product: '발뮤다 더 팟',
    category: '리빙',
    image: '/reviews/kettle.svg',
    author: '오후의 기록',
    initial: '오',
    rating: 4.5,
    date: '2026-10-22',
    views: 862,
    duration: '3개월 사용',
    excerpt: '주방 한편에 두고 싶은 디자인. 예쁘기만 한 물건일까 고민했던 제가 석 달 동안 사용해 본 후기를 전합니다.',
  },
  {
    id: 3,
    title: '많이 걷는 사람에게, 편한 운동화의 기준',
    product: '뉴발란스 990',
    category: '패션',
    image: '/reviews/sneaker.svg',
    author: '걷는 사람',
    initial: '걷',
    rating: 4.7,
    date: '2026-10-21',
    views: 2106,
    duration: '6개월 사용',
    excerpt: '하루 만 보를 걷는 일상에서 만난 운동화. 발볼과 쿠션감, 사이즈 선택까지 실제 착용 경험을 정리했어요.',
  },
  {
    id: 4,
    title: '책상 위 작은 변화, 타이핑하는 시간이 좋아졌어요',
    product: '로지텍 MX Keys Mini',
    category: '디지털',
    image: '/reviews/keyboard.svg',
    author: '데스크 노트',
    initial: '데',
    rating: 4.3,
    date: '2026-10-20',
    views: 734,
    duration: '2개월 사용',
    excerpt: '작은 책상에 잘 맞는 크기와 조용한 키감. 업무용으로 매일 사용하면서 발견한 편리함과 적응이 필요했던 부분들.',
  },
  {
    id: 5,
    title: '건조한 계절에 손이 가는, 가벼운 보습 한 병',
    product: '이솝 파슬리 씨드 세럼',
    category: '뷰티',
    image: '/reviews/serum.svg',
    author: '소소한 발견',
    initial: '소',
    rating: 4.2,
    date: '2026-10-19',
    views: 591,
    duration: '1개월 사용',
    excerpt: '끈적임이 적은 보습제를 찾다가 써봤어요. 제 피부에서 느낀 사용감과 향, 아침저녁 루틴에 대한 개인적인 기록입니다.',
  },
];
