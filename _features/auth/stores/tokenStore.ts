let accessToken: string | null = null;
let tokenRevision = 0;

export const getAccessToken = (): string | null => accessToken;
export const getTokenRevision = (): number => tokenRevision;
export const setAccessToken = (token: string | null): void => {
  accessToken = token;
  tokenRevision++;
};
