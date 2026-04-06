import Phaser from 'phaser';
import { createConfig } from './define.ts';
import { BaseResponsiveScene } from './baseResponsiveScene.ts';

const LOGO_TEXTURE_KEY = 'top-logo';
const TOP_BACKGROUND_COLOR = '#0A0A0A';
const LINK_BUTTON_FILL_COLOR = 0xe5e7eb;
const LINK_BUTTON_STROKE_COLOR = 0xf8fafc;

const TOP_LAYOUT_TOKENS = {
  logo: {
    maxDisplaySizePx: 512,
    widthRatio: 0.9,
    heightRatio: 0.82,
    minHeightPx: 320,
    navGapPx: 24,
  },
  nav: {
    minBottomMarginPx: 72,
    bottomMarginRatio: 0.08,
  },
  button: {
    radiusRatio: 0.008,
    minRadiusPx: 5,
    minGapPx: 24,
    gapRadiusMultiplier: 3.2,
    strokeMinPx: 2,
    strokeRadiusRatio: 0.18,
    hoverScale: 1.18,
    pressScale: 0.92,
  },
} as const;

type TopLayout = {
  logo: {
    x: number;
    y: number;
    scale: number;
  };
  buttons: Array<{ x: number; y: number; href: string; radius: number; strokeWidth: number }>;
};

const PAGE_LINKS = ['./page00/', './page01/', './page02/'] as const;

class TopScene extends BaseResponsiveScene {
  public static readonly key = 'TopScene';

  public constructor() {
    super(TopScene.key);
  }

  public preload(): void {
    this.load.image(LOGO_TEXTURE_KEY, 'textures/suzuran_logo_withname.webp');
  }

  public create(): void {
    this.cameras.main.setBackgroundColor(TOP_BACKGROUND_COLOR);
    this.bindResponsiveLayout();
  }

  /**
   * Codex: 画面サイズからロゴと遷移ボタンの配置情報を計算する。
   */
  protected computeLayout(width: number, height: number): TopLayout {
    const centerX = width / 2;
    const centerY = height / 2;
    const navY = height - Math.max(TOP_LAYOUT_TOKENS.nav.minBottomMarginPx, height * TOP_LAYOUT_TOKENS.nav.bottomMarginRatio);

    const buttonRadius = Math.max(
      TOP_LAYOUT_TOKENS.button.minRadiusPx,
      Math.round(Math.min(width, height) * TOP_LAYOUT_TOKENS.button.radiusRatio),
    );
    const buttonGap = Math.max(
      TOP_LAYOUT_TOKENS.button.minGapPx,
      Math.round(buttonRadius * TOP_LAYOUT_TOKENS.button.gapRadiusMultiplier),
    );

    const logoScale = this.computeLogoScale(width, height, navY);
    const strokeWidth = Math.max(
      TOP_LAYOUT_TOKENS.button.strokeMinPx,
      Math.round(buttonRadius * TOP_LAYOUT_TOKENS.button.strokeRadiusRatio),
    );

    return {
      logo: { x: centerX, y: centerY, scale: logoScale },
      buttons: PAGE_LINKS.map((href, index) => ({
        x: centerX + (index - (PAGE_LINKS.length - 1) / 2) * buttonGap,
        y: navY,
        href,
        radius: buttonRadius,
        strokeWidth,
      })),
    };
  }

  /**
   * Codex: 計算済みレイアウト情報を使ってトップ画面を再描画する。
   */
  protected renderLayout(layout: TopLayout): void {
    this.children.removeAll(true);

    this.add.image(layout.logo.x, layout.logo.y, LOGO_TEXTURE_KEY).setOrigin(0.5).setScale(layout.logo.scale);

    layout.buttons.forEach(({ x, y, href, radius, strokeWidth }) => {
      const button = this.add.circle(x, y, radius, LINK_BUTTON_FILL_COLOR, 1)
        .setStrokeStyle(strokeWidth, LINK_BUTTON_STROKE_COLOR, 0.9)
        .setInteractive({ useHandCursor: true });

      button.on('pointerover', () => {
        button.setScale(TOP_LAYOUT_TOKENS.button.hoverScale);
        button.setAlpha(1);
      });

      button.on('pointerout', () => {
        button.setScale(1);
        button.setAlpha(1);
      });

      button.on('pointerdown', () => {
        button.setScale(TOP_LAYOUT_TOKENS.button.pressScale);
      });

      button.on('pointerup', () => {
        button.setScale(TOP_LAYOUT_TOKENS.button.hoverScale);
        window.location.assign(href);
      });
    });
  }

  /**
   * Codex: ロゴテクスチャ比率を維持した最大スケール値を算出する。
   */
  private computeLogoScale(width: number, height: number, navY: number): number {
    const texture = this.textures.get(LOGO_TEXTURE_KEY).getSourceImage() as { width: number; height: number };

    const maxWidth = Math.min(width * TOP_LAYOUT_TOKENS.logo.widthRatio, TOP_LAYOUT_TOKENS.logo.maxDisplaySizePx);
    const maxHeight = Math.min(
      height * TOP_LAYOUT_TOKENS.logo.heightRatio,
      Math.max(TOP_LAYOUT_TOKENS.logo.minHeightPx, (navY - TOP_LAYOUT_TOKENS.logo.navGapPx) * 2),
      TOP_LAYOUT_TOKENS.logo.maxDisplaySizePx,
    );

    return Math.min(maxWidth / texture.width, maxHeight / texture.height);
  }
}

new Phaser.Game(createConfig([TopScene]));
