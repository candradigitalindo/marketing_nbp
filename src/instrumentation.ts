/**
 * Next.js Instrumentation
 * 
 * This file is automatically loaded by Next.js when the server starts.
 * Perfect place to initialize background workers.
 * 
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] Loading workers...')
    const { startWorkers } = await import('./workers')
    console.log('[Instrumentation] Starting workers...')
    startWorkers()
    console.log('[Instrumentation] Workers initialization complete')
  }
}
