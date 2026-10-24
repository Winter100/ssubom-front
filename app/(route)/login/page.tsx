import AuthForm from '@/app/_components/auth-form';
import { Suspense } from 'react';

type LoginPageProps = { searchParams: Promise<{ registered?: string }> };

const LoginContent = async ({ searchParams }: LoginPageProps) => {
  const { registered } = await searchParams;
  return <AuthForm mode='login' registered={registered === '1'} />;
};

const LoginPage = ({ searchParams }: LoginPageProps) => {
  return (
    <div className='min-h-screen bg-[#fafbf9] font-sans text-[#202a26] selection:bg-emerald-100'>
      <Suspense
        fallback={
          <main className='flex-1 p-10 text-center' role='status'>
            로그인 화면을 준비하고 있습니다…
          </main>
        }
      >
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
};

export default LoginPage;
