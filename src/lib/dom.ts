export interface ViewportSize {
  width: number;
  height: number;
}

export const getViewportSize = (): ViewportSize => {
  if (typeof window === 'undefined') {
    throw new Error('getViewportSize is only available in browser environment');
  }

  const width =
    window.visualViewport?.width ??
    document.documentElement.clientWidth ??
    window.innerWidth;

  const height =
    window.visualViewport?.height ??
    document.documentElement.clientHeight ??
    window.innerHeight;

  return { width, height };
};
