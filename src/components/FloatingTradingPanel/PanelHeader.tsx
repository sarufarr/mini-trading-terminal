import { memo } from 'react';
import { X, GripHorizontal } from 'lucide-react';
import { useTradePanelStore } from '@/store/trade-panel.store';
import { ETradeDirection } from '@/types/trade';
import { cn } from '@/lib/cn';
import type { EnhancedToken } from '@/lib/codex';

interface Props {
  token: EnhancedToken;
  onDragMouseDown: (e: React.MouseEvent) => void;
}

export const PanelHeader = memo(({ token, onDragMouseDown }: Props) => {
  const activeTab = useTradePanelStore((s) => s.activeTab);
  const setActiveTab = useTradePanelStore((s) => s.setActiveTab);
  const close = useTradePanelStore((s) => s.close);

  return (
    <div className="flex flex-col border-b border-border/60 select-none">
      <div
        className="flex items-center justify-between px-3 py-2 cursor-grab active:cursor-grabbing"
        onMouseDown={onDragMouseDown}
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="w-3.5 h-3.5 text-muted-foreground/50" />
          <span className="text-xs font-medium text-muted-foreground">
            {token.symbol ?? 'Token'}
          </span>
        </div>
        <button
          className="rounded p-0.5 hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={close}
          aria-label="Close panel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex px-3 pb-0 gap-1">
        {[ETradeDirection.BUY, ETradeDirection.SELL].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 py-1.5 text-sm font-medium rounded-t-md transition-colors capitalize',
              activeTab === tab
                ? tab === ETradeDirection.BUY
                  ? 'bg-green-500/15 text-green-500 border-b-2 border-green-500'
                  : 'bg-red-500/15 text-red-500 border-b-2 border-red-500'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-label={tab === ETradeDirection.BUY ? 'Buy' : 'Sell'}
          >
            {tab === ETradeDirection.BUY ? 'Buy' : 'Sell'}
          </button>
        ))}
      </div>
    </div>
  );
});

PanelHeader.displayName = 'PanelHeader';
