'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, SubmitEvent } from 'react';
import { getAuthErrorMessage } from '@/_lib/auth-client';
import { useUpdateProfile } from '../hooks/use-update-profile';

type ProfileImageFormProps = {
  profileImage?: string | null;
  memberId: number;
  nickname: string;
  nicknameChangedAt?: string | null;
};

const ProfileImageForm = ({
  profileImage,
  memberId,
  nickname,
  nicknameChangedAt,
}: ProfileImageFormProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const saving = useRef<boolean>(false);
  const [draftNickname, setDraftNickname] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const { mutateAsync: updateProfile, isPending } = useUpdateProfile(memberId);
  const [selection, setSelection] = useState<{ file: File; url: string } | null>(null);
  const [error, setError] = useState<string>('');
  const [now, setNow] = useState<number>(() => Date.now());
  const nicknameAvailableAt = nicknameChangedAt
    ? Date.parse(nicknameChangedAt) + 7 * 24 * 60 * 60 * 1000
    : 0;
  const nicknameLocked = now < nicknameAvailableAt;
  const remainingMinutes = Math.max(0, Math.ceil((nicknameAvailableAt - now) / 60_000));
  const remainingDays = Math.floor(remainingMinutes / (24 * 60));
  const remainingHours = Math.floor((remainingMinutes % (24 * 60)) / 60);
  const file = selection?.file;
  const preview = selection?.url;
  const nextNickname = nicknameLocked ? nickname : (draftNickname ?? nickname).trim();
  const hasChanges = nextNickname !== nickname || file !== undefined;

  const cancelSelection = (): void => {
    setSelection(null);
    setError('');
    setMessage('');
    setDraftNickname(null);
  };

  useEffect(() => {
    if (preview) return () => URL.revokeObjectURL(preview);
  }, [preview]);

  useEffect(() => {
    if (!nicknameLocked) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [nicknameLocked]);

  const selectImage = (event: ChangeEvent<HTMLInputElement>): void => {
    const selected = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!selected) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
      setError('JPG, PNG, WebP 이미지를 선택해 주세요.');
      return;
    }
    if (selected.size === 0 || selected.size > 5 * 1024 * 1024) {
      setError('0바이트보다 크고 5MB 이하인 이미지를 선택해 주세요.');
      return;
    }
    setError('');
    setMessage('');
    setSelection({ file: selected, url: URL.createObjectURL(selected) });
  };

  const saveProfile = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (saving.current || !hasChanges) return;
    if (!nextNickname) {
      setError('닉네임을 입력해 주세요.');
      return;
    }
    saving.current = true;
    setError('');
    setMessage('');
    try {
      await updateProfile({
        nickName: nextNickname !== nickname ? nextNickname : undefined,
        file,
      });
      setSelection(null);
      setDraftNickname(null);
      setMessage('회원 정보를 수정했습니다.');
    } catch (cause: unknown) {
      setError(getAuthErrorMessage(
        cause,
        '회원 정보를 수정하지 못했습니다. 다시 시도해 주세요.',
      ));
    } finally {
      saving.current = false;
    }
  };

  return (
    <form
      onSubmit={saveProfile}
      aria-label='닉네임 및 프로필 이미지 변경'
      aria-busy={isPending}
      className='mt-3 mb-5 rounded-xl border border-stone-200/80 p-3'
    >
      <div className='flex items-center gap-4'>
        <Image
          key={preview || profileImage}
          src={preview || profileImage || '/default-profile.svg'}
          alt={file ? '변경할 프로필 이미지 미리보기' : '현재 프로필 이미지'}
          width={72}
          height={72}
          unoptimized
          onError={(event) => {
            event.currentTarget.srcset = '';
            event.currentTarget.src = '/default-profile.svg';
          }}
          className='size-18 shrink-0 rounded-full border border-stone-100 object-cover'
        />
        <div className='min-w-0'>
          <p className='text-xs font-semibold text-stone-700'>프로필 이미지</p>
          <p
            id='profile-image-help'
            className='mt-1 text-[11px] leading-5 text-stone-500'
          >
            JPG, PNG, WebP · 최대 5MB
          </p>
          <input
            ref={inputRef}
            type='file'
            accept='image/jpeg,image/png,image/webp'
            aria-label='프로필 이미지 파일'
            aria-describedby='profile-image-help'
            disabled={isPending}
            onChange={selectImage}
            className='sr-only'
            tabIndex={-1}
          />
          <div className='mt-2 flex flex-wrap items-center gap-2'>
            <button
              type='button'
              disabled={isPending}
              onClick={() => inputRef.current?.click()}
              className='cursor-pointer rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#23745b] disabled:cursor-wait disabled:opacity-50'
            >
              이미지 선택
            </button>
          </div>
        </div>
      </div>
      <label htmlFor='profile-nickname' className='mt-4 block text-xs font-medium text-stone-600'>
        닉네임
      </label>
      <input
        id='profile-nickname'
        name='nickname'
        type='text'
        value={nicknameLocked ? nickname : draftNickname ?? nickname}
        required
        disabled={isPending || nicknameLocked}
        aria-describedby='profile-nickname-help'
        onChange={(event) => {
          setDraftNickname(event.currentTarget.value);
          setMessage('');
          setError('');
        }}
        className='mt-2 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-[#23745b] disabled:opacity-50'
      />
      <p id='profile-nickname-help' className='mt-2 text-xs leading-5 text-stone-500'>
        {nicknameLocked
          ? `닉네임 변경까지 ${remainingDays}일 ${remainingHours}시간 ${remainingMinutes % 60}분 남았습니다. 프로필 이미지는 변경할 수 있습니다.`
          : '닉네임은 변경 후 7일이 지나면 다시 변경할 수 있습니다.'}
      </p>
      {file && (
        <p className='mt-3 truncate text-xs text-stone-500' title={file.name}>
          {file.name}
        </p>
      )}
      {error && (
        <p role='alert' className='mt-3 text-xs leading-5 text-red-700'>
          {error}
        </p>
      )}
      {message && (
        <p role='status' className='mt-3 text-xs leading-5 text-[#23745b]'>
          {message}
        </p>
      )}
      <div className='mt-4 flex justify-end gap-2'>
        <button
          type='button'
          disabled={isPending || !hasChanges}
          onClick={cancelSelection}
          className='cursor-pointer rounded-lg border border-stone-200 px-3 py-2 text-xs text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50'
        >
          취소
        </button>
        <button
          type='submit'
          disabled={isPending || !hasChanges || !nextNickname}
          className='cursor-pointer rounded-lg bg-[#23745b] px-3 py-2 text-xs font-medium text-white hover:bg-[#185b46] disabled:cursor-not-allowed disabled:opacity-50'
        >
          {isPending ? '저장 중…' : '저장'}
        </button>
      </div>
    </form>
  );
};

export default ProfileImageForm;
