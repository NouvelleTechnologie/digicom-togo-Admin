import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './app.js';
import { AuthProvider } from './authcontext.js';
createRoot(document.getElementById('root')).render(_jsx(HashRouter, { children: _jsx(AuthProvider, { children: _jsx(App, {}) }) }));
