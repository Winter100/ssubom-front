'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useEditor } from '@tiptap/react';
import { createExtensions, richTextClasses } from '../lib/editor-config';
import { createLocalImage } from '../lib/local-images';
import { countBodyImages, MAX_BODY_IMAGES } from '../lib/review-limits';
import {
  emptyFields,
  type ReviewFields,
  type ReviewData,
} from '../lib/review-types';
import { hasRequiredReviewFields } from '../lib/review-validation';
import { restoreReviewDraft, saveReviewDraft } from '../lib/draft-storage';
import { useCreateReview } from './use-review';
import { getAuthErrorMessage } from '@/_lib/auth-client';
import { useRouter } from 'next/navigation';
import { DRAFT_KEY } from '../lib/draft';
import { notifyError } from '@/_lib/notifications';
import { useWithdrawal } from '@/_features/my/hooks/use-withdrawal';

export type ChangeReviewField = <K extends keyof ReviewFields>(
  key: K,
  value: ReviewFields[K],
) => void;
export type HandleReviewImage = (
  event: ChangeEvent<HTMLInputElement>,
  target: 'cover' | 'body',
) => void;

export type ReviewWriterOptions = {
  initialReview?: ReviewData;
  onSubmit?: (
    review: ReviewData,
    files: ReadonlyMap<string, File>,
  ) => Promise<void> | void;
  submitting?: boolean;
};

export const useReviewWriter = ({
  initialReview,
  onSubmit,
  submitting = false,
}: ReviewWriterOptions = {}) => {
  const withdrawal = useWithdrawal();
  const router = useRouter();
  const [fields, setFields] = useState<ReviewFields>(initialReview ?? emptyFields);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [readingImage, setReadingImage] = useState<boolean>(false);
  const [resetVersion, setResetVersion] = useState<number>(0);
  const imageFiles = useRef<Map<string, File>>(new Map());
  const createReviewMutation = useCreateReview();
  const isSubmitting = submitting || createReviewMutation.isPending;
  const submissionPending = useRef(false);

  useEffect(() => {
    const files = imageFiles.current;
    return () => {
      files.forEach((_, source) => URL.revokeObjectURL(source));
      files.clear();
    };
  }, []);

  useEffect(() => {
    const files = imageFiles.current;
    const source = fields.image;
    return () => {
      if (files.has(source)) {
        URL.revokeObjectURL(source);
        files.delete(source);
      }
    };
  }, [fields.image]);

  const editor = useEditor(
    {
      extensions: createExtensions(),
      immediatelyRender: false,
      content: initialReview?.body ?? {
        type: 'doc',
        content: [{ type: 'paragraph' }],
      },
      editorProps: {
        attributes: {
          class: `${richTextClasses} min-h-80 px-5 py-4 outline-none sm:px-7`,
          role: 'textbox',
          'aria-label': '리뷰 본문',
          'aria-multiline': 'true',
        },
      },
      onCreate: async ({ editor: current }) => {
        if (initialReview) return;
        setReadingImage(true);
        try {
          const restored = await restoreReviewDraft(current, imageFiles.current);
          if (!restored) return;
          setFields(restored);
          setMessage('이 브라우저에 저장한 작성 내용을 불러왔습니다.');
        } catch {
          if (current.isDestroyed) return;
          setError(
            '임시 저장본을 불러오지 못했습니다. 기존 저장본은 변경하지 않았습니다.',
          );
        } finally {
          if (!current.isDestroyed) setReadingImage(false);
        }
      },
    },
    [resetVersion],
  );

  const changeField = <K extends keyof ReviewFields>(
    key: K,
    value: ReviewFields[K],
  ) => {
    if (isSubmitting || submissionPending.current) return;
    setFields((current) => ({ ...current, [key]: value }));
    setMessage('');
  };

  const handleImage = (
    event: ChangeEvent<HTMLInputElement>,
    target: 'cover' | 'body',
  ) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file || !editor || isSubmitting || submissionPending.current) return;
    if (
      target === 'body' &&
      countBodyImages(editor.getJSON()) >= MAX_BODY_IMAGES
    ) {
      setError(
        `본문 이미지는 최대 ${MAX_BODY_IMAGES}개까지 추가할 수 있습니다.`,
      );
      return;
    }
    setReadingImage(true);
    setError('');
    try {
      const source = createLocalImage(file);
      imageFiles.current.set(source, file);
      if (target === 'cover') changeField('image', source);
      else if (
        !editor.chain().focus().setImage({ src: source, alt: file.name }).run()
      ) {
        URL.revokeObjectURL(source);
        imageFiles.current.delete(source);
        throw new Error('본문에 이미지를 넣지 못했습니다.');
      }
    } catch (cause: unknown) {
      const message =
        cause instanceof Error
          ? cause.message
          : '이미지를 불러오지 못했습니다.';
      setError(message);
      notifyError(message);
    } finally {
      setReadingImage(false);
    }
  };

  const saveDraft = async () => {
    if (!editor || readingImage || isSubmitting) return;
    const body = editor.getJSON();
    const draftFields = { ...fields };
    setReadingImage(true);
    setError('');
    setMessage('');
    try {
      await saveReviewDraft(draftFields, body, imageFiles.current);
      setMessage(
        '이 브라우저에 임시 저장했습니다. 다음 방문 시 자동으로 불러옵니다.',
      );
    } catch {
      setError(
        '임시 저장하지 못했습니다. 이미지가 많으면 브라우저 저장 공간이 부족할 수 있습니다. 현재 작성 내용은 유지됩니다.',
      );
    } finally {
      setReadingImage(false);
    }
  };

  const submitReview = async () => {
    if (!editor || readingImage || isSubmitting || submissionPending.current) {
      return;
    }
    if (withdrawal.blocked) return;
    if (!hasRequiredReviewFields(fields)) {
      setError('필수 항목과 평점 범위를 확인해 주세요.');
      return;
    }

    setError('');
    setMessage('');
    if (onSubmit) {
      submissionPending.current = true;
      try {
        await onSubmit(
          { ...fields, body: editor.getJSON() },
          new Map(imageFiles.current),
        );
      } catch (cause: unknown) {
        setError(getAuthErrorMessage(cause, '리뷰 수정에 실패했습니다.'));
      } finally {
        submissionPending.current = false;
      }
      return;
    }
    submissionPending.current = true;
    createReviewMutation.mutate(
      {
        review: { ...fields, body: editor.getJSON() },
        files: new Map(imageFiles.current),
      },
      {
        onSuccess: () => {
          try {
            window.localStorage.removeItem(DRAFT_KEY);
          } catch {
            notifyError('리뷰는 등록되었지만 임시 저장본을 삭제하지 못했습니다.');
          }
          setFields(emptyFields);
          setMessage('');
          setError('');
          imageFiles.current.forEach((_, source) => URL.revokeObjectURL(source));
          imageFiles.current.clear();
          setResetVersion((current) => current + 1);
          router.replace('/reviews');
        },
        onError: (cause) => {
          setError(getAuthErrorMessage(cause, '리뷰 생성에 실패했습니다.'));
        },
        onSettled: () => {
          submissionPending.current = false;
        },
      },
    );
  };

  return {
    fields,
    message,
    error,
    readingImage,
    isSubmitting,
    resetVersion,
    editor,
    changeField,
    handleImage,
    saveDraft,
    submitReview,
  };
};
