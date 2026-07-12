'use client';

import { useMemo, useState } from 'react';

type CatalogItem = {
  id: string;
  brand: string;
  model: string;
  smokerType: string;
  fuelType: string;
  rackCount: number | null;
  brisketCapacity: number | null;
  porkCapacity: number | null;
  ribCapacity: number | null;
  chickenCapacity: number | null;
  cookWindow: string | null;
  sourceConfidence: string;
  sourceLabel: string | null;
  notes: string | null;
};

type SmokerItem = {
  id: string;
  catalogId: string | null;
  name: string;
  brand: string | null;
  model: string | null;
  location: string | null;
  cookWindow: string | null;
  rackCount: number | null;
  brisketCapacity: number | null;
  porkCapacity: number | null;
  ribCapacity: number | null;
  chickenCapacity: number | null;
  active: boolean;
};

type FormAction = (formData: FormData) => void | Promise<void>;

function buildCatalogMap(catalog: CatalogItem[]) {
  return new Map(catalog.map((item) => [item.id, item]));
}

function cap(value: number | null, label: string) {
  return typeof value === 'number' ? `${value} ${label}` : `${label}: official data not published`;
}

function formatCapacityLabel(item: CatalogItem) {
  const parts = [cap(item.brisketCapacity, 'briskets'), cap(item.porkCapacity, 'butts'), cap(item.ribCapacity, 'ribs')];
  return parts.join(' / ');
}

function inputValue(value: number | null | undefined) {
  return typeof value === 'number' ? value : '';
}


function CatalogSelect({ catalog, defaultValue = '', onSelect }: { catalog: CatalogItem[]; defaultValue?: string; onSelect: (item: CatalogItem | null) => void }) {
  const brands = Array.from(new Set(catalog.map((item) => item.brand))).sort();
  return <select className="field" name="catalogId" defaultValue={defaultValue} onChange={(event) => onSelect(catalog.find((item) => item.id === event.target.value) || null)}>
    <option value="">Manual entry / custom smoker</option>
    {brands.map((brand) => <optgroup key={brand} label={brand}>
      {catalog.filter((item) => item.brand === brand).map((item) => <option key={item.id} value={item.id}>{item.model} — {formatCapacityLabel(item)}</option>)}
    </optgroup>)}
  </select>;
}

function SourceNote({ selected }: { selected: CatalogItem | null }) {
  if (!selected) return <p className="text-xs font-bold text-slate-500 md:col-span-4">Pick a catalog smoker to auto-load only manufacturer-published values. Blank fields mean the manufacturer did not publish that capacity; enter your verified number manually if you have a spec sheet or measured load.</p>;
  const confidenceClass = selected.sourceConfidence === 'OFFICIAL' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : selected.sourceConfidence === 'OFFICIAL_PARTIAL' ? 'bg-blue-50 text-blue-900 border-blue-200' : 'bg-slate-50 text-slate-900 border-slate-200';
  return <div className={`rounded-2xl border p-3 text-xs font-bold md:col-span-4 ${confidenceClass}`}>
    <div>{selected.brand} {selected.model} · {selected.smokerType} · {selected.fuelType} · Source confidence: {selected.sourceConfidence}</div>
    <div className="mt-1">{selected.sourceLabel || 'Research source'}{selected.notes ? ` — ${selected.notes}` : ''}</div>
  </div>;
}

export function AddSmokerForm({ catalog, action }: { catalog: CatalogItem[]; action: FormAction }) {
  const map = useMemo(() => buildCatalogMap(catalog), [catalog]);
  const [selectedId, setSelectedId] = useState('');
  const selected = selectedId ? map.get(selectedId) || null : null;
  return <form action={action} className="mt-4 grid gap-3 md:grid-cols-4">
    <input className="field" name="name" placeholder="Smoker name" required />
    <CatalogSelect catalog={catalog} onSelect={(item) => setSelectedId(item?.id || '')} />
    <input className="field" name="brand" placeholder="Brand" defaultValue={selected?.brand || ''} key={`brand-${selectedId}`} readOnly={Boolean(selected)} />
    <input className="field" name="model" placeholder="Model" defaultValue={selected?.model || ''} key={`model-${selectedId}`} readOnly={Boolean(selected)} />
    <input className="field" name="location" placeholder="Indoor / outdoor / pit room" />
    <input className="field" name="cookWindow" placeholder="Cook window" defaultValue={selected?.cookWindow || ''} key={`cw-${selectedId}`} />
    <input className="field" name="rackCount" type="number" min="0" step="1" placeholder="Rack count" defaultValue={inputValue(selected?.rackCount)} key={`r-${selectedId}`} />
    <input className="field" name="brisketCapacity" type="number" min="0" step="0.1" placeholder="Brisket capacity" defaultValue={inputValue(selected?.brisketCapacity)} key={`b-${selectedId}`} />
    <input className="field" name="porkCapacity" type="number" min="0" step="0.1" placeholder="Pork butt capacity" defaultValue={inputValue(selected?.porkCapacity)} key={`p-${selectedId}`} />
    <input className="field" name="ribCapacity" type="number" min="0" step="0.1" placeholder="Rib rack capacity" defaultValue={inputValue(selected?.ribCapacity)} key={`rb-${selectedId}`} />
    <input className="field" name="chickenCapacity" type="number" min="0" step="0.1" placeholder="Chicken breast capacity" defaultValue={inputValue(selected?.chickenCapacity)} key={`c-${selectedId}`} />
    <SourceNote selected={selected} />
    <button className="btn-primary md:col-span-4" type="submit">Add smoker</button>
  </form>;
}

export function EditSmokerForm({ smoker, catalog, action }: { smoker: SmokerItem; catalog: CatalogItem[]; action: FormAction }) {
  const map = useMemo(() => buildCatalogMap(catalog), [catalog]);
  const [selectedId, setSelectedId] = useState(smoker.catalogId || '');
  const selected = selectedId ? map.get(selectedId) || null : null;
  const brand = selected?.brand ?? smoker.brand ?? '';
  const model = selected?.model ?? smoker.model ?? '';
  return <form action={action} className="card grid gap-3 p-5 md:grid-cols-4">
    <input type="hidden" name="id" value={smoker.id} />
    <input className="field" name="name" defaultValue={smoker.name} />
    <CatalogSelect catalog={catalog} defaultValue={smoker.catalogId || ''} onSelect={(item) => setSelectedId(item?.id || '')} />
    <input className="field" name="brand" placeholder="Brand" defaultValue={brand} key={`brand-${smoker.id}-${selectedId}`} readOnly={Boolean(selected)} />
    <input className="field" name="model" placeholder="Model" defaultValue={model} key={`model-${smoker.id}-${selectedId}`} readOnly={Boolean(selected)} />
    <input className="field" name="location" defaultValue={smoker.location || ''} />
    <input className="field" name="cookWindow" defaultValue={selected?.cookWindow || smoker.cookWindow || ''} key={`cw-${smoker.id}-${selectedId}`} />
    <label className="text-sm font-bold">Racks<input className="field mt-1" name="rackCount" type="number" min="0" step="1" defaultValue={inputValue(selected?.rackCount) || smoker.rackCount} key={`r-${smoker.id}-${selectedId}`} /></label>
    <label className="text-sm font-bold">Briskets<input className="field mt-1" name="brisketCapacity" type="number" min="0" step="0.1" defaultValue={inputValue(selected?.brisketCapacity) || smoker.brisketCapacity} key={`b-${smoker.id}-${selectedId}`} /></label>
    <label className="text-sm font-bold">Pork butts<input className="field mt-1" name="porkCapacity" type="number" min="0" step="0.1" defaultValue={inputValue(selected?.porkCapacity) || smoker.porkCapacity} key={`p-${smoker.id}-${selectedId}`} /></label>
    <label className="text-sm font-bold">Rib racks<input className="field mt-1" name="ribCapacity" type="number" min="0" step="0.1" defaultValue={inputValue(selected?.ribCapacity) || smoker.ribCapacity} key={`rb-${smoker.id}-${selectedId}`} /></label>
    <label className="text-sm font-bold">Chicken breasts<input className="field mt-1" name="chickenCapacity" type="number" min="0" step="0.1" defaultValue={inputValue(selected?.chickenCapacity) || smoker.chickenCapacity} key={`c-${smoker.id}-${selectedId}`} /></label>
    <label className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm font-bold"><input type="checkbox" name="active" defaultChecked={smoker.active} /> Active</label>
    <SourceNote selected={selected} />
    <button className="btn-secondary md:col-span-4" type="submit">Save smoker</button>
  </form>;
}
