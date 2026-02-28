/**
 * Web Vitals reporting for LCP, FID/INP, CLS, TTFB, FCP.
 * Use for quantifying and monitoring page performance (aligns with Lighthouse).
 */
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

import { devLog } from '@/lib/dev-log';

const DEBUG = import.meta.env.DEV;

function sendToConsole(metric: Metric) {
  if (!DEBUG) return;
  devLog.log(
    `[Web Vitals] ${metric.name}:`,
    Math.round(metric.value),
    metric.rating,
    metric.id
  );
}

/**
 * Optional: send to analytics (e.g. gtag or custom backend).
 * Replace with your analytics endpoint.
 */
function sendToAnalytics(metric: Metric) {
  if (typeof window.gtag === 'function') {
    window.gtag('event', metric.name, {
      event_category: 'Web Vitals',
      value: Math.round(
        metric.name === 'CLS' ? metric.value * 1000 : metric.value
      ),
      event_label: metric.id,
      non_interaction: true,
    });
  }
}

export function reportWebVitals() {
  onCLS((metric) => {
    sendToConsole(metric);
    sendToAnalytics(metric);
  });
  onFCP((metric) => {
    sendToConsole(metric);
    sendToAnalytics(metric);
  });
  onINP((metric) => {
    sendToConsole(metric);
    sendToAnalytics(metric);
  });
  onLCP((metric) => {
    sendToConsole(metric);
    sendToAnalytics(metric);
  });
  onTTFB((metric) => {
    sendToConsole(metric);
    sendToAnalytics(metric);
  });
}
