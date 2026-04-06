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
        page02: resolve(__dirname, 'page02', 'index.html'),
        page03: resolve(__dirname, 'page03', 'index.html'),
        page04: resolve(__dirname, 'page04', 'index.html'),
        page05: resolve(__dirname, 'page05', 'index.html'),
        page06: resolve(__dirname, 'page06', 'index.html'),
      },
    },
  },
  server: {
    host: true,
    port: 5000,
  },
  base: githubPagesBase,
});
