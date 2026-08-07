/* Datadog RUM now boots from src/monitoring.js after first paint.
   This file is kept as a no-op shim so any stray import stays safe. */
export const initDatadogRUM = () => {}
export default initDatadogRUM
