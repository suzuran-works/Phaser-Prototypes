import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BaseResponsiveScene } from '../baseResponsiveScene.ts';
import { BACKGROUND_COLOR, SUBTITLE, TITLE } from './define.ts';

type QuarterLayout = {
  width: number;
  height: number;
  titleY: number;
  subtitleY: number;
  hudY: number;
  worldCenterX: number;
  worldCenterY: number;
  tileSize: number;
};

type Rabbit = {
  emoji: string;
  mood: string;
  action: string;
  gridX: number;
  gridY: number;
  targetX: number;
  targetY: number;
  progress: number;
  speed: number;
  swaySeed: number;
  bodyText: Phaser.GameObjects.Text;
  infoText: Phaser.GameObjects.Text;
  shadow: Phaser.GameObjects.Ellipse;
};

type CoinDrop = {
  sprite: Phaser.GameObjects.Text;
  value: number;
  vx: number;
  vy: number;
};

const GRID_SIZE = 8;
const RABBIT_COUNT = 14;
const RABBIT_EMOJI = ['🐰', '🐇', '🐰', '🐇', '🐰'];
const BATH_MOODS = ['ほかほか', 'しっとり', 'ごきげん', 'まったり', 'ゆるゆる'];
const BATH_ACTIONS = ['入浴中', '湯上がり休憩', '晩酌中', '交流中', '語らい中'];

const TOP_COLORS = [0xfde68a, 0xfcd34d, 0xfbbf24, 0xf59e0b];
const LEFT_COLORS = [0x78350f, 0x854d0e, 0x92400e, 0xb45309];
const RIGHT_COLORS = [0x92400e, 0xa16207, 0xb45309, 0xb45309];

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts20SummaryScene';

  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private hudText!: Phaser.GameObjects.Text;
  private worldLayer!: Phaser.GameObjects.Container;
  private tileLayer!: Phaser.GameObjects.Container;
  private propLayer!: Phaser.GameObjects.Container;
  private actorLayer!: Phaser.GameObjects.Container;
  private effectLayer!: Phaser.GameObjects.Container;
  private rabbits: Rabbit[] = [];
  private coins: CoinDrop[] = [];
  private elapsedSec = 0;
  private elapsedAcc = 0;
  private currentTileSize = 42;
  private depositTotal = 0;
  private collectedTotal = 0;
  private pendingTotal = 0;

  /**
   * GPT-5.3-Codex: 温泉うさぎ観察シーンの初期化を行う。
   */
  public constructor() {
    super(SummaryScene.key);
  }

  /**
   * GPT-5.3-Codex: 温泉フィールドとUI、うさぎキャラクターを生成する。
   */
  public create(): void {
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);

    this.titleText = this.add.text(0, 0, TITLE, {
      fontFamily: 'sans-serif',
      fontSize: '42px',
      color: '#fef3c7',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    this.subtitleText = this.add.text(0, 0, SUBTITLE, {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      color: '#fde68a',
      align: 'center',
    }).setOrigin(0.5, 0);

    this.hudText = this.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#f9fafb',
      align: 'center',
    }).setOrigin(0.5, 0);

    this.worldLayer = this.add.container(0, 0);
    this.tileLayer = this.add.container(0, 0);
    this.propLayer = this.add.container(0, 0);
    this.actorLayer = this.add.container(0, 0);
    this.effectLayer = this.add.container(0, 0);
    this.worldLayer.add([this.tileLayer, this.propLayer, this.actorLayer, this.effectLayer]);

    this.createRabbits();
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.collectCoin(pointer.worldX, pointer.worldY);
    });

    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.elapsedSec += 1;
      },
    });

    this.bindResponsiveLayout();
  }

  /**
   * GPT-5.3-Codex: うさぎ移動、入湯料金ドロップ、硬貨アニメーションを更新する。
   */
  public update(_: number, deltaMs: number): void {
    const deltaSec = deltaMs / 1000;
    this.elapsedAcc += deltaSec;

    this.rabbits.forEach((rabbit) => {
      this.advanceRabbit(rabbit, deltaSec);
    });

    this.updateCoins(deltaSec);
    this.refreshRabbitPlacement(this.currentTileSize);
    this.refreshHud();
  }

  /**
   * GPT-5.3-Codex: 画面サイズからUIとクォータービューのレイアウトを算出する。
   */
  protected computeLayout(width: number, height: number): QuarterLayout {
    const tileSize = Math.max(26, Math.min(56, Math.floor(Math.min(width, height) * 0.05)));
    return {
      width,
      height,
      titleY: Math.max(10, height * 0.02),
      subtitleY: Math.max(58, height * 0.085),
      hudY: Math.max(96, height * 0.14),
      worldCenterX: width * 0.5,
      worldCenterY: Math.max(height * 0.62, 320),
      tileSize,
    };
  }

  /**
   * GPT-5.3-Codex: 再計算されたレイアウトをUIとステージ描画へ反映する。
   */
  protected renderLayout(layout: QuarterLayout): void {
    this.titleText.setPosition(layout.width * 0.5, layout.titleY).setFontSize(Math.max(28, Math.floor(layout.width * 0.034)));
    this.subtitleText.setPosition(layout.width * 0.5, layout.subtitleY).setFontSize(Math.max(13, Math.floor(layout.width * 0.015)));
    this.hudText.setPosition(layout.width * 0.5, layout.hudY).setFontSize(Math.max(12, Math.floor(layout.width * 0.014)));

    this.currentTileSize = layout.tileSize;
    const centerOffsetX = this.toIsometric((GRID_SIZE - 1) / 2, (GRID_SIZE - 1) / 2, layout.tileSize).x;
    this.worldLayer.setPosition(layout.worldCenterX - centerOffsetX, layout.worldCenterY);

    this.drawQuarterTiles(layout.tileSize);
    this.drawOnsenProps(layout.tileSize);
    this.refreshRabbitPlacement(layout.tileSize);
  }

  /**
   * GPT-5.3-Codex: 温泉街タイルをクォータービューで描画する。
   */
  private drawQuarterTiles(tileSize: number): void {
    this.tileLayer.removeAll(true);

    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        const index = (x + y) % TOP_COLORS.length;
        const iso = this.toIsometric(x, y, tileSize);
        const halfW = tileSize;
        const halfH = tileSize * 0.5;
        const depth = Math.max(6, tileSize * 0.22);

        const left = this.add.polygon(iso.x - halfW * 0.5, iso.y + depth * 0.5, [0, -halfH * 0.5, halfW * 0.5, 0, halfW * 0.5, depth, 0, depth - halfH * 0.5], LEFT_COLORS[index], 0.88);
        const right = this.add.polygon(iso.x + halfW * 0.5, iso.y + depth * 0.5, [0, -halfH * 0.5, halfW * 0.5, 0, halfW * 0.5, depth, 0, depth - halfH * 0.5], RIGHT_COLORS[index], 0.88);
        const top = this.add.polygon(iso.x, iso.y, [0, -halfH, halfW, 0, 0, halfH, -halfW, 0], TOP_COLORS[index], 1)
          .setStrokeStyle(1, 0x92400e, 0.35);

        this.tileLayer.add([left, right, top]);
      }
    }
  }

  /**
   * GPT-5.3-Codex: 湯船や桶など眺める用の温泉オブジェクトを描画する。
   */
  private drawOnsenProps(tileSize: number): void {
    this.propLayer.removeAll(true);

    const bathCenter = this.toIsometric(3.8, 3.6, tileSize);
    const bathBase = this.add.ellipse(bathCenter.x, bathCenter.y - tileSize * 0.24, tileSize * 2.8, tileSize * 1.2, 0x7dd3fc, 0.62)
      .setStrokeStyle(2, 0x0284c7, 0.7);
    const bathSteam = this.add.text(bathCenter.x, bathCenter.y - tileSize * 1.15, '♨️♨️', {
      fontFamily: 'sans-serif',
      fontSize: `${Math.max(20, Math.floor(tileSize * 0.82))}px`,
    }).setOrigin(0.5);

    const stoolPoints = [
      { x: 2.3, y: 5.5 },
      { x: 5.9, y: 5.2 },
      { x: 6.1, y: 2.4 },
    ];

    const stools = stoolPoints.map((pt) => {
      const pos = this.toIsometric(pt.x, pt.y, tileSize);
      return this.add.text(pos.x, pos.y - tileSize * 0.45, '🪑', {
        fontFamily: 'sans-serif',
        fontSize: `${Math.max(16, Math.floor(tileSize * 0.68))}px`,
      }).setOrigin(0.5);
    });

    const drinks = [
      { x: 2.1, y: 2.1, emoji: '🍶' },
      { x: 5.7, y: 1.6, emoji: '🍺' },
      { x: 1.4, y: 4.7, emoji: '🍡' },
    ].map((drink) => {
      const pos = this.toIsometric(drink.x, drink.y, tileSize);
      return this.add.text(pos.x, pos.y - tileSize * 0.5, drink.emoji, {
        fontFamily: 'sans-serif',
        fontSize: `${Math.max(14, Math.floor(tileSize * 0.54))}px`,
      }).setOrigin(0.5);
    });

    this.propLayer.add([bathBase, bathSteam, ...stools, ...drinks]);
  }

  /**
   * GPT-5.3-Codex: 温泉のうさぎ住人をランダム配置で生成する。
   */
  private createRabbits(): void {
    this.rabbits = [];

    for (let i = 0; i < RABBIT_COUNT; i += 1) {
      const gridX = Phaser.Math.Between(0, GRID_SIZE - 1);
      const gridY = Phaser.Math.Between(0, GRID_SIZE - 1);
      const rabbit: Rabbit = {
        emoji: Phaser.Utils.Array.GetRandom(RABBIT_EMOJI),
        mood: Phaser.Utils.Array.GetRandom(BATH_MOODS),
        action: Phaser.Utils.Array.GetRandom(BATH_ACTIONS),
        gridX,
        gridY,
        targetX: Phaser.Math.Between(0, GRID_SIZE - 1),
        targetY: Phaser.Math.Between(0, GRID_SIZE - 1),
        progress: Phaser.Math.FloatBetween(0, 0.92),
        speed: Phaser.Math.FloatBetween(0.1, 0.23),
        swaySeed: Phaser.Math.FloatBetween(0, Math.PI * 2),
        bodyText: this.add.text(0, 0, '🐰', {
          fontFamily: 'sans-serif',
          fontSize: '34px',
        }).setOrigin(0.5, 0.9),
        infoText: this.add.text(0, 0, '', {
          fontFamily: 'sans-serif',
          fontSize: '12px',
          color: '#f8fafc',
          align: 'center',
        }).setOrigin(0.5, 1),
        shadow: this.add.ellipse(0, 0, 24, 10, 0x111827, 0.35),
      };

      rabbit.bodyText.setText(rabbit.emoji);
      rabbit.infoText.setText(`${rabbit.action}\n${rabbit.mood}`);
      this.actorLayer.add([rabbit.shadow, rabbit.bodyText, rabbit.infoText]);
      this.rabbits.push(rabbit);
    }
  }

  /**
   * GPT-5.3-Codex: うさぎを目標マスへ移動し、到着時に入湯料金を落とす。
   */
  private advanceRabbit(rabbit: Rabbit, deltaSec: number): void {
    rabbit.progress += rabbit.speed * deltaSec;

    if (rabbit.progress >= 1) {
      rabbit.gridX = rabbit.targetX;
      rabbit.gridY = rabbit.targetY;
      rabbit.targetX = Phaser.Math.Between(0, GRID_SIZE - 1);
      rabbit.targetY = Phaser.Math.Between(0, GRID_SIZE - 1);
      rabbit.progress = 0;

      rabbit.mood = Phaser.Utils.Array.GetRandom(BATH_MOODS);
      rabbit.action = Phaser.Utils.Array.GetRandom(BATH_ACTIONS);
      rabbit.infoText.setText(`${rabbit.action}\n${rabbit.mood}`);

      if (Phaser.Math.FloatBetween(0, 1) < 0.55) {
        this.dropCoinAtRabbit(rabbit);
      }
    }
  }

  /**
   * GPT-5.3-Codex: うさぎの現在位置をクォータービュー座標へ反映する。
   */
  private refreshRabbitPlacement(tileSize: number): void {
    this.rabbits.forEach((rabbit) => {
      const ix = Phaser.Math.Interpolation.Linear([rabbit.gridX, rabbit.targetX], rabbit.progress);
      const iy = Phaser.Math.Interpolation.Linear([rabbit.gridY, rabbit.targetY], rabbit.progress);
      const iso = this.toIsometric(ix, iy, tileSize);
      const bob = Math.sin(this.elapsedAcc * 2.2 + rabbit.swaySeed) * Math.max(2, tileSize * 0.06);

      rabbit.shadow.setPosition(iso.x, iso.y + tileSize * 0.2).setSize(tileSize * 0.58, tileSize * 0.2);
      rabbit.bodyText.setPosition(iso.x, iso.y - tileSize * 0.26 + bob).setFontSize(Math.max(20, Math.floor(tileSize * 0.76)));
      rabbit.infoText.setPosition(iso.x, iso.y - tileSize * 0.74 + bob).setFontSize(Math.max(9, Math.floor(tileSize * 0.21)));
    });
  }

  /**
   * GPT-5.3-Codex: うさぎの位置に入湯料金コインを生成して未回収額へ加算する。
   */
  private dropCoinAtRabbit(rabbit: Rabbit): void {
    const iso = this.toIsometric(rabbit.gridX, rabbit.gridY, this.currentTileSize);
    const coin = this.add.text(iso.x + Phaser.Math.Between(-8, 8), iso.y - this.currentTileSize * 0.5, '💴', {
      fontFamily: 'sans-serif',
      fontSize: `${Math.max(18, Math.floor(this.currentTileSize * 0.58))}px`,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const value = Phaser.Math.Between(30, 120);
    this.depositTotal += value;
    this.pendingTotal += value;

    const drop: CoinDrop = {
      sprite: coin,
      value,
      vx: Phaser.Math.FloatBetween(-6, 6),
      vy: Phaser.Math.FloatBetween(14, 26),
    };

    coin.on('pointerdown', () => {
      this.collectSpecificCoin(drop);
    });

    this.coins.push(drop);
    this.effectLayer.add(coin);
  }

  /**
   * GPT-5.3-Codex: タップ座標にあるコインを判定して回収する。
   */
  private collectCoin(worldX: number, worldY: number): void {
    const tapped = this.coins.find((drop) => {
      const bounds = drop.sprite.getBounds();
      return bounds.contains(worldX, worldY);
    });

    if (tapped) {
      this.collectSpecificCoin(tapped);
    }
  }

  /**
   * GPT-5.3-Codex: 指定したコインを回収しスコアへ反映する。
   */
  private collectSpecificCoin(drop: CoinDrop): void {
    const index = this.coins.indexOf(drop);
    if (index < 0) {
      return;
    }

    this.collectedTotal += drop.value;
    this.pendingTotal = Math.max(0, this.pendingTotal - drop.value);
    drop.sprite.destroy();
    this.coins.splice(index, 1);
  }

  /**
   * GPT-5.3-Codex: 放置コインのゆらぎ落下と寿命処理を行う。
   */
  private updateCoins(deltaSec: number): void {
    const expired: CoinDrop[] = [];

    this.coins.forEach((drop) => {
      drop.vy += 5 * deltaSec;
      drop.sprite.x += drop.vx * deltaSec;
      drop.sprite.y += drop.vy * deltaSec;
      drop.sprite.rotation += 0.6 * deltaSec;
      drop.sprite.alpha = Math.max(0.5, drop.sprite.alpha - 0.03 * deltaSec);

      if (drop.sprite.y > this.scale.height + 20) {
        expired.push(drop);
      }
    });

    expired.forEach((drop) => {
      const index = this.coins.indexOf(drop);
      if (index >= 0) {
        this.pendingTotal = Math.max(0, this.pendingTotal - drop.value);
        drop.sprite.destroy();
        this.coins.splice(index, 1);
      }
    });
  }

  /**
   * GPT-5.3-Codex: 観察情報と入湯料金の回収状況をHUD表示する。
   */
  private refreshHud(): void {
    const focused = this.rabbits[Math.floor((this.elapsedSec / 2) % this.rabbits.length)];
    this.hudText.setText(
      `経過 ${this.elapsedSec}s | 注目: ${focused?.emoji ?? '🐰'} ${focused?.action ?? '入浴中'}\n` +
      `落とした総額 ${this.depositTotal}円 / 回収 ${this.collectedTotal}円 / 未回収 ${this.pendingTotal}円`,
    );
  }

  /**
   * GPT-5.3-Codex: グリッド座標をクォータービュー座標へ変換する。
   */
  private toIsometric(gridX: number, gridY: number, tileSize: number): { x: number; y: number } {
    return {
      x: (gridX - gridY) * tileSize,
      y: (gridX + gridY) * tileSize * 0.5,
    };
  }
}

new Phaser.Game(createConfig([SummaryScene]));
