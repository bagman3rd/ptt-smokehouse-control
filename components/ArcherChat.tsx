'use client';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

type Message = { role: 'user' | 'assistant'; content: string };
const starter: Message[] = [{ role: 'assistant', content: "Hi, I'm Archer. Ask me about cook plans, EOD, smokers, reports, users, or POS setup." }];

export function ArcherChat() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(starter);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const question = input.trim();
    if (busy || question.length < 2) return;
    const next = [...messages, { role: 'user' as const, content: question }];
    setMessages(next); setInput(''); setBusy(true); setError('');
    try {
      const response = await fetch('/api/archer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: question, path, history: messages.slice(-6) }) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || 'Archer is unavailable.');
      setMessages([...next, { role: 'assistant', content: data.answer }]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Archer is unavailable.'); }
    finally { setBusy(false); }
  }

  return <div className="archer-root no-print" data-testid="archer-chat">
    {open ? <section id="archer-panel" className="archer-panel" role="dialog" aria-label="Archer support assistant">
      <header className="archer-header"><div className="flex items-center gap-3"><img src="/archer-face.jpg" alt="Archer" className="h-11 w-11 rounded-full object-cover"/><div><div className="font-black">Archer</div><div className="text-xs text-emerald-700">Support assistant</div></div></div><button type="button" onClick={() => setOpen(false)} aria-label="Minimize Archer" className="text-2xl">×</button></header>
      <div className="archer-messages" aria-live="polite">{messages.map((m,i)=><div key={i} className={m.role==='assistant'?'archer-message assistant':'archer-message user'}>{m.content}</div>)}{busy?<div className="archer-message assistant">Thinking…</div>:null}{error?<div className="text-sm font-bold text-red-700">{error}</div>:null}<div ref={endRef}/></div>
      <form onSubmit={submit} className="archer-form"><label className="sr-only" htmlFor="archer-question">Ask Archer</label><textarea id="archer-question" value={input} onChange={e=>setInput(e.target.value)} maxLength={500} rows={2} placeholder="Ask Archer a question…" className="field"/><div className="flex items-center justify-between"><span className="text-xs text-slate-500">{input.length}/500</span><button className="btn-primary px-4 py-2" disabled={busy || input.trim().length<2}>Send</button></div></form>
      <div className="archer-portrait"><img src="/archer-bbq.jpg" alt="Archer in pitmaster gear standing in front of large commercial smokers"/></div>
    </section> : null}
    <button type="button" className="archer-launcher" onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-controls="archer-panel"><img src="/archer-face.jpg" alt=""/><span>Archer</span><span className="h-2 w-2 rounded-full bg-emerald-400"/></button>
  </div>;
}
