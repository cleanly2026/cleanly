/**
 * Unified worker entry — FLY-02 worker process group.
 * Imported by `node apps/api/dist/workers/index.js` in fly.toml [processes].worker.
 *
 * Each worker module starts a BullMQ Worker on import (side-effect) and registers
 * its own SIGTERM/SIGINT handlers for graceful shutdown. Importing both here is
 * all that's needed.
 */
import './order.worker.js'
import './notification.worker.js'

console.log('[workers/index] All worker modules loaded')
