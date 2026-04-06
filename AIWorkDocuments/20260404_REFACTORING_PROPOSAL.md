# コンテンツ部分のリファクタリング提案

## 背景
現状の Scene 実装は、以下の2点で保守コストが上がりやすい構造です。

1. レイアウト値（余白・サイズ・係数）が散在し、意味がコードから読み取りづらい。
2. リサイズ時の再描画を Scene ごとに毎回実装する必要がある。

## 提案1: マジックナンバーの「設計値化」

### 方針
- 各 Scene に散らばる数値を、用途ごとに `LayoutTokens` として定義する。
- 「ピクセル固定値」と「画面依存係数」を明示的に分ける。

### 例
- `src/topScene.ts`
  - `0.9`, `0.82`, `24`, `320`, `0.008`, `3.2`, `0.18`, `1.18`, `0.92` などをトークン化
- `src/scripts01/summaryScene.ts`
  - `72`, `40`, `0.08` をタイポグラフィトークンとして命名

### 期待効果
- 値の意図が読みやすくなる
- デザイン調整時に変更箇所を最小化できる

## 提案2: リサイズ再計算の共通化（BaseScene 化）

### 方針
- `BaseResponsiveScene` を作り、以下を共通化する。
  - 初回描画
  - `Scale.Events.RESIZE` の購読
  - `SHUTDOWN` での解除
- 各 Scene は `renderLayout(size)` のみを実装する。

### イメージ
```ts
abstract class BaseResponsiveScene extends Phaser.Scene {
  protected abstract renderLayout(width: number, height: number): void;

  protected bindResponsiveLayout(): void {
    const draw = (w: number, h: number) => this.renderLayout(w, h);
    draw(this.scale.width, this.scale.height);

    const onResize = (size: Phaser.Structs.Size) => draw(size.width, size.height);
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, onResize);
    });
  }
}
```

### 期待効果
- 「リサイズ解除漏れ」「再描画呼び忘れ」などの実装ゆらぎを防止
- 新規 Scene 実装時に UI ロジックへ集中できる

## 提案3: レイアウト計算と描画の分離

### 方針
- Scene メソッドを2段に分ける。
  - `computeLayout(width, height)` : 座標・サイズを返す純粋関数
  - `renderLayout(layout)` : 描画だけ実施

### 期待効果
- 計算ロジックを単体テストしやすい
- 描画 API 変更時に影響範囲を限定できる

## 提案4: 破棄方式の見直し（removeAll 依存の低減）

### 方針
- `children.removeAll(true)` で全破棄して再生成する方式から、
  `Container` + 参照保持で `setPosition` / `setScale` 更新方式へ段階移行する。

### 期待効果
- 頻繁なリサイズ時のオブジェクト再生成コストを抑えられる
- ボタンイベントの再登録漏れリスクを下げられる

## 優先導入順
1. BaseScene 化（提案2）
2. トークン化（提案1）
3. 計算・描画分離（提案3）
4. 更新型レイアウト化（提案4）

段階導入することで、挙動を維持しつつ可読性と保守性を改善できます。
