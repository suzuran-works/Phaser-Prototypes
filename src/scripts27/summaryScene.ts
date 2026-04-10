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

type SealState = {
  id: number;
  gx: number;
  gy: number;
  targetGX: number;
  targetGY: number;
  retargetTimer: number;
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

  private readonly sealCount = 3;

  private readonly ballEmojis = ['⚽️', '🏀', '🏐', '🎾', '🏈', '⚾️'];

  private readonly targetPickInterval = 2.6;

  private readonly sealStepInterval = 1.1;

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

  private stackTexts: Phaser.GameObjects.Text[] = [];

  private balls: FallingBall[] = [];

  private seals: SealState[] = [];

  private sealStepTimer = 0;

  private nextBallId = 1;

  private pickedCount = 0;

  private settledCount = 0;

  private stackEmojis: string[] = [];

  /**
   * GPT-5.3-Codex: ボールを拾うアザラシゲームのシーンを初期化する。
   */
  public constructor() {
    super(SummaryScene.key);
  }

  /**
   * GPT-5.3-Codex: UI・入力・初期状態を作成してレスポンシブ描画を開始する。
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

    this.createSeals();

    this.input.on('pointerdown', () => {
      this.spawnRandomBall();
    });

    this.bindResponsiveLayout();
  }

  /**
   * GPT-5.3-Codex: アザラシを3匹生成して初期位置を割り当てる。
   */
  private createSeals(): void {
    const initialCells = [
      { gx: 1, gy: 5 },
      { gx: 3, gy: 6 },
      { gx: 5, gy: 5 },
    ];

    for (let index = 0; index < this.sealCount; index += 1) {
      const cell = initialCells[index];
      const sprite = this.add.text(0, 0, '🦭', {
        fontFamily: 'sans-serif',
        fontSize: '41px',
      }).setOrigin(0.5, 0.62);

      this.seals.push({
        id: index,
        gx: cell.gx,
        gy: cell.gy,
        targetGX: cell.gx,
        targetGY: cell.gy,
        retargetTimer: Phaser.Math.FloatBetween(0, this.targetPickInterval),
        sprite,
      });
    }
  }

  /**
   * GPT-5.3-Codex: 経過時間に応じてボール落下・拾得判定・表示を更新する。
   */
  public update(_time: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);

    this.updateSealAutonomousMove(dt);
    this.updateFallingBalls(dt);
    this.collectBallsNearSeals();
    this.syncUiTexts();
  }

  /**
   * GPT-5.3-Codex: 画面サイズに応じてクォータービュー盤面とUI寸法を計算する。
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
   * GPT-5.3-Codex: レイアウト反映時に盤面・アザラシ・ボールの表示位置を再計算する。
   */
  protected renderLayout(layout: SceneLayout): void {
    this.layout = layout;

    this.titleText.setPosition(layout.width * 0.5, 14 * layout.uiScale).setFontSize(31 * layout.uiScale);
    this.infoText.setPosition(layout.width * 0.5, 100 * layout.uiScale).setFontSize(19 * layout.uiScale);
    this.scoreText.setPosition(layout.width - 18 * layout.uiScale, 16 * layout.uiScale).setFontSize(22 * layout.uiScale);

    this.seals.forEach((seal) => {
      seal.sprite.setFontSize(41 * layout.uiScale);
    });

    this.drawField();
    this.placeSeals();
    this.repositionBalls();
    this.syncStackVisuals();
    this.syncUiTexts();
  }

  /**
   * GPT-5.3-Codex: クォータービュー風の床グリッドを描画する。
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
   * GPT-5.3-Codex: ランダムなグリッド上空に新しいボールを生成する。
   */
  private spawnRandomBall(): void {
    const gx = Phaser.Math.Between(0, this.gridSize - 1);
    const gy = Phaser.Math.Between(0, this.gridSize - 1);
    this.spawnBall(gx, gy);
  }

  /**
   * GPT-5.3-Codex: 指定グリッドの上空に新しいボールを生成する。
   */
  private spawnBall(gx: number, gy: number): void {
    const ball: FallingBall = {
      id: this.nextBallId++,
      emoji: Phaser.Utils.Array.GetRandom(this.ballEmojis),
      gx,
      gy,
      z: Phaser.Math.FloatBetween(380, 540),
      vz: Phaser.Math.FloatBetween(190, 250),
      settled: false,
      sprite: this.add.text(0, 0, '', {
        fontFamily: 'sans-serif',
        fontSize: `${Math.round(13 * this.layout.uiScale)}px`,
      }).setOrigin(0.5),
    };

    ball.sprite.setText(ball.emoji);
    this.balls.push(ball);
    this.syncBallSprite(ball);
  }

  /**
   * GPT-5.3-Codex: 落下中ボールを更新し、地面に着地した状態へ切り替える。
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
   * GPT-5.3-Codex: 3匹のアザラシ周辺の地面ボールを拾い、取得順で積み上げ更新する。
   */
  private collectBallsNearSeals(): void {
    if (this.stackEmojis.length >= this.maxCarry) {
      return;
    }

    const reachableDistance = this.layout.tileW * 0.36;
    const sealPoints = this.seals.map((seal) => this.gridToScreen(seal.gx, seal.gy, 0));
    const collectables = this.balls
      .filter((ball) => ball.settled)
      .filter((ball) => {
        const point = this.gridToScreen(ball.gx, ball.gy, 0);
        return sealPoints.some((sealPoint) => (
          Phaser.Math.Distance.Between(point.x, point.y, sealPoint.x, sealPoint.y) <= reachableDistance
        ));
      })
      .sort((a, b) => a.id - b.id);

    if (collectables.length === 0) {
      return;
    }

    const room = this.maxCarry - this.stackEmojis.length;
    const picked = collectables.slice(0, room);

    picked.forEach((ball) => {
      ball.sprite.destroy();
      this.pickedCount += 1;
      this.stackEmojis.push(ball.emoji);
    });

    const pickedIds = new Set(picked.map((ball) => ball.id));
    this.balls = this.balls.filter((ball) => !pickedIds.has(ball.id));
    this.settledCount = this.balls.filter((ball) => ball.settled).length;
    this.syncStackVisuals();
  }

  /**
   * GPT-5.3-Codex: 一定間隔で目的地を選び、アザラシをゆっくり自律移動させる。
   */
  private updateSealAutonomousMove(dt: number): void {
    this.seals.forEach((seal) => {
      seal.retargetTimer += dt;
      if (seal.retargetTimer >= this.targetPickInterval) {
        seal.retargetTimer = 0;
        this.pickNextSealTarget(seal);
      }
    });

    this.sealStepTimer += dt;
    if (this.sealStepTimer < this.sealStepInterval) {
      return;
    }
    this.sealStepTimer = 0;

    this.seals.forEach((seal) => {
      if (seal.gx === seal.targetGX && seal.gy === seal.targetGY) {
        return;
      }

      const nextGX = seal.gx + Math.sign(seal.targetGX - seal.gx);
      const nextGY = seal.gy + Math.sign(seal.targetGY - seal.gy);
      seal.gx = Phaser.Math.Clamp(nextGX, 0, this.gridSize - 1);
      seal.gy = Phaser.Math.Clamp(nextGY, 0, this.gridSize - 1);
    });

    this.placeSeals();
    this.syncStackVisuals();
  }

  /**
   * GPT-5.3-Codex: 盤面内から指定アザラシの次移動先グリッドをランダムに決める。
   */
  private pickNextSealTarget(seal: SealState): void {
    seal.targetGX = Phaser.Math.Between(0, this.gridSize - 1);
    seal.targetGY = Phaser.Math.Between(0, this.gridSize - 1);
  }

  /**
   * GPT-5.3-Codex: グリッド座標と高さをクォータービューのスクリーン座標へ変換する。
   */
  private gridToScreen(gx: number, gy: number, z: number): { x: number; y: number } {
    return {
      x: this.layout.fieldCenterX + (gx - gy) * this.layout.tileW * 0.5,
      y: this.layout.fieldTopY + (gx + gy) * this.layout.tileH * 0.5 - z,
    };
  }

  /**
   * GPT-5.3-Codex: 3匹のアザラシを現在のグリッド位置にあわせて配置する。
   */
  private placeSeals(): void {
    const rise = 18 * this.layout.uiScale;
    this.seals.forEach((seal) => {
      const center = this.gridToScreen(seal.gx, seal.gy, 0);
      seal.sprite
        .setPosition(center.x, center.y - rise)
        .setDepth(3000 + seal.gx + seal.gy + seal.id * 0.1);
    });
  }

  /**
   * GPT-5.3-Codex: すべてのボールを現在のレイアウトで再配置する。
   */
  private repositionBalls(): void {
    this.balls.forEach((ball) => {
      ball.sprite.setFontSize(13 * this.layout.uiScale);
      this.syncBallSprite(ball);
    });
  }

  /**
   * GPT-5.3-Codex: ボールの内部座標をスクリーン表示へ反映する。
   */
  private syncBallSprite(ball: FallingBall): void {
    const point = this.gridToScreen(ball.gx, ball.gy, ball.z);
    const depth = ball.settled ? 1000 + ball.gx + ball.gy : 2000 + (this.gridSize - ball.gy) * 20 + (this.gridSize - ball.gx);
    ball.sprite.setPosition(point.x, point.y).setDepth(depth);
  }

  /**
   * GPT-5.3-Codex: 取得した順のボール種類を絵文字で縦に積み上げ表示する。
   */
  private syncStackVisuals(): void {
    while (this.stackTexts.length > this.stackEmojis.length) {
      const text = this.stackTexts.pop();
      text?.destroy();
    }

    while (this.stackTexts.length < this.stackEmojis.length) {
      const stackText = this.add.text(0, 0, '⚽️', {
        fontFamily: 'sans-serif',
        fontSize: `${Math.round(13 * this.layout.uiScale)}px`,
      }).setOrigin(0.5, 0.5);
      this.stackTexts.push(stackText);
    }

    const anchorSeal = this.seals[1] ?? this.seals[0];
    const sealPos = this.gridToScreen(anchorSeal.gx, anchorSeal.gy, 0);
    this.stackTexts.forEach((text, index) => {
      text
        .setText(this.stackEmojis[index])
        .setFontSize(13 * this.layout.uiScale)
        .setPosition(
          sealPos.x,
          sealPos.y - (25 + index * 9) * this.layout.uiScale,
        )
        .setDepth(anchorSeal.sprite.depth + 10 + index);
    });
  }

  /**
   * GPT-5.3-Codex: タイトル下メッセージとスコア表示を最新状態へ更新する。
   */
  private syncUiTexts(): void {
    this.infoText.setText('🦭3匹はのんびり自律移動します\nタップごとにランダム位置へボールを落として眺めよう');
    this.scoreText.setText(`所持: ${this.stackEmojis.length}/${this.maxCarry}  累計回収: ${this.pickedCount}  地面: ${this.settledCount}`);
  }
}

new Phaser.Game(createConfig([SummaryScene]));
