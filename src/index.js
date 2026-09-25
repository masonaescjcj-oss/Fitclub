import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { applyTheme, loadTheme } from './lib/theme';
import { applyAccent, loadAccent } from './lib/accent';

applyTheme(loadTheme());
applyAccent(loadAccent());

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// The installed app works offline once it has been opened with a
// connection (see public/sw.js). Development builds skip it so hot reload
// is never served from a cache.
if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${process.env.PUBLIC_URL}/sw.js`).catch(() => {
      // No service worker (a sandboxed preview, an old browser): the app still runs online.
    });
  });
}
