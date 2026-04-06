# 追加改善メモ（2026-04-04）

このメモは、現行テンプレートを実運用に寄せるための「次の一手」を優先度付きで整理したものです。

## 優先度A（早めに入れると効果が大きい）

### 1. 静的チェックを npm scripts に追加
- 目的: 型エラー以外の品質問題（未使用変数、暗黙 any、import 順など）を早期検知する。
- 提案:
  - `eslint` / `@typescript-eslint` / `eslint-config-prettier` を導入
  - `npm run lint` を追加
  - CI で `npm run lint && npm run build` を実行
- 期待効果: レビュー時の手戻り削減、PR品質の底上げ。

### 2. Scene のレイアウト計算を純粋関数として分離・単体テスト化
- 目的: 現在進めている `computeLayout` 方針をテスト可能な形に固定化する。
- 提案:
  - `src/layouts/` を作成し、Scene から計算関数を切り出す
  - `vitest` を導入し、画面サイズ別の期待値テストを追加
- 期待効果: 画面崩れ回帰を自動検知できる。

### 3. デプロイ前に gh-pages の base パス検証を自動化
- 目的: マルチページ構成で起きやすい `base` やリンクの崩れを防ぐ。
- 提案:
  - `vite.config.ts` の `base` と README 記載URLの整合チェック手順を CI に追加
  - 最低限、`npm run build` 後に `dist/page00/index.html`, `dist/page01/index.html` の参照パスを簡易検証
- 期待効果: GitHub Pages 反映後のリンク切れを減らせる。

## 優先度B（中期で整備すると保守しやすい）

### 4. ページ追加の雛形生成スクリプトを提供
- 目的: 新規 `pageXX` 追加時の定型作業を自動化する。
- 提案:
  - `scripts/create-page.mjs` を追加
  - 生成対象: `pageXX/index.html`, `src/scriptsXX/define.ts`, `src/scriptsXX/summaryScene.ts`, `vite.config.ts` 追記ガイド
- 期待効果: 作業漏れ防止、学習コスト低下。

### 5. 画像・テクスチャ読み込み失敗時のフォールバック表示
- 目的: アセット欠損時に真っ黒画面にならないようにする。
- 提案:
  - `loaderror` を購読し、UI テキストでエラー通知
  - ロゴ不在時はプレースホルダ図形を描画
- 期待効果: デバッグ効率向上、初学者の詰まりを軽減。

### 6. topScene の再生成型描画を段階的に更新型へ移行
- 目的: リサイズ時のオブジェクト再生成コストを低減する。
- 提案:
  - `Container` と参照保持で `setPosition` / `setDisplaySize` 更新へ移行
- 期待効果: 将来的に UI 要素増加してもパフォーマンスが安定。

## 優先度C（運用フェーズで効く）

### 7. Dependabot / Renovate の導入
- 目的: Phaser / Vite / TypeScript の更新追従を半自動化する。
- 提案:
  - 週次の依存更新PRを作成
  - `build` 成功をマージ条件に設定
- 期待効果: 重大な脆弱性や互換性崩れを早めに発見。

### 8. README に「トラブルシュート」節を追加
- 目的: 初回セットアップ時の詰まりを減らす。
- 提案:
  - 例: Node バージョン不一致、Pages 404、キャッシュ起因の表示崩れ
- 期待効果: オンボーディング時間短縮。

## 次に着手するなら
1. `lint` 導入
2. `vitest` で layout テスト1本追加
3. CI の `lint + build` 実行

この3点だけでも、テンプレートの信頼性が一段上がります。
