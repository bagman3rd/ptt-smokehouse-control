'use client';

import { useEffect, useMemo, useState } from 'react';
import { dayPatternProfiles, inferDayPatternKey } from '@/lib/dayProfiles';

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

  const selectedScenario = useMemo(() => scenarios.find((scenario) => scenario.id === scenarioId), [scenarios, scenarioId]);
  const selectedDayPattern = useMemo(() => dayPatternProfiles.find((profile) => profile.key === dayPatternKey) ?? dayPatternProfiles[0], [dayPatternKey]);

  useEffect(() => {
    if (!selectedScenario) return;
    setDayPatternKey(inferDayPatternKey(selectedScenario.name));
  }, [selectedScenario?.id]);

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
        <input className="field mt-1" value={serviceDate} onChange={(event) => setServiceDate(event.target.value)} type="date" required />
        <div className="mt-1 text-xs font-bold text-slate-500">{formatDateWithDow(serviceDate)}</div>
      </div>
      <div>
        <label className="label">Scenario</label>
        <select className="field mt-1" value={scenarioId} onChange={(event) => setScenarioId(event.target.value)} required>
          {scenarios.length === 0 ? <option value="">No scenarios found — open Settings or run seed</option> : scenarios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {selectedScenario ? <div className="mt-1 text-xs text-slate-500">{formatMoney(selectedScenario.annualSales)} annual · {selectedScenario.bbqSalesPercent}% smoked meat sales</div> : null}
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
        <input className="field mt-1" value={eventMultiplier} onChange={(event) => setEventMultiplier(event.target.value)} type="number" step="0.05" min="0.5" required />
      </div>
      <div className="flex flex-col justify-end gap-2">
        <button className="btn-primary w-full" type="submit" disabled={isGenerating || scenarios.length === 0}>
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
