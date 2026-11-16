import AuthForm from '@/_features/auth/components/auth-form';
import { Suspense } from 'react';
import LoadingSpinner from '@/_features/common/components/loading-spinner';

type LoginPageProps = {
  searchParams: Promise<{ registered?: string; returnTo?: string | string[] }>;
};

const LoginPage = ({ searchParams }: LoginPageProps) => {
  return (
    <div className='min-h-screen bg-[#fafbf9] font-sans text-[#202a26] selection:bg-emerald-100'>
      <Suspense
        fallback={
          <LoadingSpinner />
        }
      >
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
};

export default LoginPage;

const LoginContent = async ({ searchParams }: LoginPageProps) => {
  const { registered, returnTo } = await searchParams;
  return (
    <AuthForm
      mode='login'
      registered={registered === '1'}
      returnTo={typeof returnTo === 'string' ? returnTo : undefined}
    />
  );
};
