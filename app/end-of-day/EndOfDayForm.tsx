'use client';

import { useMemo, useState } from 'react';

type Protein = {
  id: string;
  name: string;
  inputUnit: string;
};

type InitialProteinLog = {
  proteinId: string;
  cookedUnits: number;
  soldCookedLb: number;
  usableLeftoverUnits: number;
  usableLeftoverLb: number;
  wasteLb: number;
  wasteReason?: string | null;
  eightySixed: boolean;
};

type InitialLog = {
  serviceDate: string;
  totalSales: number;
  bbqSales: number;
  notes?: string | null;
  proteinLogs: InitialProteinLog[];
} | null;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateWithDow(dateValue: string) {
  if (!dateValue) return '';
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  const dow = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  return `${dateValue} ${dow}`;
}

function displayUnit(proteinName: string, inputUnit: string) {
  const lower = proteinName.toLowerCase();
  if (lower.includes('pork')) return 'butts';
  if (lower.includes('rib')) return 'racks';
  if (lower.includes('chicken')) return 'chicken';
  if (lower.includes('brisket')) return 'briskets';
  return inputUnit.toLowerCase().replace('_', ' ');
}

function numberFromForm(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === null || value === '' ? 0 : Number(value);
}

export function EndOfDayForm({ proteins, initialLog }: { proteins: Protein[]; initialLog?: InitialLog }) {
  const [serviceDate, setServiceDate] = useState(initialLog?.serviceDate || today());
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dateLabel = useMemo(() => formatDateWithDow(serviceDate), [serviceDate]);
  const logByProteinId = useMemo(() => new Map((initialLog?.proteinLogs || []).map((log) => [log.proteinId, log])), [initialLog]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const formData = new FormData(event.currentTarget);
      const payload = {
        serviceDate,
        totalSales: numberFromForm(formData, 'totalSales'),
        bbqSales: numberFromForm(formData, 'bbqSales'),
        notes: String(formData.get('notes') || ''),
        proteins: proteins.map((protein) => ({
          proteinId: protein.id,
          cookedUnits: numberFromForm(formData, `cookedUnits-${protein.id}`),
          soldCookedLb: numberFromForm(formData, `soldCookedLb-${protein.id}`),
          usableLeftoverUnits: numberFromForm(formData, `usableLeftoverUnits-${protein.id}`),
          usableLeftoverLb: numberFromForm(formData, `usableLeftoverLb-${protein.id}`),
          wasteLb: numberFromForm(formData, `wasteLb-${protein.id}`),
          wasteReason: String(formData.get(`wasteReason-${protein.id}`) || ''),
          eightySixed: formData.get(`eightySixed-${protein.id}`) === 'on'
        }))
      };

      const response = await fetch('/api/end-of-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        cache: 'no-store',
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) {
        throw new Error(data.message || `Save failed with status ${response.status}`);
      }
      setMessage(`Saved end-of-day log for ${formatDateWithDow(serviceDate)}. Loading saved values...`);
      window.location.assign(data.redirectUrl || `/end-of-day?serviceDate=${encodeURIComponent(serviceDate)}&savedAt=${Date.now()}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Save end-of-day log failed.';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="card p-5">
        <h2 className="text-xl font-black">Service Summary</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <div>
            <label className="label">Service Date</label>
            <input className="field mt-1" type="date" value={serviceDate} onChange={(event) => setServiceDate(event.target.value)} required />
            <div className="mt-1 text-xs font-bold text-slate-500">{dateLabel}</div>
          </div>
          <div><label className="label">Total Sales</label><input className="field mt-1" type="number" step="1" name="totalSales" defaultValue={initialLog?.totalSales ?? ''} placeholder="0" /></div>
          <div><label className="label">Smoked Meat Sales</label><input className="field mt-1" type="number" step="1" name="bbqSales" defaultValue={initialLog?.bbqSales ?? ''} placeholder="0" /></div>
          <div><label className="label">Notes</label><input className="field mt-1" name="notes" defaultValue={initialLog?.notes ?? ''} placeholder="Weather, events, service issues" /></div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-xl font-black">Protein Results</h2>
        <p className="mt-1 text-sm text-slate-600">Enter actual usable leftovers in the <strong>Usable Leftover Units</strong> column. That field is what credits the next cook plan. If cooked units are entered but sold/waste are left at 0, the app will treat those cooked units as usable leftovers as a safety fallback.</p>
        <div className="mt-4 space-y-4">
          {proteins.map((protein) => {
            const saved = logByProteinId.get(protein.id);
            return (
            <div key={protein.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 text-lg font-black">{protein.name}</div>
              <div className="grid gap-3 md:grid-cols-7">
                <div><label className="label">Cooked Units / fallback leftover</label><input className="field mt-1" name={`cookedUnits-${protein.id}`} type="number" step="0.1" defaultValue={saved?.cookedUnits ?? ''} /></div>
                <div><label className="label">Sold Cooked lb</label><input className="field mt-1" name={`soldCookedLb-${protein.id}`} type="number" step="0.1" defaultValue={saved?.soldCookedLb ?? ''} /></div>
                <div><label className="label">Usable Leftover Units — credits next plan</label><input className="field mt-1" name={`usableLeftoverUnits-${protein.id}`} type="number" step="0.1" defaultValue={saved?.usableLeftoverUnits ?? ''} placeholder={displayUnit(protein.name, protein.inputUnit)} /></div>
                <div><label className="label">Usable Leftover lb</label><input className="field mt-1" name={`usableLeftoverLb-${protein.id}`} type="number" step="0.1" defaultValue={saved?.usableLeftoverLb ?? ''} /></div>
                <div><label className="label">Waste lb</label><input className="field mt-1" name={`wasteLb-${protein.id}`} type="number" step="0.1" defaultValue={saved?.wasteLb ?? ''} /></div>
                <div><label className="label">Waste Reason</label><select className="field mt-1" name={`wasteReason-${protein.id}`} defaultValue={saved?.wasteReason || ''}><option value="">None</option><option>Overproduced</option><option>Dried out</option><option>Quality reject</option><option>Dropped/spoiled</option><option>Other</option></select></div>
                <label className="flex items-center gap-2 pt-7 text-sm font-bold"><input name={`eightySixed-${protein.id}`} type="checkbox" defaultChecked={saved?.eightySixed ?? false} className="h-5 w-5" /> 86?</label>
              </div>
            </div>
          )})}
        </div>
        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center">
          <button className="btn-primary w-full md:w-auto" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save End-of-Day Log'}</button>
          {message ? <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">{message}</div> : null}
          {error ? <div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-800">{error}</div> : null}
        </div>
      </section>
    </form>
  );
}
