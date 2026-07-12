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
  officialCapacityText: string | null;
  brisketCapacityUnit: string | null;
  porkCapacityUnit: string | null;
  ribCapacityUnit: string | null;
  chickenCapacityUnit: string | null;
  sourceConfidence: string;
  sourceLabel: string | null;
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

function formatCapacityLabel(item: CatalogItem) {
  const parts = [];
  if (typeof item.brisketCapacity === 'number') parts.push(`${item.brisketCapacity} briskets`);
  if (typeof item.porkCapacity === 'number') parts.push(`${item.porkCapacity} butts`);
  if (typeof item.ribCapacity === 'number') parts.push(`${item.ribCapacity} ribs`);
  return parts.length ? parts.join(' / ') : 'official capacities shown in details';
}

function inputValue(value: number | null | undefined): number | '' {
  return typeof value === 'number' ? value : '';
}

function preferredNumberInput(catalogValue: number | null | undefined, existingValue: number | null | undefined): number | '' {
  if (typeof catalogValue === 'number') return catalogValue;
  return inputValue(existingValue);
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
  if (!selected) return <p className="text-xs font-bold text-slate-500 md:col-span-4">Pick a catalog smoker to load manufacturer-published planning counts. Blank fields mean the published capacity is in pounds, ranges, whole chickens, or was not published. Enter a manual number only if you have a verified spec sheet or measured load.</p>;
  const confidenceClass = selected.sourceConfidence === 'OFFICIAL' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-blue-50 text-blue-900 border-blue-200';
  return <div className={`rounded-2xl border p-3 text-xs font-bold md:col-span-4 ${confidenceClass}`}>
    <div>{selected.brand} {selected.model} · {selected.smokerType} · {selected.fuelType}</div>
    <div className="mt-1">Official capacity: {selected.officialCapacityText || 'not published for every protein'}</div>
    <div className="mt-1 text-slate-600">Auto-loaded fields use count-based units only. Pound capacities and whole-chicken capacities are displayed above, not converted.</div>
  </div>;
}

export function AddSmokerForm({ catalog, action }: { catalog: CatalogItem[]; action: FormAction }) {
  const map = useMemo(() => buildCatalogMap(catalog), [catalog]);
  const [selectedId, setSelectedId] = useState('');
  const selected = selectedId ? map.get(selectedId) || null : null;
  return <form action={action} className="mt-4 grid gap-3 md:grid-cols-4">
    <label className="text-sm font-bold text-slate-800">Smoker name<input className="field mt-1" name="name" placeholder="Example: Ole Hickory inside" required /></label>
    <label className="text-sm font-bold text-slate-800">Catalog model<CatalogSelect catalog={catalog} onSelect={(item) => setSelectedId(item?.id || '')} /></label>
    <label className="text-sm font-bold text-slate-800">Brand<input className="field mt-1" name="brand" placeholder="Brand" defaultValue={selected?.brand || ''} key={`brand-${selectedId}`} readOnly={Boolean(selected)} /></label>
    <label className="text-sm font-bold text-slate-800">Model<input className="field mt-1" name="model" placeholder="Model" defaultValue={selected?.model || ''} key={`model-${selectedId}`} readOnly={Boolean(selected)} /></label>
    <label className="text-sm font-bold text-slate-800">Location<input className="field mt-1" name="location" placeholder="Indoor / outdoor / pit room" /></label>
    <label className="text-sm font-bold text-slate-800">Cook window<input className="field mt-1" name="cookWindow" placeholder="Cook window" defaultValue={selected?.cookWindow || ''} key={`cw-${selectedId}`} /></label>
    <label className="text-sm font-bold text-slate-800">Rack count<input className="field mt-1" name="rackCount" type="number" min="0" step="1" placeholder="Rack count" defaultValue={inputValue(selected?.rackCount)} key={`r-${selectedId}`} /></label>
    <label className="text-sm font-bold text-slate-800">Briskets per cook<input className="field mt-1" name="brisketCapacity" type="number" min="0" step="0.1" placeholder="Brisket count" defaultValue={inputValue(selected?.brisketCapacity)} key={`b-${selectedId}`} /></label>
    <label className="text-sm font-bold text-slate-800">Pork butts per cook<input className="field mt-1" name="porkCapacity" type="number" min="0" step="0.1" placeholder="Pork butt count" defaultValue={inputValue(selected?.porkCapacity)} key={`p-${selectedId}`} /></label>
    <label className="text-sm font-bold text-slate-800">Rib racks per cook<input className="field mt-1" name="ribCapacity" type="number" min="0" step="0.1" placeholder="Rib rack count" defaultValue={inputValue(selected?.ribCapacity)} key={`rb-${selectedId}`} /></label>
    <label className="text-sm font-bold text-slate-800">Chicken breasts per cook <span className="block text-xs text-slate-500">Manual only if verified</span><input className="field mt-1" name="chickenCapacity" type="number" min="0" step="0.1" placeholder="Chicken breast count" defaultValue={inputValue(selected?.chickenCapacity)} key={`c-${selectedId}`} /></label>
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
    <label className="text-sm font-bold">Racks<input className="field mt-1" name="rackCount" type="number" min="0" step="1" defaultValue={preferredNumberInput(selected?.rackCount, smoker.rackCount)} key={`r-${smoker.id}-${selectedId}`} /></label>
    <label className="text-sm font-bold">Briskets<input className="field mt-1" name="brisketCapacity" type="number" min="0" step="0.1" defaultValue={preferredNumberInput(selected?.brisketCapacity, smoker.brisketCapacity)} key={`b-${smoker.id}-${selectedId}`} /></label>
    <label className="text-sm font-bold">Pork butts<input className="field mt-1" name="porkCapacity" type="number" min="0" step="0.1" defaultValue={preferredNumberInput(selected?.porkCapacity, smoker.porkCapacity)} key={`p-${smoker.id}-${selectedId}`} /></label>
    <label className="text-sm font-bold">Rib racks<input className="field mt-1" name="ribCapacity" type="number" min="0" step="0.1" defaultValue={preferredNumberInput(selected?.ribCapacity, smoker.ribCapacity)} key={`rb-${smoker.id}-${selectedId}`} /></label>
    <label className="text-sm font-bold">Chicken breasts <span className="text-xs text-slate-500">manual if whole-chicken spec</span><input className="field mt-1" name="chickenCapacity" type="number" min="0" step="0.1" defaultValue={preferredNumberInput(selected?.chickenCapacity, smoker.chickenCapacity)} key={`c-${smoker.id}-${selectedId}`} /></label>
    <label className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm font-bold"><input type="checkbox" name="active" defaultChecked={smoker.active} /> Active</label>
    <SourceNote selected={selected} />
    <button className="btn-secondary md:col-span-4" type="submit">Save smoker</button>
  </form>;
}
