import AuthForm from '@/_features/login/components/auth-form';

const SignupPage = () => (
  <div className='min-h-screen bg-[#fafbf9] font-sans text-[#202a26] selection:bg-emerald-100'>
    <AuthForm mode='signup' />
  </div>
);

export default SignupPage;
