'use client';

import { useRef } from 'react';
import type { FormHTMLAttributes } from 'react';

export function AutoSubmitForm({
  children,
  ...props
}: FormHTMLAttributes<HTMLFormElement>) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const submit = (form: HTMLFormElement, delayed = false) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => form.requestSubmit(), delayed ? 350 : 0);
  };
  return (
    <form
      {...props}
      onChange={(event) => submit(event.currentTarget)}
      onInput={(event) => {
        if ((event.target as HTMLInputElement).type === 'search') submit(event.currentTarget, true);
      }}
    >
      {children}
    </form>
  );
}
