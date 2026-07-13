import fs from 'node:fs';
const source = fs.readFileSync('components/ArcherChat.tsx', 'utf8');
const css = fs.readFileSync('app/globals.css', 'utf8');
const required = [
  'SpeechRecognition',
  'webkitSpeechRecognition',
  'SpeechSynthesisUtterance',
  'utterance.rate = 0.86',
  'utterance.pitch = 0.62',
  'data-testid="archer-microphone"',
  'data-testid="archer-voice-toggle"',
  'Microphone permission was denied',
  'no audio recording is stored by PTT'
];
for (const token of required) if (!source.includes(token)) throw new Error(`Missing Archer voice contract: ${token}`);
if (!css.includes('.archer-mic.listening')) throw new Error('Missing listening-state styling');
if (/Rambo|Stallone/i.test(source)) throw new Error('Voice profile must remain original and must not imitate a named person or character');
console.log('Archer voice contract passed');
