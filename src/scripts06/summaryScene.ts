import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BaseResponsiveScene } from '../baseResponsiveScene.ts';
import { BACKGROUND_COLOR, SUBTITLE, TITLE } from './define.ts';

type SceneLayout = {
  width: number;
  height: number;
  centerX: number;
  coneTopY: number;
  coneWidth: number;
  coneHeight: number;
};

const SCOOP_RADIUS_RATIO = 0.08;
const SCOOP_RADIUS_MIN = 44;
const SCOOP_RADIUS_MAX = 86;
const MAX_STAGE = 5;
const MELT_PER_SEC = 4.8;
const FEED_GAIN = 7.5;

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts06SummaryScene';

  private layout: SceneLayout = {
    width: 1080,
    height: 1080,
    centerX: 540,
    coneTopY: 640,
    coneWidth: 220,
    coneHeight: 300,
  };

  private stage = 1;

  private growth = 28;

  private score = 0;

  private mainGraphics!: Phaser.GameObjects.Graphics;

  private uiText!: Phaser.GameObjects.Text;

  private hintText!: Phaser.GameObjects.Text;

  /**
   * Codex: アイス育成シーンの初期状態を設定する。
   */
  public constructor() {
    super(SummaryScene.key);
  }

  /**
   * Codex: 背景色と入力処理を初期化してレスポンシブ描画を開始する。
   */
  public create(): void {
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);

    this.mainGraphics = this.add.graphics();
    this.uiText = this.add.text(0, 0, '', {
      fontFamily: 'sans-serif',
      fontSize: '28px',
      color: '#1f2937',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 5,
    }).setOrigin(0.5, 0);
    this.hintText = this.add.text(0, 0, '', {
      fontFamily: 'sans-serif',
      fontSize: '22px',
      color: '#0f172a',
      stroke: '#ffffff',
      strokeThickness: 4,
    }).setOrigin(0.5, 0);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.isPointerNearIce(pointer.x, pointer.y)) {
        return;
      }

      this.feedIceCream();
      this.drawScene();
    });

    this.bindResponsiveLayout();
  }

  /**
   * Codex: 毎フレーム溶ける処理を進めて描画を更新する。
   */
  public update(_time: number, delta: number): void {
    const deltaSec = Math.min(0.06, delta / 1000);
    const beforeGrowth = this.growth;

    this.growth = Math.max(0, this.growth - MELT_PER_SEC * deltaSec);

    if (beforeGrowth !== this.growth) {
      this.drawScene();
    }
  }

  /**
   * Codex: 現在の画面サイズに合わせたコーンレイアウトを算出する。
   */
  protected computeLayout(width: number, height: number): SceneLayout {
    return {
      width,
      height,
      centerX: width / 2,
      coneTopY: height * 0.62,
      coneWidth: Math.min(300, Math.max(160, width * 0.22)),
      coneHeight: Math.min(380, Math.max(210, height * 0.32)),
    };
  }

  /**
   * Codex: リサイズ時に表示位置を更新して最新状態を再描画する。
   */
  protected renderLayout(layout: SceneLayout): void {
    this.layout = layout;
    this.drawScene();
  }

  /**
   * Codex: 成長ゲージを増やし、一定値で段階アップとスコア加算を行う。
   */
  private feedIceCream(): void {
    this.growth = Math.min(100, this.growth + FEED_GAIN);

    if (this.growth >= 96 && this.stage < MAX_STAGE) {
      this.stage += 1;
      this.growth = 38;
      this.score += this.stage * 100;
    } else {
      this.score += 12;
    }
  }

  /**
   * Codex: クリック位置がアイス周辺かどうかを判定する。
   */
  private isPointerNearIce(x: number, y: number): boolean {
    const scoopRadius = this.computeScoopRadius();
    const iceTopY = this.layout.coneTopY - scoopRadius * 0.9;
    return Phaser.Math.Distance.Between(x, y, this.layout.centerX, iceTopY) < scoopRadius * 2.25;
  }

  /**
   * Codex: ステージと成長度からスクープの半径を求める。
   */
  private computeScoopRadius(): number {
    const baseRadius = Math.max(
      SCOOP_RADIUS_MIN,
      Math.min(SCOOP_RADIUS_MAX, Math.round(Math.min(this.layout.width, this.layout.height) * SCOOP_RADIUS_RATIO)),
    );
    return baseRadius + (this.stage - 1) * 8 + this.growth * 0.18;
  }

  /**
   * Codex: コーン・スクープ・UIテキストをまとめて描画する。
   */
  private drawScene(): void {
    const graphics = this.mainGraphics;
    graphics.clear();

    this.drawSkyBackground(graphics);
    this.drawCone(graphics);
    this.drawScoops(graphics);
    this.drawUiTexts();
  }

  /**
   * Codex: 空背景と床ラインを塗って全体の見た目を整える。
   */
  private drawSkyBackground(graphics: Phaser.GameObjects.Graphics): void {
    graphics.fillStyle(0xb9f1ff, 1);
    graphics.fillRect(0, 0, this.layout.width, this.layout.height);
    graphics.fillStyle(0xfff6d5, 0.72);
    graphics.fillRect(0, this.layout.height * 0.84, this.layout.width, this.layout.height * 0.16);
  }

  /**
   * Codex: ワッフルコーン本体と格子模様を描画する。
   */
  private drawCone(graphics: Phaser.GameObjects.Graphics): void {
    const halfWidth = this.layout.coneWidth / 2;
    const topY = this.layout.coneTopY;
    const bottomY = this.layout.coneTopY + this.layout.coneHeight;

    graphics.fillStyle(0xd89b4a, 1);
    graphics.beginPath();
    graphics.moveTo(this.layout.centerX - halfWidth, topY);
    graphics.lineTo(this.layout.centerX + halfWidth, topY);
    graphics.lineTo(this.layout.centerX, bottomY);
    graphics.closePath();
    graphics.fillPath();

    graphics.lineStyle(2, 0xc27f2e, 0.6);
    for (let i = 0; i < 9; i += 1) {
      const ratio = i / 8;
      const y = topY + this.layout.coneHeight * ratio;
      const inset = halfWidth * ratio;
      graphics.beginPath();
      graphics.moveTo(this.layout.centerX - halfWidth + inset, y);
      graphics.lineTo(this.layout.centerX + halfWidth - inset, y);
      graphics.strokePath();
    }
  }

  /**
   * Codex: ステージ数に応じたスクープを積み上げて描画する。
   */
  private drawScoops(graphics: Phaser.GameObjects.Graphics): void {
    const scoopRadius = this.computeScoopRadius();
    const baseY = this.layout.coneTopY - scoopRadius * 0.9;
    const colors = [0xffc6dd, 0xfff6a1, 0xc8f5b0, 0xb8d3ff, 0xfad8ff];

    for (let i = 0; i < this.stage; i += 1) {
      const y = baseY - i * scoopRadius * 0.74;
      const x = this.layout.centerX + Math.sin(i * 1.7) * 8;
      graphics.fillStyle(colors[i % colors.length] ?? 0xffffff, 1);
      graphics.fillCircle(x, y, scoopRadius);

      graphics.fillStyle(0xffffff, 0.2);
      graphics.fillCircle(x - scoopRadius * 0.28, y - scoopRadius * 0.25, scoopRadius * 0.36);
    }
  }

  /**
   * Codex: タイトル・進行度・操作説明をテキストで表示する。
   */
  private drawUiTexts(): void {
    this.uiText
      .setText(`${TITLE} / ${SUBTITLE}\nステージ: ${this.stage}/${MAX_STAGE}  成長: ${Math.round(this.growth)}%  スコア: ${this.score}`)
      .setPosition(this.layout.centerX, 18)
      .setFontSize(this.layout.width < 700 ? '20px' : '28px');

    this.hintText
      .setText('アイスをタップして育成！\n放置すると少しずつ溶けます。')
      .setPosition(this.layout.centerX, this.layout.height - (this.layout.width < 700 ? 78 : 92))
      .setFontSize(this.layout.width < 700 ? '18px' : '22px');
  }
}

new Phaser.Game(createConfig([SummaryScene]));
