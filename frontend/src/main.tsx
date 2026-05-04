// Ξεκινά το React app και το συνδέει με το div #root του index.html.
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./i18n";
import "./styles.css";
import { applyAccessibilitySettings, initAccessibility, readAccessibilitySettings } from "./lib/accessibility";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

applyAccessibilitySettings(readAccessibilitySettings());
initAccessibility();

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
