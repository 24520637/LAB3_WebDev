import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

const element = document.getElementById('root');
if (!element) throw new Error('Missing #root application mount');
createRoot(element).render(<StrictMode><App /></StrictMode>);
