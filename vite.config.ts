
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'scoring': ['./components/ScoringScreen.tsx'],
          'setup': ['./components/SetupScreen.tsx'],
          'summary': ['./components/SummaryScreen.tsx'],
          'stats': ['./components/StatsScreen.tsx']
        }
      }
    },
    chunkSizeWarningLimit: 600
  }
});