// Build 10.0.0 — inbound SMS keyword classification (CTIA convention).
// Kept free of DB dependencies so it can be unit-tested in isolation.

export function classifyInboundSms(body: string): 'STOP' | 'START' | 'HELP' | null {
  const text = body.trim().toUpperCase();
  if (['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'].includes(text)) return 'STOP';
  if (['START', 'YES', 'UNSTOP', 'SUBSCRIBE'].includes(text)) return 'START';
  if (['HELP', 'INFO'].includes(text)) return 'HELP';
  return null;
}
