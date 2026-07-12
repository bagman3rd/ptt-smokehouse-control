'use client';

import { useMemo, useState } from 'react';

type CoreCode = 'BRISKET' | 'PORK' | 'CHICKEN' | 'RIBS';
type Protein = { id: string; name: string; code?: string | null };
type SavedQuickLog = {
  serviceDate: string;
  lockedAt?: string | null;
  proteinLogs: Array<{
    proteinId: string;
    sealedUnopenedUnits?: number;
    openedMeatLb?: number;
  }>;
} | null;

const CORE: Array<{ code: CoreCode; label: string; sealedLabel: string }> = [
  { code: 'BRISKET', label: 'Brisket', sealedLabel: 'sealed, unopened briskets' },
  { code: 'PORK', label: 'Pork', sealedLabel: 'sealed, unopened pork butts' },
  { code: 'CHICKEN', label: 'Chicken', sealedLabel: 'sealed, unopened chicken portions' },
  { code: 'RIBS', label: 'Ribs', sealedLabel: 'sealed, unopened rib racks' }
];

function today() { return new Date().toISOString().slice(0, 10); }

export function QuickEndOfDayForm({ proteins, initialLog }: { proteins: Protein[]; initialLog?: SavedQuickLog }) {
  const [serviceDate, setServiceDate] = useState(initialLog?.serviceDate || today());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isLocked = Boolean(initialLog?.lockedAt);
  const proteinByCode = useMemo(() => new Map(proteins.map((p) => [String(p.code || '').toUpperCase(), p])), [proteins]);
  const savedByProtein = useMemo(() => new Map((initialLog?.proteinLogs || []).map((row) => [row.proteinId, row])), [initialLog]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || isLocked) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const data = new FormData(event.currentTarget);
      const rows = CORE.map(({ code }) => {
        const protein = proteinByCode.get(code);
        if (!protein) throw new Error(`${code} is not configured as an active protein.`);
        return {
          proteinId: protein.id,
          sealedUnopenedUnits: Number(data.get(`sealed-${code}`) || 0),
          openedMeatLb: Number(data.get(`opened-${code}`) || 0)
        };
      });
      if (rows.some((row) => row.sealedUnopenedUnits < 0 || row.openedMeatLb < 0)) {
        throw new Error('Negative numbers are not allowed. Enter 0 when none remains.');
      }
      const response = await fetch('/api/end-of-day', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mode: 'QUICK',
          serviceDate,
          status: 'COMPLETE',
          totalSales: 0,
          bbqSales: 0,
          notes: 'Kitchen quick EOD report: 8-number closeout.',
          proteins: rows
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.message || 'Unable to submit EOD report.');
      setMessage('EOD report submitted. Only sealed pork, chicken, and ribs will reduce the next load.');
      window.location.assign(result.redirectUrl || `/end-of-day?serviceDate=${encodeURIComponent(serviceDate)}&savedAt=${Date.now()}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to submit EOD report.');
    } finally {
      setSaving(false);
    }
  }

  return <section className="card mb-6 border-2 border-emerald-300 bg-emerald-50 p-5" data-testid="quick-eod-section">
    <div className="mb-4">
      <h2 className="text-2xl font-black text-emerald-950">Quick EOD Report — 8 Numbers</h2>
      <p className="mt-1 text-sm font-bold text-emerald-900">Enter sealed unopened units and pounds remaining from opened meat. Open meat and sealed brisket are recorded for repurposing but are not carried into tomorrow’s smoker load.</p>
      <p className="mt-1 text-sm text-emerald-900"><strong>Tomorrow’s load credit:</strong> sealed pork, sealed chicken, and sealed ribs only.</p>
    </div>
    <form onSubmit={submit} className="space-y-4">
      <div className="max-w-xs">
        <label className="label" htmlFor="quick-service-date">Service date</label>
        <input id="quick-service-date" data-testid="quick-eod-date" className="field mt-1" type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} required disabled={isLocked} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {CORE.map(({ code, label, sealedLabel }) => {
          const protein = proteinByCode.get(code);
          const saved = protein ? savedByProtein.get(protein.id) : undefined;
          return <div key={code} className="rounded-2xl border border-emerald-200 bg-white p-4">
            <h3 className="text-lg font-black">{label}</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor={`sealed-${code}`}>Number of {sealedLabel}</label>
                <input id={`sealed-${code}`} data-testid={`quick-eod-sealed-${code}`} className="field mt-1 text-lg font-black" name={`sealed-${code}`} type="number" min="0" step="0.1" defaultValue={saved?.sealedUnopenedUnits ?? 0} required disabled={isLocked || !protein} />
              </div>
              <div>
                <label className="label" htmlFor={`opened-${code}`}>Pounds from opened {label.toLowerCase()}</label>
                <input id={`opened-${code}`} data-testid={`quick-eod-opened-${code}`} className="field mt-1 text-lg font-black" name={`opened-${code}`} type="number" min="0" step="0.1" defaultValue={saved?.openedMeatLb ?? 0} required disabled={isLocked || !protein} />
              </div>
            </div>
          </div>;
        })}
      </div>
      {message ? <div className="rounded-xl bg-emerald-100 px-3 py-2 text-sm font-black text-emerald-900">{message}</div> : null}
      {error ? <div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-black text-red-800">{error}</div> : null}
      <button data-testid="submit-quick-eod" className="btn-primary w-full py-4 text-lg md:w-auto" type="submit" disabled={saving || isLocked}>
        {isLocked ? 'EOD Report Locked' : saving ? 'Submitting...' : 'Submit EOD Report'}
      </button>
    </form>
  </section>;
}
