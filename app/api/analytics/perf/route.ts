import { NextResponse } from "next/server";

interface IncomingMetric {
  id: string;
  name: string;
  label: string;
  value: number;
  startTime: number;
  delta?: number;
  path: string;
  navigationType?: string;
  timestamp: number;
  userAgent?: string;
}

const METRIC_WARN_THRESHOLDS: Record<string, number> = {
  TTFB: 1500,
  LCP: 2500,
  FID: 100,
  INP: 200,
};

export async function POST(request: Request) {
  try {
    const metric = (await request.json()) as IncomingMetric;

    if (!metric?.name || !metric?.value) {
      return NextResponse.json(
        { ok: false, message: "Invalid metric payload" },
        { status: 400 }
      );
    }

    const threshold = METRIC_WARN_THRESHOLDS[metric.name];
    const logPayload = {
      ...metric,
      exceededThreshold: threshold ? metric.value > threshold : false,
    };

    if (threshold && metric.value > threshold) {
      console.warn("[PerfMetric] Threshold exceeded", logPayload);
    } else {
      console.info("[PerfMetric]", logPayload);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PerfMetric] Failed to log metric", error);
    return NextResponse.json(
      { ok: false, message: "Unable to log metric" },
      { status: 500 }
    );
  }
}

