import { useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';

export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });

  return ref;
}
