import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './theme-light.css';
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
