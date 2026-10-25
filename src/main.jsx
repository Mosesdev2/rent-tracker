import './styles.css';
import React from 'react';
import { createRoot } from 'react-dom/client';

const root = createRoot(document.getElementById('root'));

function show(msg) {
  root.render(
    <pre style={{ padding: 16, whiteSpace: 'pre-wrap', color: 'crimson' }}>{msg}</pre>
  );
}

window.addEventListener('error', (e) => show('Error: ' + e.message));
window.addEventListener('unhandledrejection', (e) =>
  show('Error: ' + (e.reason && e.reason.message ? e.reason.message : String(e.reason)))
);

import('./App.jsx')
  .then(({ default: App }) =>
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  )
  .catch((err) => show('Failed to load app: ' + err.message));