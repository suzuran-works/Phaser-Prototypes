import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BaseResponsiveScene } from '../baseResponsiveScene.ts';
import { BACKGROUND_COLOR, SUBTITLE, TITLE } from './define.ts';

type ZooLayout = {
  width: number;
  height: number;
  titleY: number;
  subtitleY: number;
  statusY: number;
  worldCenterX: number;
  worldCenterY: number;
  tileSize: number;
};

type Cell = {
  x: number;
  y: number;
};

type MonkeyState = 'idle' | 'appealing' | 'angry' | 'sleeping';

type FlyingType = 'banana' | 'poop';
type GroundItemType = 'banana' | 'poop';

type GroundItem = {
  id: number;
  type: GroundItemType;
  text: Phaser.GameObjects.Text;
  gridX: number;
  gridY: number;
  life: number;
};

const WORLD_SIZE = 8;
const TILE_TOP_COLOR = 0x22c55e;
const TILE_LEFT_COLOR = 0x15803d;
const TILE_RIGHT_COLOR = 0x166534;
const FENCE_COLOR = 0xf1f5f9;
const CUSTOMER_EMOJIS = ['😀', '😄', '🙂', '👩', '👨‍🦰', '🧒', '🧑‍🦱', '👴'];
const MONKEY_EMOJIS = ['🐵', '🐒', '🙈'];
const BANANA_EMOJI = '🍌';
const POOP_EMOJI = '💩';
const MONKEY_SPOTS: Cell[] = [{ x: 2.9, y: 3.2 }, { x: 3.8, y: 2.9 }, { x: 4.7, y: 3.3 }, { x: 3.4, y: 4.2 }, { x: 4.3, y: 4.4 }];
const CUSTOMER_SPOTS: Cell[] = [
  { x: 1, y: 1 },
  { x: 2, y: 1 },
  { x: 5, y: 1 },
  { x: 6, y: 2 },
  { x: 1, y: 5 },
  { x: 6, y: 5 },
  { x: 2, y: 6 },
  { x: 5, y: 6 },
];

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts15SummaryScene';

  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private worldLayer!: Phaser.GameObjects.Container;
  private groundLayer!: Phaser.GameObjects.Container;
  private actorLayer!: Phaser.GameObjects.Container;
  private monkeyTexts: Phaser.GameObjects.Text[] = [];
  private customerTexts: Phaser.GameObjects.Text[] = [];
  private monkeyShadows: Phaser.GameObjects.Ellipse[] = [];
  private monkeyStates: MonkeyState[] = [];
  private monkeyAppealScores: number[] = [];
  private monkeyHungerTimes: number[] = [];
  private monkeyMoodTexts: Phaser.GameObjects.Text[] = [];
  private customerMoodTexts: Phaser.GameObjects.Text[] = [];
  private monkeyBaseScales: number[] = [];
  private monkeyMoveSeeds: number[] = [];
  private monkeyReactionTimers: number[] = [];
  private monkeyReactionEmojis: string[] = [];
  private monkeySleepTimers: number[] = [];
  private monkeyWorldPositions: Phaser.Math.Vector2[] = [];
  private customerReactionTimers: number[] = [];
  private customerReactionEmojis: string[] = [];
  private monkeyFoodTargets: Array<number | null> = [];
  private monkeyAppealTime = 0;
  private monkeyRevengeTime = 0;
  private cells: Cell[] = [];
  private bananaFeedCount = 0;
  private skippedFeedCount = 0;
  private angryMonkeyCount = 0;
  private poopThrowCount = 0;
  private flyingItems: Phaser.GameObjects.Text[] = [];
  private groundItems: GroundItem[] = [];
  private groundItemSequence = 0;
  private currentTileSize = 44;

  /**
   * GPT-5.3-Codex: クォータービューの猿コーナー観察シーンを初期化する。
   */
  public constructor() {
    super(SummaryScene.key);
  }

  /**
   * GPT-5.3-Codex: UIとワールドを生成し、猿と客を配置する。
   */
  public create(): void {
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);

    this.titleText = this.add.text(0, 0, TITLE, {
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      fontSize: '42px',
      color: '#f8fafc',
    }).setOrigin(0.5, 0);

    this.subtitleText = this.add.text(0, 0, SUBTITLE, {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      color: '#bfdbfe',
    }).setOrigin(0.5, 0);

    this.statusText = this.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#fde68a',
      align: 'center',
    }).setOrigin(0.5, 0);

    this.worldLayer = this.add.container(0, 0);
    this.groundLayer = this.add.container(0, 0);
    this.actorLayer = this.add.container(0, 0);
    this.worldLayer.add([this.groundLayer, this.actorLayer]);

    this.buildGroundCells();
    this.redrawGround(this.currentTileSize);
    this.createActors();

    this.time.addEvent({
      delay: 1400,
      loop: true,
      callback: () => {
        this.launchBanana();
      },
    });

    this.bindResponsiveLayout();
  }

  /**
   * GPT-5.3-Codex: 毎フレーム猿のアピール・感情・投擲演出を更新する。
   */
  public update(_: number, deltaMs: number): void {
    const deltaSeconds = deltaMs / 1000;
    this.monkeyAppealTime += deltaSeconds;
    this.monkeyRevengeTime += deltaSeconds;

    this.updateMonkeyAppeal(deltaSeconds);
    this.updateCustomerMotion(deltaSeconds);
    this.maybeThrowPoop();
    this.updateFlyingItems(deltaSeconds);

    const appealingCount = this.monkeyStates.filter((state) => state === 'appealing').length;
    this.angryMonkeyCount = this.monkeyStates.filter((state) => state === 'angry').length;
    this.statusText.setText(`猿のアピール: ${appealingCount}匹  怒り: ${this.angryMonkeyCount}匹  バナナ: ${this.bananaFeedCount}本  仕返し: ${this.poopThrowCount}発  見送り: ${this.skippedFeedCount}回`);
  }

  /**
   * GPT-5.3-Codex: 画面サイズに応じたUIとワールドのレイアウト値を計算する。
   */
  protected computeLayout(width: number, height: number): ZooLayout {
    const uiTop = Math.max(96, height * 0.15);
    const availableHeight = Math.max(180, height - uiTop - 18);
    const tileFromHeight = Math.floor(availableHeight / 8.8);
    const tileFromWidth = Math.floor(width / 18);
    const tileSize = Math.max(24, Math.min(56, tileFromHeight, tileFromWidth));
    return {
      width,
      height,
      titleY: Math.max(12, height * 0.02),
      subtitleY: Math.max(58, height * 0.08),
      statusY: Math.max(96, height * 0.135),
      worldCenterX: width * 0.5,
      worldCenterY: uiTop + availableHeight * 0.5,
      tileSize,
    };
  }

  /**
   * GPT-5.3-Codex: レイアウト変更時に地面とキャラクター位置を再配置する。
   */
  protected renderLayout(layout: ZooLayout): void {
    this.titleText.setPosition(layout.width * 0.5, layout.titleY).setFontSize(Math.max(30, Math.floor(layout.width * 0.034)));
    this.subtitleText.setPosition(layout.width * 0.5, layout.subtitleY).setFontSize(Math.max(14, Math.floor(layout.width * 0.016)));
    this.statusText.setPosition(layout.width * 0.5, layout.statusY).setFontSize(Math.max(13, Math.floor(layout.width * 0.015)));

    this.currentTileSize = layout.tileSize;
    const visualCenterX = this.computeWorldVisualCenterX(layout.tileSize);
    this.worldLayer.setPosition(layout.worldCenterX - visualCenterX, layout.worldCenterY);
    this.redrawGround(layout.tileSize);
    this.repositionActors(layout.tileSize);
  }

  /**
   * GPT-5.3-Codex: ワールド描画に使うグリッド座標を生成する。
   */
  private buildGroundCells(): void {
    this.cells = [];
    for (let y = 0; y < WORLD_SIZE; y += 1) {
      for (let x = 0; x < WORLD_SIZE; x += 1) {
        this.cells.push({ x, y });
      }
    }
  }

  /**
   * GPT-5.3-Codex: クォータービューの地面・柵・猿エリアを再描画する。
   */
  private redrawGround(tileSize: number): void {
    this.groundLayer.removeAll(true);

    this.cells.forEach((cell) => {
      const iso = this.toIsometric(cell.x, cell.y, tileSize);
      const halfW = tileSize;
      const halfH = tileSize * 0.5;
      const depth = Math.max(6, tileSize * 0.24);

      const top = this.add.polygon(iso.x, iso.y, [0, -halfH, halfW, 0, 0, halfH, -halfW, 0], TILE_TOP_COLOR, 1)
        .setStrokeStyle(1, 0x052e16, 0.35);
      const left = this.add.polygon(iso.x - halfW * 0.5, iso.y + depth * 0.45, [0, -halfH * 0.5, halfW * 0.5, 0, halfW * 0.5, depth, 0, depth - halfH * 0.5], TILE_LEFT_COLOR, 0.86);
      const right = this.add.polygon(iso.x + halfW * 0.5, iso.y + depth * 0.45, [0, -halfH * 0.5, halfW * 0.5, 0, halfW * 0.5, depth, 0, depth - halfH * 0.5], TILE_RIGHT_COLOR, 0.86);
      this.groundLayer.add([left, right, top]);
    });

    this.drawMonkeyAreaFence(tileSize);
  }

  /**
   * GPT-5.3-Codex: 猿コーナーの周囲に柵を描いて観覧エリアを明確化する。
   */
  private drawMonkeyAreaFence(tileSize: number): void {
    const minGrid = 2.0;
    const maxGrid = 5.25;
    const corners = [
      this.toIsometric(minGrid, minGrid, tileSize),
      this.toIsometric(maxGrid, minGrid, tileSize),
      this.toIsometric(maxGrid, maxGrid, tileSize),
      this.toIsometric(minGrid, maxGrid, tileSize),
    ];

    corners.forEach((corner) => {
      const poleHeight = tileSize * 0.94;
      const poleTopY = corner.y - tileSize * 0.86;
      const pole = this.add.rectangle(corner.x, poleTopY + poleHeight * 0.5, 5, poleHeight, FENCE_COLOR, 0.88);
      this.groundLayer.add(pole);
    });

    // GPT-5.3-Codex: 奥側を先に、手前側を後に描くことで視覚的な破綻を回避する。
    this.drawFenceSegment(corners[0], corners[1], tileSize, false);
    this.drawFenceSegment(corners[3], corners[0], tileSize, false);
    this.drawFenceSegment(corners[1], corners[2], tileSize, true);
    this.drawFenceSegment(corners[2], corners[3], tileSize, true);
  }

  /**
   * GPT-5.3-Codex: 猿と客の絵文字オブジェクトを生成する。
   */
  private createActors(): void {
    this.monkeyTexts = [];
    this.customerTexts = [];
    this.monkeyShadows = [];
    this.monkeyStates = [];
    this.monkeyAppealScores = [];
    this.monkeyHungerTimes = [];
    this.monkeyMoodTexts = [];
    this.customerMoodTexts = [];
    this.monkeyBaseScales = [];
    this.monkeyMoveSeeds = [];
    this.monkeyReactionTimers = [];
    this.monkeyReactionEmojis = [];
    this.customerReactionTimers = [];
    this.customerReactionEmojis = [];

    MONKEY_SPOTS.forEach((_, index) => {
      const shadow = this.add.ellipse(0, 0, 22, 10, 0x020617, 0.35);
      const monkey = this.add.text(0, 0, Phaser.Utils.Array.GetRandom(MONKEY_EMOJIS), {
        fontFamily: 'sans-serif',
        fontSize: '42px',
      }).setOrigin(0.5, 0.9);
      const mood = this.add.text(0, 0, '➖', {
        fontFamily: 'sans-serif',
        fontSize: '22px',
      }).setOrigin(0.5, 1);

      this.monkeyShadows.push(shadow);
      this.monkeyTexts.push(monkey);
      this.monkeyStates.push('idle');
      this.monkeyAppealScores.push(0);
      this.monkeyHungerTimes.push(0);
      this.monkeyMoodTexts.push(mood);
      this.monkeyBaseScales.push(1);
      this.monkeyMoveSeeds.push(index * 1.33 + Math.random());
      this.monkeyReactionTimers.push(0);
      this.monkeyReactionEmojis.push('');
      this.monkeySleepTimers.push(0);
      this.monkeyWorldPositions.push(new Phaser.Math.Vector2(MONKEY_SPOTS[index].x, MONKEY_SPOTS[index].y));
      this.monkeyFoodTargets.push(null);
      this.actorLayer.add([shadow, mood, monkey]);
    });

    CUSTOMER_SPOTS.forEach((_, index) => {
      const customer = this.add.text(0, 0, Phaser.Utils.Array.GetRandom(CUSTOMER_EMOJIS), {
        fontFamily: 'sans-serif',
        fontSize: '34px',
      }).setOrigin(0.5, 0.9);
      const mood = this.add.text(0, 0, '🫶', {
        fontFamily: 'sans-serif',
        fontSize: '20px',
      }).setOrigin(0.5, 1);
      this.customerTexts.push(customer);
      this.customerMoodTexts.push(mood);
      this.customerReactionTimers.push(0);
      this.customerReactionEmojis.push('🫶');
      this.actorLayer.add([mood, customer]);
      this.setCustomerReaction(index, '🫶', 0.5);
    });

    this.repositionActors(this.currentTileSize);
  }

  /**
   * GPT-5.3-Codex: タイルサイズに合わせて猿・客・バナナの座標を再計算する。
   */
  private repositionActors(tileSize: number): void {
    this.monkeyTexts.forEach((monkey, index) => {
      const spot = MONKEY_SPOTS[index];
      if (!this.monkeyWorldPositions[index]) {
        this.monkeyWorldPositions[index] = new Phaser.Math.Vector2(spot.x, spot.y);
      }
      const iso = this.toIsometric(this.monkeyWorldPositions[index].x, this.monkeyWorldPositions[index].y, tileSize);
      monkey.setPosition(iso.x, iso.y - tileSize * 0.35);
      monkey.setFontSize(Math.max(28, Math.floor(tileSize * 0.96)));
      this.monkeyMoodTexts[index].setPosition(iso.x, iso.y - tileSize * 0.82).setFontSize(Math.max(16, Math.floor(tileSize * 0.42)));
      this.monkeyShadows[index].setPosition(iso.x, iso.y - tileSize * 0.05).setSize(tileSize * 0.54, tileSize * 0.22);
    });

    this.customerTexts.forEach((customer, index) => {
      const spot = CUSTOMER_SPOTS[index];
      const iso = this.toIsometric(spot.x, spot.y, tileSize);
      customer.setPosition(iso.x, iso.y - tileSize * 0.32);
      customer.setFontSize(Math.max(24, Math.floor(tileSize * 0.82)));
      this.customerMoodTexts[index].setPosition(iso.x, iso.y - tileSize * 0.78).setFontSize(Math.max(14, Math.floor(tileSize * 0.38)));
    });

    this.groundItems.forEach((item) => {
      const iso = this.toIsometric(item.gridX, item.gridY, tileSize);
      item.text.setPosition(iso.x, iso.y - tileSize * 0.18).setFontSize(Math.max(16, Math.floor(tileSize * 0.48)));
    });
  }

  /**
   * GPT-5.3-Codex: 猿のアピール状態を時間変化で切り替え、見た目に反映する。
   */
  private updateMonkeyAppeal(deltaSeconds: number): void {
    this.monkeyTexts.forEach((monkey, index) => {
      const cycle = (this.monkeyAppealTime + index * 0.7) % 3.2;
      const isAppealing = cycle > 0.45 && cycle < 1.6;
      this.monkeyAppealScores[index] = isAppealing
        ? Math.min(1, this.monkeyAppealScores[index] + deltaSeconds * 0.85)
        : Math.max(0, this.monkeyAppealScores[index] - deltaSeconds * 0.5);

      this.monkeyHungerTimes[index] += deltaSeconds;
      this.monkeySleepTimers[index] = Math.max(0, this.monkeySleepTimers[index] - deltaSeconds);
      const isSleeping = this.monkeySleepTimers[index] > 0;
      const isAngry = this.monkeyHungerTimes[index] > 6.8;
      this.monkeyStates[index] = isSleeping
        ? 'sleeping'
        : (isAngry ? 'angry' : (isAppealing ? 'appealing' : 'idle'));

      this.updateMonkeyWorldPosition(index, deltaSeconds, isSleeping, isAngry);
      const worldPos = this.monkeyWorldPositions[index];
      const base = this.toIsometric(worldPos.x, worldPos.y, this.currentTileSize);
      const driftX = isSleeping ? 0 : Math.sin(this.monkeyAppealTime * 1.2 + this.monkeyMoveSeeds[index]) * this.currentTileSize * 0.08;
      const driftY = isSleeping ? 0 : Math.cos(this.monkeyAppealTime * 0.9 + this.monkeyMoveSeeds[index] * 1.4) * this.currentTileSize * 0.04;
      const jump = isSleeping ? 0 : (isAppealing ? Math.sin(this.monkeyAppealTime * 8 + index) * 5 : Math.sin(this.monkeyAppealTime * 3 + index) * 1.7);
      const jumpOffset = jump * deltaSeconds * 24;
      monkey.setPosition(base.x + driftX, base.y - this.currentTileSize * 0.35 + driftY + jumpOffset);
      this.monkeyShadows[index].setPosition(base.x + driftX, base.y - this.currentTileSize * 0.05 + driftY * 0.45);
      const angryBoost = isAngry ? 0.1 : 0;
      const appealBoost = isAppealing ? 0.08 : 0;
      const sleepScale = isSleeping ? -0.08 : 0;
      this.monkeyBaseScales[index] = 1 + angryBoost + appealBoost + sleepScale;
      monkey.setScale(this.monkeyBaseScales[index]);

      // GPT-5.3-Codex: 怒り・アピール・通常とリアクションを統合して猿の感情を描画する。
      monkey.setTint(isSleeping ? 0xdbeafe : (isAngry ? 0xffb4b4 : (isAppealing ? 0xfff7d6 : 0xffffff)));
      this.monkeyReactionTimers[index] = Math.max(0, this.monkeyReactionTimers[index] - deltaSeconds);
      const autoMood = isSleeping ? '💤' : (isAngry ? '💢' : (isAppealing ? '✨' : '➖'));
      const mood = this.monkeyReactionTimers[index] > 0 ? this.monkeyReactionEmojis[index] : autoMood;
      this.monkeyMoodTexts[index].setText(mood).setPosition(base.x + driftX, base.y - this.currentTileSize * 0.84 + driftY * 0.7);

      if (!isSleeping && !isAngry && this.monkeyFoodTargets[index] === null && Math.random() < deltaSeconds * 0.045) {
        this.monkeySleepTimers[index] = Phaser.Math.FloatBetween(1.8, 4.6);
      }
    });
  }

  /**
   * GPT-5.3-Codex: 観客に軽い揺れと感情表示を与えてシーン全体の静止感を減らす。
   */
  private updateCustomerMotion(deltaSeconds: number): void {
    this.customerTexts.forEach((customer, index) => {
      const spot = CUSTOMER_SPOTS[index];
      const base = this.toIsometric(spot.x, spot.y, this.currentTileSize);
      const swayX = Math.sin(this.monkeyAppealTime * 1.7 + index * 0.8) * this.currentTileSize * 0.05;
      const bobY = Math.sin(this.monkeyAppealTime * 2.3 + index * 0.5) * this.currentTileSize * 0.045;
      customer.setPosition(base.x + swayX, base.y - this.currentTileSize * 0.32 + bobY);
      customer.setScale(1 + Math.max(0, bobY) * 0.006);

      this.customerReactionTimers[index] = Math.max(0, this.customerReactionTimers[index] - deltaSeconds);
      const mood = this.customerReactionTimers[index] > 0 ? this.customerReactionEmojis[index] : '🫶';
      this.customerMoodTexts[index].setPosition(base.x + swayX, base.y - this.currentTileSize * 0.78 + bobY * 0.8).setText(mood);
    });
  }

  /**
   * GPT-5.3-Codex: 客から猿へ飛ぶバナナを定期的に生成する。
   */
  private launchBanana(): void {
    if (this.customerTexts.length === 0 || this.monkeyTexts.length === 0) {
      return;
    }

    const customerIndex = Phaser.Math.Between(0, this.customerTexts.length - 1);
    const monkeyIndex = this.chooseBananaTargetIndex();
    if (monkeyIndex < 0) {
      this.skippedFeedCount += 1;
      this.setCustomerReaction(customerIndex, '💭', 1.2);
      return;
    }

    const customer = this.customerTexts[customerIndex];
    const missPoint = this.pickMissGridPointInMonkeyArea();
    const hitPoint = this.toIsometric(this.monkeyWorldPositions[monkeyIndex].x, this.monkeyWorldPositions[monkeyIndex].y, this.currentTileSize);
    const willHit = Math.random() < 0.68;
    const banana = this.createFlyingItem(
      BANANA_EMOJI,
      customer.x,
      customer.y - 12,
      willHit ? hitPoint.x : missPoint.x,
      willHit ? hitPoint.y - this.currentTileSize * 0.2 : missPoint.y,
      'banana',
    );
    banana.setData('targetMonkeyIndex', monkeyIndex);
    banana.setData('targetCustomerIndex', customerIndex);
    banana.setData('willHit', willHit);
    banana.setData('missGridX', missPoint.gridX);
    banana.setData('missGridY', missPoint.gridY);
    this.actorLayer.add(banana);

    this.bananaFeedCount += 1;
    this.monkeyHungerTimes[monkeyIndex] = Math.max(0, this.monkeyHungerTimes[monkeyIndex] - 4.8);
    this.monkeyAppealScores[monkeyIndex] = Math.max(0, this.monkeyAppealScores[monkeyIndex] - 0.34);
    this.setCustomerReaction(customerIndex, willHit ? '🎉' : '💨', 1.4);
  }

  /**
   * GPT-5.3-Codex: 怒った猿が観客へ💩を投げる仕返しイベントを発生させる。
   */
  private maybeThrowPoop(): void {
    if (this.monkeyRevengeTime < 2.2 || this.customerTexts.length === 0) {
      return;
    }

    const angryIndices = this.monkeyStates
      .map((state, index) => ({ state, index }))
      .filter((entry) => entry.state === 'angry')
      .map((entry) => entry.index);
    if (angryIndices.length === 0) {
      return;
    }

    this.monkeyRevengeTime = 0;
    const monkeyIndex = Phaser.Utils.Array.GetRandom(angryIndices);
    const customerIndex = Phaser.Math.Between(0, this.customerTexts.length - 1);
    const monkey = this.monkeyTexts[monkeyIndex];
    const customer = this.customerTexts[customerIndex];
    const missPoint = this.pickMissGridPointNearCustomerArea();
    const willHit = Math.random() < 0.6;
    const poop = this.createFlyingItem(
      POOP_EMOJI,
      monkey.x,
      monkey.y - 24,
      willHit ? customer.x : missPoint.x,
      willHit ? customer.y - 24 : missPoint.y,
      'poop',
    );
    poop.setData('targetMonkeyIndex', monkeyIndex);
    poop.setData('targetCustomerIndex', customerIndex);
    poop.setData('willHit', willHit);
    poop.setData('missGridX', missPoint.gridX);
    poop.setData('missGridY', missPoint.gridY);
    this.actorLayer.add(poop);
    this.poopThrowCount += 1;
    this.setMonkeyReaction(monkeyIndex, '💢', 1.2);
  }

  /**
   * GPT-5.3-Codex: 絵文字投擲オブジェクトを生成し、更新対象へ登録する。
   */
  private createFlyingItem(emoji: string, fromX: number, fromY: number, toX: number, toY: number, type: FlyingType): Phaser.GameObjects.Text {
    const item = this.add.text(fromX, fromY, emoji, {
      fontFamily: 'sans-serif',
      fontSize: `${Math.max(18, Math.floor(this.currentTileSize * 0.5))}px`,
    }).setOrigin(0.5, 0.8);

    item.setData('fromX', fromX);
    item.setData('fromY', fromY);
    item.setData('toX', toX);
    item.setData('toY', toY);
    item.setData('progress', 0);
    item.setData('duration', type === 'banana' ? Phaser.Math.FloatBetween(0.6, 0.95) : Phaser.Math.FloatBetween(0.45, 0.75));
    item.setData('type', type);

    this.flyingItems.push(item);
    return item;
  }

  /**
   * GPT-5.3-Codex: アピールの強い猿を優先しつつ、客が見送るケースも含めた投擲先を決定する。
   */
  private chooseBananaTargetIndex(): number {
    const appealingIndices = this.monkeyStates
      .map((state, index) => ({ state, index }))
      .filter((entry) => entry.state === 'appealing' || entry.state === 'angry')
      .map((entry) => entry.index);

    if (appealingIndices.length === 0) {
      return -1;
    }

    // GPT-5.3-Codex: 客は常に投げるわけではないため、一定確率で見送りを発生させる。
    if (Math.random() < 0.35) {
      return -1;
    }

    const weights = appealingIndices.map((index) => this.monkeyAppealScores[index] + (this.monkeyStates[index] === 'angry' ? 0.45 : 0.15));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    if (totalWeight <= 0) {
      return Phaser.Utils.Array.GetRandom(appealingIndices);
    }

    let pick = Math.random() * totalWeight;
    for (let i = 0; i < appealingIndices.length; i += 1) {
      pick -= weights[i];
      if (pick <= 0) {
        return appealingIndices[i];
      }
    }

    return appealingIndices[appealingIndices.length - 1];
  }

  /**
   * GPT-5.3-Codex: 飛翔アイテムの軌道補間と着弾時のリアクション処理を行う。
   */
  private updateFlyingItems(deltaSeconds: number): void {
    this.flyingItems = this.flyingItems.filter((item) => {
      const progress = Number(item.getData('progress')) + deltaSeconds / Number(item.getData('duration'));
      item.setData('progress', progress);

      const fromX = Number(item.getData('fromX'));
      const fromY = Number(item.getData('fromY'));
      const toX = Number(item.getData('toX'));
      const toY = Number(item.getData('toY'));
      const type = String(item.getData('type')) as FlyingType;
      const arcHeight = this.currentTileSize * (type === 'banana' ? 0.85 : 0.55);

      const x = Phaser.Math.Linear(fromX, toX, progress);
      const y = Phaser.Math.Linear(fromY, toY, progress) - Math.sin(progress * Math.PI) * arcHeight;
      item.setPosition(x, y);

      if (progress >= 1) {
        const monkeyIndex = Number(item.getData('targetMonkeyIndex'));
        const customerIndex = Number(item.getData('targetCustomerIndex'));
        const willHit = Boolean(item.getData('willHit'));
        if (willHit) {
          this.handleItemImpact(type, monkeyIndex, customerIndex);
        } else {
          this.dropGroundItem(type, Number(item.getData('missGridX')), Number(item.getData('missGridY')));
        }
        item.destroy();
        return false;
      }

      return true;
    });

    this.updateGroundItems(deltaSeconds);
  }

  /**
   * GPT-5.3-Codex: 着弾したアイテム種別に応じて猿・観客の感情を更新する。
   */
  private handleItemImpact(type: FlyingType, monkeyIndex: number, customerIndex: number): void {
    if (type === 'banana') {
      this.setMonkeyReaction(monkeyIndex, '🍌', 1.8);
      this.setCustomerReaction(customerIndex, '✨', 1.3);
      return;
    }

    this.setMonkeyReaction(monkeyIndex, '🔥', 1.6);
    const reaction = Math.random() < 0.5 ? '💥' : '💔';
    this.setCustomerReaction(customerIndex, reaction, 2.2);
  }

  /**
   * GPT-5.3-Codex: 落下物を地面に一定時間残し、必要なら猿の回収対象として割り当てる。
   */
  private dropGroundItem(type: GroundItemType, gridX: number, gridY: number): void {
    const iso = this.toIsometric(gridX, gridY, this.currentTileSize);
    const text = this.add.text(iso.x, iso.y - this.currentTileSize * 0.18, type === 'banana' ? BANANA_EMOJI : POOP_EMOJI, {
      fontFamily: 'sans-serif',
      fontSize: `${Math.max(16, Math.floor(this.currentTileSize * 0.48))}px`,
    }).setOrigin(0.5, 0.9);
    this.actorLayer.add(text);

    const item: GroundItem = {
      id: this.groundItemSequence,
      type,
      text,
      gridX,
      gridY,
      life: type === 'banana' ? 6.5 : 5.2,
    };
    this.groundItemSequence += 1;
    this.groundItems.push(item);

    if (type === 'banana') {
      this.assignMonkeyToBanana(item.id);
    }
  }

  /**
   * GPT-5.3-Codex: 地面に残った落下物の寿命を減算し、期限切れを破棄する。
   */
  private updateGroundItems(deltaSeconds: number): void {
    this.groundItems = this.groundItems.filter((item) => {
      item.life -= deltaSeconds;
      if (item.life <= 0) {
        item.text.destroy();
        this.clearFoodTargetByGroundId(item.id);
        return false;
      }

      item.text.setAlpha(item.life < 1.2 ? Math.max(0.2, item.life / 1.2) : 1);
      return true;
    });
  }

  /**
   * GPT-5.3-Codex: 落ちたバナナへ向けた猿の移動と回収処理を進める。
   */
  private updateMonkeyWorldPosition(index: number, deltaSeconds: number, isSleeping: boolean, isAngry: boolean): void {
    const worldPos = this.monkeyWorldPositions[index];
    const home = MONKEY_SPOTS[index];
    const targetGroundId = this.monkeyFoodTargets[index];
    const targetItem = this.groundItems.find((item) => item.id === targetGroundId && item.type === 'banana');
    if (targetGroundId !== null && !targetItem) {
      this.monkeyFoodTargets[index] = null;
    }

    const canEat = !isSleeping && !isAngry;
    const targetX = canEat && targetItem ? targetItem.gridX : home.x;
    const targetY = canEat && targetItem ? targetItem.gridY : home.y;
    const speed = canEat && targetItem ? 1.6 : 0.9;
    const lerp = Math.min(1, deltaSeconds * speed);

    worldPos.x = Phaser.Math.Linear(worldPos.x, targetX, lerp);
    worldPos.y = Phaser.Math.Linear(worldPos.y, targetY, lerp);

    if (canEat && targetItem) {
      const distance = Phaser.Math.Distance.Between(worldPos.x, worldPos.y, targetItem.gridX, targetItem.gridY);
      if (distance < 0.12) {
        this.consumeGroundBanana(index, targetItem.id);
      }
    }
  }

  /**
   * GPT-5.3-Codex: 猿がバナナを食べた際の後処理をまとめて実行する。
   */
  private consumeGroundBanana(monkeyIndex: number, groundId: number): void {
    const target = this.groundItems.find((item) => item.id === groundId);
    if (!target || target.type !== 'banana') {
      return;
    }

    target.text.destroy();
    this.groundItems = this.groundItems.filter((item) => item.id !== groundId);
    this.clearFoodTargetByGroundId(groundId);
    this.monkeyHungerTimes[monkeyIndex] = Math.max(0, this.monkeyHungerTimes[monkeyIndex] - 5.2);
    this.setMonkeyReaction(monkeyIndex, '🍌', 1.4);
  }

  /**
   * GPT-5.3-Codex: 落ちたバナナに最寄りの猿を割り当てる。
   */
  private assignMonkeyToBanana(groundId: number): void {
    const banana = this.groundItems.find((item) => item.id === groundId && item.type === 'banana');
    if (!banana) {
      return;
    }

    let bestIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    this.monkeyWorldPositions.forEach((position, index) => {
      if (this.monkeyStates[index] === 'sleeping') {
        return;
      }
      const distance = Phaser.Math.Distance.Between(position.x, position.y, banana.gridX, banana.gridY);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    if (bestIndex >= 0) {
      this.monkeyFoodTargets[bestIndex] = groundId;
    }
  }

  /**
   * GPT-5.3-Codex: 期限切れ等で消える落下物に紐づく猿の目的地を解除する。
   */
  private clearFoodTargetByGroundId(groundId: number): void {
    this.monkeyFoodTargets = this.monkeyFoodTargets.map((targetId) => (targetId === groundId ? null : targetId));
  }

  /**
   * GPT-5.3-Codex: 猿エリア内に着地する投擲の外れ座標を生成する。
   */
  private pickMissGridPointInMonkeyArea(): { x: number; y: number; gridX: number; gridY: number } {
    const gridX = Phaser.Math.FloatBetween(2.2, 5.0);
    const gridY = Phaser.Math.FloatBetween(2.2, 5.0);
    const iso = this.toIsometric(gridX, gridY, this.currentTileSize);
    return { x: iso.x, y: iso.y - this.currentTileSize * 0.14, gridX, gridY };
  }

  /**
   * GPT-5.3-Codex: 観客側へ外れる💩の着地点をランダムに生成する。
   */
  private pickMissGridPointNearCustomerArea(): { x: number; y: number; gridX: number; gridY: number } {
    const edgeSpots = [
      { x: Phaser.Math.FloatBetween(0.6, 2.2), y: Phaser.Math.FloatBetween(0.8, 2.4) },
      { x: Phaser.Math.FloatBetween(5.7, 7.0), y: Phaser.Math.FloatBetween(0.8, 2.5) },
      { x: Phaser.Math.FloatBetween(0.8, 2.5), y: Phaser.Math.FloatBetween(5.5, 7.0) },
      { x: Phaser.Math.FloatBetween(5.6, 7.1), y: Phaser.Math.FloatBetween(5.4, 7.1) },
    ];
    const pick = Phaser.Utils.Array.GetRandom(edgeSpots);
    const iso = this.toIsometric(pick.x, pick.y, this.currentTileSize);
    return { x: iso.x, y: iso.y - this.currentTileSize * 0.14, gridX: pick.x, gridY: pick.y };
  }

  /**
   * GPT-5.3-Codex: 猿の一時リアクションを設定する。
   */
  private setMonkeyReaction(index: number, emoji: string, duration: number): void {
    if (index < 0 || index >= this.monkeyReactionTimers.length) {
      return;
    }

    this.monkeyReactionEmojis[index] = emoji;
    this.monkeyReactionTimers[index] = duration;
  }

  /**
   * GPT-5.3-Codex: 観客の一時リアクションを設定する。
   */
  private setCustomerReaction(index: number, emoji: string, duration: number): void {
    if (index < 0 || index >= this.customerReactionTimers.length) {
      return;
    }

    this.customerReactionEmojis[index] = emoji;
    this.customerReactionTimers[index] = duration;
  }

  /**
   * GPT-5.3-Codex: ワールド全体が画面中央へ来るよう可視範囲の中心Xを算出する。
   */
  private computeWorldVisualCenterX(tileSize: number): number {
    const points: Phaser.Math.Vector2[] = [];
    this.cells.forEach((cell) => {
      points.push(this.toIsometric(cell.x, cell.y, tileSize));
    });
    MONKEY_SPOTS.forEach((spot) => {
      points.push(this.toIsometric(spot.x, spot.y, tileSize));
    });
    CUSTOMER_SPOTS.forEach((spot) => {
      points.push(this.toIsometric(spot.x, spot.y, tileSize));
    });

    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    return (minX + maxX) * 0.5;
  }

  /**
   * GPT-5.3-Codex: グリッド座標をクォータービューの2D座標へ変換する。
   */
  private toIsometric(gridX: number, gridY: number, tileSize: number): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2((gridX - gridY) * tileSize, (gridX + gridY) * tileSize * 0.5);
  }

  /**
   * GPT-5.3-Codex: 猿エリア拡張に合わせて破綻しない順序で柵セグメントを描画する。
   */
  private drawFenceSegment(from: Phaser.Math.Vector2, to: Phaser.Math.Vector2, tileSize: number, isFront: boolean): void {
    const railTopY = tileSize * 0.86;
    const railBottomY = tileSize * 0.68;
    const railTop = this.add.line(0, 0, from.x, from.y - railTopY, to.x, to.y - railTopY, FENCE_COLOR, isFront ? 0.9 : 0.72)
      .setLineWidth(isFront ? 3 : 2, isFront ? 3 : 2);
    const railBottom = this.add.line(0, 0, from.x, from.y - railBottomY, to.x, to.y - railBottomY, FENCE_COLOR, isFront ? 0.72 : 0.58)
      .setLineWidth(2, 2);
    this.groundLayer.add([railTop, railBottom]);
  }
}

new Phaser.Game(createConfig([SummaryScene]));
