'use client';

import { useFormStatus } from 'react-dom';
import type { ReactNode } from 'react';

export function SubmitButton({ children, pendingText = 'Working...' }: { children: ReactNode; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}
