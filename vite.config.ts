import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // 关键修复：将环境变量注入到浏览器环境，防止 process.env.API_KEY 访问导致的白屏错误
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ""),
    'process.env': {}
  },
  build: {
    // 解决 "Adjust chunk size limit" 告警
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // 物理分块策略：将大型依赖独立打包，降低单个 JS 文件的体积
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-utils': ['lucide-react', 'xlsx', '@google/genai']
        }
      }
    }
  }
});