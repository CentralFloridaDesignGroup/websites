import React from "react";
import ReactDOM from "react-dom/client";
import { MsalProvider } from "@azure/msal-react";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { initializeMsal, msalInstance } from "./auth/msalConfig";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root")!);

initializeMsal()
  .catch((error) => {
    console.error("Failed to initialize MSAL.", error);
  })
  .finally(() => {
    root.render(
      <React.StrictMode>
        <MsalProvider instance={msalInstance}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </MsalProvider>
      </React.StrictMode>,
    );
  });
