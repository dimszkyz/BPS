import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(),],
  server: {
    host: true,  // Izinkan akses network/tunnel
    strictPort: true, // Paksa di port 5173, error jika port terpakai
    port: 5173, 
  }
})
