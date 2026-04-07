import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BaseResponsiveScene } from '../baseResponsiveScene.ts';
import { BACKGROUND_COLOR, SUBTITLE, TITLE } from './define.ts';

type HiveCell = {
  x: number;
  y: number;
  size: number;
  honey: number;
};

type BeeAgent = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  carryingNectar: boolean;
  noiseSeed: number;
  homeCellIndex: number | null;
  bornTimer: number;
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

  private buildExpansionTimer = 0;

  private birthTimer = 0;

  private expansionStep = 0;

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
      bee.bornTimer = Math.max(0, bee.bornTimer - dt);

      const targetCell = bee.homeCellIndex !== null ? this.cells[bee.homeCellIndex] : null;
      const targetX = bee.carryingNectar ? (targetCell?.x ?? this.layout.hiveX) : this.layout.width * 0.5;
      const targetY = bee.carryingNectar ? (targetCell?.y ?? this.layout.hiveY) : this.layout.flowerY;
      const dx = targetX - bee.x;
      const dy = targetY - bee.y;
      const distance = Math.hypot(dx, dy) + 1e-6;
      const wobbleX = Math.sin(_time * 0.0015 + bee.noiseSeed) * 42;
      const wobbleY = Math.cos(_time * 0.0012 + bee.noiseSeed * 0.7) * 30;

      // GPT-5.3-Codex: 速度を抑えつつノイズを混ぜ、単調でない緩やかな飛行にする。
      bee.vx += (dx / distance) * dt * 92 + wobbleX * dt;
      bee.vy += (dy / distance) * dt * 92 + wobbleY * dt;
      bee.vx *= 0.9;
      bee.vy *= 0.9;

      bee.x += bee.vx * dt * 34;
      bee.y += bee.vy * dt * 34;

      // GPT-5.3-Codex: 採蜜と搬入の切り替えを緩やかなテンポで制御する。
      if (!bee.carryingNectar && Math.abs(bee.y - this.layout.flowerY) < 24) {
        bee.carryingNectar = true;
        bee.homeCellIndex = this.pickDepositableCell();
      } else if (bee.carryingNectar && distance < 24) {
        bee.carryingNectar = false;
        this.depositNectar(bee.homeCellIndex);
        bee.homeCellIndex = null;
      }
    });

    // GPT-5.3-Codex: 巣が満杯になったら一定間隔で増築する。
    this.updateExpansion(dt);
    // GPT-5.3-Codex: 満たされた巣穴から蜂が誕生し、巣穴を空に戻す。
    this.updateBirth(dt);
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
    this.expansionStep = 0;
    this.buildExpansionTimer = 0;
    this.birthTimer = 0;
    this.cells = this.createHexCells(4, 5);
    this.bees = this.createBees(Math.max(9, this.bees.length || 9));
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
          honey: 0,
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
      carryingNectar: false,
      noiseSeed: Math.random() * Math.PI * 2,
      homeCellIndex: null,
      bornTimer: 0,
    }));
  }

  /**
   * GPT-5.3-Codex: 蜜を入れられる巣穴を選ぶ。
   */
  private pickDepositableCell(): number | null {
    const availableIndices = this.cells
      .map((cell, index) => ({ cell, index }))
      .filter(({ cell }) => cell.honey < 1)
      .map(({ index }) => index);
    if (availableIndices.length === 0) {
      return null;
    }
    return Phaser.Utils.Array.GetRandom(availableIndices);
  }

  /**
   * GPT-5.3-Codex: 蜜の搬入で巣穴の充填率を上げる。
   */
  private depositNectar(cellIndex: number | null): void {
    if (cellIndex === null || !this.cells[cellIndex]) {
      return;
    }
    this.cells[cellIndex].honey = Math.min(1, this.cells[cellIndex].honey + 0.25);
  }

  /**
   * GPT-5.3-Codex: 全巣穴が満たされた後に一定周期で巣を増築する。
   */
  private updateExpansion(dt: number): void {
    if (!this.cells.every((cell) => cell.honey >= 1)) {
      this.buildExpansionTimer = 0;
      return;
    }
    this.buildExpansionTimer += dt;
    if (this.buildExpansionTimer < 8) {
      return;
    }
    this.buildExpansionTimer = 0;
    this.expansionStep += 1;
    const nextRows = 4 + Math.floor(this.expansionStep / 3);
    const nextCols = 5 + (this.expansionStep % 3);
    const previousCells = this.cells;
    this.cells = this.createHexCells(nextRows, nextCols);
    this.cells.forEach((cell, index) => {
      cell.honey = previousCells[index]?.honey ?? 0;
    });
  }

  /**
   * GPT-5.3-Codex: 満杯セルから定期的に蜂を誕生させ、セルを空に戻す。
   */
  private updateBirth(dt: number): void {
    this.birthTimer += dt;
    if (this.birthTimer < 6) {
      return;
    }
    this.birthTimer = 0;
    const fullCandidates = this.cells
      .map((cell, index) => ({ cell, index }))
      .filter(({ cell }) => cell.honey >= 1);
    if (fullCandidates.length === 0) {
      return;
    }
    const selected = Phaser.Utils.Array.GetRandom(fullCandidates);
    selected.cell.honey = 0;
    this.spawnBeeFromCell(selected.index);
  }

  /**
   * GPT-5.3-Codex: 指定セルから新しい蜂を誕生させる。
   */
  private spawnBeeFromCell(cellIndex: number): void {
    const sourceCell = this.cells[cellIndex];
    if (!sourceCell) {
      return;
    }
    this.bees.push({
      x: sourceCell.x,
      y: sourceCell.y,
      vx: Phaser.Math.FloatBetween(-12, 12),
      vy: Phaser.Math.FloatBetween(-26, -8),
      carryingNectar: false,
      noiseSeed: Math.random() * Math.PI * 2,
      homeCellIndex: null,
      bornTimer: 1.5,
    });
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
      .setText(`蜜が埋まった巣穴: ${this.cells.filter((cell) => cell.honey >= 1).length}/${this.cells.length}\n満杯後は増築し、満杯セルから新しい蜂が誕生します。`);
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
      const fillAlpha = 0.35 + cell.honey * 0.6;
      const fillColor = Phaser.Display.Color.Interpolate.ColorWithColor(
        new Phaser.Display.Color(255, 237, 213),
        new Phaser.Display.Color(250, 204, 21),
        100,
        Math.round(cell.honey * 100),
      );
      this.graphics.fillStyle(
        Phaser.Display.Color.GetColor(fillColor.r, fillColor.g, fillColor.b),
        fillAlpha,
      );
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

      if (bee.carryingNectar) {
        this.graphics.fillStyle(0xfcd34d, 1);
        this.graphics.fillCircle(bee.x + 12, bee.y + 2, 3);
      }

      if (bee.bornTimer > 0) {
        this.graphics.lineStyle(2, 0xf97316, 0.7);
        this.graphics.strokeCircle(bee.x, bee.y, 14 + bee.bornTimer * 6);
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
