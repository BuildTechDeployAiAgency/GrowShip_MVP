import type { NextWebVitalsMetric } from "next/app";

type PerfMetricPayload = {
  id: string;
  name: string;
  label: string;
  value: number;
  startTime: number;
  delta?: number;
  path: string;
  navigationType?: PerformanceNavigationTiming["type"];
  timestamp: number;
  userAgent?: string;
};

const PERF_ENDPOINT = "/api/analytics/perf";
const SHOULD_LOG =
  process.env.NEXT_PUBLIC_ENABLE_PERF_LOGGING?.toLowerCase() === "true" ||
  process.env.NODE_ENV !== "production";

function sendToAnalytics(metric: PerfMetricPayload) {
  const body = JSON.stringify(metric);

  if (navigator.sendBeacon) {
    navigator.sendBeacon(PERF_ENDPOINT, body);
    return;
  }

  fetch(PERF_ENDPOINT, {
    method: "POST",
    body,
    keepalive: true,
    headers: {
      "content-type": "application/json",
    },
  }).catch((error) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[WebVitals] Failed to report metric", error);
    }
  });
}

export function reportWebVitals(metric: NextWebVitalsMetric) {
  if (typeof window === "undefined") return;

  const navigationEntry =
    performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;

  const payload: PerfMetricPayload = {
    id: metric.id,
    name: metric.name,
    label: metric.label,
    value: metric.value,
    startTime: metric.startTime,
    delta: "delta" in metric ? (metric.delta as number) : undefined,
    path: window.location.pathname,
    navigationType: navigationEntry?.type,
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
  };

  if (SHOULD_LOG) {
    const threshold =
      metric.name === "TTFB" ? 1500 : metric.name === "LCP" ? 2500 : 0;
    const duration = metric.value.toFixed(2);
    const message = `[WebVitals] ${metric.name}=${duration} (label=${metric.label}, path=${payload.path})`;

    if (threshold && metric.value > threshold) {
      console.warn(`${message} ⚠️ exceeded threshold=${threshold}ms`);
    } else {
      console.info(message);
    }
  }

  sendToAnalytics(payload);
}

