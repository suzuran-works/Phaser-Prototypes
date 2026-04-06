import { resolve } from 'path';
import { defineConfig } from 'vite';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];
// Codex: GitHub Pages 配信時だけリポジトリ名を base に使う。
const githubPagesBase = repositoryName ? `/${repositoryName}/` : '/';

export default defineConfig({
  build: {
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        top: resolve(__dirname, 'index.html'),
        page00: resolve(__dirname, 'page00', 'index.html'),
        page01: resolve(__dirname, 'page01', 'index.html'),
      },
    },
  },
  server: {
    host: true,
    port: 5000,
  },
  base: githubPagesBase,
});
