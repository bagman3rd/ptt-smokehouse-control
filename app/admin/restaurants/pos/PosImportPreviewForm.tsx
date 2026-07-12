'use client';

import { useMemo, useState } from 'react';
import { parsePosCsv, buildPosPreviewRows, summarizePosPreview, type PosMappingLite } from '@/lib/posImport';
import { importPosItemCsv } from './actions';

type Props = { mappings: PosMappingLite[] };

function money(value: number) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function PosImportPreviewForm({ mappings }: Props) {
  const [csv, setCsv] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const rows = useMemo(() => buildPosPreviewRows(parsePosCsv(csv), mappings), [csv, mappings]);
  const summary = useMemo(() => summarizePosPreview(rows), [rows]);
  const canImport = confirmed && summary.validRowCount > 0 && summary.invalidRowCount === 0;

  return (
    <form action={importPosItemCsv} className="mt-4 grid gap-3">
      <input type="hidden" name="source" value="CSV" />
      <textarea className="field min-h-56 font-mono text-xs" name="posCsv" value={csv} onChange={(event) => { setCsv(event.target.value); setConfirmed(false); }} placeholder={'date,itemName,quantity,grossSales\n2026-07-01,Brisket Plate,18,540\n2026-07-01,Pulled Pork Sandwich,42,714'} />
      <section className={summary.invalidRowCount || summary.unmappedCount ? 'rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950' : 'rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700'}>
        <div className="font-black">POS Item-Sales Preview</div>
        <div className="mt-2 grid gap-2 md:grid-cols-4">
          <div><span className="block text-xs font-black uppercase text-slate-500">Rows found</span><strong>{summary.rowCount}</strong></div>
          <div><span className="block text-xs font-black uppercase text-slate-500">Valid rows</span><strong>{summary.validRowCount}</strong></div>
          <div><span className="block text-xs font-black uppercase text-slate-500">Invalid rows</span><strong>{summary.invalidRowCount}</strong></div>
          <div><span className="block text-xs font-black uppercase text-slate-500">Unmapped rows</span><strong>{summary.unmappedCount}</strong></div>
          <div><span className="block text-xs font-black uppercase text-slate-500">Gross sales</span><strong>{money(summary.totalSales)}</strong></div>
          <div><span className="block text-xs font-black uppercase text-slate-500">Mapped cooked lb</span><strong>{summary.estimatedCookedLb.toFixed(1)}</strong></div>
          <div><span className="block text-xs font-black uppercase text-slate-500">Mapped proteins</span><strong>{summary.byProtein.filter((x) => x.proteinId).length}</strong></div>
          <div><span className="block text-xs font-black uppercase text-slate-500">Status</span><strong>{canImport ? 'Ready' : 'Preview first'}</strong></div>
        </div>
        {summary.byProtein.length ? <div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-xs"><thead><tr><th className="border-b p-2">Protein</th><th className="border-b p-2">Rows</th><th className="border-b p-2">Qty</th><th className="border-b p-2">Sales</th><th className="border-b p-2">Cooked lb est.</th></tr></thead><tbody>{summary.byProtein.map((row) => <tr key={row.proteinId || 'unmapped'}><td className="border-b p-2 font-bold">{row.proteinName}</td><td className="border-b p-2">{row.rows}</td><td className="border-b p-2">{row.quantity}</td><td className="border-b p-2">{money(row.grossSales)}</td><td className="border-b p-2">{row.estimatedCookedLb.toFixed(1)}</td></tr>)}</tbody></table></div> : null}
        {summary.invalidRowCount ? <div className="mt-3 font-bold text-red-700">Fix invalid rows before import.</div> : null}
        {summary.unmappedCount ? <div className="mt-3 font-bold text-amber-800">Some items are unmapped. Import is allowed unless you require all items mapped, but unmapped items will not train protein-level usage.</div> : null}
        <label className="mt-4 flex items-center gap-2 font-bold"><input type="checkbox" name="requireMapped" /> Require every imported row to be mapped</label>
        <label className="mt-2 flex items-center gap-2 font-bold"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> Confirm preview and import these POS rows</label>
      </section>
      <button className="btn-primary" type="submit" disabled={!canImport}>Confirm POS Item Import</button>
    </form>
  );
}
