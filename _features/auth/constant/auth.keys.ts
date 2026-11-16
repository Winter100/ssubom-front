export const authKeys = {
  all: ['auth'] as const,
  withdrawal: (memberId: number) => [...authKeys.all, 'withdrawal', memberId] as const,
  me: () => [...authKeys.all, 'me'] as const,
};
