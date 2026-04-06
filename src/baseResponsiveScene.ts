import Phaser from 'phaser';

/**
 * Codex: レスポンシブ再描画のライフサイクルを共通化する基底 Scene。
 */
export abstract class BaseResponsiveScene extends Phaser.Scene {
  /**
   * Codex: 表示サイズから描画用レイアウト値を算出する。
   */
  protected abstract computeLayout(width: number, height: number): unknown;

  /**
   * Codex: 算出済みレイアウト値を使って Scene を描画する。
   */
  protected abstract renderLayout(layout: unknown): void;

  /**
   * Codex: 初回描画とリサイズ購読、破棄時解除をまとめて設定する。
   */
  protected bindResponsiveLayout(): void {
    const draw = (width: number, height: number): void => {
      const layout = this.computeLayout(width, height);
      this.renderLayout(layout);
    };

    draw(this.scale.width, this.scale.height);

    const onResize = (size: Phaser.Structs.Size): void => {
      draw(size.width, size.height);
    };

    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, onResize);
    });
  }
}
