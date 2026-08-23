export type JournalStatus = 'planning' | 'trading' | 'reviewing' | 'completed';

interface StatusInput {
  pre_market_completed: boolean;
  post_market_completed: boolean;
  hasTrades: boolean; // true if trades table has >=1 row for this user/date/symbol
}

export function computeStatus({
  pre_market_completed,
  post_market_completed,
  hasTrades,
}: StatusInput): JournalStatus {
  if (post_market_completed) return 'completed';
  if (hasTrades) return 'reviewing';
  if (pre_market_completed) return 'trading';
  return 'planning';
}
