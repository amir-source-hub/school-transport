import type { FormHTMLAttributes } from 'react';
import { Button } from '@/components/ui/button';

export function AutoSubmitForm({
  children,
  showSubmit = true,
  ...props
}: FormHTMLAttributes<HTMLFormElement> & { showSubmit?: boolean }) {
  return (
    <form {...props}>
      {children}
      {showSubmit && (
        <Button type="submit" className="self-end">
          اعمال فیلتر
        </Button>
      )}
    </form>
  );
}
