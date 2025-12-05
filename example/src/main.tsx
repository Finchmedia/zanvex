import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexQueryCacheProvider } from "convex-helpers/react/cache";
import App from "./App";
import "./index.css";

// Initialize theme before React renders to prevent flash
const theme = localStorage.getItem("theme") ?? "dark";
document.documentElement.classList.toggle("dark", theme === "dark");

const address = import.meta.env.VITE_CONVEX_URL;

const convex = new ConvexReactClient(address);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <ConvexQueryCacheProvider>
        <App />
      </ConvexQueryCacheProvider>
    </ConvexProvider>
  </StrictMode>,
);
