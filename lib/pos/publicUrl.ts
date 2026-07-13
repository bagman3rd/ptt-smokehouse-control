function isLoopback(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  if (forwardedHost) return `${forwardedProto || url.protocol.replace(':', '')}://${forwardedHost}`;
  return url.origin;
}

export function squareCallbackUrl(request: Request): string {
  const origin = requestOrigin(request);
  const configured = process.env.SQUARE_REDIRECT_URI?.trim();
  if (!configured) return `${origin}/api/pos/square/callback`;

  try {
    const configuredUrl = new URL(configured);
    const requestUrl = new URL(origin);
    // Never let a loopback development callback override a deployed request.
    if (!isLoopback(requestUrl.hostname) && isLoopback(configuredUrl.hostname)) {
      return `${origin}/api/pos/square/callback`;
    }
    return configuredUrl.toString();
  } catch {
    return `${origin}/api/pos/square/callback`;
  }
}
