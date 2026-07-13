'use client';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

type Message = { role: 'user' | 'assistant'; content: string };
type SpeechRecognitionEventLike = { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> };
type SpeechRecognitionErrorLike = { error?: string };
type RecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
};
type RecognitionConstructor = new () => RecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  }
}

const starter: Message[] = [{ role: 'assistant', content: "Hi, I'm Archer. Ask me about cook plans, EOD, smokers, reports, users, or POS setup." }];

export function ArcherChat() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(starter);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const requestSequenceRef = useRef(0);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(Boolean(Recognition));
    return () => {
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  function speak(text: string) {
    if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.86;
    utterance.pitch = 0.62;
    utterance.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((voice) => /male|david|mark|daniel|google us english/i.test(voice.name) && /^en/i.test(voice.lang))
      || voices.find((voice) => /^en-US/i.test(voice.lang))
      || voices.find((voice) => /^en/i.test(voice.lang));
    if (preferred) utterance.voice = preferred;
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    window.speechSynthesis?.cancel();
  }

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setError('Voice input is not supported by this browser. Type your question instead.');
      return;
    }
    setError('');
    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      let transcript = '';
      for (let index = 0; index < event.results.length; index += 1) transcript += event.results[index][0]?.transcript || '';
      setInput(transcript.trimStart().slice(0, 500));
    };
    recognition.onerror = (event) => {
      const reason = event.error === 'not-allowed'
        ? 'Microphone permission was denied. Allow microphone access in your browser and try again.'
        : 'Archer could not hear that clearly. Please try again or type your question.';
      setError(reason);
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const question = input.trim();
    if (busy || question.length < 2) return;
    recognitionRef.current?.stop();
    const next = [...messages, { role: 'user' as const, content: question }];
    const requestId = ++requestSequenceRef.current;
    const history = messages.slice(-6).map((message) => ({ ...message, content: message.content.slice(0, 2400) }));
    setMessages(next); setInput(''); setBusy(true); setError('');
    try {
      const response = await fetch('/api/archer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: question, path, history }) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || 'Archer is unavailable.');
      if (requestId !== requestSequenceRef.current) return;
      setMessages([...next, { role: 'assistant', content: data.answer }]);
      speak(data.answer);
    } catch (e) {
      if (requestId === requestSequenceRef.current) setError(e instanceof Error ? e.message : 'Archer is unavailable.');
    } finally {
      if (requestId === requestSequenceRef.current) setBusy(false);
    }
  }

  return <div className="archer-root no-print" data-testid="archer-chat">
    {open ? <section id="archer-panel" className="archer-panel" role="dialog" aria-label="Archer support assistant">
      <header className="archer-header">
        <div className="flex items-center gap-3"><img src="/archer-face.jpg" alt="Archer" className="h-11 w-11 rounded-full object-cover"/><div><div className="font-black">Archer</div><div className="text-xs text-emerald-700">Pitmaster support assistant</div></div></div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => { setVoiceEnabled((value) => !value); stopSpeaking(); }} aria-label={voiceEnabled ? 'Mute Archer voice' : 'Enable Archer voice'} aria-pressed={voiceEnabled} className="archer-icon-button" data-testid="archer-voice-toggle">{voiceEnabled ? '🔊' : '🔇'}</button>
          <button type="button" onClick={() => { setOpen(false); recognitionRef.current?.stop(); stopSpeaking(); }} aria-label="Minimize Archer" className="text-2xl">×</button>
        </div>
      </header>
      <div className="archer-messages" aria-live="polite">{messages.map((m,i)=><div key={i} className={m.role==='assistant'?'archer-message assistant':'archer-message user'}>{m.content}</div>)}{busy?<div className="archer-message assistant">Thinking…</div>:null}{error?<div className="text-sm font-bold text-red-700" role="alert">{error}</div>:null}<div ref={endRef}/></div>
      <form onSubmit={submit} className="archer-form">
        <label className="sr-only" htmlFor="archer-question">Ask Archer</label>
        <textarea id="archer-question" value={input} onChange={e=>setInput(e.target.value)} maxLength={500} rows={2} placeholder={listening ? 'Listening…' : 'Ask Archer a question…'} className="field"/>
        <div className="archer-form-actions">
          <span className="text-xs text-slate-500">{input.length}/500</span>
          <div className="flex items-center gap-2">
            <button type="button" className={listening ? 'archer-mic listening' : 'archer-mic'} onClick={toggleListening} aria-label={listening ? 'Stop recording voice question' : 'Record voice question'} aria-pressed={listening} data-testid="archer-microphone" title={speechSupported ? 'Speak your question' : 'Voice input may not be supported in this browser'}>{listening ? '■ Stop' : '🎙 Speak'}</button>
            <button className="btn-primary px-4 py-2" disabled={busy || input.trim().length<2}>Send</button>
          </div>
        </div>
        <p className="archer-voice-note">Archer can read answers aloud in a deep, rugged pitmaster voice. Your browser handles microphone transcription; no audio recording is stored by PTT.</p>
      </form>
      <div className="archer-portrait"><img src="/archer-bbq.jpg" alt="Archer in pitmaster gear standing in front of large commercial smokers"/></div>
    </section> : null}
    <button type="button" className="archer-launcher" onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-controls="archer-panel"><img src="/archer-face.jpg" alt=""/><span>Archer</span><span className="h-2 w-2 rounded-full bg-emerald-400"/></button>
  </div>;
}
