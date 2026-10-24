export type AuthFields = {
  email: string;
  password: string;
  passwordConfirm: string;
  nickname: string;
};
export type AuthField = keyof AuthFields;
export type AuthErrors = Partial<Record<AuthField, string>>;

export const validateAuthField = (field: AuthField, values: AuthFields): string => {
  switch (field) {
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())
        ? '' : '올바른 이메일 주소를 입력해 주세요.';
    case 'password':
      return values.password.length >= 8 ? '' : '비밀번호는 8자 이상 입력해 주세요.';
    case 'passwordConfirm':
      return values.passwordConfirm === values.password && values.passwordConfirm.length > 0
        ? '' : '비밀번호가 일치하지 않습니다.';
    case 'nickname':
      return values.nickname.trim() ? '' : '닉네임을 입력해 주세요.';
  }
};
