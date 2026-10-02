export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Connect and create the tables as soon as the service starts.
  try {
    const { getDb } = await import('./lib/data-source.js');
    await getDb();
    console.log('[identity] database ready');
  } catch (err) {
    console.error('[identity] database is not ready:', err.message);
  }

  const { startDispatcher } = await import('./lib/outbox.js');
  startDispatcher();
}
