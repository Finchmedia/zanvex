import { defineApp } from "convex/server";
import zanvex from "@mrfinch/zanvex/convex.config.js";

const app = defineApp();
app.use(zanvex);

export default app;
