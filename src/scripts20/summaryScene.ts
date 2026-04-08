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

type RabbitState = 'walking' | 'talking' | 'resting' | 'drinking' | 'bathing' | 'exiting';

type Rabbit = {
  id: number;
  emoji: string;
  mood: string;
  action: string;
  state: RabbitState;
  timer: number;
  gridX: number;
  gridY: number;
  targetX: number;
  targetY: number;
  progress: number;
  speed: number;
  swaySeed: number;
  paidOnExit: boolean;
  bodyText: Phaser.GameObjects.Text;
  infoText: Phaser.GameObjects.Text;
  bubbleText: Phaser.GameObjects.Text;
  shadow: Phaser.GameObjects.Ellipse;
};

type CoinDrop = {
  sprite: Phaser.GameObjects.Text;
  value: number;
  vx: number;
  vy: number;
  landed: boolean;
  lifeSec: number;
  groundY: number;
};

const GRID_SIZE = 8;
const INITIAL_RABBIT_COUNT = 10;
const MAX_RABBITS = 20;
const RABBIT_EMOJI = '🐇';
const BATH_MOODS = ['ほかほか', 'しっとり', 'ごきげん', 'まったり', 'ゆるゆる'];
const TOP_COLORS = [0xfde68a, 0xfcd34d, 0xfbbf24, 0xf59e0b];
const LEFT_COLORS = [0x78350f, 0x854d0e, 0x92400e, 0xb45309];
const RIGHT_COLORS = [0x92400e, 0xa16207, 0xb45309, 0xb45309];
const CHAIR_SPOTS = [
  { x: 2.3, y: 5.5 },
  { x: 5.9, y: 5.2 },
  { x: 6.1, y: 2.4 },
];
const DRINK_SPOTS = [
  { x: 2.1, y: 2.1 },
  { x: 5.7, y: 1.6 },
];
const BATH_CENTER = { x: 3.8, y: 3.6 };
const EXIT_POINT = { x: GRID_SIZE + 0.8, y: GRID_SIZE - 0.1 };

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
  private spawnTimer = 0;
  private rabbitSerial = 0;
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

    for (let i = 0; i < INITIAL_RABBIT_COUNT; i += 1) {
      this.spawnRabbit();
    }

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
    this.spawnTimer += deltaSec;

    if (this.spawnTimer >= 4.5) {
      this.spawnTimer = 0;
      this.spawnRabbit();
    }

    this.processRabbitInteractions(deltaSec);
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

    const bathCenter = this.toIsometric(BATH_CENTER.x, BATH_CENTER.y, tileSize);
    const bathBase = this.add.ellipse(bathCenter.x, bathCenter.y - tileSize * 0.24, tileSize * 2.8, tileSize * 1.2, 0x7dd3fc, 0.62)
      .setStrokeStyle(2, 0x0284c7, 0.7);
    const bathSteam = this.add.text(bathCenter.x, bathCenter.y - tileSize * 1.15, '♨️♨️', {
      fontFamily: 'sans-serif',
      fontSize: `${Math.max(20, Math.floor(tileSize * 0.82))}px`,
    }).setOrigin(0.5);

    const stools = CHAIR_SPOTS.map((pt) => {
      const pos = this.toIsometric(pt.x, pt.y, tileSize);
      return this.add.text(pos.x, pos.y - tileSize * 0.45, '🪑', {
        fontFamily: 'sans-serif',
        fontSize: `${Math.max(16, Math.floor(tileSize * 0.68))}px`,
      }).setOrigin(0.5);
    });

    const drinks = [
      ...DRINK_SPOTS.map((spot) => ({ ...spot, emoji: '🍶' })),
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
   * GPT-5.3-Codex: 定期入場の新規うさぎを生成してステージへ追加する。
   */
  private spawnRabbit(): void {
    if (this.rabbits.length >= MAX_RABBITS) {
      return;
    }

    const entryX = -0.7;
    const entryY = Phaser.Math.FloatBetween(1.2, GRID_SIZE - 1.2);
    const rabbit: Rabbit = {
      id: this.rabbitSerial,
      emoji: RABBIT_EMOJI,
      mood: Phaser.Utils.Array.GetRandom(BATH_MOODS),
      action: '入場',
      state: 'walking',
      timer: Phaser.Math.FloatBetween(2.2, 5),
      gridX: entryX,
      gridY: entryY,
      targetX: Phaser.Math.FloatBetween(0.4, GRID_SIZE - 1.5),
      targetY: Phaser.Math.FloatBetween(0.4, GRID_SIZE - 1.5),
      progress: 0,
      speed: Phaser.Math.FloatBetween(0.14, 0.27),
      swaySeed: Phaser.Math.FloatBetween(0, Math.PI * 2),
      paidOnExit: false,
      bodyText: this.add.text(0, 0, RABBIT_EMOJI, {
        fontFamily: 'sans-serif',
        fontSize: '34px',
      }).setOrigin(0.5, 0.9),
      infoText: this.add.text(0, 0, '', {
        fontFamily: 'sans-serif',
        fontSize: '12px',
        color: '#f8fafc',
        align: 'center',
      }).setOrigin(0.5, 1),
      bubbleText: this.add.text(0, 0, '', {
        fontFamily: 'sans-serif',
        fontSize: '11px',
        color: '#111827',
        backgroundColor: '#fef3c7cc',
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5, 1).setVisible(false),
      shadow: this.add.ellipse(0, 0, 24, 10, 0x111827, 0.35),
    };

    rabbit.infoText.setText(`${rabbit.action}\n${rabbit.mood}`);
    this.actorLayer.add([rabbit.shadow, rabbit.bodyText, rabbit.infoText, rabbit.bubbleText]);
    this.rabbits.push(rabbit);
    this.rabbitSerial += 1;
  }

  /**
   * GPT-5.3-Codex: うさぎ同士の会話イベントを近接判定で発生させる。
   */
  private processRabbitInteractions(deltaSec: number): void {
    // GPT-5.3-Codex: 会話中の吹き出し寿命を毎フレームで減算する。
    this.rabbits.forEach((rabbit) => {
      if (rabbit.state === 'talking') {
        rabbit.timer -= deltaSec;
        if (rabbit.timer <= 0) {
          rabbit.state = 'walking';
          rabbit.action = '散策中';
          rabbit.mood = Phaser.Utils.Array.GetRandom(BATH_MOODS);
          rabbit.bubbleText.setVisible(false);
          rabbit.timer = Phaser.Math.FloatBetween(2, 5.2);
          rabbit.targetX = Phaser.Math.FloatBetween(0.4, GRID_SIZE - 1.4);
          rabbit.targetY = Phaser.Math.FloatBetween(0.4, GRID_SIZE - 1.4);
        }
      }
    });

    for (let i = 0; i < this.rabbits.length; i += 1) {
      const a = this.rabbits[i];
      if (a.state !== 'walking' || a.progress > 0.4) {
        continue;
      }

      for (let j = i + 1; j < this.rabbits.length; j += 1) {
        const b = this.rabbits[j];
        if (b.state !== 'walking' || b.progress > 0.4) {
          continue;
        }

        const dist = Phaser.Math.Distance.Between(a.gridX, a.gridY, b.gridX, b.gridY);
        if (dist < 0.6 && Phaser.Math.FloatBetween(0, 1) < 0.16) {
          this.startTalkingPair(a, b);
          return;
        }
      }
    }
  }

  /**
   * GPT-5.3-Codex: 2匹のうさぎを会話状態に遷移させる。
   */
  private startTalkingPair(first: Rabbit, second: Rabbit): void {
    const lines = ['こんばんは！', 'いい湯だね', 'また来ようね'];
    const duration = Phaser.Math.FloatBetween(2.5, 4.5);

    [first, second].forEach((rabbit, index) => {
      rabbit.state = 'talking';
      rabbit.timer = duration;
      rabbit.action = 'おしゃべり';
      rabbit.mood = 'なかよし';
      rabbit.progress = 0;
      rabbit.targetX = rabbit.gridX;
      rabbit.targetY = rabbit.gridY;
      rabbit.bubbleText.setText(lines[index]).setVisible(true);
    });
  }

  /**
   * GPT-5.3-Codex: うさぎを目標マスへ移動し、到着時に次行動へ遷移する。
   */
  private advanceRabbit(rabbit: Rabbit, deltaSec: number): void {
    if (rabbit.state === 'talking' || rabbit.state === 'bathing' || rabbit.state === 'resting' || rabbit.state === 'drinking') {
      rabbit.timer -= deltaSec;
      if (rabbit.state === 'bathing' && rabbit.timer <= 0) {
        rabbit.state = 'walking';
        rabbit.action = '湯上がり';
        rabbit.mood = 'ぽかぽか';
        rabbit.targetX = Phaser.Math.FloatBetween(4.9, 6.8);
        rabbit.targetY = Phaser.Math.FloatBetween(2.8, 6.5);
        rabbit.progress = 0;
      } else if ((rabbit.state === 'resting' || rabbit.state === 'drinking') && rabbit.timer <= 0) {
        rabbit.state = 'walking';
        rabbit.action = '散策中';
        rabbit.targetX = Phaser.Math.FloatBetween(0.4, GRID_SIZE - 1.4);
        rabbit.targetY = Phaser.Math.FloatBetween(0.4, GRID_SIZE - 1.4);
        rabbit.progress = 0;
      }
      return;
    }

    rabbit.progress += rabbit.speed * deltaSec;

    if (rabbit.progress < 1) {
      return;
    }

    rabbit.gridX = rabbit.targetX;
    rabbit.gridY = rabbit.targetY;
    rabbit.progress = 0;

    if (rabbit.state === 'exiting') {
      this.dropCoinAtRabbit(rabbit, Phaser.Math.Between(130, 260), '入湯料金');
      rabbit.paidOnExit = true;
      this.removeRabbit(rabbit);
      return;
    }

    this.chooseNextAction(rabbit);
  }

  /**
   * GPT-5.3-Codex: 到着したうさぎの次行動を重み付きランダムで決める。
   */
  private chooseNextAction(rabbit: Rabbit): void {
    const roll = Phaser.Math.FloatBetween(0, 1);

    if (roll < 0.2) {
      rabbit.state = 'bathing';
      rabbit.action = '入浴中';
      rabbit.mood = 'しずか';
      rabbit.timer = Phaser.Math.FloatBetween(3.5, 7.5);
      rabbit.targetX = BATH_CENTER.x + Phaser.Math.FloatBetween(-0.4, 0.4);
      rabbit.targetY = BATH_CENTER.y + Phaser.Math.FloatBetween(-0.2, 0.2);
      rabbit.progress = 0;
      return;
    }

    if (roll < 0.38) {
      const chair = Phaser.Utils.Array.GetRandom(CHAIR_SPOTS);
      rabbit.state = 'resting';
      rabbit.action = '椅子で休憩';
      rabbit.mood = 'ひとやすみ';
      rabbit.timer = Phaser.Math.FloatBetween(2.8, 6);
      rabbit.targetX = chair.x;
      rabbit.targetY = chair.y;
      rabbit.progress = 0;
      return;
    }

    if (roll < 0.56) {
      const drink = Phaser.Utils.Array.GetRandom(DRINK_SPOTS);
      rabbit.state = 'drinking';
      rabbit.action = '晩酌中';
      rabbit.mood = 'ほろよい';
      rabbit.timer = Phaser.Math.FloatBetween(2.4, 5);
      rabbit.targetX = drink.x;
      rabbit.targetY = drink.y;
      rabbit.progress = 0;
      return;
    }

    if (roll > 0.9) {
      rabbit.state = 'exiting';
      rabbit.action = '退出中';
      rabbit.mood = 'また来るね';
      rabbit.targetX = EXIT_POINT.x;
      rabbit.targetY = EXIT_POINT.y;
      rabbit.progress = 0;
      return;
    }

    rabbit.state = 'walking';
    rabbit.action = '散策中';
    rabbit.mood = Phaser.Utils.Array.GetRandom(BATH_MOODS);
    rabbit.targetX = Phaser.Math.FloatBetween(0.4, GRID_SIZE - 1.4);
    rabbit.targetY = Phaser.Math.FloatBetween(0.4, GRID_SIZE - 1.4);
    rabbit.progress = 0;

    if (Phaser.Math.FloatBetween(0, 1) < 0.3) {
      this.dropCoinAtRabbit(rabbit, Phaser.Math.Between(20, 80), 'チップ');
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
      const idle = rabbit.state === 'bathing' || rabbit.state === 'resting' || rabbit.state === 'drinking' || rabbit.state === 'talking';
      const bob = idle ? 0 : Math.sin(this.elapsedAcc * 2.2 + rabbit.swaySeed) * Math.max(2, tileSize * 0.06);

      rabbit.shadow.setPosition(iso.x, iso.y + tileSize * 0.2).setSize(tileSize * 0.58, tileSize * 0.2);
      rabbit.bodyText.setPosition(iso.x, iso.y - tileSize * 0.26 + bob).setFontSize(Math.max(20, Math.floor(tileSize * 0.76)));
      rabbit.infoText
        .setPosition(iso.x, iso.y - tileSize * 0.74 + bob)
        .setFontSize(Math.max(9, Math.floor(tileSize * 0.21)))
        .setText(`${rabbit.action}\n${rabbit.mood}`);

      rabbit.bubbleText
        .setPosition(iso.x, iso.y - tileSize * 1.05)
        .setFontSize(Math.max(9, Math.floor(tileSize * 0.2)));
    });
  }

  /**
   * GPT-5.3-Codex: うさぎの位置に料金コインを生成して未回収額へ加算する。
   */
  private dropCoinAtRabbit(rabbit: Rabbit, minValue: number, label: string): void {
    const iso = this.toIsometric(rabbit.gridX, rabbit.gridY, this.currentTileSize);
    const coin = this.add.text(iso.x + Phaser.Math.Between(-8, 8), iso.y - this.currentTileSize * 0.72, '💰', {
      fontFamily: 'sans-serif',
      fontSize: `${Math.max(18, Math.floor(this.currentTileSize * 0.58))}px`,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const value = Phaser.Math.Between(minValue, minValue + 90);
    this.depositTotal += value;
    this.pendingTotal += value;

    const drop: CoinDrop = {
      sprite: coin,
      value,
      vx: Phaser.Math.FloatBetween(-12, 12),
      vy: Phaser.Math.FloatBetween(30, 52),
      landed: false,
      lifeSec: 0,
      groundY: iso.y + this.currentTileSize * 0.2,
    };

    coin.setData('label', label);
    coin.on('pointerdown', () => {
      this.collectSpecificCoin(drop);
    });

    this.coins.push(drop);
    this.effectLayer.add(coin);
  }

  /**
   * GPT-5.3-Codex: 退出完了したうさぎを安全に破棄する。
   */
  private removeRabbit(rabbit: Rabbit): void {
    const index = this.rabbits.indexOf(rabbit);
    if (index < 0) {
      return;
    }

    rabbit.shadow.destroy();
    rabbit.bodyText.destroy();
    rabbit.infoText.destroy();
    rabbit.bubbleText.destroy();
    this.rabbits.splice(index, 1);
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
   * GPT-5.3-Codex: 料金コインを落下後に床へ残し、一定時間で消去する。
   */
  private updateCoins(deltaSec: number): void {
    const expired: CoinDrop[] = [];
    this.coins.forEach((drop) => {
      if (!drop.landed) {
        drop.vy += 36 * deltaSec;
        drop.sprite.x += drop.vx * deltaSec;
        drop.sprite.y += drop.vy * deltaSec;
        if (drop.sprite.y >= drop.groundY) {
          drop.sprite.y = drop.groundY;
          drop.vx = 0;
          drop.vy = 0;
          drop.landed = true;
          drop.sprite.rotation = 0;
        } else {
          drop.sprite.rotation += 0.7 * deltaSec;
        }
      } else {
        drop.lifeSec += deltaSec;
        if (drop.lifeSec > 16) {
          expired.push(drop);
        }
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
    const focused = this.rabbits[Math.floor((this.elapsedSec / 2) % Math.max(1, this.rabbits.length))];
    this.hudText.setText(
      `経過 ${this.elapsedSec}s | うさぎ ${this.rabbits.length}匹 | 注目: ${focused?.emoji ?? '🐇'} ${focused?.action ?? '入場待ち'}\n`
      + `落とした総額 ${this.depositTotal}円 / 回収 ${this.collectedTotal}円 / 未回収 ${this.pendingTotal}円`,
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
