// Build 11.0.0 — Next.js instrumentation.
// Registers a global error handler so uncaught server errors are captured by
// the observability pipeline (v3.0 §41). Runs once at server startup.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { recordDeploy } = await import('@/lib/observability');
    // Record this process start as a deploy marker for post-deploy monitoring.
    await recordDeploy(process.env.APP_BUILD_VERSION || '11.0.0', process.env.RENDER_GIT_COMMIT).catch(
      () => {}
    );
  }
}

// Next.js 14+ calls onRequestError for uncaught errors in the request pipeline.
export async function onRequestError(
  err: unknown,
  request: { path?: string },
  context: { routerKind?: string }
) {
  try {
    const { captureException } = await import('@/lib/observability');
    await captureException(err, {
      route: request?.path,
      tags: { routerKind: context?.routerKind || 'unknown' }
    });
  } catch {
    // Never throw from instrumentation.
  }
}
