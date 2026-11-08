import { jsx as _jsx } from 'react/jsx-runtime';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './app.js';
import { AuthProvider } from './authcontext.js';

const container = document.getElementById('root');
if (!container) throw new Error("Élément d'application #root introuvable.");
createRoot(container).render(
  _jsx(HashRouter, {
    children: _jsx(AuthProvider, { children: _jsx(App, {}) })
  })
);

// Enregistrement PWA : chemin relatif compatible avec GitHub Pages (dépôt /digicom-togo-Admin/).
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .catch((error) => console.warn('Service Worker non enregistré :', error));
  });
}
