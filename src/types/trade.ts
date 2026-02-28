export enum ETradeDirection {
  BUY = 'buy',
  SELL = 'sell',
}

export enum ETradePhaseStatus {
  IDLE = 'idle',
  AWAITING_SIGNATURE = 'awaiting-signature',
  SENDING = 'sending',
  CONFIRMING = 'confirming',
  SUCCESS = 'success',
  ERROR = 'error',
}

export type TradePhase =
  | { status: ETradePhaseStatus.IDLE }
  | { status: ETradePhaseStatus.AWAITING_SIGNATURE }
  | { status: ETradePhaseStatus.SENDING }
  | { status: ETradePhaseStatus.CONFIRMING; txid: string }
  | { status: ETradePhaseStatus.SUCCESS; txid: string }
  | { status: ETradePhaseStatus.ERROR; message: string };
