import axios from 'axios';
import { api } from '@/lib/api';
import { getAuthErrorMessage } from '@/app/_lib/auth-client';
import type { ReviewCreateRequest } from './review-types';

type PresignedImageRequest = {
  clientId: string;
  name: string;
  contentType: string;
  fileSize: number;
};

type PresignedImageUrl = {
  clientId: string;
  key: string;
  name: string;
  url: string;
};

export const issueReviewImageUrls = async (
  images: PresignedImageRequest[],
): Promise<PresignedImageUrl[]> => {
  const { data } = await api.post<PresignedImageUrl[]>(
    'storage/presigned-url',
    {
      images,
    },
  );
  return data;
};

export const uploadReviewImage = async (
  url: string,
  file: File,
): Promise<void> => {
  try {
    await axios.put(url, file, {
      headers: { 'Content-Type': file.type },
      withCredentials: false,
    });
  } catch (cause: unknown) {
    throw new Error(
      getAuthErrorMessage(cause, `이미지 업로드에 실패했습니다: ${file.name}`),
    );
  }
};

export const postReview = async (
  review: ReviewCreateRequest,
): Promise<void> => {
  await api.post('reviews', review);
};
