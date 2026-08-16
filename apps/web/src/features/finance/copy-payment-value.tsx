'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function CopyPaymentValue({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    const normalized = value.replace(/\s/g, '');
    try {
      await navigator.clipboard.writeText(normalized);
    } catch {
      const input = document.createElement('textarea');
      input.value = normalized;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }
  return (
    <Button type="button" size="sm" variant="ghost" aria-label={`کپی ${label}`} onClick={copy}>
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? 'کپی شد' : 'کپی'}
    </Button>
  );
}
