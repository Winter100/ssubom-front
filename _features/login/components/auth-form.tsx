'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { useLogin } from '../../../_hooks/use-login';
import { useSignup } from '../../../_hooks/use-signup';
import { getAuthErrorMessage } from '../../../_lib/auth-client';
import {
  validateAuthField,
  type AuthErrors,
  type AuthField,
  type AuthFields,
} from '../../../_lib/auth-validation';
import { project } from '../../../_constant/web';

const fieldDefinitions: {
  name: AuthField;
  label: string;
  type: string;
  autoComplete: string;
}[] = [
  { name: 'email', label: '이메일', type: 'email', autoComplete: 'email' },
  {
    name: 'password',
    label: '비밀번호',
    type: 'password',
    autoComplete: 'current-password',
  },
  {
    name: 'passwordConfirm',
    label: '비밀번호 확인',
    type: 'password',
    autoComplete: 'new-password',
  },
  { name: 'nickname', label: '닉네임', type: 'text', autoComplete: 'nickname' },
];

const AuthForm = ({
  mode,
  registered = false,
}: {
  mode: 'login' | 'signup';
  registered?: boolean;
}) => {
  const signupMode = mode === 'signup';
  const title = signupMode ? '회원가입' : '로그인';
  const router = useRouter();
  const login = useLogin();
  const signup = useSignup();
  const submitting = useRef(false);
  const [values, setValues] = useState<AuthFields>({
    email: '',
    password: '',
    passwordConfirm: '',
    nickname: '',
  });
  const [errors, setErrors] = useState<AuthErrors>({});
  const [serverError, setServerError] = useState('');
  const pending = login.isPending || signup.isPending;
  const fields = signupMode ? fieldDefinitions : fieldDefinitions.slice(0, 2);

  const change = (field: AuthField, value: string): void => {
    const next = { ...values, [field]: value };
    setValues(next);
    setServerError('');
    setErrors((previous) => {
      const updated = { ...previous };
      if (previous[field]) updated[field] = validateAuthField(field, next);
      if (field === 'password' && previous.passwordConfirm)
        updated.passwordConfirm = validateAuthField('passwordConfirm', next);
      return updated;
    });
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (submitting.current) return;
    const nextErrors: AuthErrors = {};
    for (const { name } of fields) {
      const message = validateAuthField(name, values);
      if (message) nextErrors[name] = message;
    }
    setErrors(nextErrors);
    setServerError('');
    if (Object.keys(nextErrors).length) {
      const firstField = fields.find(({ name }) => nextErrors[name]);
      if (firstField)
        event.currentTarget
          .querySelector<HTMLInputElement>(`#${firstField.name}`)
          ?.focus();
      return;
    }
    submitting.current = true;
    try {
      const input = { email: values.email.trim(), password: values.password };
      if (signupMode) {
        await signup.mutateAsync({
          ...input,
          nickname: values.nickname.trim(),
        });
        router.replace('/login?registered=1');
      } else {
        await login.mutateAsync(input);
        router.replace('/');
      }
    } catch (cause: unknown) {
      setServerError(
        getAuthErrorMessage(
          cause,
          `${title}에 실패했습니다. 다시 시도해 주세요.`,
        ),
      );
    } finally {
      submitting.current = false;
      login.reset();
      signup.reset();
    }
  };

  return (
    <main className='flex flex-1 items-center justify-center px-5 py-12 sm:py-20'>
      <section
        aria-labelledby='auth-title'
        className='w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-10'
      >
        <p className='mb-3 text-sm font-semibold text-[#23745b]'>
          {project.header_description}, {project.title}
        </p>
        <h1 id='auth-title' className='text-3xl font-bold tracking-tight'>
          {title}
        </h1>
        <p className='mb-8 mt-3 text-sm leading-6 text-stone-500'>
          {signupMode
            ? '나만의 경험을 기록하고 함께 나눠 보세요.'
            : '다시 만나 반갑습니다. 이야기를 이어가 주세요.'}
        </p>
        {registered && (
          <p
            role='status'
            className='mb-5 rounded-xl bg-emerald-50 p-4 text-sm text-[#23745b]'
          >
            회원가입이 완료되었습니다. 로그인해 주세요.
          </p>
        )}
        <form noValidate onSubmit={submit} aria-busy={pending}>
          {serverError && (
            <p
              role='alert'
              className='mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700'
            >
              {serverError}
            </p>
          )}
          <fieldset
            disabled={pending}
            className='space-y-5 disabled:opacity-70'
          >
            <legend className='sr-only'>{title} 정보</legend>
            {fields.map(({ name, label, type, autoComplete }) => (
              <div key={name}>
                <label
                  htmlFor={name}
                  className='mb-2 block text-sm font-medium'
                >
                  {label}
                </label>
                <input
                  id={name}
                  name={name}
                  type={type}
                  required
                  minLength={
                    name === 'password' || name === 'passwordConfirm'
                      ? 8
                      : undefined
                  }
                  autoComplete={
                    signupMode && name === 'password'
                      ? 'new-password'
                      : autoComplete
                  }
                  value={values[name]}
                  onChange={(event) => change(name, event.target.value)}
                  aria-invalid={Boolean(errors[name])}
                  aria-describedby={
                    errors[name]
                      ? `${name}-error`
                      : name === 'password'
                        ? 'password-hint'
                        : undefined
                  }
                  className='w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none focus:border-[#23745b] focus:ring-2 focus:ring-emerald-100 aria-invalid:border-red-500'
                />
                {name === 'password' && mode === 'signup' && !errors[name] && (
                  <p id='password-hint' className='mt-2 text-xs text-stone-500'>
                    8자 이상 입력해 주세요.
                  </p>
                )}
                {errors[name] && (
                  <p
                    id={`${name}-error`}
                    className='mt-2 text-sm text-red-700'
                    aria-live='polite'
                  >
                    {errors[name]}
                  </p>
                )}
              </div>
            ))}
            <button
              type='submit'
              className='w-full rounded-xl bg-[#23745b] px-4 py-3 font-semibold text-white hover:bg-[#185b46] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#23745b]'
            >
              {pending ? `${title} 중…` : title}
            </button>
          </fieldset>
        </form>
        <p className='mt-7 text-center text-sm text-stone-500'>
          {signupMode ? '이미 계정이 있으신가요? ' : '아직 계정이 없으신가요? '}
          <Link
            href={signupMode ? '/login' : '/signup'}
            className='font-semibold text-[#23745b] underline underline-offset-4'
          >
            {signupMode ? '로그인' : '회원가입'}
          </Link>
        </p>
      </section>
    </main>
  );
};

export default AuthForm;
