import { httpRouter } from "convex/server";

const http = httpRouter();

// Zanvex doesn't expose HTTP routes by default.
// All permission checks happen via Convex queries/mutations.
//
// If you need HTTP endpoints for external integrations,
// you can add them here.

export default http;
