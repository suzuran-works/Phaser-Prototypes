# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

---

## コマンド

```bash
# 新規ページ雛形生成
npm run create:page -- --page 30 --subtitle "説明"
```

ビルドは `tsc && vite build` の順。TypeScript エラーがあるとビルドが止まる。テストスイートはない。

---

## アーキテクチャ概要

### スタック

- **ゲームエンジン**: Phaser 3
- **ビルドツール**: Vite（ESモジュール、マルチページ対応）
- **言語**: TypeScript（strict モード）
- **デプロイ**: GitHub Actions → GitHub Pages（main へのプッシュで自動デプロイ）

### マルチページ構成

`index.html`（ルート）と `pageXX/index.html`（page00〜page29、計30ページ）がそれぞれ独立した Vite エントリーポイント。`vite.config.ts` の `rollupOptions.input` に全エントリーが列挙されている。

```
index.html              → src/topScene.ts      （ページ一覧ナビゲーション）
pageXX/index.html       → src/scriptsXX/summaryScene.ts  （各ゲーム実装）
```

### ページ実装の構造

各ページは `src/scriptsXX/` に以下の2ファイルを持つ：

- `define.ts` — ページのメタデータ（タイトル・サブタイトル・カラー定義）
- `summaryScene.ts` — Phaser シーンとしてのゲーム実装

### 主要な共通ファイル

| ファイル | 役割 |
|---|---|
| `src/define.ts` | 画面サイズ（1080×1080）・モバイル分岐点（1024px）・共通カラー |
| `src/baseResponsiveScene.ts` | レスポンシブ対応の基底シーン。`computeLayout()` と `renderLayout()` を abstract で強制し、ウィンドウリサイズ時に自動再描画 |
| `src/topScene.ts` | トップページ。30個の円形ボタンで各ページへ遷移 |

### デプロイフロー

- main へのプッシュで自動デプロイ
- PR タイトルまたはコミットメッセージに `[skip deploy]` を含めるとデプロイをスキップ
- `.github/workflows/deploy.yml` が制御

### ドキュメントディレクトリ

- `AIWorkDocuments/` — ゲームページ作成・改善の指示文（日付付きMarkdown）
- `AIRecoveryDocuments/` — 不具合修正のナレッジ蓄積先
