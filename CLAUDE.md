# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## AGENTS.mdのインポート

> 以下は `AGENTS.md` の内容をそのままインポートしたものです。

---

# エージェント向けの指針

- 変更作業を始める前に、必ずこの CLAUDE.md を確認してください。


# コミットメッセージ

- コミットメッセージは日本語で簡潔かつ内容が伝わるものにしてください。
- コミットメッセージの文頭にエージェントのサービス名を明記してください。
- デプロイスキップと指示されたら、マージ対象PRタイトルに[skip deploy]を含めてください。
- 互換性のため、コミットメッセージに[skip deploy]を含めてもスキップ判定されます。


# コーディング規約

- このプロジェクトにあるスクリプトが従っているコーディング規約に従ってスクリプトを編集してください。
- 自明なコードを除き、短く要点を押さえたコメントを必ず記述してください。
- コーディングエージェントが記述するコメントには、文頭にエージェントのサービス名を明記してください。
- 追加した関数には関数ヘッダは必ずつけてください。
  - 関数ヘッダにも文頭にエージェントのサービス名を明記してください。

# その他の指示

- エージェントとの対話の際は基本的には日本語を用いること。
- ブランチ名はプレフィックスにエージェントのサービス名を明記し、短めの命名にすること。
- プルリクエストタイトル・説明は変更の全容が日本語で端的に分かるものにしてください。
- プルリクエストの説明の冒頭には次の記述を入れてください。
  - copilotにお願い:日本語でレビューしてください
- 不具合修正タスクの依頼がある際は、`AIRecoveryDocuments/` にナレッジを蓄積すること。

## ゲームページ作成依頼時の運用ルール

- 「PageXX を作成してほしい」等のゲームページ作成指示を受けた場合は、受領した指示文を `AIWorkDocuments/` 配下に日付付きMarkdownとして必ず追加し、実装と同じコミットに含めること。
- ゲームの改善タスク（既存ページの改修・調整・最適化等）を受けた場合も、受領した指示文を `AIWorkDocuments/` 配下に日付付きMarkdownとして必ず追加し、実装と同じコミットに含めること。
- 上記ドキュメントには、指示の原文と要点を残し、後続の改修時に参照できる状態にすること。
- ゲーム新規作成や改善の指示を受けた場合、作業終了時に「デプロイ後はこのURLで確認できます: (URL)」の形式で確認先URLを必ず案内すること。
- AIRecoveryDocumentsを考慮し、近しい実装を行う際に参考にすること。
- 新規ページにゲームを作る際、リポジトリ内の既存のゲームのコードを参考にせず、初めから思考すること。

---

## コマンド

```bash
npm install          # 依存関係のインストール
npm run dev          # 開発サーバー起動（http://localhost:5000）
npm run build        # TypeScript コンパイル + Vite プロダクションビルド
npm run preview      # プロダクションビルドのローカルプレビュー
npm run create:page  # 新規ページ雛形生成（例: npm run create:page -- --page 30 --subtitle "説明"）
```

ビルドは `tsc && vite build` の順に実行される。TypeScript エラーがあるとビルドが止まる。テストスイートはない。

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
