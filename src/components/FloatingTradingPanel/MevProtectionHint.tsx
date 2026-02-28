import { memo } from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { env } from '@/env';

export const MevProtectionHint = memo(function MevProtectionHint() {
  const enabled = Boolean(env.VITE_JITO_BLOCK_ENGINE_URL);

  if (enabled) {
    return (
      <div
        className="flex items-center gap-2 text-xs text-muted-foreground"
        role="status"
        aria-label="MEV protection enabled via Jito"
      >
        <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-green-600 dark:text-green-500" />
        <span>MEV protection · Sent via Jito</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-500"
      role="status"
      aria-label="MEV protection is off"
    >
      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
      <span>MEV protection off · Tx sent via public RPC</span>
    </div>
  );
});

MevProtectionHint.displayName = 'MevProtectionHint';
