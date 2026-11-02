const categoryIcons: Readonly<Record<string, string>> = {
  '전자기기/it': '💻',
  '뷰티/패션': '👗',
  '음식/맛집': '🍽️',
  '여행/숙박': '✈️',
  '문화/콘텐츠': '🎬',
  '생활/리빙': '🏠',
  '서비스/기타': '🛠️',
  it: '💻',
  식품: '🍽️',
  전체: '🗂️',
};

export const getCategoryIcon = (category: string): string =>
  categoryIcons[category.trim().toLowerCase()] ?? '🏷️';
