import { defineConfig } from 'vite';

// 相对路径同时适配 GitHub Pages 项目子路径与本地预览。
export default defineConfig({
  base: './',
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  build: { rolldownOptions: { output: { codeSplitting: { groups: [{ name: 'three', test: /node_modules[\\/]three/ }] } } } },
});
