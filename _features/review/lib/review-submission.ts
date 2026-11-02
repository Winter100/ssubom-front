import type { ReviewData, ReviewCreateRequest } from './review-types';
import { getImageSources, replaceImageSources } from './local-images';
import { hasRequiredReviewFields } from './review-validation';
import {
  countBodyImages,
  MAX_BODY_IMAGES,
  MAX_VERDICT_LENGTH,
} from './review-limits';
import { issueReviewImageUrls, uploadReviewImage } from './review-api';
import { isValidReviewId } from './review-id';
import { reviewApi } from '../hooks/use-review';

type SubmissionImage = {
  clientId: string;
  source: string;
  file: File;
};

export const prepareReviewRequest = async (
  review: ReviewData,
  files: ReadonlyMap<string, File>,
  existingImages: ReadonlyMap<string, string> = new Map(),
): Promise<ReviewCreateRequest> => {
  // 필수 항목 체크
  if (!hasRequiredReviewFields(review)) {
    throw new Error('필수 항목과 평점을 확인해 주세요.');
  }
  if (countBodyImages(review.body) > MAX_BODY_IMAGES) {
    throw new Error(
      `본문 이미지는 최대 ${MAX_BODY_IMAGES}개까지 추가할 수 있습니다.`,
    );
  }
  if (review.verdict.length > MAX_VERDICT_LENGTH) {
    throw new Error(
      `추천 문구는 최대 ${MAX_VERDICT_LENGTH}자까지 입력할 수 있습니다.`,
    );
  }
  const { category } = review;
  if (!category) throw new Error('카테고리를 선택해 주세요.');

  const bodySources = getImageSources(review.body);
  const sources = [...new Set([review.image, ...bodySources].filter(Boolean))];
  const images: SubmissionImage[] = [];
  for (const source of sources) {
    const file = files.get(source);
    if (file) images.push({ clientId: crypto.randomUUID(), source, file });
    else if (!existingImages.get(source)) {
      throw new Error('이미지 원본 파일 또는 기존 이미지 키를 찾을 수 없습니다.');
    }
  }

  // presigned urls 발급
  const issuedUrls = images.length
    ? await issueReviewImageUrls(
        images.map(({ clientId, file }) => ({
          clientId,
          name: file.name,
          contentType: file.type,
          fileSize: file.size,
        })),
      )
    : [];

  if (images.length !== issuedUrls.length) {
    throw new Error('발급받지 못한 키가 존재합니다.');
  }
  const urlsByClientId = new Map(
    issuedUrls.map((image) => [image.clientId, image]),
  );
  const uploads = images.map((image) => {
    const issued = urlsByClientId.get(image.clientId);
    if (!issued?.key || !issued.url) {
      throw new Error(`Presigned URL을 찾을 수 없습니다: ${image.file.name}`);
    }
    return { ...image, key: issued.key, url: issued.url };
  });

  // 발급받은 url에 실제 이미지 업로드
  const uploadedSources = new Map<string, string>(
    await Promise.all(
      uploads.map(
        async ({ source, file, key, url }): Promise<[string, string]> => {
          await uploadReviewImage(url, file);
          return [source, key];
        },
      ),
    ),
  );

  // 화면의 URL은 유지하고 전송할 복사본에서만 키로 교체합니다.

  const sourceKeys = new Map([...existingImages, ...uploadedSources]);
  const getImageKey = (source: string): string => {
    const key = sourceKeys.get(source);
    if (!key) throw new Error('이미지 키를 찾을 수 없습니다.');
    return key;
  };
  const mainImageKey = review.image ? getImageKey(review.image) : null;
  return {
    title: review.title,
    product: review.product,
    duration: review.duration,
    rating: review.rating,
    verdict: review.verdict,
    pros: review.pros.map((item) => item.trim()),
    cons: review.cons.map((item) => item.trim()),
    categoryId: category.id,
    mainImageKey,
    subImageKeys: [...new Set(bodySources.map(getImageKey))].filter(
      (key) => key !== mainImageKey,
    ),
    content: replaceImageSources(review.body, sourceKeys),
  };
};

export const createReview = async (
  review: ReviewData,
  files: ReadonlyMap<string, File>,
): Promise<void> => {
  await reviewApi.create(await prepareReviewRequest(review, files));
};

export const updateReview = async (
  reviewId: string,
  review: ReviewData,
  files: ReadonlyMap<string, File>,
  existingImages: ReadonlyMap<string, string>,
): Promise<void> => {
  if (!isValidReviewId(reviewId)) throw new Error('올바른 리뷰 ID가 아닙니다.');
  const payload = await prepareReviewRequest(review, files, existingImages);
  await reviewApi.update(reviewId, payload);
};
