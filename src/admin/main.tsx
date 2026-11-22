import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AdminApp from "./App";
import { AdminStoreProvider } from "./lib/store";
import "./admin.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AdminStoreProvider>
      <AdminApp />
    </AdminStoreProvider>
  </StrictMode>,
);
