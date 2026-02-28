import { TradingPanel, TradeEnvRequiredCard } from '@/components/TradingPanel';
import type { EnhancedToken, PairFilterResult } from '@/lib/codex';
import { TokenPageInfoCard } from './TokenPageInfoCard';
import { TokenPagePoolsCard } from './TokenPagePoolsCard';

interface TokenPageSidebarProps {
  details: EnhancedToken | undefined;
  pairs: PairFilterResult[];
  hasTradeEnv: boolean;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
}

export function TokenPageSidebar({
  details,
  pairs,
  hasTradeEnv,
  onRefresh,
  refreshing = false,
}: TokenPageSidebarProps) {
  return (
    <div className="lg:col-span-1 space-y-6">
      {details &&
        (hasTradeEnv ? (
          <TradingPanel token={details} />
        ) : (
          <TradeEnvRequiredCard token={details} />
        ))}
      <TokenPageInfoCard details={details} />
      <TokenPagePoolsCard
        pairs={pairs}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />
    </div>
  );
}
