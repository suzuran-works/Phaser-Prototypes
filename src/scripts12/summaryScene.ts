import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BaseResponsiveScene } from '../baseResponsiveScene.ts';
import { BACKGROUND_COLOR, SUBTITLE, TITLE } from './define.ts';

type GeometrySeed = {
  level: number;
  energy: number;
  age: number;
  phase: number;
  hue: number;
  spin: number;
  body: Phaser.GameObjects.Polygon;
  core: Phaser.GameObjects.Arc;
  aura: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
};

type EvolutionEcho = {
  sprite: Phaser.GameObjects.Polygon;
  angle: number;
  distance: number;
  drift: number;
};

type SceneLayout = {
  width: number;
  height: number;
  titleY: number;
  subtitleY: number;
  statusY: number;
  fieldX: number;
  fieldY: number;
  fieldWidth: number;
  fieldHeight: number;
};

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts12SummaryScene';

  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private fieldFrame!: Phaser.GameObjects.Rectangle;

  private seed!: GeometrySeed;
  private echoes: EvolutionEcho[] = [];
  private observationScore = 0;
  private evolveProgress = 0;

  /**
   * Codex: 単一幾何学の芸術進化シーンを初期化する。
   */
  public constructor() {
    super(SummaryScene.key);
  }

  /**
   * Codex: UIと観察フィールドを生成し、進化対象を配置する。
   */
  public create(): void {
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);

    this.titleText = this.add.text(0, 0, TITLE, {
      fontFamily: 'sans-serif',
      fontSize: '42px',
      color: '#dbeafe',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    this.subtitleText = this.add.text(0, 0, SUBTITLE, {
      fontFamily: 'sans-serif',
      fontSize: '23px',
      color: '#93c5fd',
    }).setOrigin(0.5, 0);

    this.statusText = this.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#bfdbfe',
      align: 'center',
      lineSpacing: 7,
    }).setOrigin(0.5, 0);

    this.fieldFrame = this.add.rectangle(0, 0, 100, 100, 0x0b2538, 0.86)
      .setStrokeStyle(4, 0x60a5fa, 0.8)
      .setOrigin(0, 0);

    this.createSingleGeometry();
    this.bindResponsiveLayout();

    this.input.on('pointerdown', () => {
      this.feedEvolution(20);
      this.observationScore += 12;
    });
  }

  /**
   * Codex: 幾何学の脈動・回転・進化判定とステータス更新を実行する。
   */
  public update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.05);

    this.seed.age += dt;
    this.seed.phase += dt * 1.5;
    this.seed.energy = Math.min(100, this.seed.energy + dt * (8 + this.seed.level));
    this.seed.spin += dt * (0.08 + this.seed.level * 0.01);

    if (this.seed.energy >= 100) {
      this.evolveSeed();
    }

    this.evolveProgress = Phaser.Math.Clamp(this.evolveProgress - dt * 6, 0, 100);
    this.observationScore += dt * (this.seed.level * 2.6);

    this.renderSeed();
    this.renderEchoes(dt);

    this.statusText.setText([
      `観察スコア: ${Math.floor(this.observationScore)}   進化共鳴: ${Math.floor(this.evolveProgress)}%`,
      `段階: ${this.seed.level}   エネルギー: ${Math.floor(this.seed.energy)}   クリック: 進化を促進`,
      '単一幾何学が脈動・回転・色彩変化を重ね、芸術的に進化する',
    ]);
  }

  /**
   * Codex: 画面サイズに応じてUIと観察フィールドの配置を算出する。
   */
  protected computeLayout(width: number, height: number): SceneLayout {
    const fieldWidth = Math.min(width * 0.82, 880);
    const fieldHeight = Math.min(height * 0.66, 740);
    return {
      width,
      height,
      titleY: Math.max(12, height * 0.025),
      subtitleY: Math.max(56, height * 0.078),
      statusY: Math.max(92, height * 0.13),
      fieldX: (width - fieldWidth) * 0.5,
      fieldY: Math.max(height * 0.23, 170),
      fieldWidth,
      fieldHeight,
    };
  }

  /**
   * Codex: レイアウト反映と進化体の座標補正を行う。
   */
  protected renderLayout(layout: SceneLayout): void {
    const titleSize = Math.max(28, Math.floor(Math.min(layout.width, layout.height) * 0.041));
    const subSize = Math.max(16, Math.floor(Math.min(layout.width, layout.height) * 0.022));
    const statusSize = Math.max(13, Math.floor(Math.min(layout.width, layout.height) * 0.02));

    this.titleText.setPosition(layout.width * 0.5, layout.titleY).setFontSize(titleSize);
    this.subtitleText.setPosition(layout.width * 0.5, layout.subtitleY).setFontSize(subSize);
    this.statusText.setPosition(layout.width * 0.5, layout.statusY).setFontSize(statusSize);

    this.fieldFrame
      .setPosition(layout.fieldX, layout.fieldY)
      .setSize(layout.fieldWidth, layout.fieldHeight);

    const center = this.getFieldCenter();
    this.seed.body.setPosition(center.x, center.y);
    this.seed.aura.setPosition(center.x, center.y);
    this.seed.core.setPosition(center.x, center.y);
    this.seed.label.setPosition(center.x, center.y + 84);
  }

  /**
   * Codex: 単一の進化幾何学オブジェクトを生成する。
   */
  private createSingleGeometry(): void {
    const center = this.getFieldCenter();
    const body = this.add.polygon(center.x, center.y, this.createMorphPoints(3, 56, 0, 0), 0xffffff, 0.94)
      .setStrokeStyle(2, 0xe0f2fe, 0.9);
    const aura = this.add.circle(center.x, center.y, 74, 0x000000, 0).setStrokeStyle(3, 0x93c5fd, 0.75);
    const core = this.add.circle(center.x, center.y, 10, 0xf8fafc, 0.9).setStrokeStyle(2, 0x7dd3fc, 0.8);
    const label = this.add.text(center.x, center.y + 84, '', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#dbeafe',
    }).setOrigin(0.5, 0);

    this.seed = {
      level: 1,
      energy: 45,
      age: 0,
      phase: 0,
      hue: 205,
      spin: 0,
      body,
      aura,
      core,
      label,
    };

    this.renderSeed();
  }

  /**
   * Codex: 進化エネルギーを加算して共鳴演出を強める。
   */
  private feedEvolution(amount: number): void {
    this.seed.energy = Math.min(100, this.seed.energy + amount);
    this.evolveProgress = Math.min(100, this.evolveProgress + amount * 1.6);
    this.seed.aura.setStrokeStyle(4, 0xfcd34d, 0.95);
    this.time.delayedCall(150, () => {
      this.seed.aura.setStrokeStyle(3, 0x93c5fd, 0.75);
    });
  }

  /**
   * Codex: 閾値到達時に幾何学段階を上げ、残響図形を生成する。
   */
  private evolveSeed(): void {
    this.seed.energy = 30;
    this.seed.level = Math.min(18, this.seed.level + 1);
    this.seed.hue = (this.seed.hue + Phaser.Math.Between(18, 35)) % 360;
    this.evolveProgress = 100;
    this.observationScore += this.seed.level * 18;

    const center = this.getFieldCenter();
    const sides = this.getSeedSides();
    const echo = this.add.polygon(center.x, center.y, this.createMorphPoints(sides, 42, this.seed.phase, 0.25), 0xffffff, 0.22)
      .setStrokeStyle(2, 0xffffff, 0.45);

    this.echoes.push({
      sprite: echo,
      angle: Phaser.Math.FloatBetween(0, Math.PI * 2),
      distance: Phaser.Math.Between(34, 108),
      drift: Phaser.Math.FloatBetween(0.3, 0.9),
    });

    if (this.echoes.length > 9) {
      const oldest = this.echoes.shift();
      oldest?.sprite.destroy();
    }
  }

  /**
   * Codex: 単一幾何学の見た目を現在状態に合わせて描画する。
   */
  private renderSeed(): void {
    const center = this.getFieldCenter();
    const sides = this.getSeedSides();
    const radius = 44 + this.seed.level * 2.8;
    const pulse = 1 + Math.sin(this.seed.age * 2.4) * 0.14;
    const fill = Phaser.Display.Color.HSLToColor(this.seed.hue / 360, 0.72, 0.58).color;

    this.seed.body
      .setPosition(center.x, center.y)
      .setTo(this.createMorphPoints(sides, radius * pulse, this.seed.phase + this.seed.spin, 0.18))
      .setFillStyle(fill, 0.92)
      .setStrokeStyle(3, 0xe2e8f0, 0.92)
      .setRotation(this.seed.spin * 0.7);

    this.seed.aura
      .setPosition(center.x, center.y)
      .setRadius(radius * 1.35)
      .setStrokeStyle(3, fill, 0.58);

    this.seed.core
      .setPosition(center.x, center.y)
      .setRadius(8 + this.seed.level * 0.5)
      .setFillStyle(fill, 0.78);

    this.seed.label
      .setPosition(center.x, center.y + radius + 26)
      .setText(`Stage.${this.seed.level}  Sides:${sides}  Energy:${Math.floor(this.seed.energy)}`);
  }

  /**
   * Codex: 進化残響図形をゆっくり公転させて芸術的な軌跡を描く。
   */
  private renderEchoes(dt: number): void {
    const center = this.getFieldCenter();
    const maxDistance = Math.min(this.fieldFrame.width, this.fieldFrame.height) * 0.36;

    this.echoes.forEach((echo, index) => {
      echo.angle += dt * echo.drift;
      echo.distance = Math.min(maxDistance, echo.distance + dt * 7);
      const x = center.x + Math.cos(echo.angle + this.seed.spin) * echo.distance;
      const y = center.y + Math.sin(echo.angle + this.seed.spin) * echo.distance;
      const alpha = Phaser.Math.Clamp(0.5 - index * 0.05, 0.12, 0.5);
      const sides = Math.max(3, this.getSeedSides() - index % 3);

      echo.sprite
        .setPosition(x, y)
        .setTo(this.createMorphPoints(sides, 16 + index * 2.4, this.seed.phase + index * 0.2, 0.1))
        .setRotation(-this.seed.spin * 0.6 + index * 0.1)
        .setAlpha(alpha);
    });
  }

  /**
   * Codex: 進化段階から現在の辺数を算出する。
   */
  private getSeedSides(): number {
    return Phaser.Math.Clamp(3 + Math.floor(this.seed.level / 2), 3, 12);
  }

  /**
   * Codex: 有機的なうねりを持つ多角形ポイント列を返す。
   */
  private createMorphPoints(sides: number, radius: number, phase: number, wobble: number): number[] {
    const points: number[] = [];
    for (let index = 0; index < sides; index += 1) {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / sides;
      const wave = 1 + Math.sin(phase + index * 1.3) * wobble;
      points.push(Math.cos(angle) * radius * wave, Math.sin(angle) * radius * wave);
    }
    return points;
  }

  /**
   * Codex: 観察フィールド中心座標を返す。
   */
  private getFieldCenter(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      this.fieldFrame.x + this.fieldFrame.width * 0.5,
      this.fieldFrame.y + this.fieldFrame.height * 0.5,
    );
  }
}

new Phaser.Game(createConfig([SummaryScene]));
