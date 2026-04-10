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
  id: number;
  gx: number;
  gy: number;
  targetGx: number;
  targetGy: number;
  x: number;
  y: number;
  speed: number;
  carryValue: number | null;
  dirX: number;
  dirY: number;
  stepCooldown: number;
  pathHistory: string[];
  forcedPause: number;
  actionDuration: number;
  sleepTimer: number;
  sleepCooldown: number;
  idleTimer: number;
  walkCycle: number;
};

type MergeEffect = {
  x: number;
  y: number;
  value: number;
  age: number;
  duration: number;
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

  private readonly catSleepDuration = 10;

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

  private cats: CatAgent[] = [];

  private mergeEffects: MergeEffect[] = [];

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
    this.cats = this.createCats();

    this.input.on('pointerdown', () => {
      this.spawnTapBall();
    });

    this.bindResponsiveLayout();
  }

  /**
   * Codex: 猫の行動・落下球の更新・演出更新を行う。
   */
  public update(_time: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    this.updateFallingBalls(dt);
    this.updateCats(dt);
    this.updateMergeEffects(dt);
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

    this.cats.forEach((cat) => {
      const catPos = this.gridToScreen(cat.gx, cat.gy);
      cat.x = catPos.x;
      cat.y = catPos.y;
      cat.targetGx = cat.gx;
      cat.targetGy = cat.gy;
    });

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
   * Codex: 3匹の猫それぞれに行動決定と補間移動を適用する。
   */
  private updateCats(dt: number): void {
    this.cats.forEach((cat) => {
      if (cat.sleepTimer > 0) {
        cat.sleepTimer = Math.max(0, cat.sleepTimer - dt);
        if (cat.sleepTimer === 0) {
          cat.actionDuration = 0;
        }
        return;
      }

      const targetPos = this.gridToScreen(cat.targetGx, cat.targetGy);
      const dx = targetPos.x - cat.x;
      const dy = targetPos.y - cat.y;
      const distance = Math.hypot(dx, dy);
      const maxMove = cat.speed * dt;

      if (distance > 0.001) {
        cat.walkCycle += dt * 6;
        const ratio = Math.min(1, maxMove / distance);
        cat.x += dx * ratio;
        cat.y += dy * ratio;
        return;
      }

      cat.walkCycle = 0;
      cat.x = targetPos.x;
      cat.y = targetPos.y;
      cat.gx = cat.targetGx;
      cat.gy = cat.targetGy;
      cat.pathHistory = this.pushPathHistory(cat.pathHistory, cat.gx, cat.gy);
      cat.stepCooldown = Math.max(0, cat.stepCooldown - dt);
      cat.forcedPause = Math.max(0, cat.forcedPause - dt);
      cat.sleepCooldown = Math.max(0, cat.sleepCooldown - dt);
      if (cat.stepCooldown > 0) {
        return;
      }
      if (cat.forcedPause > 0) {
        return;
      }
      if (cat.idleTimer > 0) {
        cat.idleTimer = Math.max(0, cat.idleTimer - dt);
        return;
      }

      if (cat.sleepCooldown <= 0) {
        this.startCatSleep(cat);
        return;
      }
      if (this.shouldStartCatIdle(cat)) {
        return;
      }

      this.resolveCatCellAction(cat);
      cat.actionDuration += dt;

      const next = this.chooseNextCatStep(cat);
      if (!next) {
        cat.stepCooldown = 0.2;
        return;
      }

      cat.dirX = Phaser.Math.Clamp(next.gx - cat.gx, -1, 1);
      cat.dirY = Phaser.Math.Clamp(next.gy - cat.gy, -1, 1);
      cat.targetGx = next.gx;
      cat.targetGy = next.gy;
      cat.stepCooldown = this.computeCatStepCooldown(cat, next.gx, next.gy);
    });
  }

  /**
   * Codex: 連続移動時は待機を減らし、複数セルをまたぐ移動を許可する。
   */
  private computeCatStepCooldown(cat: CatAgent, nextGx: number, nextGy: number): number {
    const axisMove = Math.abs(nextGx - cat.gx) + Math.abs(nextGy - cat.gy);
    if (axisMove === 1) {
      return 0;
    }

    return 0.04;
  }

  /**
   * Codex: 侵入制約を守って猫の次セルを決める。
   */
  private chooseNextCatStep(cat: CatAgent): { gx: number; gy: number } | null {
    const goal = this.findCatGoal(cat);
    if (!goal) {
      return null;
    }

    const moveSpan = cat.carryValue === null ? 1 : 3;
    const candidates = this.getCatStepCandidates(cat, moveSpan)
      .filter((cell) => this.canCatEnter(cat, cell.gx, cell.gy));

    if (candidates.length === 0) {
      return null;
    }

    candidates.sort((a, b) => {
      const da = Math.abs(goal.gx - a.gx) + Math.abs(goal.gy - a.gy);
      const db = Math.abs(goal.gx - b.gx) + Math.abs(goal.gy - b.gy);
      return da - db;
    });

    const next = candidates.find((candidate) => !this.willRepeatPath(cat, candidate.gx, candidate.gy));
    if (next) {
      return next;
    }

    cat.forcedPause = 0.36;
    return null;
  }

  /**
   * Codex: 運搬中の停止を防ぐため、猫の任意休憩は発生させない。
   */
  private shouldStartCatIdle(_cat: CatAgent): boolean {
    return false;
  }

  /**
   * Codex: 運搬中は複数セル先まで含めた移動候補を返す。
   */
  private getCatStepCandidates(cat: CatAgent, maxSpan: number): Array<{ gx: number; gy: number }> {
    const candidates: Array<{ gx: number; gy: number }> = [];
    for (let gy = 0; gy < this.gridSize; gy += 1) {
      for (let gx = 0; gx < this.gridSize; gx += 1) {
        const dist = Math.abs(gx - cat.gx) + Math.abs(gy - cat.gy);
        if (dist === 0 || dist > maxSpan) {
          continue;
        }
        candidates.push({ gx, gy });
      }
    }
    return candidates;
  }

  /**
   * Codex: 空荷なら最寄りボール、積載中なら同値ボールを目標セルにする。
   */
  private findCatGoal(cat: CatAgent): { gx: number; gy: number } | null {
    if (cat.carryValue === null) {
      const target = this.findBallForSearch(cat);
      return target ? { gx: target.gx, gy: target.gy } : null;
    }

    const same = this.findNearestBall(cat.gx, cat.gy, (ball) => (
      ball.value === cat.carryValue && !(ball.gx === cat.gx && ball.gy === cat.gy)
    ));

    if (same) {
      return { gx: same.gx, gy: same.gy };
    }

    const empty = this.findNearestEmptyCell(cat.gx, cat.gy);
    return empty ? { gx: empty.gx, gy: empty.gy } : null;
  }

  /**
   * Codex: 猫が入ったセルで拾得・マージ・一時退避を処理する。
   */
  private resolveCatCellAction(cat: CatAgent): void {
    const ball = this.findBallAt(cat.gx, cat.gy);
    if (!ball) {
      if (cat.carryValue !== null) {
        this.balls.push({
          id: this.nextBallId++,
          gx: cat.gx,
          gy: cat.gy,
          value: cat.carryValue,
        });
        cat.carryValue = null;
      }
      return;
    }

    if (cat.carryValue === null) {
      cat.carryValue = ball.value;
      this.removeBallById(ball.id);
      return;
    }

    if (cat.carryValue === ball.value) {
      ball.value += cat.carryValue;
      this.pushMergeEffect(cat.gx, cat.gy, ball.value);
      cat.carryValue = null;
    }
  }

  /**
   * Codex: ボール占有セルの侵入可否を要件どおり判定する。
   */
  private canCatEnter(cat: CatAgent, gx: number, gy: number): boolean {
    if (this.isCellTargetedByOtherCat(cat.id, gx, gy)) {
      return false;
    }

    const ball = this.findBallAt(gx, gy);
    if (!ball) {
      return true;
    }

    if (cat.carryValue === null) {
      return true;
    }

    return ball.value === cat.carryValue;
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
    this.drawCats();
    this.drawMergeEffects();

    const carrying = this.cats.filter((cat) => cat.carryValue !== null).length;
    const sleeping = this.cats.filter((cat) => cat.sleepTimer > 0).length;
    const mergeHint = carrying === 0
      ? '3匹とも空荷: 任意ボールセルに侵入可能'
      : `運搬中の猫 ${carrying}匹: 同値セルへ運搬して合体`;
    const sleepHint = sleeping > 0 ? `睡眠中 ${sleeping}匹: 約10秒で復帰` : '猫は疲れると約10秒眠る';
    this.infoText.setText(`タップで2/4/8を空セルへ落下。 同じ数字で合体。\n${mergeHint} / ${sleepHint}`);
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
  private drawCats(): void {
    const catFontPx = Math.round(34 * this.layout.uiScale);
    this.cats.forEach((cat) => {
      const renderY = cat.y + this.getCatWalkBob(cat);
      const catText = this.add.text(cat.x, renderY, '🐈', {
        fontFamily: 'sans-serif',
        fontSize: `${catFontPx}px`,
      }).setOrigin(0.5, 0.74);
      catText.setScale(this.getCatFacingScaleX(cat), 1);
      this.transientTexts.push(catText);

      if (cat.sleepTimer > 0 && this.isSleepBubbleVisible(cat)) {
        this.transientTexts.push(this.add.text(
          cat.x,
          renderY - this.layout.tileH * 0.84,
          '🫧',
          {
            fontFamily: 'sans-serif',
            fontSize: `${Math.round(catFontPx * 0.78)}px`,
          },
        ).setOrigin(0.5));
      }

      if (cat.carryValue === null || cat.sleepTimer > 0) {
        return;
      }

      const frontX = cat.x + cat.dirX * this.layout.tileW * 0.22;
      const frontY = renderY + cat.dirY * this.layout.tileH * 0.22 - this.layout.tileH * 0.22;
      const radius = this.layout.tileH * 0.27;

      this.graphics.fillStyle(this.pickBallColor(cat.carryValue), 1);
      this.graphics.fillCircle(frontX, frontY, radius);
      this.graphics.lineStyle(2, 0x0f172a, 0.72);
      this.graphics.strokeCircle(frontX, frontY, radius);

      this.transientTexts.push(this.add.text(frontX, frontY, String(cat.carryValue), {
        color: '#0f172a',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
        fontSize: `${Math.round(this.layout.tileH * 0.35)}px`,
      }).setOrigin(0.5));
    });
  }

  /**
   * GPT-5.3-Codex: 進行方向の画面X成分から猫絵文字の左右反転スケールを返す。
   */
  private getCatFacingScaleX(cat: CatAgent): number {
    const screenDirX = cat.dirX - cat.dirY;
    if (screenDirX > 0) {
      return -1;
    }

    return 1;
  }

  /**
   * Codex: 移動中の猫に上下の揺れを加えて歩行感を出す。
   */
  private getCatWalkBob(cat: CatAgent): number {
    const moving = cat.gx !== cat.targetGx || cat.gy !== cat.targetGy;
    if (!moving) {
      return 0;
    }

    return Math.sin(cat.walkCycle) * this.layout.tileH * 0.1;
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
      if (!this.findBallAt(current.gx, current.gy) && !this.isCatOnCell(current.gx, current.gy)) {
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

  /**
   * Codex: 猫3匹の初期配置を作成する。
   */
  private createCats(): CatAgent[] {
    const starts = [
      { gx: 1, gy: 1, dirX: 1, dirY: 0 },
      { gx: 2, gy: 3, dirX: 0, dirY: -1 },
      { gx: 4, gy: 2, dirX: -1, dirY: 0 },
    ];

    return starts.map((start, index) => {
      const p = this.gridToScreen(start.gx, start.gy);
      return {
        id: index + 1,
        gx: start.gx,
        gy: start.gy,
        targetGx: start.gx,
        targetGy: start.gy,
        x: p.x,
        y: p.y,
        speed: Phaser.Math.FloatBetween(92, 122),
        carryValue: null,
        dirX: start.dirX,
        dirY: start.dirY,
        stepCooldown: 0,
        pathHistory: [`${start.gx},${start.gy}`],
        forcedPause: 0,
        actionDuration: 0,
        sleepTimer: 0,
        sleepCooldown: Phaser.Math.FloatBetween(18, 26),
        idleTimer: 0,
        walkCycle: Phaser.Math.FloatBetween(0, Math.PI * 2),
      };
    });
  }

  /**
   * Codex: 空荷の猫が近場だけでなく遠方ボールも狙う探索目標を返す。
   */
  private findBallForSearch(cat: CatAgent): GridBall | null {
    const allBalls = this.balls.slice();
    if (allBalls.length === 0) {
      return null;
    }

    const sorted = allBalls.sort((a, b) => {
      const da = Math.abs(a.gx - cat.gx) + Math.abs(a.gy - cat.gy);
      const db = Math.abs(b.gx - cat.gx) + Math.abs(b.gy - cat.gy);
      return da - db;
    });

    if (sorted.length <= 2 || Phaser.Math.FloatBetween(0, 1) < 0.64) {
      return sorted[0];
    }

    const midToFar = sorted.slice(Math.min(2, sorted.length - 1));
    return Phaser.Utils.Array.GetRandom(midToFar);
  }

  /**
   * Codex: 一定時間働いた猫を約10秒の睡眠状態へ遷移させる。
   */
  private startCatSleep(cat: CatAgent): void {
    cat.sleepTimer = this.catSleepDuration + Phaser.Math.FloatBetween(-1, 1);
    cat.sleepCooldown = Number.POSITIVE_INFINITY;
    cat.stepCooldown = 0.35;
    cat.forcedPause = 0;
    cat.targetGx = cat.gx;
    cat.targetGy = cat.gy;
    cat.pathHistory = [`${cat.gx},${cat.gy}`];
    if (cat.carryValue !== null && !this.findBallAt(cat.gx, cat.gy)) {
      this.balls.push({
        id: this.nextBallId++,
        gx: cat.gx,
        gy: cat.gy,
        value: cat.carryValue,
      });
      cat.carryValue = null;
    }
    this.time.delayedCall(cat.sleepTimer * 1000, () => {
      cat.sleepCooldown = Phaser.Math.FloatBetween(18, 26);
      cat.actionDuration = 0;
    });
  }

  /**
   * Codex: 猫の移動履歴を固定長で更新する。
   */
  private pushPathHistory(history: string[], gx: number, gy: number): string[] {
    const key = `${gx},${gy}`;
    if (history[history.length - 1] === key) {
      return history;
    }

    const nextHistory = [...history, key];
    return nextHistory.slice(-7);
  }

  /**
   * Codex: 次の移動が同一パターン反復になるかを判定する。
   */
  private willRepeatPath(cat: CatAgent, nextGx: number, nextGy: number): boolean {
    const simulated = [...cat.pathHistory, `${nextGx},${nextGy}`].slice(-6);
    if (simulated.length < 6) {
      return false;
    }

    const [a, b, c, d, e, f] = simulated;
    const repeatsTwoStep = a === c && c === e && b === d && d === f;
    const repeatsThreeStep = a === d && b === e && c === f;
    return repeatsTwoStep || repeatsThreeStep;
  }

  /**
   * Codex: セルに猫が存在するかを判定する。
   */
  private isCatOnCell(gx: number, gy: number): boolean {
    return this.cats.some((cat) => cat.gx === gx && cat.gy === gy);
  }

  /**
   * Codex: 他の猫が同じ目標セルを狙っていないか判定する。
   */
  private isCellTargetedByOtherCat(catId: number, gx: number, gy: number): boolean {
    return this.cats.some((cat) => (
      cat.id !== catId
      && cat.targetGx === gx
      && cat.targetGy === gy
    ));
  }

  /**
   * Codex: マージ演出を追加する。
   */
  private pushMergeEffect(gx: number, gy: number, value: number): void {
    const p = this.gridToScreen(gx, gy);
    this.mergeEffects.push({
      x: p.x,
      y: p.y - this.layout.tileH * 0.26,
      value,
      age: 0,
      duration: 0.42,
    });
  }

  /**
   * Codex: マージ演出の寿命を更新する。
   */
  private updateMergeEffects(dt: number): void {
    this.mergeEffects.forEach((effect) => {
      effect.age += dt;
    });
    this.mergeEffects = this.mergeEffects.filter((effect) => effect.age < effect.duration);
  }

  /**
   * Codex: マージ時のリングとテキスト演出を描画する。
   */
  private drawMergeEffects(): void {
    this.mergeEffects.forEach((effect) => {
      const t = effect.age / effect.duration;
      const alpha = Phaser.Math.Clamp(1 - t, 0, 1);
      const radius = this.layout.tileH * (0.34 + t * 0.82);
      const sparkleY = effect.y - this.layout.tileH * 0.24 - t * this.layout.tileH * 0.32;

      this.graphics.lineStyle(3, 0xfef08a, alpha * 0.95);
      this.graphics.strokeCircle(effect.x, effect.y, radius);
      this.graphics.lineStyle(2, 0xffffff, alpha * 0.75);
      this.graphics.strokeCircle(effect.x, effect.y, radius * 0.65);

      this.transientTexts.push(this.add.text(effect.x, sparkleY, `✨+${effect.value}`, {
        color: '#fde68a',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
        fontSize: `${Math.round(this.layout.tileH * 0.34)}px`,
      }).setOrigin(0.5).setAlpha(alpha));
    });
  }

  /**
   * Codex: 睡眠中の猫に対して1秒間隔で泡の点滅表示を切り替える。
   */
  private isSleepBubbleVisible(cat: CatAgent): boolean {
    return Math.floor(cat.sleepTimer) % 2 === 0;
  }
}

new Phaser.Game(createConfig([SummaryScene]));
