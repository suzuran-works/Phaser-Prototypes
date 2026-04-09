import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BaseResponsiveScene } from '../baseResponsiveScene.ts';
import { BACKGROUND_COLOR, SUBTITLE, TITLE } from './define.ts';

type GridBall = {
  id: number;
  gx: number;
  gy: number;
  value: number;
};

type FallingBall = {
  gx: number;
  gy: number;
  value: number;
  px: number;
  py: number;
  vy: number;
  landed: boolean;
};

type CatAgent = {
  gx: number;
  gy: number;
  x: number;
  y: number;
  carryValue: number | null;
  dirX: number;
  dirY: number;
  stepCooldown: number;
};

type SceneLayout = {
  width: number;
  height: number;
  tileW: number;
  tileH: number;
  fieldCenterX: number;
  fieldTopY: number;
  uiScale: number;
};

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts26SummaryScene';

  private readonly gridSize = 6;

  private readonly initialTwos = 9;

  private readonly tapChoices = [2, 4, 8];

  private layout: SceneLayout = {
    width: 1080,
    height: 1080,
    tileW: 90,
    tileH: 45,
    fieldCenterX: 540,
    fieldTopY: 210,
    uiScale: 1,
  };

  private graphics!: Phaser.GameObjects.Graphics;

  private titleText!: Phaser.GameObjects.Text;

  private infoText!: Phaser.GameObjects.Text;

  private transientTexts: Phaser.GameObjects.Text[] = [];

  private balls: GridBall[] = [];

  private fallingBalls: FallingBall[] = [];

  private nextBallId = 1;

  private cat: CatAgent = {
    gx: 0,
    gy: 0,
    x: 0,
    y: 0,
    carryValue: null,
    dirX: 1,
    dirY: 0,
    stepCooldown: 0,
  };

  /**
   * Codex: クォータービュー猫ボールマージゲームを初期化する。
   */
  public constructor() {
    super(SummaryScene.key);
  }

  /**
   * Codex: 初期ボール配置・入力設定・レスポンシブ描画を開始する。
   */
  public create(): void {
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);
    this.graphics = this.add.graphics();

    this.titleText = this.add.text(0, 0, `${TITLE}\n${SUBTITLE}`, {
      color: '#e2e8f0',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: 6,
      fontSize: '30px',
    }).setOrigin(0.5, 0);

    this.infoText = this.add.text(0, 0, '', {
      color: '#bfdbfe',
      fontFamily: 'sans-serif',
      align: 'center',
      lineSpacing: 4,
      fontSize: '20px',
    }).setOrigin(0.5, 0);

    this.seedInitialTwos();
    const catStart = this.gridToScreen(2, 2);
    this.cat = {
      gx: 2,
      gy: 2,
      x: catStart.x,
      y: catStart.y,
      carryValue: null,
      dirX: 1,
      dirY: 0,
      stepCooldown: 0,
    };

    this.input.on('pointerdown', () => {
      this.spawnTapBall();
    });

    this.bindResponsiveLayout();
  }

  /**
   * Codex: 猫の行動・2ボールの転がり・落下球の更新を行う。
   */
  public update(_time: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    this.updateRollingTwos(dt);
    this.updateFallingBalls(dt);
    this.updateCat(dt);
    this.drawScene();
  }

  /**
   * Codex: 画面サイズに応じて6x6クォータービュー領域を算出する。
   */
  protected computeLayout(width: number, height: number): SceneLayout {
    const uiScale = Math.max(0.72, Math.min(1.22, Math.min(width / 1080, height / 1080)));
    const tileW = Math.max(74, Math.round(Math.min(width * 0.16, height * 0.11)));
    const tileH = Math.round(tileW * 0.5);

    return {
      width,
      height,
      tileW,
      tileH,
      fieldCenterX: width * 0.5,
      fieldTopY: Math.max(180 * uiScale, height * 0.23),
      uiScale,
    };
  }

  /**
   * Codex: UI位置を更新し現在状態を再描画する。
   */
  protected renderLayout(layout: SceneLayout): void {
    this.layout = layout;
    this.titleText.setPosition(layout.width * 0.5, 16 * layout.uiScale).setFontSize(31 * layout.uiScale);
    this.infoText.setPosition(layout.width * 0.5, 102 * layout.uiScale).setFontSize(20 * layout.uiScale);

    const catPos = this.gridToScreen(this.cat.gx, this.cat.gy);
    this.cat.x = catPos.x;
    this.cat.y = catPos.y;

    this.drawScene();
  }

  /**
   * Codex: 要件どおり、値2のボールを複数個ランダム配置する。
   */
  private seedInitialTwos(): void {
    while (this.balls.length < this.initialTwos) {
      const gx = Phaser.Math.Between(0, this.gridSize - 1);
      const gy = Phaser.Math.Between(0, this.gridSize - 1);
      if (this.findBallAt(gx, gy)) {
        continue;
      }

      this.balls.push({
        id: this.nextBallId++,
        gx,
        gy,
        value: 2,
      });
    }
  }

  /**
   * Codex: タップで2/4/8のいずれかを落下生成し、着地でセルへ配置する。
   */
  private spawnTapBall(): void {
    const spawnValue = Phaser.Utils.Array.GetRandom(this.tapChoices);
    const startCol = Phaser.Math.Between(0, this.gridSize - 1);
    const targetCell = this.findNearestEmptyCell(startCol, 0);

    if (!targetCell) {
      return;
    }

    const targetPos = this.gridToScreen(targetCell.gx, targetCell.gy);
    this.fallingBalls.push({
      gx: targetCell.gx,
      gy: targetCell.gy,
      value: spawnValue,
      px: targetPos.x,
      py: -40,
      vy: 0,
      landed: false,
    });
  }

  /**
   * Codex: 値2のボールだけを確率移動させ「転がっている」状態を再現する。
   */
  private updateRollingTwos(dt: number): void {
    if (Phaser.Math.FloatBetween(0, 1) > dt * 2.2) {
      return;
    }

    const twos = this.balls.filter((ball) => ball.value === 2);
    if (twos.length === 0) {
      return;
    }

    const mover = Phaser.Utils.Array.GetRandom(twos);
    if (this.cat.carryValue === null && this.cat.gx === mover.gx && this.cat.gy === mover.gy) {
      return;
    }

    const neighbors = this.getNeighborCells(mover.gx, mover.gy).filter((cell) => (
      !this.findBallAt(cell.gx, cell.gy)
      && !(this.cat.gx === cell.gx && this.cat.gy === cell.gy)
    ));

    if (neighbors.length === 0) {
      return;
    }

    const next = Phaser.Utils.Array.GetRandom(neighbors);
    mover.gx = next.gx;
    mover.gy = next.gy;
  }

  /**
   * Codex: 落下中ボールの重力演算と着地時のマージ/配置を処理する。
   */
  private updateFallingBalls(dt: number): void {
    const gravity = 1700;

    this.fallingBalls.forEach((ball) => {
      if (ball.landed) {
        return;
      }

      const target = this.gridToScreen(ball.gx, ball.gy);
      ball.vy += gravity * dt;
      ball.py += ball.vy * dt;

      if (ball.py >= target.y - this.layout.tileH * 0.26) {
        ball.py = target.y - this.layout.tileH * 0.26;
        ball.landed = true;
        this.placeOrMergeAt(ball.gx, ball.gy, ball.value);
      }
    });

    this.fallingBalls = this.fallingBalls.filter((ball) => !ball.landed);
  }

  /**
   * Codex: 猫は空荷時に任意ボールへ、積載時は同値ボールへ向かう。
   */
  private updateCat(dt: number): void {
    this.cat.stepCooldown = Math.max(0, this.cat.stepCooldown - dt);
    if (this.cat.stepCooldown > 0) {
      return;
    }

    const next = this.chooseNextCatStep();
    if (!next) {
      this.cat.stepCooldown = 0.12;
      return;
    }

    this.cat.dirX = Phaser.Math.Clamp(next.gx - this.cat.gx, -1, 1);
    this.cat.dirY = Phaser.Math.Clamp(next.gy - this.cat.gy, -1, 1);
    this.cat.gx = next.gx;
    this.cat.gy = next.gy;

    const nextPos = this.gridToScreen(next.gx, next.gy);
    this.cat.x = nextPos.x;
    this.cat.y = nextPos.y;

    this.resolveCatCellAction();
    this.cat.stepCooldown = 0.18;
  }

  /**
   * Codex: 侵入制約を守って猫の次セルを決める。
   */
  private chooseNextCatStep(): { gx: number; gy: number } | null {
    const goal = this.findCatGoal();
    if (!goal) {
      return null;
    }

    const candidates = this.getNeighborCells(this.cat.gx, this.cat.gy)
      .filter((cell) => this.canCatEnter(cell.gx, cell.gy));

    if (candidates.length === 0) {
      return null;
    }

    candidates.sort((a, b) => {
      const da = Math.abs(goal.gx - a.gx) + Math.abs(goal.gy - a.gy);
      const db = Math.abs(goal.gx - b.gx) + Math.abs(goal.gy - b.gy);
      return da - db;
    });

    return candidates[0];
  }

  /**
   * Codex: 空荷なら最寄りボール、積載中なら同値ボールを目標セルにする。
   */
  private findCatGoal(): { gx: number; gy: number } | null {
    if (this.cat.carryValue === null) {
      const nearest = this.findNearestBall(this.cat.gx, this.cat.gy, () => true);
      return nearest ? { gx: nearest.gx, gy: nearest.gy } : null;
    }

    const same = this.findNearestBall(this.cat.gx, this.cat.gy, (ball) => (
      ball.value === this.cat.carryValue && !(ball.gx === this.cat.gx && ball.gy === this.cat.gy)
    ));

    if (same) {
      return { gx: same.gx, gy: same.gy };
    }

    const empty = this.findNearestEmptyCell(this.cat.gx, this.cat.gy);
    return empty ? { gx: empty.gx, gy: empty.gy } : null;
  }

  /**
   * Codex: 猫が入ったセルで拾得・マージ・一時退避を処理する。
   */
  private resolveCatCellAction(): void {
    const ball = this.findBallAt(this.cat.gx, this.cat.gy);
    if (!ball) {
      if (this.cat.carryValue !== null) {
        this.balls.push({
          id: this.nextBallId++,
          gx: this.cat.gx,
          gy: this.cat.gy,
          value: this.cat.carryValue,
        });
        this.cat.carryValue = null;
      }
      return;
    }

    if (this.cat.carryValue === null) {
      this.cat.carryValue = ball.value;
      this.removeBallById(ball.id);
      return;
    }

    if (this.cat.carryValue === ball.value) {
      ball.value += this.cat.carryValue;
      this.cat.carryValue = null;
    }
  }

  /**
   * Codex: ボール占有セルの侵入可否を要件どおり判定する。
   */
  private canCatEnter(gx: number, gy: number): boolean {
    const ball = this.findBallAt(gx, gy);
    if (!ball) {
      return true;
    }

    if (this.cat.carryValue === null) {
      return true;
    }

    return ball.value === this.cat.carryValue;
  }

  /**
   * Codex: 指定セルに配置済みボールがあれば同値時のみマージする。
   */
  private placeOrMergeAt(gx: number, gy: number, value: number): void {
    const existing = this.findBallAt(gx, gy);
    if (!existing) {
      this.balls.push({ id: this.nextBallId++, gx, gy, value });
      return;
    }

    if (existing.value === value) {
      existing.value += value;
      return;
    }

    const fallback = this.findNearestEmptyCell(gx, gy);
    if (fallback) {
      this.balls.push({ id: this.nextBallId++, gx: fallback.gx, gy: fallback.gy, value });
    }
  }

  /**
   * Codex: グリッド描画・ボール・猫をまとめて描画する。
   */
  private drawScene(): void {
    this.graphics.clear();
    this.clearTransientTexts();

    this.drawGrid();
    this.drawBalls();
    this.drawFallingBalls();
    this.drawCat();

    const mergeHint = this.cat.carryValue === null ? '空荷: 任意ボールセルに侵入可能' : `積載中 ${this.cat.carryValue}: 同値セルのみ侵入`;
    this.infoText.setText(`タップで2/4/8を落下。 同じ数字で合体。\n${mergeHint}`);
  }

  /**
   * Codex: 6x6クォータービューの菱形セルを描画する。
   */
  private drawGrid(): void {
    for (let gy = 0; gy < this.gridSize; gy += 1) {
      for (let gx = 0; gx < this.gridSize; gx += 1) {
        const p = this.gridToScreen(gx, gy);
        const shade = 0x1d4ed8 + (gx + gy) * 0x030300;
        this.drawDiamond(p.x, p.y, this.layout.tileW, this.layout.tileH, Phaser.Math.Clamp(shade, 0x1d4ed8, 0x60a5fa));
      }
    }
  }

  /**
   * Codex: セル上の数字ボールを描画する。
   */
  private drawBalls(): void {
    this.balls.forEach((ball) => {
      const p = this.gridToScreen(ball.gx, ball.gy);
      const radius = this.layout.tileH * 0.32;
      this.graphics.fillStyle(this.pickBallColor(ball.value), 1);
      this.graphics.fillCircle(p.x, p.y - this.layout.tileH * 0.26, radius);
      this.graphics.lineStyle(2, 0x0f172a, 0.7);
      this.graphics.strokeCircle(p.x, p.y - this.layout.tileH * 0.26, radius);

      this.transientTexts.push(this.add.text(p.x, p.y - this.layout.tileH * 0.26, String(ball.value), {
        color: '#0f172a',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
        fontSize: `${Math.round(this.layout.tileH * 0.43)}px`,
      }).setOrigin(0.5));
    });
  }

  /**
   * Codex: 落下中ボールをセル上空へ描画する。
   */
  private drawFallingBalls(): void {
    this.fallingBalls.forEach((ball) => {
      const radius = this.layout.tileH * 0.3;
      this.graphics.fillStyle(this.pickBallColor(ball.value), 1);
      this.graphics.fillCircle(ball.px, ball.py, radius);
      this.graphics.lineStyle(2, 0x0f172a, 0.68);
      this.graphics.strokeCircle(ball.px, ball.py, radius);

      this.transientTexts.push(this.add.text(ball.px, ball.py, String(ball.value), {
        color: '#0f172a',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
        fontSize: `${Math.round(this.layout.tileH * 0.39)}px`,
      }).setOrigin(0.5));
    });
  }

  /**
   * Codex: 猫と運搬中ボールを「◯🐈」風に前方表示で描画する。
   */
  private drawCat(): void {
    const catFontPx = Math.round(34 * this.layout.uiScale);
    this.transientTexts.push(this.add.text(this.cat.x, this.cat.y, '🐈', {
      fontFamily: 'sans-serif',
      fontSize: `${catFontPx}px`,
    }).setOrigin(0.5, 0.74));

    if (this.cat.carryValue === null) {
      return;
    }

    const frontX = this.cat.x + this.cat.dirX * this.layout.tileW * 0.22;
    const frontY = this.cat.y + this.cat.dirY * this.layout.tileH * 0.22 - this.layout.tileH * 0.22;
    const radius = this.layout.tileH * 0.27;

    this.graphics.fillStyle(this.pickBallColor(this.cat.carryValue), 1);
    this.graphics.fillCircle(frontX, frontY, radius);
    this.graphics.lineStyle(2, 0x0f172a, 0.72);
    this.graphics.strokeCircle(frontX, frontY, radius);

    this.transientTexts.push(this.add.text(frontX, frontY, String(this.cat.carryValue), {
      color: '#0f172a',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      fontSize: `${Math.round(this.layout.tileH * 0.35)}px`,
    }).setOrigin(0.5));
  }

  /**
   * Codex: グリッド座標をクォータービュー画面座標へ変換する。
   */
  private gridToScreen(gx: number, gy: number): { x: number; y: number } {
    return {
      x: this.layout.fieldCenterX + (gx - gy) * this.layout.tileW * 0.5,
      y: this.layout.fieldTopY + (gx + gy) * this.layout.tileH * 0.5,
    };
  }

  /**
   * Codex: 菱形タイルを塗りと枠線つきで描画する。
   */
  private drawDiamond(x: number, y: number, width: number, height: number, color: number): void {
    this.graphics.fillStyle(color, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(x, y - height * 0.5);
    this.graphics.lineTo(x + width * 0.5, y);
    this.graphics.lineTo(x, y + height * 0.5);
    this.graphics.lineTo(x - width * 0.5, y);
    this.graphics.closePath();
    this.graphics.fillPath();

    this.graphics.lineStyle(1, 0xdbecff, 0.32);
    this.graphics.strokePath();
  }

  /**
   * Codex: 指定セルのボールを高速参照する。
   */
  private findBallAt(gx: number, gy: number): GridBall | null {
    return this.balls.find((ball) => ball.gx === gx && ball.gy === gy) ?? null;
  }

  /**
   * Codex: ボールIDで配列から取り除く。
   */
  private removeBallById(id: number): void {
    this.balls = this.balls.filter((ball) => ball.id !== id);
  }

  /**
   * Codex: 最近傍ボールを条件付きで探索する。
   */
  private findNearestBall(fromGx: number, fromGy: number, condition: (ball: GridBall) => boolean): GridBall | null {
    let best: GridBall | null = null;
    let bestDist = Number.POSITIVE_INFINITY;

    this.balls.forEach((ball) => {
      if (!condition(ball)) {
        return;
      }

      const dist = Math.abs(ball.gx - fromGx) + Math.abs(ball.gy - fromGy);
      if (dist < bestDist) {
        best = ball;
        bestDist = dist;
      }
    });

    return best;
  }

  /**
   * Codex: 起点から最近傍の空セルをBFSで探索する。
   */
  private findNearestEmptyCell(startGx: number, startGy: number): { gx: number; gy: number } | null {
    const queue: Array<{ gx: number; gy: number }> = [{ gx: startGx, gy: startGy }];
    const visited = new Set<string>([`${startGx},${startGy}`]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (!this.findBallAt(current.gx, current.gy) && !(this.cat.gx === current.gx && this.cat.gy === current.gy)) {
        return current;
      }

      this.getNeighborCells(current.gx, current.gy).forEach((next) => {
        const key = `${next.gx},${next.gy}`;
        if (visited.has(key)) {
          return;
        }
        visited.add(key);
        queue.push(next);
      });
    }

    return null;
  }

  /**
   * Codex: グリッド内の上下左右隣接セルを返す。
   */
  private getNeighborCells(gx: number, gy: number): Array<{ gx: number; gy: number }> {
    const candidates = [
      { gx: gx + 1, gy },
      { gx: gx - 1, gy },
      { gx, gy: gy + 1 },
      { gx, gy: gy - 1 },
    ];

    return candidates.filter((cell) => (
      cell.gx >= 0
      && cell.gx < this.gridSize
      && cell.gy >= 0
      && cell.gy < this.gridSize
    ));
  }

  /**
   * Codex: 数値ごとにボール色を選択する。
   */
  private pickBallColor(value: number): number {
    const palette = [0xfef08a, 0xfda4af, 0xa7f3d0, 0x93c5fd, 0xd8b4fe, 0xfdba74];
    const index = Math.floor(Math.log2(Math.max(2, value))) % palette.length;
    return palette[index];
  }

  /**
   * Codex: 毎フレーム再生成するテキストを確実に破棄する。
   */
  private clearTransientTexts(): void {
    this.transientTexts.forEach((text) => text.destroy());
    this.transientTexts = [];
  }
}

new Phaser.Game(createConfig([SummaryScene]));
