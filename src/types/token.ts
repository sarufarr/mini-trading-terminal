export type TokenEvent = {
  id: string;
  timestamp: number;
  transactionHash: string;
  eventDisplayType?: string | null;
  amountUsd?: number | null;
  uniqueId?: string;
};
