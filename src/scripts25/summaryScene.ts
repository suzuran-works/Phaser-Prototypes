import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BaseResponsiveScene } from '../baseResponsiveScene.ts';
import { BACKGROUND_COLOR, SUBTITLE, TITLE } from './define.ts';

type FieldCell = {
  gx: number;
  gy: number;
  value: number;
  taken: boolean;
};

type HoleCell = {
  gx: number;
  gy: number;
};

type DroppedBall = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  radius: number;
  alive: boolean;
};

type Peg = {
  x: number;
  y: number;
  radius: number;
};

type ScorePocket = {
  x: number;
  y: number;
  width: number;
  height: number;
  multiplier: number;
};

type CatAgent = {
  id: number;
  x: number;
  y: number;
  speed: number;
  ball: FieldCell | null;
  targetBallIndex: number;
  dropTarget: HoleCell;
  cooldown: number;
};

type SceneLayout = {
  width: number;
  height: number;
  topCenterX: number;
  topY: number;
  topHeight: number;
  bottomY: number;
  tileW: number;
  tileH: number;
  fieldOffsetX: number;
  fieldOffsetY: number;
  uiScale: number;
};

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts25SummaryScene';

  private readonly gridCols = 8;

  private readonly gridRows = 8;

  private readonly gravity = 880;

  private readonly ballPalette = [0xfef3c7, 0xbbf7d0, 0xbfdbfe, 0xfbcfe8, 0xc4b5fd];

  private layout: SceneLayout = {
    width: 1080,
    height: 1080,
    topCenterX: 540,
    topY: 100,
    topHeight: 480,
    bottomY: 560,
    tileW: 56,
    tileH: 28,
    fieldOffsetX: 0,
    fieldOffsetY: 0,
    uiScale: 1,
  };

  private graphics!: Phaser.GameObjects.Graphics;

  private titleText!: Phaser.GameObjects.Text;

  private infoText!: Phaser.GameObjects.Text;

  private pointsText!: Phaser.GameObjects.Text;

  private transientTexts: Phaser.GameObjects.Text[] = [];

  private fieldBalls: FieldCell[] = [];

  private holes: HoleCell[] = [];

  private cats: CatAgent[] = [];

  private droppedBalls: DroppedBall[] = [];

  private pegs: Peg[] = [];

  private scorePockets: ScorePocket[] = [];

  private score = 0;

  private totalDelivered = 0;

  private nextCatCost = 25;

  private nextCatId = 1;

  /**
   * Codex: 猫の数字ボール運搬ゲームシーンを初期化する。
   */
  public constructor() {
    super(SummaryScene.key);
  }

  /**
   * Codex: 初期データと描画オブジェクトを生成する。
   */
  public create(): void {
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);
    this.graphics = this.add.graphics();

    this.titleText = this.add.text(0, 0, `${TITLE} - ${SUBTITLE}`, {
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      fontSize: '30px',
      color: '#0f172a',
    }).setOrigin(0.5, 0);

    this.infoText = this.add.text(0, 0, '', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#334155',
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5, 0);

    this.pointsText = this.add.text(0, 0, '', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#7c2d12',
      fontStyle: 'bold',
    }).setOrigin(1, 0);

    this.holes = this.createHoles();
    this.fieldBalls = this.createFieldBalls(18);
    this.cats = [this.createCat(this.layout.topCenterX, this.layout.topY + 110)];

    this.bindResponsiveLayout();
  }

  /**
   * Codex: 猫移動・落下玉シミュレーション・増員処理を更新する。
   */
  public update(_time: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);

    this.updateCats(dt);
    this.updateDroppedBalls(dt);
    this.tryHireCat();
    this.refillFieldBalls();
    this.drawScene();
  }

  /**
   * Codex: 画面サイズに応じてクォータービュー領域とUIスケールを算出する。
   */
  protected computeLayout(width: number, height: number): SceneLayout {
    const uiScale = Math.max(0.72, Math.min(1.18, width / 1080));
    const topHeight = height * 0.5;
    const tileW = Math.max(48, Math.round(Math.min(width, topHeight) * 0.08));
    const tileH = Math.round(tileW * 0.5);

    return {
      width,
      height,
      topCenterX: width * 0.5,
      topY: 90 * uiScale,
      topHeight,
      bottomY: topHeight,
      tileW,
      tileH,
      fieldOffsetX: width * 0.5,
      fieldOffsetY: 165 * uiScale,
      uiScale,
    };
  }

  /**
   * Codex: レイアウト反映時にパチンコ要素とUI位置を再計算する。
   */
  protected renderLayout(layout: SceneLayout): void {
    this.layout = layout;

    this.titleText.setPosition(layout.width * 0.5, 12 * layout.uiScale).setFontSize(30 * layout.uiScale);
    this.infoText.setPosition(layout.width * 0.5, 54 * layout.uiScale).setFontSize(20 * layout.uiScale);
    this.pointsText.setPosition(layout.width - 18 * layout.uiScale, 14 * layout.uiScale).setFontSize(20 * layout.uiScale);

    this.pegs = this.createPegs();
    this.scorePockets = this.createScorePockets();
    this.drawScene();
  }

  /**
   * Codex: フィールド上の穴セルを5つ生成する。
   */
  private createHoles(): HoleCell[] {
    return [
      { gx: 1, gy: 2 },
      { gx: 3, gy: 5 },
      { gx: 4, gy: 3 },
      { gx: 6, gy: 2 },
      { gx: 5, gy: 6 },
    ];
  }

  /**
   * Codex: 初期の数字ボール群をランダムなセルへ配置する。
   */
  private createFieldBalls(count: number): FieldCell[] {
    const balls: FieldCell[] = [];
    while (balls.length < count) {
      const gx = Phaser.Math.Between(0, this.gridCols - 1);
      const gy = Phaser.Math.Between(0, this.gridRows - 1);
      if (this.isHole(gx, gy) || balls.some((ball) => ball.gx === gx && ball.gy === gy)) {
        continue;
      }

      balls.push({
        gx,
        gy,
        value: Phaser.Math.Between(1, 9),
        taken: false,
      });
    }
    return balls;
  }

  /**
   * Codex: 猫エージェントを生成する。
   */
  private createCat(x: number, y: number): CatAgent {
    const hole = Phaser.Utils.Array.GetRandom(this.holes);
    return {
      id: this.nextCatId++,
      x,
      y,
      speed: Phaser.Math.FloatBetween(64, 86),
      ball: null,
      targetBallIndex: -1,
      dropTarget: hole,
      cooldown: Phaser.Math.FloatBetween(0.2, 0.8),
    };
  }

  /**
   * Codex: 猫の探索・運搬・投下アクションを段階的に更新する。
   */
  private updateCats(dt: number): void {
    this.cats.forEach((cat) => {
      cat.cooldown = Math.max(0, cat.cooldown - dt);

      if (!cat.ball) {
        if (cat.targetBallIndex < 0 || this.fieldBalls[cat.targetBallIndex]?.taken) {
          cat.targetBallIndex = this.pickNearestFreeBall(cat.x, cat.y);
        }

        if (cat.targetBallIndex >= 0) {
          const targetBall = this.fieldBalls[cat.targetBallIndex];
          const target = this.gridToScreen(targetBall.gx, targetBall.gy);
          const arrived = this.moveTowards(cat, target.x, target.y - this.layout.tileH * 0.35, cat.speed, dt);
          if (arrived && cat.cooldown <= 0 && !targetBall.taken) {
            targetBall.taken = true;
            cat.ball = targetBall;
            cat.dropTarget = Phaser.Utils.Array.GetRandom(this.holes);
            cat.cooldown = 0.28;
          }
        }
        return;
      }

      const dropPoint = this.gridToScreen(cat.dropTarget.gx, cat.dropTarget.gy);
      const arrivedToHole = this.moveTowards(cat, dropPoint.x, dropPoint.y - this.layout.tileH * 0.45, cat.speed * 1.12, dt);
      if (arrivedToHole && cat.cooldown <= 0) {
        this.spawnDroppedBall(dropPoint.x, dropPoint.y + 4 * this.layout.uiScale, cat.ball.value);
        cat.ball = null;
        cat.targetBallIndex = -1;
        cat.cooldown = 0.42;
        this.totalDelivered += 1;
      }
    });
  }

  /**
   * Codex: 落下した数字ボールの重力・反射・得点計算を処理する。
   */
  private updateDroppedBalls(dt: number): void {
    this.droppedBalls.forEach((ball) => {
      if (!ball.alive) {
        return;
      }

      ball.vy += this.gravity * dt;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      // Codex: 画面端はエネルギー減衰付きで反射し、玉を画面内に保つ。
      if (ball.x < ball.radius) {
        ball.x = ball.radius;
        ball.vx = Math.abs(ball.vx) * 0.82;
      } else if (ball.x > this.layout.width - ball.radius) {
        ball.x = this.layout.width - ball.radius;
        ball.vx = -Math.abs(ball.vx) * 0.82;
      }

      this.pegs.forEach((peg) => {
        const dx = ball.x - peg.x;
        const dy = ball.y - peg.y;
        const dist = Math.hypot(dx, dy);
        const minDist = ball.radius + peg.radius;

        if (dist > 0.001 && dist < minDist) {
          const nx = dx / dist;
          const ny = dy / dist;
          const push = minDist - dist;
          ball.x += nx * push;
          ball.y += ny * push;

          const vDot = ball.vx * nx + ball.vy * ny;
          ball.vx -= (1.62 * vDot) * nx;
          ball.vy -= (1.62 * vDot) * ny;
          ball.vx += Phaser.Math.FloatBetween(-30, 30);
        }
      });

      const pocket = this.findPocket(ball.x, ball.y);
      if (pocket) {
        ball.alive = false;
        this.score += ball.value * pocket.multiplier;
        return;
      }

      if (ball.y > this.layout.height + 100) {
        ball.alive = false;
      }
    });

    this.droppedBalls = this.droppedBalls.filter((ball) => ball.alive);
  }

  /**
   * Codex: 得点が閾値を超えたら猫を増員し、次コストを更新する。
   */
  private tryHireCat(): void {
    while (this.score >= this.nextCatCost && this.cats.length < 8) {
      this.score -= this.nextCatCost;
      const spawnX = this.layout.topCenterX + Phaser.Math.Between(-120, 120);
      const spawnY = this.layout.topY + Phaser.Math.Between(90, 180);
      this.cats.push(this.createCat(spawnX, spawnY));
      this.nextCatCost = Math.round(this.nextCatCost * 1.65 + 8);
    }
  }

  /**
   * Codex: ボール総数が少ない場合に補充して作業待ちを防ぐ。
   */
  private refillFieldBalls(): void {
    const activeFieldBalls = this.fieldBalls.filter((ball) => !ball.taken).length;
    if (activeFieldBalls >= 12) {
      return;
    }

    const toAdd = 18 - activeFieldBalls;
    const fresh = this.createFieldBalls(Math.max(0, toAdd));

    fresh.forEach((candidate) => {
      if (this.fieldBalls.some((ball) => !ball.taken && ball.gx === candidate.gx && ball.gy === candidate.gy)) {
        return;
      }
      this.fieldBalls.push(candidate);
    });

    this.fieldBalls = this.fieldBalls.filter((ball) => !ball.taken || this.cats.some((cat) => cat.ball === ball));
  }

  /**
   * Codex: クォータービュー地形・猫・数字ボール・パチンコを一括描画する。
   */
  private drawScene(): void {
    this.graphics.clear();
    this.clearTransientTexts();
    this.drawQuarterField();
    this.drawPachinkoArea();
    this.drawFieldBalls();
    this.drawCats();
    this.drawDroppedBalls();

    this.infoText.setText(`🐈 ${this.cats.length}匹が運搬中 / 投下済み ${this.totalDelivered}個\n次の猫コスト: ${this.nextCatCost} 点`);
    this.pointsText.setText(`得点: ${this.score}`);
  }

  /**
   * Codex: フィールドの菱形セルと穴セル（欠け）を描画する。
   */
  private drawQuarterField(): void {
    for (let gy = 0; gy < this.gridRows; gy += 1) {
      for (let gx = 0; gx < this.gridCols; gx += 1) {
        if (this.isHole(gx, gy)) {
          continue;
        }

        const p = this.gridToScreen(gx, gy);
        const shade = 0xdbeafe - (gx + gy) * 0x0909;
        this.drawDiamond(p.x, p.y, this.layout.tileW, this.layout.tileH, Phaser.Math.Clamp(shade, 0xb3d8f8, 0xdbeafe));
      }
    }

    this.holes.forEach((hole) => {
      const p = this.gridToScreen(hole.gx, hole.gy);
      this.graphics.fillStyle(0x1f2937, 0.82);
      this.graphics.fillEllipse(p.x, p.y + this.layout.tileH * 0.08, this.layout.tileW * 0.52, this.layout.tileH * 0.4);
      this.graphics.lineStyle(2, 0xf8fafc, 0.6);
      this.graphics.strokeEllipse(p.x, p.y + this.layout.tileH * 0.08, this.layout.tileW * 0.5, this.layout.tileH * 0.36);
    });
  }

  /**
   * Codex: 下半分のパチンコエリア、ピン、得点ポケットを描画する。
   */
  private drawPachinkoArea(): void {
    this.graphics.fillStyle(0xe2e8f0, 1);
    this.graphics.fillRect(0, this.layout.bottomY, this.layout.width, this.layout.height - this.layout.bottomY);

    this.graphics.lineStyle(2, 0x64748b, 0.4);
    this.graphics.strokeLineShape(new Phaser.Geom.Line(0, this.layout.bottomY, this.layout.width, this.layout.bottomY));

    this.pegs.forEach((peg) => {
      this.graphics.fillStyle(0x475569, 1);
      this.graphics.fillCircle(peg.x, peg.y, peg.radius);
    });

    this.scorePockets.forEach((pocket) => {
      this.graphics.fillStyle(0x0f766e, 0.86);
      this.graphics.fillRoundedRect(pocket.x - pocket.width / 2, pocket.y - pocket.height / 2, pocket.width, pocket.height, 10);
      this.graphics.lineStyle(2, 0xf0fdfa, 0.85);
      this.graphics.strokeRoundedRect(pocket.x - pocket.width / 2, pocket.y - pocket.height / 2, pocket.width, pocket.height, 10);

      const label = `x${pocket.multiplier}`;
      this.transientTexts.push(this.add.text(pocket.x, pocket.y - 4 * this.layout.uiScale, label, {
        fontFamily: 'sans-serif',
        color: '#ecfeff',
        fontStyle: 'bold',
        fontSize: `${14 * this.layout.uiScale}px`,
      }).setOrigin(0.5));
    });
  }

  /**
   * Codex: フィールド上の数字ボールを描画する。
   */
  private drawFieldBalls(): void {
    this.fieldBalls.forEach((ball) => {
      if (ball.taken) {
        return;
      }

      const p = this.gridToScreen(ball.gx, ball.gy);
      const radius = this.layout.tileH * 0.28;
      const color = this.ballPalette[(ball.value - 1) % this.ballPalette.length];

      this.graphics.fillStyle(color, 1);
      this.graphics.fillCircle(p.x, p.y - this.layout.tileH * 0.25, radius);
      this.graphics.lineStyle(2, 0x334155, 0.6);
      this.graphics.strokeCircle(p.x, p.y - this.layout.tileH * 0.25, radius);

      this.transientTexts.push(this.add.text(p.x, p.y - this.layout.tileH * 0.25, String(ball.value), {
        fontFamily: 'sans-serif',
        fontSize: `${Math.round(this.layout.tileH * 0.38)}px`,
        color: '#0f172a',
        fontStyle: 'bold',
      }).setOrigin(0.5));
    });
  }

  /**
   * Codex: 猫本体と運搬中ボールを描画する。
   */
  private drawCats(): void {
    this.cats.forEach((cat) => {
      const fontSize = Math.round(30 * this.layout.uiScale);
      this.transientTexts.push(this.add.text(cat.x, cat.y, '🐈', {
        fontFamily: 'sans-serif',
        fontSize: `${fontSize}px`,
      }).setOrigin(0.5, 0.78));

      if (cat.ball) {
        this.transientTexts.push(this.add.text(cat.x, cat.y - 24 * this.layout.uiScale, String(cat.ball.value), {
          fontFamily: 'sans-serif',
          color: '#dc2626',
          fontStyle: 'bold',
          fontSize: `${Math.round(18 * this.layout.uiScale)}px`,
        }).setOrigin(0.5));
      }
    });
  }

  /**
   * Codex: パチンコ内を落下中の数字ボールを描画する。
   */
  private drawDroppedBalls(): void {
    this.droppedBalls.forEach((ball) => {
      const color = this.ballPalette[(ball.value - 1) % this.ballPalette.length];
      this.graphics.fillStyle(color, 1);
      this.graphics.fillCircle(ball.x, ball.y, ball.radius);
      this.graphics.lineStyle(2, 0x334155, 0.65);
      this.graphics.strokeCircle(ball.x, ball.y, ball.radius);

      this.transientTexts.push(this.add.text(ball.x, ball.y, String(ball.value), {
        fontFamily: 'sans-serif',
        fontSize: `${Math.round(ball.radius * 1.1)}px`,
        color: '#0f172a',
        fontStyle: 'bold',
      }).setOrigin(0.5));
    });
  }

  /**
   * Codex: 毎フレーム再生成するテキストを破棄し、メモリ増加を防ぐ。
   */
  private clearTransientTexts(): void {
    this.transientTexts.forEach((text) => text.destroy());
    this.transientTexts = [];
  }

  /**
   * Codex: グリッド座標からクォータービュー画面座標へ変換する。
   */
  private gridToScreen(gx: number, gy: number): { x: number; y: number } {
    return {
      x: this.layout.fieldOffsetX + (gx - gy) * (this.layout.tileW * 0.5),
      y: this.layout.fieldOffsetY + (gx + gy) * (this.layout.tileH * 0.5),
    };
  }

  /**
   * Codex: 指定セルが穴かどうかを返す。
   */
  private isHole(gx: number, gy: number): boolean {
    return this.holes.some((hole) => hole.gx === gx && hole.gy === gy);
  }

  /**
   * Codex: 菱形タイルを描画する。
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

    this.graphics.lineStyle(1, 0xffffff, 0.22);
    this.graphics.strokePath();
  }

  /**
   * Codex: 猫を目標地点へ補間移動し、到達時に true を返す。
   */
  private moveTowards(cat: CatAgent, tx: number, ty: number, speed: number, dt: number): boolean {
    const dx = tx - cat.x;
    const dy = ty - cat.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 2) {
      cat.x = tx;
      cat.y = ty;
      return true;
    }

    const step = Math.min(distance, speed * dt);
    cat.x += (dx / distance) * step;
    cat.y += (dy / distance) * step;
    return false;
  }

  /**
   * Codex: 猫位置に近い未取得ボールのインデックスを返す。
   */
  private pickNearestFreeBall(catX: number, catY: number): number {
    let minDistance = Number.POSITIVE_INFINITY;
    let result = -1;

    this.fieldBalls.forEach((ball, index) => {
      if (ball.taken) {
        return;
      }

      const p = this.gridToScreen(ball.gx, ball.gy);
      const distance = Phaser.Math.Distance.Between(catX, catY, p.x, p.y);
      if (distance < minDistance) {
        minDistance = distance;
        result = index;
      }
    });

    return result;
  }

  /**
   * Codex: 穴から下半分へ落ちる数字ボールを生成する。
   */
  private spawnDroppedBall(startX: number, startY: number, value: number): void {
    this.droppedBalls.push({
      x: startX,
      y: Math.max(this.layout.bottomY + 4, startY),
      vx: Phaser.Math.FloatBetween(-46, 46),
      vy: Phaser.Math.FloatBetween(10, 40),
      value,
      radius: Math.max(10, this.layout.tileH * 0.24),
      alive: true,
    });
  }

  /**
   * Codex: 下半分のピン配置を算出する。
   */
  private createPegs(): Peg[] {
    const pegs: Peg[] = [];
    const rows = 6;
    const cols = 9;
    const startY = this.layout.bottomY + 44 * this.layout.uiScale;
    const areaWidth = this.layout.width * 0.76;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const shift = row % 2 === 0 ? 0 : areaWidth / cols / 2;
        const x = this.layout.width * 0.5 - areaWidth / 2 + col * (areaWidth / cols) + shift;
        const y = startY + row * (30 * this.layout.uiScale);

        if (x < 24 || x > this.layout.width - 24) {
          continue;
        }

        pegs.push({
          x,
          y,
          radius: 5.4 * this.layout.uiScale,
        });
      }
    }

    return pegs;
  }

  /**
   * Codex: 最終得点のくぼみ（スコアポケット）を生成する。
   */
  private createScorePockets(): ScorePocket[] {
    const multipliers = [2, 3, 5, 3, 2];
    return multipliers.map((multiplier, index) => {
      const t = (index + 0.5) / multipliers.length;
      return {
        x: this.layout.width * (0.08 + t * 0.84),
        y: this.layout.height - 32 * this.layout.uiScale,
        width: 72 * this.layout.uiScale,
        height: 42 * this.layout.uiScale,
        multiplier,
      };
    });
  }

  /**
   * Codex: ボールがポケット領域に入っているか判定する。
   */
  private findPocket(x: number, y: number): ScorePocket | null {
    return this.scorePockets.find((pocket) => (
      x >= pocket.x - pocket.width / 2
      && x <= pocket.x + pocket.width / 2
      && y >= pocket.y - pocket.height / 2
      && y <= pocket.y + pocket.height / 2
    )) ?? null;
  }
}

new Phaser.Game(createConfig([SummaryScene]));
