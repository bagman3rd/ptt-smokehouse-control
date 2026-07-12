'use client';

import { useMemo, useState } from 'react';

type Protein = { id: string; name: string; inputUnit: string };

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
  status: string;
  notes?: string | null;
  lockedAt?: string | null;
  proteinLogs: InitialProteinLog[];
} | null;

function today() { return new Date().toISOString().slice(0, 10); }

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
  if (lower.includes('chicken')) return 'breasts';
  if (lower.includes('brisket')) return 'briskets';
  return inputUnit.toLowerCase().replace('_', ' ');
}

function numberFromForm(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === null || value === '' ? 0 : Number(value);
}

function rawFromForm(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === null ? '' : String(value);
}

export function EndOfDayForm({ proteins, initialLog }: { proteins: Protein[]; initialLog?: InitialLog }) {
  const [serviceDate, setServiceDate] = useState(initialLog?.serviceDate || today());
  const [status, setStatus] = useState(initialLog?.status || 'DRAFT');
  const [lockLog, setLockLog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const dateLabel = useMemo(() => formatDateWithDow(serviceDate), [serviceDate]);
  const isLocked = Boolean(initialLog?.lockedAt) || initialLog?.status === 'LOCKED';
  const logByProteinId = useMemo(() => new Map((initialLog?.proteinLogs || []).map((log) => [log.proteinId, log])), [initialLog]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving || isLocked) return;

    setIsSaving(true);
    setMessage(null);
    setError(null);
    setWarnings([]);

    try {
      const formData = new FormData(event.currentTarget);
      const selectedStatus = lockLog ? 'LOCKED' : String(formData.get('status') || status || 'DRAFT');
      const validationWarnings: string[] = [];
      const blockingErrors: string[] = [];
      let allProteinValuesZero = true;

      for (const protein of proteins) {
        const unit = displayUnit(protein.name, protein.inputUnit);
        const cookedUnits = numberFromForm(formData, `cookedUnits-${protein.id}`);
        const soldCookedLb = numberFromForm(formData, `soldCookedLb-${protein.id}`);
        const usableLeftoverUnitsRaw = rawFromForm(formData, `usableLeftoverUnits-${protein.id}`);
        const usableLeftoverUnits = numberFromForm(formData, `usableLeftoverUnits-${protein.id}`);
        const usableLeftoverLb = numberFromForm(formData, `usableLeftoverLb-${protein.id}`);
        const wasteLb = numberFromForm(formData, `wasteLb-${protein.id}`);

        if ([cookedUnits, soldCookedLb, usableLeftoverUnits, usableLeftoverLb, wasteLb].some((value) => value < 0)) {
          blockingErrors.push(`${protein.name}: negative values are not allowed.`);
        }
        if (cookedUnits > 0 || soldCookedLb > 0 || usableLeftoverUnits > 0 || usableLeftoverLb > 0 || wasteLb > 0) {
          allProteinValuesZero = false;
        }
        if (cookedUnits > 0 && usableLeftoverUnits > cookedUnits) {
          validationWarnings.push(`${protein.name}: usable leftover ${unit} exceed cooked ${unit}. Check hot box count.`);
        }
        if (cookedUnits === 0 && soldCookedLb > 0) {
          validationWarnings.push(`${protein.name}: sold cooked pounds entered but cooked units are zero.`);
        }
        if (['COMPLETE', 'REVIEWED', 'LOCKED'].includes(selectedStatus) && cookedUnits > 0 && usableLeftoverUnitsRaw === '') {
          blockingErrors.push(`${protein.name}: usable leftover units are required before marking the EOD log ${selectedStatus}. Enter 0 if none.`);
        }
      }

      if (allProteinValuesZero) {
        validationWarnings.push('All protein values are zero. Save as Draft only unless this is intentional.');
        if (['COMPLETE', 'REVIEWED', 'LOCKED'].includes(selectedStatus)) {
          blockingErrors.push('Cannot mark EOD Complete/Reviewed/Locked with all protein values at zero. Save as Draft or enter closing data.');
        }
      }
      if (lockLog && selectedStatus !== 'LOCKED') {
        blockingErrors.push('Lock request failed because status did not resolve to LOCKED.');
      }

      setWarnings(validationWarnings);
      if (blockingErrors.length > 0) throw new Error(blockingErrors.join(' '));

      const payload = {
        serviceDate,
        totalSales: numberFromForm(formData, 'totalSales'),
        bbqSales: numberFromForm(formData, 'bbqSales'),
        status: selectedStatus,
        lockLog,
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
      if (!response.ok || data.ok === false) throw new Error(data.message || `Save failed with status ${response.status}`);
      setMessage(`Saved ${selectedStatus} end-of-day log for ${formatDateWithDow(serviceDate)}. Loading saved values...`);
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
        <h2 className="text-xl font-black">Guided Closeout Workflow</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          {['1. Confirm cooked/loaded units', '2. Enter sold, waste, leftovers', '3. Confirm 86 events', '4. Add manager notes', '5. Mark Complete / Lock'].map((step) => <div key={step} className="rounded-xl bg-slate-50 p-3 text-sm font-black text-slate-700">{step}</div>)}
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          {['All proteins reviewed', 'Leftovers physically counted', 'Waste entered', '86 events confirmed', 'Hot box checked', 'Manager reviewed'].map((item) => <label key={item} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-bold"><input type="checkbox" className="h-4 w-4" disabled={isLocked} /> {item}</label>)}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-xl font-black">Service Summary</h2>
        {isLocked ? <div className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">This EOD log is locked. Create a corrected log under a different service date or unlock in the database if this was accidental.</div> : null}
        <div className="mt-4 grid gap-4 md:grid-cols-5">
          <div>
            <label className="label">Service Date</label>
            <input className="field mt-1" type="date" value={serviceDate} onChange={(event) => setServiceDate(event.target.value)} required disabled={isLocked} />
            <div className="mt-1 text-xs font-bold text-slate-500">{dateLabel}</div>
          </div>
          <div><label className="label">Total Sales</label><input className="field mt-1" type="number" step="1" name="totalSales" defaultValue={initialLog?.totalSales ?? ''} placeholder="0" disabled={isLocked} /></div>
          <div><label className="label">Smoked Meat Sales</label><input className="field mt-1" type="number" step="1" name="bbqSales" defaultValue={initialLog?.bbqSales ?? ''} placeholder="0" disabled={isLocked} /></div>
          <div>
            <label className="label">EOD Status</label>
            <select className="field mt-1" name="status" value={status} onChange={(event) => setStatus(event.target.value)} disabled={isLocked}>
              <option value="DRAFT">Draft</option>
              <option value="COMPLETE">Complete</option>
              <option value="REVIEWED">Manager Reviewed</option>
            </select>
          </div>
          <div><label className="label">Notes</label><input className="field mt-1" name="notes" defaultValue={initialLog?.notes ?? ''} placeholder="Weather, events, service issues" disabled={isLocked} /></div>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm font-black text-slate-700">
          <input type="checkbox" className="h-5 w-5" checked={lockLog} onChange={(event) => setLockLog(event.target.checked)} disabled={isLocked} />
          Lock EOD log after saving. Use only after review; locked logs cannot be edited from the app.
        </label>
      </section>

      <section className="card p-5">
        <h2 className="text-xl font-black">Protein Results</h2>
        <p className="mt-1 text-sm text-slate-600">Enter actual usable leftovers in the <strong>Usable Leftover Units</strong> column. Complete/Reviewed/Locked logs require explicit leftover units for any protein with cooked units. Enter 0 if none.</p>
        <div className="mt-4 space-y-4">
          {proteins.map((protein) => {
            const saved = logByProteinId.get(protein.id);
            return (
            <div key={protein.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 text-lg font-black">{protein.name}</div>
              <div className="grid gap-3 md:grid-cols-7">
                <div><label className="label">Cooked / Loaded Units</label><input className="field mt-1" name={`cookedUnits-${protein.id}`} type="number" step="0.1" defaultValue={saved?.cookedUnits ?? ''} disabled={isLocked} /></div>
                <div><label className="label">Sold Cooked lb</label><input className="field mt-1" name={`soldCookedLb-${protein.id}`} type="number" step="0.1" defaultValue={saved?.soldCookedLb ?? ''} disabled={isLocked} /></div>
                <div><label className="label">Usable Leftover Units — required for Complete</label><input className="field mt-1" name={`usableLeftoverUnits-${protein.id}`} type="number" step="0.1" defaultValue={saved?.usableLeftoverUnits ?? ''} placeholder={displayUnit(protein.name, protein.inputUnit)} disabled={isLocked} /></div>
                <div><label className="label">Usable Leftover lb</label><input className="field mt-1" name={`usableLeftoverLb-${protein.id}`} type="number" step="0.1" defaultValue={saved?.usableLeftoverLb ?? ''} disabled={isLocked} /></div>
                <div><label className="label">Waste lb</label><input className="field mt-1" name={`wasteLb-${protein.id}`} type="number" step="0.1" defaultValue={saved?.wasteLb ?? ''} disabled={isLocked} /></div>
                <div><label className="label">Waste Reason</label><select className="field mt-1" name={`wasteReason-${protein.id}`} defaultValue={saved?.wasteReason || ''} disabled={isLocked}><option value="">None</option><option>Overproduced</option><option>Dried out</option><option>Quality reject</option><option>Dropped/spoiled</option><option>Other</option></select></div>
                <label className="flex items-center gap-2 pt-7 text-sm font-bold"><input name={`eightySixed-${protein.id}`} type="checkbox" defaultChecked={saved?.eightySixed ?? false} className="h-5 w-5" disabled={isLocked} /> 86?</label>
              </div>
            </div>
          )})}
        </div>
        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center">
          <button className="btn-primary w-full md:w-auto" type="submit" disabled={isSaving || isLocked}>{isSaving ? 'Saving...' : isLocked ? 'Locked' : 'Save End-of-Day Log'}</button>
          {message ? <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">{message}</div> : null}
          {error ? <div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-800">{error}</div> : null}
          {warnings.length > 0 ? <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900"><div>Validation warnings:</div><ul className="mt-1 list-disc pl-5">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div> : null}
        </div>
      </section>
    </form>
  );
}
