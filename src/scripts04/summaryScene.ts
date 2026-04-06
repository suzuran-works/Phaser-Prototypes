import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BaseResponsiveScene } from '../baseResponsiveScene.ts';
import { BACKGROUND_COLOR } from './define.ts';

const JELLYFISH_COUNT = 7;
const PARALLAX_LAYER_COUNT = 3;

type SceneLayout = {
  width: number;
  height: number;
};

type Jellyfish = {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  speedY: number;
  driftAmplitude: number;
  driftSpeed: number;
  phase: number;
  scale: number;
  hue: number;
  glowAlpha: number;
  graphics: Phaser.GameObjects.Graphics;
};

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts04SummaryScene';

  private layout: SceneLayout = { width: 1080, height: 1080 };

  private readonly jellyfishes: Jellyfish[] = [];

  private readonly backgroundLayers: Phaser.GameObjects.Container[] = [];

  private jellyLayer?: Phaser.GameObjects.Container;

  private titleText?: Phaser.GameObjects.Text;

  /**
   * Codex: クラゲ鑑賞シーンの初期化を行う。
   */
  public constructor() {
    super(SummaryScene.key);
  }

  /**
   * Codex: 背景色設定とレスポンシブ描画の起動を行う。
   */
  public create(): void {
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);
    this.bindResponsiveLayout();
  }

  /**
   * Codex: 各クラゲの遊泳アニメーションと再描画を毎フレーム更新する。
   */
  public update(_time: number, delta: number): void {
    const deltaSec = delta / 1000;
    this.animateBackgroundDrift();
    this.updateJellyfishSwim(deltaSec);
  }

  /**
   * Codex: 描画に必要なレイアウトサイズを返す。
   */
  protected computeLayout(width: number, height: number): SceneLayout {
    return { width, height };
  }

  /**
   * Codex: レイアウト更新時に背景とクラゲ群を再構築する。
   */
  protected renderLayout(layout: SceneLayout): void {
    this.layout = layout;

    this.children.removeAll(true);
    this.backgroundLayers.length = 0;
    this.jellyfishes.length = 0;

    this.createBackground();
    this.createJellyfishLayer();
    this.createTitle();
  }

  /**
   * Codex: 幻想的な深海グラデーションと漂う粒子を生成する。
   */
  private createBackground(): void {
    const { width, height } = this.layout;

    const base = this.add.rectangle(width / 2, height / 2, width, height, 0x040b26, 1);
    const auroraA = this.add.ellipse(width * 0.25, height * 0.22, width * 0.8, height * 0.42, 0x5b6dff, 0.2);
    const auroraB = this.add.ellipse(width * 0.75, height * 0.18, width * 0.9, height * 0.38, 0x3bffff, 0.14);
    const auroraC = this.add.ellipse(width * 0.5, height * 0.84, width * 1.25, height * 0.35, 0xd363ff, 0.12);

    const gradientContainer = this.add.container(0, 0, [base, auroraA, auroraB, auroraC]);
    this.backgroundLayers.push(gradientContainer);

    for (let layerIndex = 0; layerIndex < PARALLAX_LAYER_COUNT; layerIndex += 1) {
      const particleLayer = this.add.container(0, 0);
      const particleCount = 18 + layerIndex * 9;
      const minRadius = 1 + layerIndex;
      const maxRadius = 3 + layerIndex;
      const alpha = 0.12 + layerIndex * 0.04;

      for (let i = 0; i < particleCount; i += 1) {
        const particle = this.add.circle(
          Phaser.Math.Between(0, width),
          Phaser.Math.Between(0, height),
          Phaser.Math.FloatBetween(minRadius, maxRadius),
          layerIndex === 0 ? 0xb5d4ff : 0xc4fff7,
          alpha,
        );
        particleLayer.add(particle);
      }

      this.backgroundLayers.push(particleLayer);
    }
  }

  /**
   * Codex: クラゲ描画レイヤを作成し、個体データを初期化する。
   */
  private createJellyfishLayer(): void {
    const { width, height } = this.layout;
    this.jellyLayer = this.add.container(0, 0);

    for (let i = 0; i < JELLYFISH_COUNT; i += 1) {
      const scale = Phaser.Math.FloatBetween(0.65, 1.28);
      const jellyGraphics = this.add.graphics();
      this.jellyLayer.add(jellyGraphics);

      this.jellyfishes.push({
        x: Phaser.Math.Between(80, width - 80),
        y: Phaser.Math.Between(120, height - 80),
        baseX: Phaser.Math.Between(80, width - 80),
        baseY: Phaser.Math.Between(100, height - 70),
        speedY: Phaser.Math.FloatBetween(8, 20),
        driftAmplitude: Phaser.Math.FloatBetween(22, 58),
        driftSpeed: Phaser.Math.FloatBetween(0.5, 1.1),
        phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
        scale,
        hue: Phaser.Math.Between(0, 2),
        glowAlpha: Phaser.Math.FloatBetween(0.2, 0.35),
        graphics: jellyGraphics,
      });
    }
  }

  /**
   * Codex: 画面上部に鑑賞用タイトルを表示する。
   */
  private createTitle(): void {
    const isMobile = this.layout.width < 640;
    const fontSize = isMobile ? '24px' : '34px';

    this.titleText = this.add.text(this.layout.width / 2, isMobile ? 18 : 22, 'Moonlit Jellyfish Garden', {
      fontFamily: 'sans-serif',
      fontSize,
      color: '#eaf6ff',
      stroke: '#1e2a4d',
      strokeThickness: 6,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    this.tweens.add({
      targets: this.titleText,
      alpha: { from: 0.95, to: 0.58 },
      duration: 1400,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });
  }

  /**
   * Codex: 背景レイヤごとに僅かな縦ドリフトを与えて奥行きを作る。
   */
  private animateBackgroundDrift(): void {
    for (let i = 0; i < this.backgroundLayers.length; i += 1) {
      const layer = this.backgroundLayers[i];
      const driftStrength = (i + 1) * 1.8;
      layer.y = Math.sin(this.time.now * 0.00035 + i) * driftStrength;
    }
  }

  /**
   * Codex: クラゲの上昇・傘の脈動・触手揺れを更新して描画する。
   */
  private updateJellyfishSwim(deltaSec: number): void {
    const { width, height } = this.layout;

    for (const jelly of this.jellyfishes) {
      jelly.phase += deltaSec * jelly.driftSpeed;
      jelly.baseY -= jelly.speedY * deltaSec;

      if (jelly.baseY < -120) {
        jelly.baseY = height + Phaser.Math.Between(40, 120);
        jelly.baseX = Phaser.Math.Between(80, width - 80);
      }

      jelly.x = jelly.baseX + Math.sin(jelly.phase) * jelly.driftAmplitude;
      jelly.y = jelly.baseY + Math.cos(jelly.phase * 1.4) * 12;

      this.drawSingleJellyfish(jelly);
    }
  }

  /**
   * Codex: クラゲ1体の傘・口腕・触手を形状として描画する。
   */
  private drawSingleJellyfish(jelly: Jellyfish): void {
    const graphics = jelly.graphics;
    const pulse = 1 + Math.sin(this.time.now * 0.007 + jelly.phase) * 0.07;
    const bellWidth = 86 * jelly.scale * pulse;
    const bellHeight = 56 * jelly.scale * (1 - (pulse - 1) * 0.35);
    const colorSet = this.pickJellyColor(jelly.hue);

    graphics.clear();

    graphics.fillStyle(colorSet.glow, jelly.glowAlpha);
    graphics.fillEllipse(jelly.x, jelly.y + 6, bellWidth * 1.5, bellHeight * 1.4);

    graphics.fillStyle(colorSet.bell, 0.88);
    graphics.lineStyle(3, 0xf2fdff, 0.78);
    graphics.fillEllipse(jelly.x, jelly.y, bellWidth, bellHeight);
    graphics.strokeEllipse(jelly.x, jelly.y, bellWidth, bellHeight);

    graphics.lineStyle(4, colorSet.arm, 0.72);
    const hemPoints = [
      new Phaser.Math.Vector2(jelly.x - bellWidth * 0.42, jelly.y + bellHeight * 0.12),
      new Phaser.Math.Vector2(jelly.x - bellWidth * 0.24, jelly.y + bellHeight * 0.22),
      new Phaser.Math.Vector2(jelly.x, jelly.y + bellHeight * 0.16),
      new Phaser.Math.Vector2(jelly.x + bellWidth * 0.22, jelly.y + bellHeight * 0.24),
      new Phaser.Math.Vector2(jelly.x + bellWidth * 0.42, jelly.y + bellHeight * 0.12),
    ];
    graphics.strokePoints(hemPoints, false, false);

    graphics.fillStyle(0xf7ffff, 0.24);
    graphics.fillEllipse(jelly.x - bellWidth * 0.12, jelly.y - bellHeight * 0.14, bellWidth * 0.28, bellHeight * 0.2);

    this.drawOralArms(graphics, jelly.x, jelly.y + bellHeight * 0.2, bellWidth, bellHeight, colorSet.arm);
    this.drawTentacles(graphics, jelly.x, jelly.y + bellHeight * 0.18, bellWidth, jelly.scale, colorSet.tentacle, jelly.phase);
  }

  /**
   * Codex: クラゲの口腕を太めの有機曲線として描く。
   */
  private drawOralArms(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    bellWidth: number,
    bellHeight: number,
    color: number,
  ): void {
    const armCount = 4;

    for (let i = 0; i < armCount; i += 1) {
      const ratio = (i / (armCount - 1)) * 2 - 1;
      const sway = Math.sin(this.time.now * 0.004 + i) * bellWidth * 0.04;
      const startX = x + ratio * bellWidth * 0.16;
      const endY = y + bellHeight * 0.62 + Math.abs(ratio) * 10;

      graphics.lineStyle(6, color, 0.52);
      const armCurve = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(startX, y),
        new Phaser.Math.Vector2(startX + sway, y + bellHeight * 0.28),
        new Phaser.Math.Vector2(startX + sway * 1.4, endY),
      );
      graphics.strokePoints(armCurve.getPoints(14), false, false);
    }
  }

  /**
   * Codex: 長い触手群を複数本描いてクラゲらしいシルエットを作る。
   */
  private drawTentacles(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    bellWidth: number,
    scale: number,
    color: number,
    phase: number,
  ): void {
    const tentacleCount = 10;
    const length = 120 * scale;

    for (let i = 0; i < tentacleCount; i += 1) {
      const ratio = i / (tentacleCount - 1);
      const spread = (ratio - 0.5) * bellWidth * 0.72;
      const sway = Math.sin(this.time.now * 0.003 + phase * 1.3 + i * 0.7) * 14 * scale;
      const sway2 = Math.cos(this.time.now * 0.004 + phase + i * 0.42) * 9 * scale;
      const thickness = Phaser.Math.Linear(2.6, 1.1, ratio);

      graphics.lineStyle(thickness, color, 0.55);
      const tentacleCurve = new Phaser.Curves.CubicBezier(
        new Phaser.Math.Vector2(x + spread, y),
        new Phaser.Math.Vector2(x + spread + sway, y + length * 0.34),
        new Phaser.Math.Vector2(x + spread - sway2, y + length * 0.68),
        new Phaser.Math.Vector2(x + spread + sway * 0.45, y + length),
      );
      graphics.strokePoints(tentacleCurve.getPoints(16), false, false);
    }
  }

  /**
   * Codex: 色相インデックスに応じてクラゲの発光色セットを返す。
   */
  private pickJellyColor(hue: number): { bell: number; arm: number; tentacle: number; glow: number } {
    const palettes = [
      { bell: 0x8fe8ff, arm: 0xb8f7ff, tentacle: 0xb6f2ff, glow: 0x47d6ff },
      { bell: 0xd8a8ff, arm: 0xefc9ff, tentacle: 0xf5d8ff, glow: 0xc163ff },
      { bell: 0x95ffd8, arm: 0xc6ffe9, tentacle: 0xaefee2, glow: 0x39dba2 },
    ] as const;

    return palettes[hue] ?? palettes[0];
  }
}

new Phaser.Game(createConfig([SummaryScene]));
