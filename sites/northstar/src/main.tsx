import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initializeMsal } from "./auth/msalConfig";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root")!);

initializeMsal()
  .catch((error) => {
    console.error("Failed to initialize MSAL.", error);
  })
  .finally(() => {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  });
