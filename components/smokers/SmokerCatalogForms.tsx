'use client';

import { useMemo, useState } from 'react';
import { COOK_WINDOW_LABELS, SMOKER_LOCATION_LABELS } from '@/lib/domainCodes';

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

const LOCATION_OPTIONS = Object.entries(SMOKER_LOCATION_LABELS).map(([value, label]) => ({ value, label }));
const COOK_WINDOW_OPTIONS = Object.entries(COOK_WINDOW_LABELS).map(([value, label]) => ({ value, label }));

function SelectField({ name, defaultValue = '', options, required = false }: { name: string; defaultValue?: string; options: readonly { value: string; label: string }[]; required?: boolean }) {
  return <select className="field mt-1" name={name} defaultValue={options.some((option) => option.value === defaultValue) ? defaultValue : ''} required={required}>
    <option value="">Select one</option>
    {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
  </select>;
}

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
  if (!selected) return <p className="text-xs font-bold text-slate-500 md:col-span-4">Pick a catalog smoker to load manufacturer-published planning counts. Blank fields mean the published capacity is in pounds, ranges, or was not published. Enter a manual number only if you have a verified spec sheet or measured load.</p>;
  const confidenceClass = selected.sourceConfidence === 'OFFICIAL' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-blue-50 text-blue-900 border-blue-200';
  return <div className={`rounded-2xl border p-3 text-xs font-bold md:col-span-4 ${confidenceClass}`}>
    <div>{selected.brand} {selected.model} · {selected.smokerType} · {selected.fuelType}</div>
    <div className="mt-1">Official capacity: {selected.officialCapacityText || 'not published for every protein'}</div>
    <div className="mt-1 text-slate-600">Auto-loaded fields use count-based units. For this project, one whole chicken equals one 2.5-pound double breast in weight and smoker space, so manufacturer whole-chicken counts load directly as chicken-breast counts.</div>
  </div>;
}

export function AddSmokerForm({ catalog, action }: { catalog: CatalogItem[]; action: FormAction }) {
  const map = useMemo(() => buildCatalogMap(catalog), [catalog]);
  const [selectedId, setSelectedId] = useState('');
  const selected = selectedId ? map.get(selectedId) || null : null;
  return <form action={action} className="mt-4 grid gap-3 md:grid-cols-4">
    <label className="text-sm font-bold text-slate-800">Smoker Brand<input className="field mt-1" name="name" placeholder="Example: Southern Pride outdoor" required /></label>
    <label className="text-sm font-bold text-slate-800">Catalog model<CatalogSelect catalog={catalog} onSelect={(item) => setSelectedId(item?.id || '')} /></label>
    <label className="text-sm font-bold text-slate-800">Manufacturer<input className="field mt-1" name="brand" placeholder="Manufacturer" defaultValue={selected?.brand || ''} key={`brand-${selectedId}`} readOnly={Boolean(selected)} /></label>
    <label className="text-sm font-bold text-slate-800">Model<input className="field mt-1" name="model" placeholder="Model" defaultValue={selected?.model || ''} key={`model-${selectedId}`} readOnly={Boolean(selected)} /></label>
    <label className="text-sm font-bold text-slate-800">Location<SelectField name="location" options={LOCATION_OPTIONS} required /></label>
    <label className="text-sm font-bold text-slate-800">Cook window<SelectField name="cookWindow" options={COOK_WINDOW_OPTIONS} defaultValue={selected?.cookWindow || ''} required key={`cw-${selectedId}`} /></label>
    <label className="text-sm font-bold text-slate-800">Rack count<input className="field mt-1" name="rackCount" type="number" min="0" step="1" placeholder="Rack count" defaultValue={inputValue(selected?.rackCount)} key={`r-${selectedId}`} /></label>
    <label className="text-sm font-bold text-slate-800">Briskets per cook<input className="field mt-1" name="brisketCapacity" type="number" min="0" step="0.1" placeholder="Brisket count" defaultValue={inputValue(selected?.brisketCapacity)} key={`b-${selectedId}`} /></label>
    <label className="text-sm font-bold text-slate-800">Pork butts per cook<input className="field mt-1" name="porkCapacity" type="number" min="0" step="0.1" placeholder="Pork butt count" defaultValue={inputValue(selected?.porkCapacity)} key={`p-${selectedId}`} /></label>
    <label className="text-sm font-bold text-slate-800">Rib racks per cook<input className="field mt-1" name="ribCapacity" type="number" min="0" step="0.1" placeholder="Rib rack count" defaultValue={inputValue(selected?.ribCapacity)} key={`rb-${selectedId}`} /></label>
    <label className="text-sm font-bold text-slate-800">Chicken breasts per cook <span className="block text-xs text-slate-500">Whole chicken = one 2.5 lb double breast</span><input className="field mt-1" name="chickenCapacity" type="number" min="0" step="0.1" placeholder="Chicken breast count" defaultValue={inputValue(selected?.chickenCapacity)} key={`c-${selectedId}`} /></label>
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
    <label className="text-sm font-bold">Smoker Brand<input className="field mt-1" name="name" defaultValue={smoker.name} required /></label>
    <CatalogSelect catalog={catalog} defaultValue={smoker.catalogId || ''} onSelect={(item) => setSelectedId(item?.id || '')} />
    <label className="text-sm font-bold">Manufacturer<input className="field mt-1" name="brand" placeholder="Manufacturer" defaultValue={brand} key={`brand-${smoker.id}-${selectedId}`} readOnly={Boolean(selected)} /></label>
    <input className="field" name="model" placeholder="Model" defaultValue={model} key={`model-${smoker.id}-${selectedId}`} readOnly={Boolean(selected)} />
    <label className="text-sm font-bold">Location<SelectField name="location" options={LOCATION_OPTIONS} defaultValue={smoker.location || ''} required /></label>
    <label className="text-sm font-bold">Cook window<SelectField name="cookWindow" options={COOK_WINDOW_OPTIONS} defaultValue={selected?.cookWindow || smoker.cookWindow || ''} required key={`cw-${smoker.id}-${selectedId}`} /></label>
    <label className="text-sm font-bold">Racks<input className="field mt-1" name="rackCount" type="number" min="0" step="1" defaultValue={preferredNumberInput(selected?.rackCount, smoker.rackCount)} key={`r-${smoker.id}-${selectedId}`} /></label>
    <label className="text-sm font-bold">Briskets<input className="field mt-1" name="brisketCapacity" type="number" min="0" step="0.1" defaultValue={preferredNumberInput(selected?.brisketCapacity, smoker.brisketCapacity)} key={`b-${smoker.id}-${selectedId}`} /></label>
    <label className="text-sm font-bold">Pork butts<input className="field mt-1" name="porkCapacity" type="number" min="0" step="0.1" defaultValue={preferredNumberInput(selected?.porkCapacity, smoker.porkCapacity)} key={`p-${smoker.id}-${selectedId}`} /></label>
    <label className="text-sm font-bold">Rib racks<input className="field mt-1" name="ribCapacity" type="number" min="0" step="0.1" defaultValue={preferredNumberInput(selected?.ribCapacity, smoker.ribCapacity)} key={`rb-${smoker.id}-${selectedId}`} /></label>
    <label className="text-sm font-bold">Chicken breasts <span className="text-xs text-slate-500">whole chicken = one double breast</span><input className="field mt-1" name="chickenCapacity" type="number" min="0" step="0.1" defaultValue={preferredNumberInput(selected?.chickenCapacity, smoker.chickenCapacity)} key={`c-${smoker.id}-${selectedId}`} /></label>
    <label className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm font-bold"><input type="checkbox" name="active" defaultChecked={smoker.active} /> Active</label>
    <SourceNote selected={selected} />
    <button className="btn-secondary md:col-span-4" type="submit">Save smoker</button>
  </form>;
}
