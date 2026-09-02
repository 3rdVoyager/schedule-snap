const isLocal =
  location.hostname === "localhost" || location.hostname === "127.0.0.1";

/** Set PROD_API_URL when deploying the worker to production. */
const PROD_API_URL = "https://schedule-snap-api.joshuacheng-dev.workers.dev";

export const API_URL = isLocal ? "http://localhost:8787" : PROD_API_URL;
