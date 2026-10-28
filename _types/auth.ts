export type User = { id: number; email: string; nickname: string };
export type LoginInput = { email: string; password: string };
export type SignupInput = LoginInput & { nickname: string };
export type LoginResponse = { member: User; accessToken: string };
export type TokenResponse = { accessToken: string };
export type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'error';
