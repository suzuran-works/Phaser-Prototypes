import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BaseResponsiveScene } from '../baseResponsiveScene.ts';
import { BACKGROUND_COLOR, SUBTITLE, TITLE } from './define.ts';

type WorldPoint = {
  x: number;
  y: number;
};

type ProjectedPoint = {
  x: number;
  y: number;
};

type BeeAgent = {
  world: WorldPoint;
  velocity: WorldPoint;
  carryingNectar: boolean;
  holeIndex: number;
  phase: number;
};

type HiveHole = {
  world: WorldPoint;
  nectar: number;
};

type SceneLayout = {
  width: number;
  height: number;
  originX: number;
  originY: number;
  tileW: number;
  tileH: number;
  uiScale: number;
};

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts24SummaryScene';

  private readonly gridSize = 10;

  private readonly flowerWorld = { x: 8, y: 8 };

  private readonly hiveCenter = { x: 2, y: 2 };

  private layout: SceneLayout = {
    width: 1080,
    height: 1080,
    originX: 540,
    originY: 210,
    tileW: 70,
    tileH: 35,
    uiScale: 1,
  };

  private graphics!: Phaser.GameObjects.Graphics;

  private titleText!: Phaser.GameObjects.Text;

  private statusText!: Phaser.GameObjects.Text;

  private bees: BeeAgent[] = [];

  private holes: HiveHole[] = [];

  private beeTexts: Phaser.GameObjects.Text[] = [];

  private flowerTexts: Phaser.GameObjects.Text[] = [];

  private flowerOffsets: WorldPoint[] = [];

  /**
   * Codex: 絵文字版の蜂ゲームシーンを初期化する。
   */
  public constructor() {
    super(SummaryScene.key);
  }

  /**
   * Codex: 描画オブジェクトとゲーム要素を生成する。
   */
  public create(): void {
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);
    this.graphics = this.add.graphics();

    this.titleText = this.add.text(0, 0, `${TITLE} - ${SUBTITLE}`, {
      fontFamily: 'sans-serif',
      fontSize: '30px',
      color: '#78350f',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    this.statusText = this.add.text(0, 0, '', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#3f3f46',
      align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5, 0);

    this.holes = this.createHiveHoles();
    this.bees = this.createBees(8);

    this.beeTexts = this.bees.map(() => this.add.text(0, 0, '🐝', { fontFamily: 'sans-serif' }).setOrigin(0.5, 0.6));
    this.flowerOffsets = this.createFlowerOffsets();
    this.flowerTexts = this.flowerOffsets.map(() => this.add.text(0, 0, '🌹', { fontFamily: 'sans-serif' }).setOrigin(0.5));

    this.bindResponsiveLayout();
  }

  /**
   * Codex: 蜂の移動と採蜜を更新し、画面を再描画する。
   */
  public update(time: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);

    this.bees.forEach((bee) => {
      const target = bee.carryingNectar ? this.holes[bee.holeIndex].world : this.flowerWorld;
      const dx = target.x - bee.world.x;
      const dy = target.y - bee.world.y;
      const distance = Math.hypot(dx, dy) + 0.0001;
      const sway = Math.sin(time * 0.0015 + bee.phase) * 0.5;

      // Codex: 目標方向の速度と微小な揺れを合成し、蜂の飛行を自然に見せる。
      bee.velocity.x += (dx / distance) * dt * 10 + sway * dt;
      bee.velocity.y += (dy / distance) * dt * 10 - sway * dt;
      bee.velocity.x *= 0.9;
      bee.velocity.y *= 0.9;

      bee.world.x = Phaser.Math.Clamp(bee.world.x + bee.velocity.x * dt * 5, 0, this.gridSize - 1);
      bee.world.y = Phaser.Math.Clamp(bee.world.y + bee.velocity.y * dt * 5, 0, this.gridSize - 1);

      if (!bee.carryingNectar && distance < 0.8) {
        bee.carryingNectar = true;
      } else if (bee.carryingNectar && distance < 0.7) {
        bee.carryingNectar = false;
        this.holes[bee.holeIndex].nectar = Math.min(1, this.holes[bee.holeIndex].nectar + 0.2);
      }
    });

    this.drawScene();
  }

  /**
   * Codex: 表示サイズに合わせたクォータービュー座標を計算する。
   */
  protected computeLayout(width: number, height: number): SceneLayout {
    const tileW = Math.max(54, Math.round(Math.min(width, height) * 0.066));
    const tileH = Math.max(27, Math.round(tileW * 0.5));
    const uiScale = Math.max(0.75, Math.min(1.2, width / 1080));

    return {
      width,
      height,
      originX: width * 0.5,
      originY: height * 0.18,
      tileW,
      tileH,
      uiScale,
    };
  }

  /**
   * Codex: レイアウト更新時にUIスケールと再描画を反映する。
   */
  protected renderLayout(layout: SceneLayout): void {
    this.layout = layout;

    this.titleText.setPosition(layout.width * 0.5, 18 * layout.uiScale);
    this.titleText.setFontSize(30 * layout.uiScale);

    this.statusText.setPosition(layout.width * 0.5, 62 * layout.uiScale);
    this.statusText.setFontSize(20 * layout.uiScale);

    const beeFontSize = `${Math.max(20, Math.round(layout.tileH * 0.9))}px`;
    this.beeTexts.forEach((beeText) => {
      beeText.setFontSize(beeFontSize);
    });

    const flowerFontSize = `${Math.max(16, Math.round(layout.tileH * 0.72))}px`;
    this.flowerTexts.forEach((flowerText) => {
      flowerText.setFontSize(flowerFontSize);
    });

    this.drawScene();
  }

  /**
   * Codex: ワールド座標をクォータービュー座標へ投影する。
   */
  private project(point: WorldPoint): ProjectedPoint {
    return {
      x: this.layout.originX + (point.x - point.y) * (this.layout.tileW * 0.5),
      y: this.layout.originY + (point.x + point.y) * (this.layout.tileH * 0.5),
    };
  }

  /**
   * Codex: 巣穴の配置を生成する。
   */
  private createHiveHoles(): HiveHole[] {
    const holes: HiveHole[] = [];
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        holes.push({
          world: {
            x: this.hiveCenter.x + (col - 1.5) * 0.8,
            y: this.hiveCenter.y + (row - 1) * 0.8,
          },
          nectar: 0,
        });
      }
    }
    return holes;
  }

  /**
   * Codex: 花畑起点に蜂エージェントを生成する。
   */
  private createBees(count: number): BeeAgent[] {
    return Array.from({ length: count }, (_, index) => {
      const angle = (index / count) * Math.PI * 2;
      return {
        world: {
          x: this.flowerWorld.x + Math.cos(angle) * 0.7,
          y: this.flowerWorld.y + Math.sin(angle) * 0.7,
        },
        velocity: { x: 0, y: 0 },
        carryingNectar: false,
        holeIndex: index % this.holes.length,
        phase: Math.random() * Math.PI * 2,
      };
    });
  }

  /**
   * Codex: 花絵文字のランダムオフセットを生成する。
   */
  private createFlowerOffsets(): WorldPoint[] {
    return Array.from({ length: 10 }, () => ({
      x: this.flowerWorld.x + (Math.random() - 0.5) * 1.8,
      y: this.flowerWorld.y + (Math.random() - 0.5) * 1.6,
    }));
  }

  /**
   * Codex: 地面・巣穴・絵文字をまとめて再描画する。
   */
  private drawScene(): void {
    this.graphics.clear();
    this.drawGround();
    this.drawHive();
    this.drawFlowers();
    this.drawBees();

    const filled = this.holes.filter((hole) => hole.nectar >= 1).length;
    this.statusText.setText(`🐝 ${this.bees.length}匹 / 🌹 花畑あり\n満杯の巣穴: ${filled}/${this.holes.length}`);
  }

  /**
   * Codex: 10x10のクォータービュー地面を描画する。
   */
  private drawGround(): void {
    for (let y = 0; y < this.gridSize; y += 1) {
      for (let x = 0; x < this.gridSize; x += 1) {
        const p = this.project({ x, y });
        const halfW = this.layout.tileW * 0.5;
        const halfH = this.layout.tileH * 0.5;
        const tint = (x + y) % 2 === 0 ? 0xfef3c7 : 0xfef9c3;

        this.graphics.fillStyle(tint, 0.95);
        this.graphics.beginPath();
        this.graphics.moveTo(p.x, p.y - halfH);
        this.graphics.lineTo(p.x + halfW, p.y);
        this.graphics.lineTo(p.x, p.y + halfH);
        this.graphics.lineTo(p.x - halfW, p.y);
        this.graphics.closePath();
        this.graphics.fillPath();
      }
    }
  }

  /**
   * Codex: 図形オブジェクトで巣穴を描画する。
   */
  private drawHive(): void {
    this.holes.forEach((hole) => {
      const p = this.project(hole.world);
      const radius = this.layout.tileH * 0.45;

      this.graphics.fillStyle(0xd97706, 0.95);
      this.graphics.fillEllipse(p.x, p.y, radius * 1.7, radius * 1.2);

      this.graphics.fillStyle(0x451a03, 0.9);
      this.graphics.fillEllipse(p.x, p.y + radius * 0.05, radius * 0.95, radius * 0.55);

      if (hole.nectar > 0) {
        this.graphics.fillStyle(0xfacc15, 0.88);
        this.graphics.fillEllipse(p.x, p.y + radius * 0.05, radius * 0.95, radius * 0.55 * hole.nectar);
      }
    });
  }

  /**
   * Codex: 🌹の絵文字を花畑位置に配置する。
   */
  private drawFlowers(): void {
    this.flowerTexts.forEach((flowerText, index) => {
      const p = this.project(this.flowerOffsets[index]);
      flowerText.setPosition(p.x, p.y);
    });
  }

  /**
   * Codex: 🐝の絵文字を蜂エージェント位置に配置する。
   */
  private drawBees(): void {
    this.beeTexts.forEach((beeText, index) => {
      const bee = this.bees[index];
      const p = this.project(bee.world);
      beeText.setPosition(p.x, p.y);
      beeText.setAlpha(bee.carryingNectar ? 1 : 0.92);
    });
  }
}

new Phaser.Game(createConfig([SummaryScene]));
