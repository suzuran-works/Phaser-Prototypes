import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BaseResponsiveScene } from '../baseResponsiveScene.ts';
import { BACKGROUND_COLOR, SUBTITLE, TITLE } from './define.ts';

type HiveCell = {
  x: number;
  y: number;
  size: number;
  built: boolean;
};

type BeeAgent = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  carryingWax: boolean;
};

type SceneLayout = {
  width: number;
  height: number;
  hiveX: number;
  hiveY: number;
  hiveCellSize: number;
  flowerY: number;
};

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts10SummaryScene';

  private layout: SceneLayout = {
    width: 1080,
    height: 1080,
    hiveX: 540,
    hiveY: 380,
    hiveCellSize: 34,
    flowerY: 820,
  };

  private graphics!: Phaser.GameObjects.Graphics;

  private titleText!: Phaser.GameObjects.Text;

  private statusText!: Phaser.GameObjects.Text;

  private cells: HiveCell[] = [];

  private bees: BeeAgent[] = [];

  private builtCount = 0;

  /**
   * GPT-5.3-Codex: 蜂の巣観察シーンを初期化する。
   */
  public constructor() {
    super(SummaryScene.key);
  }

  /**
   * GPT-5.3-Codex: 描画オブジェクトと蜂エージェントを生成してレスポンシブ描画を開始する。
   */
  public create(): void {
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);

    this.graphics = this.add.graphics();
    this.titleText = this.add.text(0, 0, `${TITLE} - ${SUBTITLE}`, {
      fontFamily: 'sans-serif',
      fontSize: '32px',
      color: '#1e3a8a',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    this.statusText = this.add.text(0, 0, '', {
      fontFamily: 'sans-serif',
      fontSize: '22px',
      color: '#1f2937',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5, 0);

    this.cells = this.createHexCells(4, 5);
    this.bees = this.createBees(9);

    this.bindResponsiveLayout();
  }

  /**
   * GPT-5.3-Codex: 蜂の移動更新と巣作り進行を行い、毎フレーム再描画する。
   */
  public update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.05);

    this.bees.forEach((bee) => {
      const targetX = bee.carryingWax ? this.layout.hiveX : this.layout.width * 0.5;
      const targetY = bee.carryingWax ? this.layout.hiveY : this.layout.flowerY;
      const dx = targetX - bee.x;
      const dy = targetY - bee.y;
      const distance = Math.hypot(dx, dy) + 1e-6;

      bee.vx += (dx / distance) * dt * 180;
      bee.vy += (dy / distance) * dt * 180;
      bee.vx *= 0.92;
      bee.vy *= 0.92;

      bee.x += bee.vx * dt * 60;
      bee.y += bee.vy * dt * 60;

      // GPT-5.3-Codex: 目的地到達時に花粉採集と巣への搬入を切り替える。
      if (!bee.carryingWax && Math.abs(bee.y - this.layout.flowerY) < 24) {
        bee.carryingWax = true;
      } else if (bee.carryingWax && Math.abs(bee.y - this.layout.hiveY) < 30) {
        bee.carryingWax = false;
        this.buildNextCell();
      }
    });

    this.drawScene();
  }

  /**
   * GPT-5.3-Codex: 画面サイズに応じた巣と花畑の基準座標を計算する。
   */
  protected computeLayout(width: number, height: number): SceneLayout {
    return {
      width,
      height,
      hiveX: width * 0.5,
      hiveY: height * 0.34,
      hiveCellSize: Math.max(18, Math.floor(Math.min(width, height) * 0.03)),
      flowerY: height * 0.82,
    };
  }

  /**
   * GPT-5.3-Codex: レイアウトを保持し、巣セルのサイズと座標を再計算する。
   */
  protected renderLayout(layout: SceneLayout): void {
    this.layout = layout;
    this.cells = this.createHexCells(4, 5);
    this.drawScene();
  }

  /**
   * GPT-5.3-Codex: 六角形セル群を巣の中心付近に生成する。
   */
  private createHexCells(rows: number, cols: number): HiveCell[] {
    const cells: HiveCell[] = [];
    const size = this.layout.hiveCellSize;
    const hGap = size * 1.75;
    const vGap = size * 1.5;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = this.layout.hiveX + (col - (cols - 1) / 2) * hGap + (row % 2 === 0 ? 0 : hGap * 0.5);
        const y = this.layout.hiveY + (row - (rows - 1) / 2) * vGap;
        cells.push({
          x,
          y,
          size,
          built: false,
        });
      }
    }

    return cells;
  }

  /**
   * GPT-5.3-Codex: 蜂エージェントを花畑付近に初期配置する。
   */
  private createBees(count: number): BeeAgent[] {
    return Array.from({ length: count }, (_, index) => ({
      x: this.layout.width * 0.5 + Math.cos((index / Math.max(1, count)) * Math.PI * 2) * 120,
      y: this.layout.flowerY + Math.sin((index / Math.max(1, count)) * Math.PI * 2) * 36,
      vx: 0,
      vy: 0,
      carryingWax: false,
    }));
  }

  /**
   * GPT-5.3-Codex: 未完成セルを1つずつ完成状態に進める。
   */
  private buildNextCell(): void {
    const nextCell = this.cells.find((cell) => !cell.built);
    if (!nextCell) {
      return;
    }
    nextCell.built = true;
    this.builtCount = Math.min(this.cells.length, this.builtCount + 1);
  }

  /**
   * GPT-5.3-Codex: 空、花畑、蜂、巣の状態表示をまとめて描画する。
   */
  private drawScene(): void {
    this.graphics.clear();

    // GPT-5.3-Codex: 花畑ラインを描き、観察の視線を下部に誘導する。
    this.graphics.fillStyle(0xd9f99d, 1);
    this.graphics.fillRect(0, this.layout.flowerY + 30, this.layout.width, this.layout.height - this.layout.flowerY);

    this.drawFlowers();
    this.drawHiveCells();
    this.drawBees();

    this.titleText.setPosition(this.layout.width * 0.5, 28);
    this.statusText
      .setPosition(this.layout.width * 0.5, this.layout.height * 0.66)
      .setText(`巣の完成度: ${this.builtCount}/${this.cells.length}\n蜂たちは花畑と巣を往復して、少しずつ巣房を作っています。`);
  }

  /**
   * GPT-5.3-Codex: 花の簡易アイコンを並べて採集地点を描画する。
   */
  private drawFlowers(): void {
    const flowerCount = 10;
    for (let i = 0; i < flowerCount; i += 1) {
      const x = (this.layout.width / (flowerCount + 1)) * (i + 1);
      const y = this.layout.flowerY;

      this.graphics.fillStyle(0xf472b6, 0.95);
      this.graphics.fillCircle(x - 8, y, 8);
      this.graphics.fillCircle(x + 8, y, 8);
      this.graphics.fillCircle(x, y - 8, 8);
      this.graphics.fillCircle(x, y + 8, 8);
      this.graphics.fillStyle(0xfacc15, 1);
      this.graphics.fillCircle(x, y, 6);
      this.graphics.lineStyle(3, 0x4d7c0f, 1);
      this.graphics.lineBetween(x, y + 12, x, y + 40);
    }
  }

  /**
   * GPT-5.3-Codex: 完成済みかどうかで色を分けて六角セルを描画する。
   */
  private drawHiveCells(): void {
    this.cells.forEach((cell) => {
      this.graphics.lineStyle(2, 0x78350f, 0.95);
      this.graphics.fillStyle(cell.built ? 0xfacc15 : 0xffedd5, cell.built ? 0.95 : 0.75);
      this.drawHex(cell.x, cell.y, cell.size);
    });
  }

  /**
   * GPT-5.3-Codex: 蜂の胴体と羽、運搬中インジケータを描画する。
   */
  private drawBees(): void {
    this.bees.forEach((bee) => {
      this.graphics.fillStyle(0xfef08a, 1);
      this.graphics.fillEllipse(bee.x, bee.y, 18, 12);
      this.graphics.lineStyle(2, 0x111827, 0.9);
      this.graphics.lineBetween(bee.x - 5, bee.y - 5, bee.x - 5, bee.y + 5);
      this.graphics.lineBetween(bee.x + 1, bee.y - 5, bee.x + 1, bee.y + 5);
      this.graphics.fillStyle(0xe0f2fe, 0.85);
      this.graphics.fillEllipse(bee.x - 5, bee.y - 8, 10, 8);
      this.graphics.fillEllipse(bee.x + 5, bee.y - 8, 10, 8);

      if (bee.carryingWax) {
        this.graphics.fillStyle(0xfcd34d, 1);
        this.graphics.fillCircle(bee.x + 12, bee.y + 2, 3);
      }
    });
  }

  /**
   * GPT-5.3-Codex: 指定座標に六角形ポリゴンを描画する。
   */
  private drawHex(x: number, y: number, radius: number): void {
    const points: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 6; i += 1) {
      const angle = Phaser.Math.DegToRad(60 * i + 30);
      points.push(new Phaser.Math.Vector2(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius));
    }

    this.graphics.beginPath();
    this.graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      this.graphics.lineTo(points[i].x, points[i].y);
    }
    this.graphics.closePath();
    this.graphics.fillPath();
    this.graphics.strokePath();
  }
}

new Phaser.Game(createConfig([SummaryScene]));
