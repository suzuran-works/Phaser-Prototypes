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
  homeCellIndex: number | null;
  phase: number;
};

type HiveCell = {
  world: WorldPoint;
  honey: number;
};

type SceneLayout = {
  width: number;
  height: number;
  originX: number;
  originY: number;
  quarterTileW: number;
  quarterTileH: number;
  flowerPatch: WorldPoint;
  hiveCenter: WorldPoint;
  uiScale: number;
};

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts23SummaryScene';

  private layout: SceneLayout = {
    width: 1080,
    height: 1080,
    originX: 540,
    originY: 190,
    quarterTileW: 74,
    quarterTileH: 37,
    flowerPatch: { x: 0, y: 10 },
    hiveCenter: { x: 0, y: 0 },
    uiScale: 1,
  };

  private bees: BeeAgent[] = [];

  private cells: HiveCell[] = [];

  private graphics!: Phaser.GameObjects.Graphics;

  private titleText!: Phaser.GameObjects.Text;

  private statusText!: Phaser.GameObjects.Text;

  private expansionTimer = 0;

  private birthTimer = 0;

  private flowerOffsets: WorldPoint[] = [];

  /**
   * Codex: クォータービューの蜂の巣観察シーンを初期化する。
   */
  public constructor() {
    super(SummaryScene.key);
  }

  /**
   * Codex: 描画オブジェクトと蜂エージェントを生成し、レスポンシブ描画を開始する。
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
      fontSize: '22px',
      color: '#3f3f46',
      align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5, 0);

    this.cells = this.createHiveCells(4, 5);
    this.bees = this.createBees(10);
    this.flowerOffsets = this.createFlowerOffsets(14);
    this.bindResponsiveLayout();
  }

  /**
   * Codex: 蜂の移動・採蜜・産卵進行を更新し、毎フレーム再描画する。
   */
  public update(time: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    const flower = this.layout.flowerPatch;

    this.bees.forEach((bee) => {
      const target = bee.carryingNectar ? this.cells[bee.homeCellIndex ?? 0]?.world ?? this.layout.hiveCenter : flower;
      const dx = target.x - bee.world.x;
      const dy = target.y - bee.world.y;
      const distance = Math.hypot(dx, dy) + 0.0001;
      const swayX = Math.sin(time * 0.002 + bee.phase) * 0.7;
      const swayY = Math.cos(time * 0.0016 + bee.phase) * 0.5;

      // Codex: 目標方向へ向かう速度に緩やかな揺らぎを重ねて自然な飛行感を作る。
      bee.velocity.x += (dx / distance) * dt * 9 + swayX * dt;
      bee.velocity.y += (dy / distance) * dt * 9 + swayY * dt;
      bee.velocity.x *= 0.9;
      bee.velocity.y *= 0.9;

      bee.world.x += bee.velocity.x * dt * 5.2;
      bee.world.y += bee.velocity.y * dt * 5.2;

      if (!bee.carryingNectar && distance < 0.85) {
        bee.carryingNectar = true;
        bee.homeCellIndex = this.pickDepositableCell();
      } else if (bee.carryingNectar && distance < 0.8) {
        bee.carryingNectar = false;
        this.depositNectar(bee.homeCellIndex);
        bee.homeCellIndex = null;
      }
    });

    this.updateExpansion(dt);
    this.updateBirth(dt);
    this.drawScene();
  }

  /**
   * Codex: 表示サイズに応じたクォータービュー投影パラメータを算出する。
   */
  protected computeLayout(width: number, height: number): SceneLayout {
    const tileW = Math.max(52, Math.round(Math.min(width, height) * 0.07));
    const tileH = Math.max(26, Math.round(tileW * 0.5));
    const uiScale = Math.max(0.75, Math.min(1.2, width / 1080));

    return {
      width,
      height,
      originX: width * 0.5,
      originY: height * 0.22,
      quarterTileW: tileW,
      quarterTileH: tileH,
      flowerPatch: { x: 0, y: 10.5 },
      hiveCenter: { x: 0, y: 1.2 },
      uiScale,
    };
  }

  /**
   * Codex: レイアウト更新時にUIと巣セルの配置を再計算する。
   */
  protected renderLayout(layout: SceneLayout): void {
    this.layout = layout;

    this.titleText.setPosition(layout.width * 0.5, 20 * layout.uiScale);
    this.titleText.setFontSize(30 * layout.uiScale);

    this.statusText.setPosition(layout.width * 0.5, 66 * layout.uiScale);
    this.statusText.setFontSize(20 * layout.uiScale);

    this.cells = this.createHiveCells(4, 5);
    if (this.bees.length === 0) {
      this.bees = this.createBees(10);
    }

    this.drawScene();
  }

  /**
   * Codex: クォータービュー用の2D座標にワールド座標を投影する。
   */
  private project(point: WorldPoint): ProjectedPoint {
    return {
      x: this.layout.originX + (point.x - point.y) * (this.layout.quarterTileW * 0.5),
      y: this.layout.originY + (point.x + point.y) * (this.layout.quarterTileH * 0.5),
    };
  }

  /**
   * Codex: 蜂の巣セルをワールド座標で生成する。
   */
  private createHiveCells(rows: number, cols: number): HiveCell[] {
    const cells: HiveCell[] = [];
    const spacing = 1.08;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const wx = (col - (cols - 1) / 2) * spacing + (row % 2 === 0 ? 0 : spacing * 0.5);
        const wy = (row - (rows - 1) / 2) * spacing + this.layout.hiveCenter.y;
        cells.push({ world: { x: wx, y: wy }, honey: this.cells[cells.length]?.honey ?? 0 });
      }
    }

    return cells;
  }

  /**
   * Codex: 花畑付近へ蜂エージェントを初期配置する。
   */
  private createBees(count: number): BeeAgent[] {
    return Array.from({ length: count }, (_, index) => {
      const angle = (index / count) * Math.PI * 2;
      return {
        world: {
          x: this.layout.flowerPatch.x + Math.cos(angle) * 1.8,
          y: this.layout.flowerPatch.y + Math.sin(angle) * 0.9,
        },
        velocity: { x: 0, y: 0 },
        carryingNectar: false,
        homeCellIndex: null,
        phase: Math.random() * Math.PI * 2,
      };
    });
  }

  /**
   * Codex: 蜜を格納できる巣穴インデックスをランダムに選ぶ。
   */
  private pickDepositableCell(): number | null {
    const candidates = this.cells
      .map((cell, index) => ({ cell, index }))
      .filter(({ cell }) => cell.honey < 1)
      .map(({ index }) => index);

    if (candidates.length === 0) {
      return null;
    }

    return Phaser.Utils.Array.GetRandom(candidates);
  }

  /**
   * Codex: 巣穴へ蜜を搬入し、充填率を進める。
   */
  private depositNectar(cellIndex: number | null): void {
    if (cellIndex === null || !this.cells[cellIndex]) {
      return;
    }
    this.cells[cellIndex].honey = Math.min(1, this.cells[cellIndex].honey + 0.25);
  }

  /**
   * Codex: すべての巣穴が満杯になったら一定周期で増築する。
   */
  private updateExpansion(dt: number): void {
    if (!this.cells.every((cell) => cell.honey >= 1)) {
      this.expansionTimer = 0;
      return;
    }

    this.expansionTimer += dt;
    if (this.expansionTimer < 6.5) {
      return;
    }

    this.expansionTimer = 0;
    const rows = 4 + Math.min(4, Math.floor(this.cells.length / 20));
    const cols = 5 + Math.min(4, Math.floor(this.cells.length / 24));
    this.cells = this.createHiveCells(rows, cols);
  }

  /**
   * Codex: 満杯セルから定期的に蜂を誕生させ、セルを空に戻す。
   */
  private updateBirth(dt: number): void {
    const matured = this.cells
      .map((cell, index) => ({ cell, index }))
      .filter(({ cell }) => cell.honey >= 1)
      .map(({ index }) => index);

    if (matured.length === 0) {
      this.birthTimer = 0;
      return;
    }

    this.birthTimer += dt;
    if (this.birthTimer < 2.4) {
      return;
    }

    this.birthTimer = 0;
    const bornIndex = Phaser.Utils.Array.GetRandom(matured);
    this.cells[bornIndex].honey = 0;

    const spawn = this.cells[bornIndex].world;
    this.bees.push({
      world: { x: spawn.x, y: spawn.y + 0.3 },
      velocity: { x: 0, y: 0 },
      carryingNectar: false,
      homeCellIndex: null,
      phase: Math.random() * Math.PI * 2,
    });
  }

  /**
   * Codex: クォータービュー地面・巣・花・蜂をまとめて描画する。
   */
  private drawScene(): void {
    const g = this.graphics;
    g.clear();

    this.drawGroundPlane();
    this.drawFlowerPatch();

    const sortedCells = [...this.cells].sort((a, b) => (a.world.x + a.world.y) - (b.world.x + b.world.y));
    sortedCells.forEach((cell) => {
      this.drawHiveCell(cell);
    });

    const sortedBees = [...this.bees].sort((a, b) => (a.world.x + a.world.y) - (b.world.x + b.world.y));
    sortedBees.forEach((bee) => {
      this.drawBee(bee);
    });

    const filled = this.cells.filter((cell) => cell.honey >= 1).length;
    this.statusText.setText(`蜂の数: ${this.bees.length}匹\n満杯の巣穴: ${filled}/${this.cells.length}`);
  }

  /**
   * Codex: クォータービューの地面グリッドを描画する。
   */
  private drawGroundPlane(): void {
    const g = this.graphics;
    for (let gy = -2; gy <= 15; gy += 1) {
      for (let gx = -8; gx <= 8; gx += 1) {
        const p = this.project({ x: gx, y: gy });
        const halfW = this.layout.quarterTileW * 0.5;
        const halfH = this.layout.quarterTileH * 0.5;
        const tint = (gx + gy) % 2 === 0 ? 0xfffbeb : 0xfef3c7;

        g.fillStyle(tint, 0.95);
        g.beginPath();
        g.moveTo(p.x, p.y - halfH);
        g.lineTo(p.x + halfW, p.y);
        g.lineTo(p.x, p.y + halfH);
        g.lineTo(p.x - halfW, p.y);
        g.closePath();
        g.fillPath();
      }
    }
  }


  /**
   * Codex: 花畑に使うランダムオフセットを固定生成する。
   */
  private createFlowerOffsets(count: number): WorldPoint[] {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 2.2,
      y: (Math.random() - 0.5) * 1.4,
    }));
  }

  /**
   * Codex: 花畑エリアをクォータービューで描画する。
   */
  private drawFlowerPatch(): void {
    const g = this.graphics;
    const center = this.project(this.layout.flowerPatch);

    g.fillStyle(0x86efac, 0.85);
    g.fillEllipse(center.x, center.y, this.layout.quarterTileW * 3.4, this.layout.quarterTileH * 2.1);

    this.flowerOffsets.forEach((offset, index) => {
      const jitter = this.project({
        x: this.layout.flowerPatch.x + offset.x,
        y: this.layout.flowerPatch.y + offset.y,
      });

      g.fillStyle(index % 2 === 0 ? 0xf472b6 : 0xfde047, 0.9);
      g.fillCircle(jitter.x, jitter.y, Math.max(2, this.layout.quarterTileH * 0.11));
    });
  }

  /**
   * Codex: 蜂の巣セルをハニカム風に描画する。
   */
  private drawHiveCell(cell: HiveCell): void {
    const g = this.graphics;
    const center = this.project(cell.world);
    const radius = this.layout.quarterTileH * 0.52;

    g.fillStyle(0xd97706, 0.9);
    g.beginPath();
    for (let side = 0; side < 6; side += 1) {
      const angle = -Math.PI / 2 + side * (Math.PI / 3);
      const px = center.x + Math.cos(angle) * radius;
      const py = center.y + Math.sin(angle) * radius;
      if (side === 0) {
        g.moveTo(px, py);
      } else {
        g.lineTo(px, py);
      }
    }
    g.closePath();
    g.fillPath();

    if (cell.honey > 0) {
      g.fillStyle(0xfbbf24, 0.75);
      g.fillEllipse(center.x, center.y + radius * 0.1, radius * 1.1, radius * 0.65 * cell.honey);
    }
  }

  /**
   * Codex: 蜂を楕円と帯模様で描画する。
   */
  private drawBee(bee: BeeAgent): void {
    const g = this.graphics;
    const center = this.project(bee.world);
    const bodyW = this.layout.quarterTileH * 0.7;
    const bodyH = this.layout.quarterTileH * 0.42;

    g.fillStyle(0xfef08a, 1);
    g.fillEllipse(center.x, center.y, bodyW, bodyH);

    g.lineStyle(Math.max(1, this.layout.uiScale * 1.5), 0x111827, 0.9);
    g.beginPath();
    g.moveTo(center.x - bodyW * 0.18, center.y - bodyH * 0.4);
    g.lineTo(center.x - bodyW * 0.18, center.y + bodyH * 0.4);
    g.moveTo(center.x + bodyW * 0.1, center.y - bodyH * 0.4);
    g.lineTo(center.x + bodyW * 0.1, center.y + bodyH * 0.4);
    g.strokePath();

    g.fillStyle(0xdbeafe, bee.carryingNectar ? 0.9 : 0.65);
    g.fillEllipse(center.x - bodyW * 0.2, center.y - bodyH * 0.75, bodyW * 0.45, bodyH * 0.5);
    g.fillEllipse(center.x + bodyW * 0.2, center.y - bodyH * 0.75, bodyW * 0.45, bodyH * 0.5);
  }
}

new Phaser.Game(createConfig([SummaryScene]));
