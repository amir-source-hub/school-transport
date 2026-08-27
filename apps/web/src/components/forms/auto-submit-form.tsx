import type { FormHTMLAttributes } from 'react';
import { Button } from '@/components/ui/button';

export function AutoSubmitForm({ children, ...props }: FormHTMLAttributes<HTMLFormElement>) {
  return (
    <form {...props}>
      {children}
      <Button type="submit" className="self-end">
        اعمال فیلتر
      </Button>
    </form>
  );
}
