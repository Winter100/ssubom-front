export const getLoginReturnTo = (value?: string): string => {
  if (!value?.startsWith('/')) return '/';

  try {
    const destination = new URL(value, 'http://localhost');
    const pathname = destination.pathname.replace(/\/+$/, '');
    if (
      destination.origin !== 'http://localhost' ||
      pathname === '/login' ||
      pathname === '/signup'
    ) {
      return '/';
    }
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return '/';
  }
};

export const getLoginHref = (returnTo: string): string => {
  const destination = getLoginReturnTo(returnTo);
  return destination === '/'
    ? '/login'
    : `/login?${new URLSearchParams({ returnTo: destination })}`;
};
