export const SUCCESS_RESET_MS = 4000;
export const BALANCE_REFRESH_DELAY_MS = 1500;
export const MIN_LOADING_MS = 400;
export const RESIZE_THROTTLE_MS = 100;

/** Framer-motion spring for panel snap (drag end). */
export const PANEL_SPRING_STIFFNESS = 400;
export const PANEL_SPRING_DAMPING = 30;

/** Max height for list/table views (NetworkList, VirtualTable on NetworkPage). */
export const LIST_VIEW_MAX_HEIGHT = '80vh';

/** VirtualList estimateSize for network list items (px). */
export const LIST_ESTIMATE_SIZE = 40;

/** VirtualTable estimatedRowHeight for tokens grid (px). */
export const TOKENS_GRID_ESTIMATED_ROW_HEIGHT = 52;

/** VirtualTable gridTemplateColumns for tokens grid (Icon, Name, Symbol, Exchanges). */
export const TOKENS_GRID_COLUMNS = '60px 1fr 1fr 1fr';

/** Max height for events table on token page. */
export const EVENTS_VIEW_MAX_HEIGHT = '50vh';

/** VirtualTable estimatedRowHeight for events grid (px). */
export const EVENTS_GRID_ESTIMATED_ROW_HEIGHT = 48;

/** VirtualTable gridTemplateColumns for events grid (Type, Time, Value, Tx Hash). */
export const EVENTS_GRID_COLUMNS = '1fr 1fr 1fr 100px';

/** HomePage: network names shown first (order preserved). */
export const TOP_NETWORK_NAMES = [
  'Solana',
  'Ethereum',
  'BNB Chain',
  'Base',
  'Arbitrum',
  'Unichain',
  'Sui',
  'Tron',
  'Polygon',
  'Sonic',
  'Aptos',
] as const;
