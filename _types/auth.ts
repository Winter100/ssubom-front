export type User = {
  id: number;
  email: string;
  nickname: string;
  nicknameChangedAt: string | null;
  createdAt: Date;
  profileImage?: string | null;
};
export type LoginInput = { email: string; password: string };
export type SignupInput = LoginInput & { nickname: string };
export type LoginResponse = { user: User; accessToken: string };
export type TokenResponse = { accessToken: string };
