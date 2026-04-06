import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BaseResponsiveScene } from '../baseResponsiveScene.ts';
import { BACKGROUND_COLOR } from './define.ts';

const SUMMARY_LAYOUT_TOKENS = {
  markerRadiusPx: 6,
  cornerMarginPx: 16,
  centerMarkerDistancePx: 100,
} as const;

type SummaryLayout = {
  markers: Array<{ x: number; y: number }>;
};

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts00SummaryScene';

  public constructor() {
    super(SummaryScene.key);
  }

  public create(): void {
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);
    this.bindResponsiveLayout();
  }

  /**
   * Codex: マーカー描画に必要な座標一覧を画面サイズから計算する。
   */
  protected computeLayout(width: number, height: number): SummaryLayout {
    const centerX = width / 2;
    const centerY = height / 2;

    return {
      markers: [
        { x: SUMMARY_LAYOUT_TOKENS.cornerMarginPx, y: SUMMARY_LAYOUT_TOKENS.cornerMarginPx },
        { x: width - SUMMARY_LAYOUT_TOKENS.cornerMarginPx, y: SUMMARY_LAYOUT_TOKENS.cornerMarginPx },
        { x: SUMMARY_LAYOUT_TOKENS.cornerMarginPx, y: height - SUMMARY_LAYOUT_TOKENS.cornerMarginPx },
        { x: width - SUMMARY_LAYOUT_TOKENS.cornerMarginPx, y: height - SUMMARY_LAYOUT_TOKENS.cornerMarginPx },
        { x: centerX, y: centerY },
        { x: centerX, y: centerY - SUMMARY_LAYOUT_TOKENS.centerMarkerDistancePx },
        { x: centerX, y: centerY + SUMMARY_LAYOUT_TOKENS.centerMarkerDistancePx },
        { x: centerX - SUMMARY_LAYOUT_TOKENS.centerMarkerDistancePx, y: centerY },
        { x: centerX + SUMMARY_LAYOUT_TOKENS.centerMarkerDistancePx, y: centerY },
      ],
    };
  }

  /**
   * Codex: 算出済み座標へ小さい白丸マーカーを描画する。
   */
  protected renderLayout(layout: SummaryLayout): void {
    this.children.removeAll(true);

    layout.markers.forEach(({ x, y }) => {
      this.add.circle(x, y, SUMMARY_LAYOUT_TOKENS.markerRadiusPx, 0xffffff, 1);
    });
  }
}

new Phaser.Game(createConfig([SummaryScene]));
