'use client';
// Build 11.0.3 — Web Vitals field reporter (v3.0 §27.1).
// Measures Core Web Vitals in real browsers using native PerformanceObserver
// (no web-vitals dependency, zero bundle risk) and beacons them to /api/vitals.
// Captures LCP, CLS, INP (via event-timing), FCP, and TTFB.

import { useEffect } from 'react';

function rate(metric: string, v: number): 'good' | 'needs-improvement' | 'poor' {
  const t: Record<string, [number, number]> = {
    LCP: [2500, 4000],
    INP: [200, 500],
    CLS: [0.1, 0.25],
    FCP: [1800, 3000],
    TTFB: [800, 1800]
  };
  const [good, poor] = t[metric] || [Infinity, Infinity];
  return v <= good ? 'good' : v <= poor ? 'needs-improvement' : 'poor';
}

export default function WebVitalsReporter() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;
    const route = window.location.pathname;
    const deviceType = window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop';
    const navType =
      (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type || 'navigate';

    const send = (metric: string, value: number) => {
      const payload = JSON.stringify({ metric, value, rating: rate(metric, value), route, navType, deviceType });
      // sendBeacon survives page unload; fall back to fetch keepalive.
      if (navigator.sendBeacon) navigator.sendBeacon('/api/vitals', payload);
      else fetch('/api/vitals', { method: 'POST', body: payload, keepalive: true }).catch(() => {});
    };

    const observers: PerformanceObserver[] = [];

    // LCP — report the last candidate at page hide.
    let lcp = 0;
    try {
      const o = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) lcp = (e as any).renderTime || (e as any).loadTime || e.startTime;
      });
      o.observe({ type: 'largest-contentful-paint', buffered: true });
      observers.push(o);
    } catch {}

    // CLS — cumulative, excluding shifts after recent input.
    let cls = 0;
    try {
      const o = new PerformanceObserver((list) => {
        for (const e of list.getEntries() as any[]) if (!e.hadRecentInput) cls += e.value;
      });
      o.observe({ type: 'layout-shift', buffered: true });
      observers.push(o);
    } catch {}

    // INP — worst interaction latency (approximation via event timing).
    let inp = 0;
    try {
      const o = new PerformanceObserver((list) => {
        for (const e of list.getEntries() as any[]) {
          const dur = e.duration || 0;
          if (dur > inp) inp = dur;
        }
      });
      o.observe({ type: 'event', buffered: true, durationThreshold: 40 } as any);
      observers.push(o);
    } catch {}

    // FCP + TTFB — one-shot from paint / navigation timing.
    try {
      const fcp = performance.getEntriesByName('first-contentful-paint')[0];
      if (fcp) send('FCP', fcp.startTime);
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (nav) send('TTFB', nav.responseStart);
    } catch {}

    const flush = () => {
      if (lcp) send('LCP', lcp);
      send('CLS', +cls.toFixed(4));
      if (inp) send('INP', inp);
      observers.forEach((o) => o.disconnect());
    };

    // Flush on the first hide (most reliable point for finalized metrics).
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onHide, { once: true });
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []);

  return null;
}
