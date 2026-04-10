import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BaseResponsiveScene } from '../baseResponsiveScene.ts';
import { BACKGROUND_COLOR, SUBTITLE, TITLE } from './define.ts';

type FallingBall = {
  id: number;
  emoji: string;
  gx: number;
  gy: number;
  z: number;
  vz: number;
  settled: boolean;
  sprite: Phaser.GameObjects.Text;
};

type SceneLayout = {
  width: number;
  height: number;
  uiScale: number;
  fieldCenterX: number;
  fieldTopY: number;
  tileW: number;
  tileH: number;
};

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts27SummaryScene';

  private readonly gridSize = 7;

  private readonly maxCarry = 10;

  private readonly ballEmojis = ['⚽️', '🏀', '🏐', '🎾', '🏈', '⚾️'];

  private readonly spawnInterval = 0.9;

  private layout: SceneLayout = {
    width: 1080,
    height: 1080,
    uiScale: 1,
    fieldCenterX: 540,
    fieldTopY: 180,
    tileW: 96,
    tileH: 48,
  };

  private graphics!: Phaser.GameObjects.Graphics;

  private titleText!: Phaser.GameObjects.Text;

  private infoText!: Phaser.GameObjects.Text;

  private scoreText!: Phaser.GameObjects.Text;

  private sealText!: Phaser.GameObjects.Text;

  private stackTexts: Phaser.GameObjects.Text[] = [];

  private balls: FallingBall[] = [];

  private nextBallId = 1;

  private spawnTimer = 0;

  private pickedCount = 0;

  private carryCount = 0;

  private settledCount = 0;

  private sealGX = 3;

  private sealGY = 6;

  /**
   * Codex: ボールを拾うアザラシゲームのシーンを初期化する。
   */
  public constructor() {
    super(SummaryScene.key);
  }

  /**
   * Codex: UI・入力・初期状態を作成してレスポンシブ描画を開始する。
   */
  public create(): void {
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);
    this.graphics = this.add.graphics();

    this.titleText = this.add.text(0, 0, `${TITLE}\n${SUBTITLE}`, {
      fontFamily: 'sans-serif',
      color: '#dbeafe',
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: 6,
      fontSize: '32px',
    }).setOrigin(0.5, 0);

    this.infoText = this.add.text(0, 0, '', {
      fontFamily: 'sans-serif',
      color: '#93c5fd',
      align: 'center',
      lineSpacing: 5,
      fontSize: '20px',
    }).setOrigin(0.5, 0);

    this.scoreText = this.add.text(0, 0, '', {
      fontFamily: 'sans-serif',
      color: '#fde68a',
      fontStyle: 'bold',
      fontSize: '22px',
    }).setOrigin(1, 0);

    this.sealText = this.add.text(0, 0, '🦭', {
      fontFamily: 'sans-serif',
      fontSize: '82px',
    }).setOrigin(0.5, 0.62);

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.moveSealToPointer(pointer.x, pointer.y);
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.moveSealToPointer(pointer.x, pointer.y);
    });

    this.bindResponsiveLayout();
  }

  /**
   * Codex: 経過時間に応じてボール落下・拾得判定・表示を更新する。
   */
  public update(_time: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);

    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer -= this.spawnInterval;
      this.spawnBall();
    }

    this.updateFallingBalls(dt);
    this.collectBallsNearSeal();
    this.syncUiTexts();
  }

  /**
   * Codex: 画面サイズに応じてクォータービュー盤面とUI寸法を計算する。
   */
  protected computeLayout(width: number, height: number): SceneLayout {
    const uiScale = Math.max(0.68, Math.min(1.15, Math.min(width / 1080, height / 1080)));
    const tileW = Math.max(64, Math.round(96 * uiScale));
    const tileH = Math.round(tileW * 0.5);

    return {
      width,
      height,
      uiScale,
      fieldCenterX: width * 0.5,
      fieldTopY: Math.round(190 * uiScale),
      tileW,
      tileH,
    };
  }

  /**
   * Codex: レイアウト反映時に盤面・アザラシ・ボールの表示位置を再計算する。
   */
  protected renderLayout(layout: SceneLayout): void {
    this.layout = layout;

    this.titleText.setPosition(layout.width * 0.5, 14 * layout.uiScale).setFontSize(31 * layout.uiScale);
    this.infoText.setPosition(layout.width * 0.5, 100 * layout.uiScale).setFontSize(19 * layout.uiScale);
    this.scoreText.setPosition(layout.width - 18 * layout.uiScale, 16 * layout.uiScale).setFontSize(22 * layout.uiScale);
    this.sealText.setFontSize(82 * layout.uiScale);

    this.drawField();
    this.placeSeal();
    this.repositionBalls();
    this.syncStackVisuals();
    this.syncUiTexts();
  }

  /**
   * Codex: クォータービュー風の床グリッドを描画する。
   */
  private drawField(): void {
    const { tileW, tileH } = this.layout;
    this.graphics.clear();

    this.graphics.fillStyle(0x0a1b3d, 1);
    this.graphics.fillRect(0, 0, this.layout.width, this.layout.height);

    for (let gy = 0; gy < this.gridSize; gy += 1) {
      for (let gx = 0; gx < this.gridSize; gx += 1) {
        const center = this.gridToScreen(gx, gy, 0);
        const color = (gx + gy) % 2 === 0 ? 0x1e3a8a : 0x1d4ed8;
        this.graphics.fillStyle(color, 0.62);
        this.graphics.lineStyle(2, 0x93c5fd, 0.35);
        this.graphics.beginPath();
        this.graphics.moveTo(center.x, center.y - tileH * 0.5);
        this.graphics.lineTo(center.x + tileW * 0.5, center.y);
        this.graphics.lineTo(center.x, center.y + tileH * 0.5);
        this.graphics.lineTo(center.x - tileW * 0.5, center.y);
        this.graphics.closePath();
        this.graphics.fillPath();
        this.graphics.strokePath();
      }
    }
  }

  /**
   * Codex: 新しいボールをランダム座標の上空へ生成する。
   */
  private spawnBall(): void {
    const ball: FallingBall = {
      id: this.nextBallId++,
      emoji: Phaser.Utils.Array.GetRandom(this.ballEmojis),
      gx: Phaser.Math.Between(0, this.gridSize - 1),
      gy: Phaser.Math.Between(0, this.gridSize - 1),
      z: Phaser.Math.FloatBetween(380, 540),
      vz: Phaser.Math.FloatBetween(190, 250),
      settled: false,
      sprite: this.add.text(0, 0, '', {
        fontFamily: 'sans-serif',
        fontSize: `${Math.round(50 * this.layout.uiScale)}px`,
      }).setOrigin(0.5),
    };

    ball.sprite.setText(ball.emoji);
    this.balls.push(ball);
    this.syncBallSprite(ball);
  }

  /**
   * Codex: 落下中ボールを更新し、地面に着地した状態へ切り替える。
   */
  private updateFallingBalls(dt: number): void {
    this.balls.forEach((ball) => {
      if (ball.settled) {
        return;
      }

      ball.vz += 340 * dt;
      ball.z = Math.max(0, ball.z - ball.vz * dt);
      if (ball.z <= 0) {
        ball.z = 0;
        ball.settled = true;
      }
      this.syncBallSprite(ball);
    });

    this.settledCount = this.balls.filter((ball) => ball.settled).length;
  }

  /**
   * Codex: アザラシ周辺の地面ボールを拾い、10個まで積み上げ数を更新する。
   */
  private collectBallsNearSeal(): void {
    if (this.carryCount >= this.maxCarry) {
      return;
    }

    const reachableDistance = this.layout.tileW * 0.35;
    const sealPoint = this.gridToScreen(this.sealGX, this.sealGY, 0);
    const collectables = this.balls
      .filter((ball) => ball.settled)
      .filter((ball) => {
        const point = this.gridToScreen(ball.gx, ball.gy, 0);
        return Phaser.Math.Distance.Between(point.x, point.y, sealPoint.x, sealPoint.y) <= reachableDistance;
      })
      .sort((a, b) => a.id - b.id);

    if (collectables.length === 0) {
      return;
    }

    const room = this.maxCarry - this.carryCount;
    const picked = collectables.slice(0, room);

    picked.forEach((ball) => {
      ball.sprite.destroy();
      this.pickedCount += 1;
      this.carryCount += 1;
    });

    const pickedIds = new Set(picked.map((ball) => ball.id));
    this.balls = this.balls.filter((ball) => !pickedIds.has(ball.id));
    this.settledCount = this.balls.filter((ball) => ball.settled).length;
    this.syncStackVisuals();
  }

  /**
   * Codex: グリッド座標と高さをクォータービューのスクリーン座標へ変換する。
   */
  private gridToScreen(gx: number, gy: number, z: number): { x: number; y: number } {
    return {
      x: this.layout.fieldCenterX + (gx - gy) * this.layout.tileW * 0.5,
      y: this.layout.fieldTopY + (gx + gy) * this.layout.tileH * 0.5 - z,
    };
  }

  /**
   * Codex: 画面座標を最寄りのグリッドへ逆変換してアザラシ位置を更新する。
   */
  private moveSealToPointer(screenX: number, screenY: number): void {
    const localX = (screenX - this.layout.fieldCenterX) / (this.layout.tileW * 0.5);
    const localY = (screenY - this.layout.fieldTopY) / (this.layout.tileH * 0.5);
    const gx = Math.round((localX + localY) * 0.5);
    const gy = Math.round((localY - localX) * 0.5);
    this.sealGX = Phaser.Math.Clamp(gx, 0, this.gridSize - 1);
    this.sealGY = Phaser.Math.Clamp(gy, 0, this.gridSize - 1);
    this.placeSeal();
    this.syncStackVisuals();
  }

  /**
   * Codex: 現在のグリッド位置にあわせてアザラシ絵文字を配置する。
   */
  private placeSeal(): void {
    const center = this.gridToScreen(this.sealGX, this.sealGY, 0);
    const rise = 18 * this.layout.uiScale;
    this.sealText.setPosition(center.x, center.y - rise).setDepth(3000 + this.sealGX + this.sealGY);
  }

  /**
   * Codex: すべてのボールを現在のレイアウトで再配置する。
   */
  private repositionBalls(): void {
    this.balls.forEach((ball) => {
      ball.sprite.setFontSize(50 * this.layout.uiScale);
      this.syncBallSprite(ball);
    });
  }

  /**
   * Codex: ボールの内部座標をスクリーン表示へ反映する。
   */
  private syncBallSprite(ball: FallingBall): void {
    const point = this.gridToScreen(ball.gx, ball.gy, ball.z);
    const depth = ball.settled ? 1000 + ball.gx + ball.gy : 2000 + (this.gridSize - ball.gy) * 20 + (this.gridSize - ball.gx);
    ball.sprite.setPosition(point.x, point.y).setDepth(depth);
  }

  /**
   * Codex: アザラシの所持ボール段数を絵文字で積み上げ表示する。
   */
  private syncStackVisuals(): void {
    while (this.stackTexts.length > this.carryCount) {
      const text = this.stackTexts.pop();
      text?.destroy();
    }

    while (this.stackTexts.length < this.carryCount) {
      const stackText = this.add.text(0, 0, '⚽️', {
        fontFamily: 'sans-serif',
        fontSize: `${Math.round(32 * this.layout.uiScale)}px`,
      }).setOrigin(0.5, 0.5);
      this.stackTexts.push(stackText);
    }

    const sealPos = this.gridToScreen(this.sealGX, this.sealGY, 0);
    this.stackTexts.forEach((text, index) => {
      const zigzag = index % 2 === 0 ? -1 : 1;
      const level = Math.floor(index / 2);
      text
        .setFontSize(32 * this.layout.uiScale)
        .setPosition(
          sealPos.x + zigzag * (8 + level * 2) * this.layout.uiScale,
          sealPos.y - (36 + index * 14) * this.layout.uiScale,
        )
        .setDepth(this.sealText.depth + 10 + index);
    });
  }

  /**
   * Codex: タイトル下メッセージとスコア表示を最新状態へ更新する。
   */
  private syncUiTexts(): void {
    this.infoText.setText('盤面をドラッグ/タップして🦭を移動\n落ちたボールを拾って10個まで積み上げよう');
    this.scoreText.setText(`所持: ${this.carryCount}/${this.maxCarry}  累計回収: ${this.pickedCount}  地面: ${this.settledCount}`);
  }
}

new Phaser.Game(createConfig([SummaryScene]));
