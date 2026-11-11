'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { getLoginHref } from '../lib/login-redirect';

type LoginLinkProps = {
  children: ReactNode;
  className?: string;
};

const LoginLink = ({ children, className }: LoginLinkProps) => {
  const router = useRouter();

  return (
    <Link
      href='/login'
      className={className}
      onNavigate={(event) => {
        event.preventDefault();
        const { pathname, search, hash } = window.location;
        router.push(getLoginHref(`${pathname}${search}${hash}`));
      }}
    >
      {children}
    </Link>
  );
};

export default LoginLink;
