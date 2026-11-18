import { copyFileSync, mkdirSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const adminRouteFiles = { name: 'admin-route-files', closeBundle() { for (const path of ['Admin/login', 'Admin']) { mkdirSync(`dist/${path}`, { recursive: true }); copyFileSync('dist/index.html', `dist/${path}/index.html`); } } };
export default defineConfig({ plugins: [react(), adminRouteFiles], server: { port: 5173, proxy: { '/api': 'http://localhost:4000' } } });

