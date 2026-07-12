'use client';

import { useMemo, useState } from 'react';
import { importSalesHistoryCsv } from '../setup/actions';

type ParsedRow = { date: string; totalSales: number; bbqSales: number; valid: boolean; reason?: string };

function parseCsv(csv: string): ParsedRow[] {
  return csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).flatMap((line): ParsedRow[] => {
    if (/^date\s*,/i.test(line)) return [];
    const [date = '', total = '', bbq = ''] = line.split(',').map((part) => part.trim());
    const totalSales = Number(total);
    const bbqSales = bbq === '' ? Math.round(totalSales * 0.38) : Number(bbq);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [{ date, totalSales: 0, bbqSales: 0, valid: false, reason: 'Invalid date' }];
    if (!Number.isFinite(totalSales) || totalSales <= 0) return [{ date, totalSales: 0, bbqSales: 0, valid: false, reason: 'Invalid totalSales' }];
    if (!Number.isFinite(bbqSales) || bbqSales < 0) return [{ date, totalSales, bbqSales: 0, valid: false, reason: 'Invalid bbqSales' }];
    return [{ date, totalSales, bbqSales, valid: true, reason: undefined }];
  });
}

function money(value: number) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function PosImportPreviewForm() {
  const [csv, setCsv] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const rows = useMemo(() => parseCsv(csv), [csv]);
  const validRows = rows.filter((row) => row.valid);
  const invalidRows = rows.filter((row) => !row.valid);
  const totalSales = validRows.reduce((sum, row) => sum + row.totalSales, 0);
  const bbqSales = validRows.reduce((sum, row) => sum + row.bbqSales, 0);
  const dates = validRows.map((row) => row.date).sort();
  const canImport = confirmed && validRows.length >= 7 && invalidRows.length === 0;

  return (
    <form action={importSalesHistoryCsv} className="mt-4 grid gap-3">
      <textarea className="field min-h-56 font-mono text-xs" name="salesCsv" value={csv} onChange={(event) => { setCsv(event.target.value); setConfirmed(false); }} placeholder={'date,totalSales,bbqSales\n2026-07-01,8750,3325\n2026-07-02,9220,3504'} />
      <section className={invalidRows.length ? 'rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-950' : 'rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700'}>
        <div className="font-black">Import Preview</div>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          <div><span className="block text-xs font-black uppercase text-slate-500">Rows found</span><strong>{rows.length}</strong></div>
          <div><span className="block text-xs font-black uppercase text-slate-500">Valid rows</span><strong>{validRows.length}</strong></div>
          <div><span className="block text-xs font-black uppercase text-slate-500">Invalid rows</span><strong>{invalidRows.length}</strong></div>
          <div><span className="block text-xs font-black uppercase text-slate-500">Date range</span><strong>{dates.length ? `${dates[0]} to ${dates[dates.length - 1]}` : '—'}</strong></div>
          <div><span className="block text-xs font-black uppercase text-slate-500">Total sales</span><strong>{money(totalSales)}</strong></div>
          <div><span className="block text-xs font-black uppercase text-slate-500">BBQ sales</span><strong>{money(bbqSales)}</strong></div>
        </div>
        {invalidRows.length ? <ul className="mt-3 list-disc pl-5 font-bold">{invalidRows.slice(0, 5).map((row, index) => <li key={`${row.date}-${index}`}>{row.date || 'blank date'} — {row.reason}</li>)}</ul> : null}
        {validRows.length > 0 && validRows.length < 7 ? <div className="mt-3 font-bold text-amber-700">At least 7 valid rows are required to recalculate useful curves.</div> : null}
        <label className="mt-4 flex items-center gap-2 font-bold"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> Confirm preview and import these rows</label>
      </section>
      <button className="btn-primary" type="submit" disabled={!canImport}>Confirm Import Sales History</button>
      {!canImport ? <div className="text-xs font-bold text-slate-500">Import button unlocks after preview is confirmed, there are at least 7 valid rows, and there are no invalid rows.</div> : null}
    </form>
  );
}
