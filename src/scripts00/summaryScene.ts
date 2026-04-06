import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BaseResponsiveScene } from '../baseResponsiveScene.ts';

const BACKGROUND_TOP_COLOR = 0x0a1f5c;
const BACKGROUND_BOTTOM_COLOR = 0x16a2d7;
const SAND_COLOR = 0xf5d87b;
const FEED_BUTTON_COLOR = 0xff9f43;
const FEED_BUTTON_STROKE = 0xfff4d6;

const MAX_LEVEL = 8;
const MAX_GROWTH = 100;
const GROWTH_PER_FEED = 12;

const UI_LAYOUT = {
  margin: 24,
  titleY: 52,
  statusY: 104,
  progressY: 138,
  buttonBottomMargin: 88,
  buttonWidthRatio: 0.42,
  buttonMaxWidth: 360,
  buttonHeight: 72,
  fishAreaRatio: 0.56,
} as const;

type SummaryLayout = {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  fishY: number;
  button: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  progress: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts00SummaryScene';

  private growth = 0;

  public constructor() {
    super(SummaryScene.key);
  }

  public create(): void {
    this.bindResponsiveLayout();
  }

  /**
   * Codex: 画面サイズからUIと生き物の描画配置を計算する。
   */
  protected computeLayout(width: number, height: number): SummaryLayout {
    const buttonWidth = Math.min(UI_LAYOUT.buttonMaxWidth, width * UI_LAYOUT.buttonWidthRatio);

    return {
      width,
      height,
      centerX: width / 2,
      centerY: height / 2,
      fishY: height * UI_LAYOUT.fishAreaRatio,
      button: {
        x: width / 2,
        y: height - UI_LAYOUT.buttonBottomMargin,
        width: buttonWidth,
        height: UI_LAYOUT.buttonHeight,
      },
      progress: {
        x: UI_LAYOUT.margin,
        y: UI_LAYOUT.progressY,
        width: width - UI_LAYOUT.margin * 2,
        height: 20,
      },
    };
  }

  /**
   * Codex: レイアウトと成長値から海中背景・生き物・UIを再描画する。
   */
  protected renderLayout(layout: SummaryLayout): void {
    this.children.removeAll(true);

    this.renderOceanBackground(layout);
    this.renderCorals(layout);
    this.renderFish(layout);
    this.renderHud(layout);
    this.renderFeedButton(layout);
    this.spawnAmbientBubbles(layout);
  }

  /**
   * Codex: 深海グラデーションと砂地を描画して舞台を作る。
   */
  private renderOceanBackground(layout: SummaryLayout): void {
    const gradient = this.add.graphics();
    gradient.fillGradientStyle(BACKGROUND_TOP_COLOR, BACKGROUND_TOP_COLOR, BACKGROUND_BOTTOM_COLOR, BACKGROUND_BOTTOM_COLOR, 1);
    gradient.fillRect(0, 0, layout.width, layout.height);

    const sand = this.add.graphics();
    sand.fillStyle(SAND_COLOR, 0.9);
    sand.fillEllipse(layout.centerX, layout.height + 40, layout.width * 1.3, layout.height * 0.3);
  }

  /**
   * Codex: 背景の珊瑚を配置して画面の彩りを増やす。
   */
  private renderCorals(layout: SummaryLayout): void {
    const coral = this.add.graphics();

    const leftX = layout.width * 0.13;
    const rightX = layout.width * 0.88;
    const baseY = layout.height - 62;

    coral.lineStyle(18, 0xff6b81, 0.9);
    coral.beginPath();
    coral.moveTo(leftX, baseY);
    coral.lineTo(leftX - 16, baseY - 80);
    coral.moveTo(leftX + 16, baseY);
    coral.lineTo(leftX + 28, baseY - 68);
    coral.strokePath();

    coral.lineStyle(16, 0xff9ff3, 0.85);
    coral.beginPath();
    coral.moveTo(rightX, baseY);
    coral.lineTo(rightX + 20, baseY - 78);
    coral.moveTo(rightX - 20, baseY);
    coral.lineTo(rightX - 28, baseY - 74);
    coral.strokePath();
  }

  /**
   * Codex: 成長値に応じてサイズと色が変化する海洋生物を描画する。
   */
  private renderFish(layout: SummaryLayout): void {
    const growthRate = Phaser.Math.Clamp(this.growth / MAX_GROWTH, 0, 1);
    const scale = 0.86 + growthRate * 0.74;
    const bodyWidth = 180 * scale;
    const bodyHeight = 112 * scale;
    const bodyColor = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0x5ce1e6),
      Phaser.Display.Color.ValueToColor(0x8a5cff),
      MAX_GROWTH,
      this.growth,
    );

    const pet = this.add.container(layout.centerX, layout.fishY);
    const body = this.add.ellipse(0, 0, bodyWidth, bodyHeight, Phaser.Display.Color.GetColor(bodyColor.r, bodyColor.g, bodyColor.b));
    const tail = this.add.triangle(
      -bodyWidth * 0.54,
      0,
      -bodyWidth * 0.38,
      0,
      -bodyWidth * 0.86,
      -bodyHeight * 0.34,
      -bodyWidth * 0.86,
      bodyHeight * 0.34,
      0x7f5af0,
      1,
    );
    const fin = this.add.ellipse(-12 * scale, -bodyHeight * 0.44, 46 * scale, 24 * scale, 0xa8f0ff, 0.95);
    const eye = this.add.circle(bodyWidth * 0.3, -bodyHeight * 0.12, 11 * scale, 0xffffff, 1);
    const pupil = this.add.circle(bodyWidth * 0.31, -bodyHeight * 0.12, 5 * scale, 0x1e293b, 1);
    const smile = this.add.line(bodyWidth * 0.24, bodyHeight * 0.12, -10 * scale, 0, 10 * scale, 0, 0x182848, 1).setLineWidth(3);

    pet.add([tail, body, fin, eye, pupil, smile]);

    // Codex: ゆらぎアニメーションで海中を漂う雰囲気を演出する。
    this.tweens.add({
      targets: pet,
      y: layout.fishY - 10,
      duration: 1800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  /**
   * Codex: タイトル・レベル・満腹ゲージを表示する。
   */
  private renderHud(layout: SummaryLayout): void {
    const level = this.computeLevel();

    this.add.text(layout.centerX, UI_LAYOUT.titleY, '🌊 ルミネコを育てよう', {
      fontFamily: 'sans-serif',
      fontSize: '36px',
      color: '#f8fafc',
      stroke: '#0f172a',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(layout.centerX, UI_LAYOUT.statusY, `レベル ${level} / ${MAX_LEVEL}  |  満腹度 ${this.growth}%`, {
      fontFamily: 'sans-serif',
      fontSize: '28px',
      color: '#fefce8',
      stroke: '#0f172a',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.rectangle(layout.progress.x, layout.progress.y, layout.progress.width, layout.progress.height, 0x0b132b, 0.6).setOrigin(0, 0.5);
    this.add.rectangle(
      layout.progress.x,
      layout.progress.y,
      (layout.progress.width * Phaser.Math.Clamp(this.growth, 0, MAX_GROWTH)) / MAX_GROWTH,
      layout.progress.height,
      0x67e8f9,
      0.92,
    ).setOrigin(0, 0.5);
  }

  /**
   * Codex: 餌やりボタンのUIとクリック処理を構築する。
   */
  private renderFeedButton(layout: SummaryLayout): void {
    const button = this.add
      .rectangle(layout.button.x, layout.button.y, layout.button.width, layout.button.height, FEED_BUTTON_COLOR, 0.97)
      .setStrokeStyle(4, FEED_BUTTON_STROKE, 0.95)
      .setInteractive({ useHandCursor: true });

    const label = this.add.text(layout.button.x, layout.button.y, '🍤 餌をあげる', {
      fontFamily: 'sans-serif',
      fontSize: '32px',
      color: '#1f2937',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    button.on('pointerover', () => {
      button.setScale(1.04);
      label.setScale(1.04);
    });

    button.on('pointerout', () => {
      button.setScale(1);
      label.setScale(1);
    });

    button.on('pointerdown', () => {
      this.feedCreature(layout);
    });
  }

  /**
   * Codex: 餌やり時に成長値を加算し、キラキラ演出を発生させる。
   */
  private feedCreature(layout: SummaryLayout): void {
    this.growth = Math.min(MAX_GROWTH, this.growth + GROWTH_PER_FEED);

    for (let index = 0; index < 5; index += 1) {
      const sparkle = this.add.star(
        layout.centerX + Phaser.Math.Between(-90, 90),
        layout.fishY + Phaser.Math.Between(-55, 55),
        5,
        4,
        12,
        0xfff59d,
        0.95,
      );
      this.tweens.add({
        targets: sparkle,
        y: sparkle.y - Phaser.Math.Between(35, 80),
        alpha: 0,
        duration: 680,
        onComplete: () => sparkle.destroy(),
      });
    }

    this.renderLayout(layout);
  }

  /**
   * Codex: 水泡を継続的に発生させて海中らしい動きを作る。
   */
  private spawnAmbientBubbles(layout: SummaryLayout): void {
    for (let index = 0; index < 10; index += 1) {
      const bubble = this.add.circle(
        Phaser.Math.Between(30, Math.floor(layout.width - 30)),
        Phaser.Math.Between(Math.floor(layout.height * 0.6), layout.height),
        Phaser.Math.Between(4, 10),
        0xd1f5ff,
        0.35,
      );

      this.tweens.add({
        targets: bubble,
        y: Phaser.Math.Between(40, Math.floor(layout.height * 0.35)),
        x: bubble.x + Phaser.Math.Between(-30, 30),
        alpha: 0,
        duration: Phaser.Math.Between(2400, 4200),
        delay: Phaser.Math.Between(0, 1400),
        repeat: -1,
        onRepeat: () => {
          bubble.setY(Phaser.Math.Between(Math.floor(layout.height * 0.66), layout.height));
          bubble.setX(Phaser.Math.Between(30, Math.floor(layout.width - 30)));
          bubble.setAlpha(0.35);
        },
      });
    }
  }

  /**
   * Codex: 成長値からレベルを算出する。
   */
  private computeLevel(): number {
    return Math.min(MAX_LEVEL, 1 + Math.floor((this.growth / MAX_GROWTH) * (MAX_LEVEL - 1)));
  }
}

new Phaser.Game(createConfig([SummaryScene]));
