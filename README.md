# Phaser Prototypes

Phaser 3 + Vite + TypeScript で、複数ページ構成の試作をすぐ始めるためのテンプレートです。  
トップページからサンプルページへ遷移しながら、シーン構成や UI のたたき台を段階的に育てられるようにしています。

## 特徴

- Phaser 3 を使ったシンプルな初期構成
- Vite のマルチページ設定に対応
- TypeScript でシーンを分割しやすい構成
- トップページに加えて、用途の異なる 2 つのサンプルページを収録
- PC とモバイルで表示サイズを切り替える基本設定を用意

## 動作環境

- Node.js 18 以上推奨
- npm

## セットアップ

```bash
npm install
```

## 開発サーバー

```bash
npm run dev
```

Vite 開発サーバーは `http://localhost:5000` で起動します。  
同一ネットワーク内の別端末から確認したい場合は、`host: true` を設定しているため、ローカル IP 経由でもアクセスできます。

## ビルドと確認

本番用ビルド:

```bash
npm run build
```

ビルド結果のプレビュー:

```bash
npm run preview
```

## GitHub Pages へのデプロイ

このリポジトリには、GitHub Actions で `dist/` を GitHub Pages へデプロイする設定が入っています。

### 初回設定

1. GitHub のリポジトリで `Settings > Pages` を開く
2. `Build and deployment` の `Source` を `GitHub Actions` に変更する

### デプロイ方法

- `main` ブランチへ push すると自動でデプロイされます
- `v1.0.0` のようなタグを push してもデプロイされます
- `Actions` タブから `Deploy static content to Pages` を手動実行することもできます
- デプロイをスキップしたい場合は、マージ対象 PR のタイトルに `[skip deploy]` を含めてください（例: `docs: 説明更新 [skip deploy]`）
- 互換性のため、`main` ブランチへ push するコミットメッセージに `[skip deploy]` を含めた場合もスキップされます
- 注意: GitHub Actions の実行時間には上限があり、Free プランでは月 2,000 分までです

### 公開 URL

- トップページ: `https://suzuran-works.github.io/Phaser-Prototypes/`
- page00: `https://suzuran-works.github.io/Phaser-Prototypes/page00/`
- page01: `https://suzuran-works.github.io/Phaser-Prototypes/page01/`

## ページ構成

### `/`

トップページです。  
中央にロゴ画像を表示し、画面下部の 2 つの丸ボタンから `page00` / `page01` へ遷移できます。

### `/page00/`

背景色の上に、画面四隅と中央周辺へ小さな白丸マーカーを描画するサンプルページです。  
リサイズ時にも位置を再計算して再描画する、レイアウト確認用の最小サンプルとして使えます。

### `/page01/`

背景色の上に、中央へ `Template` テキストを表示するサンプルページです。  
リサイズに追従して文字サイズと位置を更新する、テキスト表示の最小サンプルとして使えます。

## ディレクトリ構成

```text
.
├── index.html
├── page00/
│   └── index.html
├── page01/
│   └── index.html
├── src/
│   ├── define.ts
│   ├── topScene.ts
│   ├── scripts00/
│   │   ├── define.ts
│   │   └── summaryScene.ts
│   └── scripts01/
│       ├── define.ts
│       └── summaryScene.ts
├── package.json
└── vite.config.ts
```

## 主要ファイル

- `src/define.ts`
  - Phaser 全体で使う画面サイズ、モバイル判定、共通 `GameConfig` を定義しています。
- `src/topScene.ts`
  - ルートページのトップシーンです。ロゴ表示と `page00` / `page01` への丸ボタン遷移を実装しています。
- `src/scripts00/summaryScene.ts`
  - `page00` 用のサンプルシーンです。四隅と中央周辺に白丸マーカーを描画するレイアウト確認用実装です。
- `src/scripts01/summaryScene.ts`
  - `page01` 用のサンプルシーンです。中央の `Template` テキスト表示とリサイズ追従を実装しています。
- `vite.config.ts`
  - `index.html`、`page00/index.html`、`page01/index.html` をエントリにしたマルチページ設定です。

## トップページ画像サイズ仕様

トップページ中央のロゴ画像（`public/textures/suzuran_logo_withname.webp`）は、画面サイズに応じて自動調整されるレスポンシブ表示です。  
また、リサイズ時にレイアウトを再描画することで、画面サイズ変更時の配置崩れを防いでいます。

## 拡張の進め方

### 1. 新しいページを追加する

1. `pageXX/index.html` を追加する
2. 対応するシーンスクリプトを `src/` 配下に作成する
3. `vite.config.ts` の `rollupOptions.input` に新しいエントリを追加する
4. 必要ならトップページに導線を追加する

### 2. 既存ページを育てる

- `page00`
- `page01`
- 共通化したい処理が増えたら、`src/` 配下に共通モジュールを追加して整理してください

## ページ追加スクリプト

新しい `pageXX` の雛形をまとめて作成できます。

```bash
npm run create:page -- --page 2
```

- `--page` は `2` / `02` / `page02` の形式で指定できます
- `--subtitle` を指定すると `src/scriptsXX/define.ts` の `SUBTITLE` を同時に設定します
- `--dry-run` を指定するとファイルは作成せず、作成予定だけ確認できます

例:

```bash
npm run create:page -- --page page02 --subtitle "追加ページの説明"
```

作成されるファイル:

- `pageXX/index.html`
- `src/scriptsXX/define.ts`
- `src/scriptsXX/summaryScene.ts`

実行後、標準出力に表示されるガイドに沿って `vite.config.ts` の `rollupOptions.input` へ `pageXX` を追加してください。

## テンプレート初期化スクリプト（ロゴは変更しない）

複製直後の最低限の置き換え（プロジェクトID・タイトル）をまとめて実行できます。

```bash
npm run init:template -- --id my-game --title "My Game"
```

- 更新対象
  - `package.json` の `name`
  - `index.html` の `<title>`
  - `README.md` の先頭見出し
  - `README.md` の GitHub Pages 公開 URL
  - `pageXX/index.html` の `<title>`
- `public/textures/suzuran_logo_withname.webp` などのロゴ素材は変更しません
- 変更内容だけ確認したい場合は `--dry-run` を追加してください

## このテンプレートが向いている用途

- Phaser ベースの小規模プロトタイプ
- UI 実験を含むゲーム画面のたたき台作成
- ページごとに検証テーマを分けたい検証用プロジェクト
- 将来的にシーンやロジックを段階的に分割していく構成の初期化
