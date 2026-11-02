export const getReviewImageUrl = (key: string | null | undefined): string => {
  if (!key) return '';
  if (/^(https?:|blob:|data:)/.test(key)) return key;
  const baseUrl = process.env.NEXT_PUBLIC_IMAGE_URL;
  if (!baseUrl) return '';
  return `${baseUrl.replace(/\/+$/, '')}/${key.replace(/^\/+/, '')}`;
};
