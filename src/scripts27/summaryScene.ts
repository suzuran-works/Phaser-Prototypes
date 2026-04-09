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
  collected: boolean;
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
  sealY: number;
};

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts27SummaryScene';

  private readonly gridSize = 7;

  private readonly ballEmojis = ['⚽️', '🏀', '🏐', '🎾', '🏈', '⚾️'];

  private readonly spawnInterval = 0.95;

  private layout: SceneLayout = {
    width: 1080,
    height: 1080,
    uiScale: 1,
    fieldCenterX: 540,
    fieldTopY: 170,
    tileW: 96,
    tileH: 48,
    sealY: 780,
  };

  private graphics!: Phaser.GameObjects.Graphics;

  private titleText!: Phaser.GameObjects.Text;

  private infoText!: Phaser.GameObjects.Text;

  private scoreText!: Phaser.GameObjects.Text;

  private sealText!: Phaser.GameObjects.Text;

  private balls: FallingBall[] = [];

  private nextBallId = 1;

  private spawnTimer = 0;

  private score = 0;

  private missed = 0;

  private sealGX = 3;

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
      fontSize: '84px',
    }).setOrigin(0.5, 0.62);

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.sealGX = this.screenXToGrid(pointer.x);
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.sealGX = this.screenXToGrid(pointer.x);
    });

    this.bindResponsiveLayout();
  }

  /**
   * Codex: 経過時間に応じてボール落下・衝突判定・描画状態を更新する。
   */
  public update(_time: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);

    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer -= this.spawnInterval;
      this.spawnBall();
    }

    this.updateFallingBalls(dt);
    this.syncUiTexts();
  }

  /**
   * Codex: 画面サイズに応じてクォータービュー盤面とUI寸法を計算する。
   */
  protected computeLayout(width: number, height: number): SceneLayout {
    const uiScale = Math.max(0.68, Math.min(1.15, Math.min(width / 1080, height / 1080)));
    const tileW = Math.max(66, Math.round(96 * uiScale));
    const tileH = Math.round(tileW * 0.5);

    return {
      width,
      height,
      uiScale,
      fieldCenterX: width * 0.5,
      fieldTopY: Math.round(190 * uiScale),
      tileW,
      tileH,
      sealY: Math.round(height - Math.max(130, 180 * uiScale)),
    };
  }

  /**
   * Codex: レイアウト反映時に盤面・アザラシ・ボールの表示位置を再計算する。
   */
  protected renderLayout(layout: SceneLayout): void {
    this.layout = layout;

    this.titleText.setPosition(layout.width * 0.5, 14 * layout.uiScale).setFontSize(32 * layout.uiScale);
    this.infoText.setPosition(layout.width * 0.5, 98 * layout.uiScale).setFontSize(20 * layout.uiScale);
    this.scoreText.setPosition(layout.width - 18 * layout.uiScale, 16 * layout.uiScale).setFontSize(22 * layout.uiScale);
    this.sealText.setFontSize(84 * layout.uiScale);

    this.drawField();
    this.placeSeal();
    this.repositionBalls();
    this.syncUiTexts();
  }

  /**
   * Codex: クォータービュー風の床グリッドとキャッチ帯を描画する。
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
        this.graphics.fillStyle(color, 0.6);
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

    // Codex: 手前の帯を明るくして、アザラシが拾うラインを視覚化する。
    const left = this.gridToScreen(0, this.gridSize - 1, 0);
    const right = this.gridToScreen(this.gridSize - 1, this.gridSize - 1, 0);
    this.graphics.fillStyle(0x60a5fa, 0.18);
    this.graphics.fillRect(left.x - tileW * 0.55, left.y - tileH, right.x - left.x + tileW * 1.1, tileH * 1.6);
  }

  /**
   * Codex: 新しい絵文字ボールをランダム座標の上空へ生成する。
   */
  private spawnBall(): void {
    const ball: FallingBall = {
      id: this.nextBallId++,
      emoji: Phaser.Utils.Array.GetRandom(this.ballEmojis),
      gx: Phaser.Math.Between(0, this.gridSize - 1),
      gy: Phaser.Math.Between(1, this.gridSize - 1),
      z: Phaser.Math.FloatBetween(410, 560),
      vz: Phaser.Math.FloatBetween(200, 260),
      collected: false,
      sprite: this.add.text(0, 0, '', {
        fontFamily: 'sans-serif',
        fontSize: `${Math.round(54 * this.layout.uiScale)}px`,
      }).setOrigin(0.5),
    };

    ball.sprite.setText(ball.emoji);
    this.balls.push(ball);
    this.syncBallSprite(ball);
  }

  /**
   * Codex: 落下更新とキャッチ/取り逃し判定を行い、不要ボールを破棄する。
   */
  private updateFallingBalls(dt: number): void {
    const sealCenter = this.gridToScreen(this.sealGX, this.gridSize - 1, 0);

    this.balls.forEach((ball) => {
      if (ball.collected) {
        return;
      }

      ball.vz += 360 * dt;
      ball.z = Math.max(0, ball.z - ball.vz * dt);
      this.syncBallSprite(ball);

      const projected = this.gridToScreen(ball.gx, ball.gy, ball.z);
      const canCatch = ball.z < 72;
      const nearSeal = Phaser.Math.Distance.Between(projected.x, projected.y, sealCenter.x, sealCenter.y) < this.layout.tileW * 0.62;

      if (canCatch && nearSeal) {
        ball.collected = true;
        this.score += 1;
        ball.sprite.destroy();
      } else if (ball.z <= 0) {
        ball.collected = true;
        this.missed += 1;
        ball.sprite.destroy();
      }
    });

    this.balls = this.balls.filter((ball) => !ball.collected);
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
   * Codex: ポインター座標を最寄りのグリッド列へ丸める。
   */
  private screenXToGrid(screenX: number): number {
    const projectedCenter = this.gridToScreen(0, this.gridSize - 1, 0);
    const offset = screenX - projectedCenter.x;
    const gx = Math.round(offset / (this.layout.tileW * 0.5));
    return Phaser.Math.Clamp(gx, 0, this.gridSize - 1);
  }

  /**
   * Codex: 現在のグリッド列にあわせてアザラシ絵文字を配置する。
   */
  private placeSeal(): void {
    const center = this.gridToScreen(this.sealGX, this.gridSize - 1, 0);
    this.sealText.setPosition(center.x, this.layout.sealY);
  }

  /**
   * Codex: すべての落下中ボールを現在のレイアウトで再配置する。
   */
  private repositionBalls(): void {
    this.balls.forEach((ball) => {
      ball.sprite.setFontSize(54 * this.layout.uiScale);
      this.syncBallSprite(ball);
    });
  }

  /**
   * Codex: ボールの内部座標をスクリーン表示へ反映する。
   */
  private syncBallSprite(ball: FallingBall): void {
    const point = this.gridToScreen(ball.gx, ball.gy, ball.z);
    ball.sprite.setPosition(point.x, point.y);
  }

  /**
   * Codex: タイトル下メッセージとスコア表示を最新状態へ更新する。
   */
  private syncUiTexts(): void {
    this.placeSeal();
    this.infoText.setText('左右へドラッグ/タップして🦭を移動\n落ちてくるボール絵文字を拾おう');
    this.scoreText.setText(`ひろった: ${this.score} / こぼした: ${this.missed}`);
  }
}

new Phaser.Game(createConfig([SummaryScene]));
