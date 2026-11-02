import axios from 'axios';
import { apiPath } from '@/_constant/api-path';
import { api } from '@/_lib/api/api';
import { getAuthErrorMessage } from '@/_lib/auth-client';

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
    apiPath.presignedImages,
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
