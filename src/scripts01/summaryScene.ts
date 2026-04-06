import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BaseResponsiveScene } from '../baseResponsiveScene.ts';

const BACKGROUND_COLOR = 0x123524;
const CENTER_TEXT = 'Template';

const TYPOGRAPHY_TOKENS = {
  maxFontSizePx: 72,
  minFontSizePx: 40,
  widthRatio: 0.08,
} as const;

type CenterTextLayout = {
  x: number;
  y: number;
  textSizePx: number;
};

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts01SummaryScene';

  public constructor() {
    super(SummaryScene.key);
  }

  public create(): void {
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);
    this.bindResponsiveLayout();
  }

  /**
   * Codex: 表示幅に応じた中央テキストの座標と文字サイズを算出する。
   */
  protected computeLayout(width: number, height: number): CenterTextLayout {
    return {
      x: width / 2,
      y: height / 2,
      textSizePx: Math.min(
        TYPOGRAPHY_TOKENS.maxFontSizePx,
        Math.max(TYPOGRAPHY_TOKENS.minFontSizePx, Math.round(width * TYPOGRAPHY_TOKENS.widthRatio)),
      ),
    };
  }

  /**
   * Codex: 計算結果を使って中央テキストを再描画する。
   */
  protected renderLayout(layout: CenterTextLayout): void {
    this.children.removeAll(true);
    this.add.text(layout.x, layout.y, `${CENTER_TEXT} ${layout.textSizePx}px`, {
      fontSize: `${layout.textSizePx}px`,
      color: '#ecfdf5',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }
}

new Phaser.Game(createConfig([SummaryScene]));
