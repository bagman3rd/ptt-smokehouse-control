'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Scenario = {
  id: string;
  name: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function CreateCookPlanForm({ scenarios }: { scenarios: Scenario[] }) {
  const router = useRouter();
  const [serviceDate, setServiceDate] = useState(today());
  const [scenarioId, setScenarioId] = useState(scenarios[0]?.id ?? '');
  const [eventMultiplier, setEventMultiplier] = useState('1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isGenerating) return;

    setIsGenerating(true);
    setMessage(null);

    try {
      const response = await fetch('/api/cook-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceDate, scenarioId, eventMultiplier })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) {
        throw new Error(data.message || `Generate failed with status ${response.status}`);
      }
      setMessage('Plan generated. Refreshing latest plan...');
      router.refresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Generate plan failed.';
      setMessage(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 grid gap-4 md:grid-cols-4">
      <div>
        <label className="label">Service Date</label>
        <input className="field mt-1" value={serviceDate} onChange={(event) => setServiceDate(event.target.value)} type="date" required />
      </div>
      <div>
        <label className="label">Scenario</label>
        <select className="field mt-1" value={scenarioId} onChange={(event) => setScenarioId(event.target.value)} required>
          {scenarios.length === 0 ? <option value="">No scenarios found — open Settings or run seed</option> : scenarios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Event Multiplier</label>
        <input className="field mt-1" value={eventMultiplier} onChange={(event) => setEventMultiplier(event.target.value)} type="number" step="0.05" min="0.5" required />
      </div>
      <div className="flex flex-col justify-end gap-2">
        <button className="btn-primary w-full" type="submit" disabled={isGenerating || scenarios.length === 0}>
          {isGenerating ? 'Generating...' : 'Generate Plan'}
        </button>
        {message ? <div className="text-xs font-bold text-slate-600">{message}</div> : null}
      </div>
    </form>
  );
}
