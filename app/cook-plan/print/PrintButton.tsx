'use client';

export function PrintButton() {
  return <button onClick={() => window.print()} className="rounded-lg border px-4 py-2 font-bold">Print</button>;
}
