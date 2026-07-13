'use client';

import { useEffect, useMemo, useState } from 'react';
import { dayPatternProfiles, inferDayPatternKey } from '@/lib/dayProfiles';
import { FOOD_SALES_PERCENT, LIQUOR_SALES_PERCENT, salesBreakdownLine } from '@/lib/salesModel';

type Scenario = {
  id: string;
  name: string;
  annualSales?: number;
  bbqSalesPercent?: number;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateWithDow(dateValue: string) {
  if (!dateValue) return '';
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  const dow = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  return `${dateValue} ${dow}`;
}

function formatMoney(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) return '—';
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function CreateCookPlanForm({ scenarios }: { scenarios: Scenario[] }) {
  const [serviceDate, setServiceDate] = useState(today());
  const [scenarioId, setScenarioId] = useState(scenarios[0]?.id ?? '');
  const [eventMultiplier, setEventMultiplier] = useState('1');
  const [dayPatternKey, setDayPatternKey] = useState('default-tourist');
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);
  const [eodStatus, setEodStatus] = useState<any>(null);
  const [eodStatusLoading, setEodStatusLoading] = useState(false);
  const [capacityPreview, setCapacityPreview] = useState<any>(null);
  const [capacityLoading, setCapacityLoading] = useState(false);

  const selectedScenario = useMemo(() => scenarios.find((scenario) => scenario.id === scenarioId), [scenarios, scenarioId]);
  const selectedDayPattern = useMemo(() => dayPatternProfiles.find((profile) => profile.key === dayPatternKey) ?? dayPatternProfiles[0], [dayPatternKey]);

  useEffect(() => {
    if (!selectedScenario) return;
    setDayPatternKey(inferDayPatternKey(selectedScenario.name));
  }, [selectedScenario?.id]);

  useEffect(() => {
    let cancelled = false;
    async function loadStatus() {
      if (!serviceDate) return;
      setEodStatusLoading(true);
      try {
        const response = await fetch(`/api/eod-status?loadDate=${encodeURIComponent(serviceDate)}`, { cache: 'no-store' });
        const data = await response.json().catch(() => ({}));
        if (!cancelled) setEodStatus(data);
      } catch (err) {
        if (!cancelled) setEodStatus({ ok: false, message: 'Could not check prior EOD status.' });
      } finally {
        if (!cancelled) setEodStatusLoading(false);
      }
    }
    loadStatus();
    return () => { cancelled = true; };
  }, [serviceDate]);

  useEffect(() => {
    let cancelled = false;
    async function loadCapacityPreview() {
      if (!serviceDate || !scenarioId) return;
      setCapacityLoading(true);
      try {
        const params = new URLSearchParams({ loadDate: serviceDate, scenarioId, eventMultiplier, dayPatternKey });
        const response = await fetch(`/api/cook-plan/capacity-preview?${params.toString()}`, { cache: 'no-store' });
        const data = await response.json().catch(() => ({}));
        if (!cancelled) setCapacityPreview(data);
      } catch (err) {
        if (!cancelled) setCapacityPreview({ ok: false, message: 'Could not check smoker capacity preview.' });
      } finally {
        if (!cancelled) setCapacityLoading(false);
      }
    }
    loadCapacityPreview();
    return () => { cancelled = true; };
  }, [serviceDate, scenarioId, eventMultiplier, dayPatternKey]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isGenerating) return;

    setIsGenerating(true);
    setMessage(null);
    setError(null);
    setLastResult(null);

    try {
      const response = await fetch('/api/cook-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        cache: 'no-store',
        body: JSON.stringify({ serviceDate, scenarioId, eventMultiplier, dayPatternKey })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) {
        throw new Error(data.message || `Generate failed with status ${response.status}`);
      }
      setLastResult(data);
      setMessage(`Generated load plan for ${formatDateWithDow(serviceDate)}. Brisket/pork use next-day demand; ribs/chicken use same-day demand. Loading updated meat numbers...`);
      // Force a full navigation to the specific newly-created plan. router.refresh() alone can leave
      // stale server-component output visible on Render/browser caches.
      window.location.assign(data.redirectUrl || `/cook-plan?generatedAt=${Date.now()}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Generate plan failed.';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 grid gap-4 md:grid-cols-5">
      <div>
        <label className="label">Load Date</label>
        <input data-testid="cook-plan-load-date" className="field mt-1" value={serviceDate} onChange={(event) => setServiceDate(event.target.value)} type="date" required />
        <div className="mt-1 text-xs font-bold text-slate-500">{formatDateWithDow(serviceDate)}</div>
      </div>
      <div>
        <label className="label">Scenario</label>
        <select className="field mt-1" value={scenarioId} onChange={(event) => setScenarioId(event.target.value)} required>
          {scenarios.length === 0 ? <option value="">No scenarios found — open Settings or run seed</option> : scenarios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {selectedScenario ? <div className="mt-1 space-y-1 text-xs text-slate-500"><div>{formatMoney(selectedScenario.annualSales)} annual total restaurant sales</div><div className="font-bold text-blue-800">{LIQUOR_SALES_PERCENT}% liquor is excluded · {FOOD_SALES_PERCENT}% food · {selectedScenario.bbqSalesPercent}% smoked meat of total</div><div>{salesBreakdownLine(selectedScenario.annualSales ?? 0, selectedScenario.bbqSalesPercent ?? 0)}</div></div> : null}
      </div>

      <div>
        <label className="label">Day Pattern</label>
        <select className="field mt-1" value={dayPatternKey} onChange={(event) => setDayPatternKey(event.target.value)} required>
          {dayPatternProfiles.map((profile) => <option key={profile.key} value={profile.key}>{profile.name}</option>)}
        </select>
        <div className="mt-1 text-xs text-slate-500">Sat {selectedDayPattern.shares[6]}% · Sun {selectedDayPattern.shares[0]}%</div>
      </div>
      <div>
        <label className="label">Event Multiplier</label>
        <input data-testid="cook-plan-event-multiplier" className="field mt-1" value={eventMultiplier} onChange={(event) => setEventMultiplier(event.target.value)} type="number" step="0.05" min="0.5" required />
      </div>
      <div className="md:col-span-5">
        <div className={eodStatus?.status === 'FOUND' ? 'rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900' : 'rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950'}>
          <div className="font-black">Prior EOD status before Generate Plan</div>
          <div className="mt-1">
            {eodStatusLoading ? 'Checking exact prior-day EOD log...' : eodStatus?.message || 'Prior EOD status unavailable.'}
          </div>
          {eodStatus?.status === 'FOUND' ? <div className="mt-1 text-xs font-bold">Leftover units: {Math.round(eodStatus.totalLeftoverUnits || 0)} · Waste: {Math.round(eodStatus.totalWasteLb || 0)} lb · Source: {eodStatus.priorEodDateLabel}</div> : null}
          {eodStatus?.status !== 'FOUND' ? <div className="mt-1 text-xs font-bold">Generate can continue, but the Cook Plan will require a manual hot-box check and will show missing prior EOD credit.</div> : null}
        </div>
      </div>

      <div className="md:col-span-5">
        <div className={capacityPreview?.warnings?.length ? 'rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-950' : 'rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700'}>
          <div className="font-black">Smoker capacity preview before Generate Plan</div>
          <div className="mt-1">{capacityLoading ? 'Checking active smoker capacity...' : capacityPreview?.warnings?.length ? 'Capacity warnings found. Review before generating.' : 'No capacity conflicts found from active smoker records.'}</div>
          {capacityPreview?.warnings?.length ? <ul className="mt-2 list-disc pl-5 font-bold">{capacityPreview.warnings.map((warning: string) => <li key={warning}>{warning}</li>)}</ul> : null}
          {capacityPreview?.items?.length ? <div className="mt-2 grid gap-1 text-xs md:grid-cols-2">{capacityPreview.items.map((item: any) => <div key={item.protein}>{item.protein}: projected {item.projectedUnits} / capacity {item.activeCapacity || 'not set'}</div>)}</div> : null}
        </div>
      </div>

      <div className="flex flex-col justify-end gap-2 md:col-span-5">
        <button data-testid="generate-cook-plan" className="btn-primary w-full md:w-auto" type="submit" disabled={isGenerating || scenarios.length === 0}>
          {isGenerating ? 'Generating...' : 'Generate Plan'}
        </button>
        {message ? <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">{message}</div> : null}
        {error ? <div className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-800">{error}</div> : null}
        {lastResult?.items ? <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <div className="font-black">API returned:</div>
          {lastResult.items.map((item: any) => <div key={item.protein}>{item.protein}: forecast {item.forecastCookUnits || item.recommendedCookUnits}, leftover {item.usableLeftoverUnits || 0}, load {item.recommendedCookUnits}</div>)}
        </div> : null}
      </div>
    </form>
  );
}
