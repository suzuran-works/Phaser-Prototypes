import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BaseResponsiveScene } from '../baseResponsiveScene.ts';
import { BACKGROUND_COLOR, SUBTITLE, TITLE } from './define.ts';

type QuarterLayout = {
  width: number;
  height: number;
  titleY: number;
  subtitleY: number;
  fieldCenterX: number;
  fieldCenterY: number;
  tileSize: number;
  slotAreaY: number;
  slotAreaHeight: number;
  slotCenterX: number;
};

type EmojiCategory = 'creature' | 'tool' | 'food';

type EmojiDefinition = {
  emoji: string;
  category: EmojiCategory;
  label: string;
};

type Creature = {
  emoji: string;
  mood: string;
  carryingTool: string | null;
  sprite: Phaser.GameObjects.Text;
  info: Phaser.GameObjects.Text;
  shadow: Phaser.GameObjects.Ellipse;
  gridX: number;
  gridY: number;
  targetX: number;
  targetY: number;
  travel: number;
  speed: number;
};

type ToolEntity = {
  emoji: string;
  sprite: Phaser.GameObjects.Text;
  gridX: number;
  gridY: number;
};

type FoodEntity = {
  emoji: string;
  sprite: Phaser.GameObjects.Text;
  gridX: number;
  gridY: number;
  freshness: number;
};

type Reel = {
  frame: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
};

const GRID_SIZE = 8;
const REEL_COUNT = 3;
const REEL_TICK_MS = 80;
const REEL_STOP_INTERVAL_MS = 420;
const IDLE_MOODS = ['のんびり', 'うきうき', 'きょろきょろ', 'てくてく'];
const EMOJI_POOL: EmojiDefinition[] = [
  { emoji: '🐰', category: 'creature', label: 'うさぎ' },
  { emoji: '🦊', category: 'creature', label: 'きつね' },
  { emoji: '🐼', category: 'creature', label: 'ぱんだ' },
  { emoji: '🪓', category: 'tool', label: 'おの' },
  { emoji: '🧹', category: 'tool', label: 'ほうき' },
  { emoji: '🪣', category: 'tool', label: 'ばけつ' },
  { emoji: '🍎', category: 'food', label: 'りんご' },
  { emoji: '🍞', category: 'food', label: 'パン' },
  { emoji: '🥕', category: 'food', label: 'にんじん' },
];

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts21SummaryScene';

  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private fieldLayer!: Phaser.GameObjects.Container;
  private tileLayer!: Phaser.GameObjects.Container;
  private itemLayer!: Phaser.GameObjects.Container;
  private creatureLayer!: Phaser.GameObjects.Container;
  private uiLayer!: Phaser.GameObjects.Container;
  private slotPanel!: Phaser.GameObjects.Rectangle;
  private spinButton!: Phaser.GameObjects.Rectangle;
  private spinLabel!: Phaser.GameObjects.Text;
  private reels: Reel[] = [];
  private creatures: Creature[] = [];
  private tools: ToolEntity[] = [];
  private foods: FoodEntity[] = [];
  private reelTimer: Phaser.Time.TimerEvent | null = null;
  private stopTimer: Phaser.Time.TimerEvent | null = null;
  private reelActiveStates: boolean[] = [false, false, false];
  private spinResults: EmojiDefinition[] = [];
  private spinning = false;
  private spinAttemptCount = 0;
  private tileSize = 38;

  /**
   * GPT-5.3-Codex: クォータービュー＋スロット複合シーンを初期化する。
   */
  public constructor() {
    super(SummaryScene.key);
  }

  /**
   * GPT-5.3-Codex: UIとレイヤーを構築して初期状態を描画する。
   */
  public create(): void {
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);

    this.titleText = this.add.text(0, 0, TITLE, {
      fontFamily: 'sans-serif',
      fontSize: '38px',
      color: '#e2e8f0',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    this.subtitleText = this.add.text(0, 0, SUBTITLE, {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      color: '#93c5fd',
      align: 'center',
    }).setOrigin(0.5, 0);

    this.statusText = this.add.text(0, 0, 'タップしてスロット開始', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#f8fafc',
      align: 'center',
    }).setOrigin(0.5, 0.5);

    this.fieldLayer = this.add.container(0, 0);
    this.tileLayer = this.add.container(0, 0);
    this.itemLayer = this.add.container(0, 0);
    this.creatureLayer = this.add.container(0, 0);
    this.fieldLayer.add([this.tileLayer, this.itemLayer, this.creatureLayer]);

    this.uiLayer = this.add.container(0, 0);
    this.slotPanel = this.add.rectangle(0, 0, 100, 100, 0x111827, 0.88).setOrigin(0.5, 0.5);
    this.uiLayer.add(this.slotPanel);

    this.reels = Array.from({ length: REEL_COUNT }, () => {
      const frame = this.add.rectangle(0, 0, 100, 140, 0x1e293b, 0.95).setStrokeStyle(3, 0x94a3b8, 0.8);
      const text = this.add.text(0, 0, '🎲', {
        fontFamily: 'sans-serif',
        fontSize: '64px',
        color: '#f8fafc',
      }).setOrigin(0.5, 0.5);
      this.uiLayer.add([frame, text]);
      return { frame, text };
    });

    this.spinButton = this.add.rectangle(0, 0, 240, 76, 0x0ea5e9, 1)
      .setStrokeStyle(4, 0x67e8f9, 0.9)
      .setInteractive({ useHandCursor: true });
    this.spinLabel = this.add.text(0, 0, 'スロットを回す', {
      fontFamily: 'sans-serif',
      fontSize: '30px',
      color: '#082f49',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);
    this.uiLayer.add([this.spinButton, this.spinLabel]);

    this.spinButton.on('pointerdown', () => {
      this.startSpin();
    });

    this.bindResponsiveLayout();
  }

  /**
   * GPT-5.3-Codex: 生き物の移動と道具・食料の相互作用を毎フレーム更新する。
   */
  public update(_: number, deltaMs: number): void {
    const deltaSec = deltaMs / 1000;

    this.creatures.forEach((creature) => {
      creature.travel += deltaSec * creature.speed;
      if (creature.travel >= 1) {
        creature.travel = 0;
        creature.gridX = creature.targetX;
        creature.gridY = creature.targetY;
        creature.targetX = Phaser.Math.Between(1, GRID_SIZE - 2);
        creature.targetY = Phaser.Math.Between(1, GRID_SIZE - 2);
        creature.mood = Phaser.Utils.Array.GetRandom(IDLE_MOODS);
      }

      const lerpX = Phaser.Math.Linear(creature.gridX, creature.targetX, creature.travel);
      const lerpY = Phaser.Math.Linear(creature.gridY, creature.targetY, creature.travel);
      const iso = this.toIso(lerpX, lerpY, this.tileSize);
      creature.shadow.setPosition(iso.x, iso.y + this.tileSize * 0.68);
      creature.sprite.setPosition(iso.x, iso.y + this.tileSize * 0.18);
      creature.info.setPosition(iso.x, iso.y - this.tileSize * 0.42);
      creature.info.setText(creature.carryingTool ? `${creature.mood} ${creature.carryingTool}` : creature.mood);
    });

    this.processToolPickup();
    this.processFoodEating(deltaSec);
  }

  /**
   * GPT-5.3-Codex: 画面サイズから上半分フィールドと下半分スロット領域を計算する。
   */
  protected computeLayout(width: number, height: number): QuarterLayout {
    const fieldHeight = height * 0.5;
    const tileSize = Math.max(24, Math.min(44, Math.floor(Math.min(width * 0.1, fieldHeight * 0.14))));

    return {
      width,
      height,
      titleY: Math.max(10, height * 0.014),
      subtitleY: Math.max(56, height * 0.064),
      fieldCenterX: width * 0.5,
      fieldCenterY: fieldHeight * 0.63,
      tileSize,
      slotAreaY: height * 0.75,
      slotAreaHeight: height * 0.5,
      slotCenterX: width * 0.5,
    };
  }

  /**
   * GPT-5.3-Codex: 計算済みレイアウトを各表示要素へ適用する。
   */
  protected renderLayout(layout: QuarterLayout): void {
    this.tileSize = layout.tileSize;

    this.titleText.setPosition(layout.width * 0.5, layout.titleY).setFontSize(Math.max(24, Math.floor(layout.width * 0.03)));
    this.subtitleText.setPosition(layout.width * 0.5, layout.subtitleY).setFontSize(Math.max(12, Math.floor(layout.width * 0.015)));
    this.statusText.setPosition(layout.width * 0.5, layout.slotAreaY - layout.slotAreaHeight * 0.24).setFontSize(Math.max(16, Math.floor(layout.width * 0.018)));

    const centerOffset = this.toIso((GRID_SIZE - 1) / 2, (GRID_SIZE - 1) / 2, this.tileSize).x;
    this.fieldLayer.setPosition(layout.fieldCenterX - centerOffset, layout.fieldCenterY);

    this.drawQuarterField(this.tileSize);
    this.refreshDroppedItems();

    this.slotPanel.setPosition(layout.slotCenterX, layout.slotAreaY).setSize(layout.width * 0.95, layout.slotAreaHeight * 0.9);

    const reelGap = Math.max(84, Math.floor(layout.width * 0.16));
    this.reels.forEach((reel, index) => {
      const x = layout.slotCenterX + (index - 1) * reelGap;
      const y = layout.slotAreaY - layout.slotAreaHeight * 0.05;
      reel.frame.setPosition(x, y).setSize(Math.max(84, Math.floor(layout.width * 0.13)), Math.max(112, Math.floor(layout.slotAreaHeight * 0.38)));
      reel.text.setPosition(x, y).setFontSize(`${Math.max(48, Math.floor(layout.width * 0.06))}px`);
    });

    this.spinButton.setPosition(layout.slotCenterX, layout.slotAreaY + layout.slotAreaHeight * 0.26)
      .setSize(Math.max(220, Math.floor(layout.width * 0.28)), Math.max(64, Math.floor(layout.slotAreaHeight * 0.24)));
    this.spinLabel.setPosition(this.spinButton.x, this.spinButton.y).setFontSize(`${Math.max(22, Math.floor(layout.width * 0.028))}px`);
  }

  /**
   * GPT-5.3-Codex: クォータービューの床タイルを描画する。
   */
  private drawQuarterField(tileSize: number): void {
    this.tileLayer.removeAll(true);

    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        const iso = this.toIso(x, y, tileSize);
        const halfW = tileSize;
        const halfH = tileSize * 0.5;
        const colors = (x + y) % 2 === 0
          ? { top: 0x86efac, left: 0x166534, right: 0x15803d }
          : { top: 0x4ade80, left: 0x14532d, right: 0x166534 };

        const top = this.add.polygon(iso.x, iso.y, [0, -halfH, halfW, 0, 0, halfH, -halfW, 0], colors.top, 1)
          .setStrokeStyle(1, 0x052e16, 0.35);
        const left = this.add.polygon(iso.x - halfW * 0.5, iso.y + halfH * 0.5, [0, 0, halfW * 0.5, halfH * 0.5, halfW * 0.5, halfH * 1.5, 0, halfH], colors.left, 0.95);
        const right = this.add.polygon(iso.x + halfW * 0.5, iso.y + halfH * 0.5, [0, 0, -halfW * 0.5, halfH * 0.5, -halfW * 0.5, halfH * 1.5, 0, halfH], colors.right, 0.95);
        this.tileLayer.add([left, right, top]);
      }
    }
  }

  /**
   * GPT-5.3-Codex: 2Dグリッド座標をクォータービュー座標へ変換する。
   */
  private toIso(gridX: number, gridY: number, tileSize: number): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2((gridX - gridY) * tileSize, (gridX + gridY) * tileSize * 0.5);
  }

  /**
   * GPT-5.3-Codex: スロット回転を開始し、半自動で停止まで進行させる。
   */
  private startSpin(): void {
    if (this.spinning) {
      return;
    }

    this.spinAttemptCount += 1;
    this.spinning = true;
    this.spinButton.disableInteractive().setAlpha(0.6);
    this.statusText.setText('スロット回転中...');

    this.spinResults = this.generateSpinResults();
    this.reelActiveStates = [true, true, true];

    this.reelTimer?.remove(false);
    this.reelTimer = this.time.addEvent({
      delay: REEL_TICK_MS,
      loop: true,
      callback: () => {
        this.reels.forEach((reel, index) => {
          if (!this.reelActiveStates[index]) {
            return;
          }
          const randomEmoji = Phaser.Utils.Array.GetRandom(EMOJI_POOL).emoji;
          reel.text.setText(randomEmoji);
        });
      },
    });

    let stopIndex = 0;
    this.stopTimer?.remove(false);
    this.stopTimer = this.time.addEvent({
      delay: REEL_STOP_INTERVAL_MS,
      loop: true,
      callback: () => {
        this.reelActiveStates[stopIndex] = false;
        this.reels[stopIndex].text.setText(this.spinResults[stopIndex].emoji);
        stopIndex += 1;

        if (stopIndex >= REEL_COUNT) {
          this.stopTimer?.remove(false);
          this.reelTimer?.remove(false);
          this.stopSpinAndResolve();
        }
      },
    });
  }

  /**
   * GPT-5.3-Codex: 3回に1回は必ず揃うスロット結果を生成する。
   */
  private generateSpinResults(): EmojiDefinition[] {
    if (this.spinAttemptCount % 3 === 0) {
      const matchedEmoji = Phaser.Utils.Array.GetRandom(EMOJI_POOL);
      // GPT-5.3-Codex: 3回目は全リール同一にして確定で揃える。
      return Array.from({ length: REEL_COUNT }, () => matchedEmoji);
    }

    return Array.from({ length: REEL_COUNT }, () => Phaser.Utils.Array.GetRandom(EMOJI_POOL));
  }

  /**
   * GPT-5.3-Codex: スロット停止後に当たり判定とフィールド反映を行う。
   */
  private stopSpinAndResolve(): void {
    this.spinning = false;
    this.spinButton.setInteractive({ useHandCursor: true }).setAlpha(1);

    const jackpot = this.spinResults.every((entry) => entry.emoji === this.spinResults[0].emoji);
    if (!jackpot) {
      this.statusText.setText('今回はハズレ。もう一度タップ！');
      return;
    }

    const matched = this.spinResults[0];
    this.statusText.setText(`🎉 ${matched.emoji} (${matched.label}) が揃った！`);
    this.spawnMatchedEmoji(matched);
  }

  /**
   * GPT-5.3-Codex: 揃った絵文字のカテゴリに応じてフィールド挙動を追加する。
   */
  private spawnMatchedEmoji(definition: EmojiDefinition): void {
    if (definition.category === 'creature') {
      this.spawnCreature(definition.emoji);
      return;
    }

    if (definition.category === 'tool') {
      this.dropTool(definition.emoji);
      return;
    }

    this.dropFood(definition.emoji);
  }

  /**
   * GPT-5.3-Codex: 生き物を出現させ、生活挙動の初期値を設定する。
   */
  private spawnCreature(emoji: string): void {
    const gridX = Phaser.Math.Between(1, GRID_SIZE - 2);
    const gridY = Phaser.Math.Between(1, GRID_SIZE - 2);
    const iso = this.toIso(gridX, gridY, this.tileSize);

    const shadow = this.add.ellipse(iso.x, iso.y + this.tileSize * 0.68, this.tileSize * 0.7, this.tileSize * 0.3, 0x020617, 0.3);
    const sprite = this.add.text(iso.x, iso.y + this.tileSize * 0.18, emoji, {
      fontFamily: 'sans-serif',
      fontSize: `${Math.max(28, Math.floor(this.tileSize * 0.95))}px`,
    }).setOrigin(0.5, 0.68);
    const info = this.add.text(iso.x, iso.y - this.tileSize * 0.42, '誕生', {
      fontFamily: 'sans-serif',
      fontSize: `${Math.max(12, Math.floor(this.tileSize * 0.38))}px`,
      color: '#fef9c3',
      backgroundColor: '#1f2937cc',
      padding: { left: 6, right: 6, top: 2, bottom: 2 },
    }).setOrigin(0.5, 0.5);

    this.creatureLayer.add([shadow, sprite, info]);
    this.creatures.push({
      emoji,
      mood: '誕生',
      carryingTool: null,
      sprite,
      info,
      shadow,
      gridX,
      gridY,
      targetX: Phaser.Math.Between(1, GRID_SIZE - 2),
      targetY: Phaser.Math.Between(1, GRID_SIZE - 2),
      travel: 0,
      speed: Phaser.Math.FloatBetween(0.22, 0.4),
    });
  }

  /**
   * GPT-5.3-Codex: 道具絵文字を地面へ出現させる。
   */
  private dropTool(emoji: string): void {
    const gridX = Phaser.Math.Between(1, GRID_SIZE - 2);
    const gridY = Phaser.Math.Between(1, GRID_SIZE - 2);
    const iso = this.toIso(gridX, gridY, this.tileSize);
    const sprite = this.add.text(iso.x, iso.y + this.tileSize * 0.18, emoji, {
      fontFamily: 'sans-serif',
      fontSize: `${Math.max(20, Math.floor(this.tileSize * 0.8))}px`,
    }).setOrigin(0.5, 0.68);
    this.itemLayer.add(sprite);
    this.tools.push({ emoji, sprite, gridX, gridY });

    if (this.creatures.length === 0) {
      this.statusText.setText(`道具 ${emoji} が置かれた。生き物が来ると使います。`);
    }
  }

  /**
   * GPT-5.3-Codex: 食べもの絵文字を地面へ出現させる。
   */
  private dropFood(emoji: string): void {
    const gridX = Phaser.Math.Between(1, GRID_SIZE - 2);
    const gridY = Phaser.Math.Between(1, GRID_SIZE - 2);
    const iso = this.toIso(gridX, gridY, this.tileSize);
    const sprite = this.add.text(iso.x, iso.y + this.tileSize * 0.18, emoji, {
      fontFamily: 'sans-serif',
      fontSize: `${Math.max(20, Math.floor(this.tileSize * 0.8))}px`,
    }).setOrigin(0.5, 0.68);
    this.itemLayer.add(sprite);
    this.foods.push({ emoji, sprite, gridX, gridY, freshness: 7 });

    if (this.creatures.length === 0) {
      this.statusText.setText(`食べもの ${emoji} が置かれた。生き物が来ると食べます。`);
    }
  }

  /**
   * GPT-5.3-Codex: フィールド内アイテムの表示位置をリサイズ時に再配置する。
   */
  private refreshDroppedItems(): void {
    this.tools.forEach((tool) => {
      const iso = this.toIso(tool.gridX, tool.gridY, this.tileSize);
      tool.sprite.setPosition(iso.x, iso.y + this.tileSize * 0.18).setFontSize(`${Math.max(20, Math.floor(this.tileSize * 0.8))}px`);
    });

    this.foods.forEach((food) => {
      const iso = this.toIso(food.gridX, food.gridY, this.tileSize);
      food.sprite.setPosition(iso.x, iso.y + this.tileSize * 0.18).setFontSize(`${Math.max(20, Math.floor(this.tileSize * 0.8))}px`);
    });

    this.creatures.forEach((creature) => {
      creature.sprite.setFontSize(`${Math.max(28, Math.floor(this.tileSize * 0.95))}px`);
      creature.info.setFontSize(`${Math.max(12, Math.floor(this.tileSize * 0.38))}px`);
    });
  }

  /**
   * GPT-5.3-Codex: 生き物が近くの道具を拾って利用状態にする。
   */
  private processToolPickup(): void {
    if (this.creatures.length === 0 || this.tools.length === 0) {
      return;
    }

    for (let i = this.tools.length - 1; i >= 0; i -= 1) {
      const tool = this.tools[i];
      const receiver = this.creatures.find((creature) => {
        const dx = creature.gridX - tool.gridX;
        const dy = creature.gridY - tool.gridY;
        return Math.hypot(dx, dy) < 1.2;
      });

      if (!receiver) {
        continue;
      }

      receiver.carryingTool = tool.emoji;
      receiver.mood = `道具使用中`;
      tool.sprite.destroy();
      this.tools.splice(i, 1);
      this.statusText.setText(`${receiver.emoji} が ${tool.emoji} を拾って使い始めた！`);
    }
  }

  /**
   * GPT-5.3-Codex: 生き物が近くの食べものを食べ、時間で鮮度を減らす。
   */
  private processFoodEating(deltaSec: number): void {
    for (let i = this.foods.length - 1; i >= 0; i -= 1) {
      const food = this.foods[i];
      food.freshness -= deltaSec;

      const eater = this.creatures.find((creature) => {
        const dx = creature.gridX - food.gridX;
        const dy = creature.gridY - food.gridY;
        return Math.hypot(dx, dy) < 1.2;
      });

      if (eater) {
        eater.mood = `もぐもぐ ${food.emoji}`;
        food.sprite.destroy();
        this.foods.splice(i, 1);
        this.statusText.setText(`${eater.emoji} が ${food.emoji} を食べた！`);
        continue;
      }

      if (food.freshness <= 0) {
        food.sprite.destroy();
        this.foods.splice(i, 1);
      }
    }
  }
}

new Phaser.Game(createConfig([SummaryScene]));
