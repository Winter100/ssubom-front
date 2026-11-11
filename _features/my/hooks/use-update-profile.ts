import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPath } from '@/_constant/api-path';
import { api } from '@/_lib/api/api';
import type { User } from '@/_types/auth';
import { authKeys } from '@/_features/auth/constant/auth.keys';
import { reviewKeys } from '@/_features/review/constant/review.keys';
import { issueReviewImageUrls, uploadReviewImage } from '@/_features/review/lib/review-api';
import { getReviewImageUrl } from '@/_features/review/lib/review-image';

type UpdateProfileInput = {
  nickName?: string;
  file?: File;
};

type MemberUpdateRequest = {
  nickName?: string;
  profileImage?: string;
};

export const useUpdateProfile = (memberId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ nickName, file }: UpdateProfileInput): Promise<MemberUpdateRequest> => {
      const payload: MemberUpdateRequest = { nickName };
      if (file) {
        const clientId = crypto.randomUUID();
        const uploads = await issueReviewImageUrls([{
          clientId,
          name: file.name,
          contentType: file.type,
          fileSize: file.size,
        }]);
        const upload = uploads.find((image) => image.clientId === clientId);
        if (!upload) throw new Error('이미지 업로드 정보를 받지 못했습니다. 다시 시도해 주세요.');
        await uploadReviewImage(upload.url, file);
        payload.profileImage = upload.key;
      }
      if (queryClient.getQueryData<User | null>(authKeys.me())?.id !== memberId) {
        throw new Error('로그인 정보가 변경되었습니다. 다시 로그인한 뒤 시도해 주세요.');
      }
      await api.post<void>(apiPath.me, payload);
      return payload;
    },
    onSuccess: async (payload: MemberUpdateRequest) => {
      await queryClient.cancelQueries({ queryKey: authKeys.me() });
      const user = queryClient.getQueryData<User | null>(authKeys.me());
      if (!user || user.id !== memberId) return;
      queryClient.setQueryData<User>(authKeys.me(), {
        ...user,
        nickname: payload.nickName ?? user.nickname,
        profileImage: payload.profileImage
          ? getReviewImageUrl(payload.profileImage)
          : user.profileImage,
      });
      // 상세 조회는 조회수를 올리므로 다음 방문 때 최신 작성자 정보를 읽습니다.
      void queryClient.invalidateQueries({ queryKey: reviewKeys.all, refetchType: 'none' });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: authKeys.me() }),
        queryClient.invalidateQueries({
          queryKey: reviewKeys.memberReviews(),
          predicate: ({ queryKey }) => typeof queryKey[2] === 'object',
        }),
      ]);
    },
    retry: false,
  });
};
