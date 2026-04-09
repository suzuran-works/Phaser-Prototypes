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
        page07: resolve(__dirname, 'page07', 'index.html'),
        page08: resolve(__dirname, 'page08', 'index.html'),
        page09: resolve(__dirname, 'page09', 'index.html'),
        page10: resolve(__dirname, 'page10', 'index.html'),
        page11: resolve(__dirname, 'page11', 'index.html'),
        page12: resolve(__dirname, 'page12', 'index.html'),
        page13: resolve(__dirname, 'page13', 'index.html'),
        page14: resolve(__dirname, 'page14', 'index.html'),
        page15: resolve(__dirname, 'page15', 'index.html'),
        page16: resolve(__dirname, 'page16', 'index.html'),
        page17: resolve(__dirname, 'page17', 'index.html'),
        page18: resolve(__dirname, 'page18', 'index.html'),
        page19: resolve(__dirname, 'page19', 'index.html'),
        page20: resolve(__dirname, 'page20', 'index.html'),
        page21: resolve(__dirname, 'page21', 'index.html'),
        page22: resolve(__dirname, 'page22', 'index.html'),
        page23: resolve(__dirname, 'page23', 'index.html'),
        page24: resolve(__dirname, 'page24', 'index.html'),
        page25: resolve(__dirname, 'page25', 'index.html'),
        page26: resolve(__dirname, 'page26', 'index.html'),
        // Codex: Page27 をビルド入力に追加して本番配信での 404 を防ぐ。
        page27: resolve(__dirname, 'page27', 'index.html'),
      },
    },
  },
  server: {
    host: true,
    port: 5000,
  },
  base: githubPagesBase,
});
