import React from "react";
import ReactDOM from "react-dom/client";
import { PublicClientApplication, EventType } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import App from "./App";
import { msalConfig, isLocalDevMode } from "./config/authConfig";
import "./index.css";
import { AppProvider } from './contexts/AppContext';
import { ThemeProvider } from './components/ThemeProvider';

// Render function extracted for reuse
const renderApp = (msalInstance?: PublicClientApplication) => {
  const rootElement = document.getElementById("root");
  
  if (!rootElement) {
    console.error('Failed to find the root element');
    return;
  }

  const appContent = (
    <AppProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </AppProvider>
  );

  const content = msalInstance ? (
    <MsalProvider instance={msalInstance}>
      {appContent}
    </MsalProvider>
  ) : appContent;

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      {content}
    </React.StrictMode>
  );
};

if (isLocalDevMode) {
  console.log('[main] Running in LOCAL DEV MODE - Authentication bypassed');
  renderApp();
} else {
  console.log("[main] Running in PRODUCTION MODE - Authentication enabled");
  // Initialize MSAL instance for production
  const msalInstance = new PublicClientApplication(msalConfig!);

  // Handle redirect promise (required for PKCE flow)
  msalInstance.initialize().then(() => {
    // Account selection logic (optional, handles multiple accounts)
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      msalInstance.setActiveAccount(accounts[0]);
    }

    msalInstance.addEventCallback((event) => {
      if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
        const payload = event.payload as any;
        const account = payload.account;
        msalInstance.setActiveAccount(account);
      }
    });

    renderApp(msalInstance);
  });
}
