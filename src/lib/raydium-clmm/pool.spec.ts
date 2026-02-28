import { describe, expect, it } from 'vitest';
import { selectPoolByLiquidity } from './pool';

describe('selectPoolByLiquidity', () => {
  it('returns null for empty array', () => {
    expect(selectPoolByLiquidity([], () => 0n)).toBeNull();
  });

  it('returns single item', () => {
    const items = [{ id: 'a', liquidity: 100n }];
    const getLiq = (x: (typeof items)[0]) => x.liquidity;
    expect(selectPoolByLiquidity(items, getLiq)).toEqual(items[0]);
  });

  it('returns item with max liquidity', () => {
    const items = [
      { id: 'a', liquidity: 100n },
      { id: 'b', liquidity: 300n },
      { id: 'c', liquidity: 200n },
    ];
    const getLiq = (x: (typeof items)[0]) => x.liquidity;
    expect(selectPoolByLiquidity(items, getLiq)).toEqual(items[1]);
  });

  it('returns first when all liquidity equal', () => {
    const items = [
      { id: 'a', liquidity: 50n },
      { id: 'b', liquidity: 50n },
    ];
    const getLiq = (x: (typeof items)[0]) => x.liquidity;
    expect(selectPoolByLiquidity(items, getLiq)).toEqual(items[0]);
  });
});
