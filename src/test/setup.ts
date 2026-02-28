import '@testing-library/jest-dom/vitest';

// cmdk (Command) and VirtualList need ResizeObserver
class ResizeObserverMock {
  observe = () => {};
  unobserve = () => {};
  disconnect = () => {};
}
window.ResizeObserver = window.ResizeObserver ?? ResizeObserverMock;
