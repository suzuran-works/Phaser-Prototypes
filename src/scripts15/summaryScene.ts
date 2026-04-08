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

type MonkeyState = 'idle' | 'appealing' | 'angry';

const WORLD_SIZE = 8;
const TILE_TOP_COLOR = 0x22c55e;
const TILE_LEFT_COLOR = 0x15803d;
const TILE_RIGHT_COLOR = 0x166534;
const FENCE_COLOR = 0xf1f5f9;
const CUSTOMER_EMOJIS = ['😀', '😄', '🙂', '🧢', '👩', '👨‍🦰', '🧒', '🧑‍🦱'];
const MONKEY_EMOJIS = ['🐵', '🐒', '🙈'];
const BANANA_EMOJI = '🍌';
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
  private monkeyBaseScales: number[] = [];
  private monkeyAppealTime = 0;
  private cells: Cell[] = [];
  private bananaFeedCount = 0;
  private skippedFeedCount = 0;
  private angryMonkeyCount = 0;
  private bananaTexts: Phaser.GameObjects.Text[] = [];
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
   * GPT-5.3-Codex: 毎フレーム猿のアピール演出とバナナの飛翔を更新する。
   */
  public update(_: number, deltaMs: number): void {
    const deltaSeconds = deltaMs / 1000;
    this.monkeyAppealTime += deltaSeconds;

    this.updateMonkeyAppeal(deltaSeconds);
    this.updateCustomerMotion();
    this.updateBananas(deltaSeconds);

    const appealingCount = this.monkeyStates.filter((state) => state === 'appealing').length;
    this.angryMonkeyCount = this.monkeyStates.filter((state) => state === 'angry').length;
    this.statusText.setText(`猿のアピール: ${appealingCount}匹  怒り: ${this.angryMonkeyCount}匹  バナナ: ${this.bananaFeedCount}本  見送り: ${this.skippedFeedCount}回`);
  }

  /**
   * GPT-5.3-Codex: 画面サイズに応じたUIとワールドのレイアウト値を計算する。
   */
  protected computeLayout(width: number, height: number): ZooLayout {
    const tileSize = Math.max(30, Math.min(56, Math.floor(Math.min(width, height) * 0.052)));
    return {
      width,
      height,
      titleY: Math.max(12, height * 0.02),
      subtitleY: Math.max(58, height * 0.08),
      statusY: Math.max(96, height * 0.135),
      worldCenterX: width * 0.5,
      worldCenterY: Math.max(height * 0.62, 300),
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
    this.worldLayer.setPosition(layout.worldCenterX, layout.worldCenterY);
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
      const pole = this.add.rectangle(corner.x, corner.y - tileSize * 0.48, 5, tileSize * 0.94, FENCE_COLOR, 0.88);
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
    this.monkeyBaseScales = [];

    MONKEY_SPOTS.forEach(() => {
      const shadow = this.add.ellipse(0, 0, 22, 10, 0x020617, 0.35);
      const monkey = this.add.text(0, 0, Phaser.Utils.Array.GetRandom(MONKEY_EMOJIS), {
        fontFamily: 'sans-serif',
        fontSize: '42px',
      }).setOrigin(0.5, 0.9);
      const mood = this.add.text(0, 0, '', {
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
      this.actorLayer.add([shadow, mood, monkey]);
    });

    CUSTOMER_SPOTS.forEach(() => {
      const customer = this.add.text(0, 0, Phaser.Utils.Array.GetRandom(CUSTOMER_EMOJIS), {
        fontFamily: 'sans-serif',
        fontSize: '34px',
      }).setOrigin(0.5, 0.9);
      this.customerTexts.push(customer);
      this.actorLayer.add(customer);
    });

    this.repositionActors(this.currentTileSize);
  }

  /**
   * GPT-5.3-Codex: タイルサイズに合わせて猿・客・バナナの座標を再計算する。
   */
  private repositionActors(tileSize: number): void {
    this.monkeyTexts.forEach((monkey, index) => {
      const spot = MONKEY_SPOTS[index];
      const iso = this.toIsometric(spot.x, spot.y, tileSize);
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
      const isAngry = this.monkeyHungerTimes[index] > 6.8;
      this.monkeyStates[index] = isAngry ? 'angry' : (isAppealing ? 'appealing' : 'idle');

      const spot = MONKEY_SPOTS[index];
      const base = this.toIsometric(spot.x, spot.y, this.currentTileSize);
      const jump = isAppealing ? Math.sin(this.monkeyAppealTime * 8 + index) * 6 : Math.sin(this.monkeyAppealTime * 3 + index) * 2;
      const jumpOffset = jump * deltaSeconds * 24;
      monkey.setPosition(base.x, base.y - this.currentTileSize * 0.35 + jumpOffset);
      this.monkeyShadows[index].setPosition(base.x, base.y - this.currentTileSize * 0.05);
      const angryBoost = isAngry ? 0.1 : 0;
      const appealBoost = isAppealing ? 0.08 : 0;
      this.monkeyBaseScales[index] = 1 + angryBoost + appealBoost;
      monkey.setScale(this.monkeyBaseScales[index]);

      // GPT-5.3-Codex: 怒り・アピール・通常の状態で視覚トーンを切り替える。
      monkey.setTint(isAngry ? 0xffb4b4 : (isAppealing ? 0xfff7d6 : 0xffffff));
      this.monkeyMoodTexts[index].setText(isAngry ? '💢' : (isAppealing ? '✨' : ''));
    });
  }

  /**
   * GPT-5.3-Codex: 観客に軽い揺れ動作を与えてシーン全体の静止感を減らす。
   */
  private updateCustomerMotion(): void {
    this.customerTexts.forEach((customer, index) => {
      const spot = CUSTOMER_SPOTS[index];
      const base = this.toIsometric(spot.x, spot.y, this.currentTileSize);
      const swayX = Math.sin(this.monkeyAppealTime * 1.7 + index * 0.8) * this.currentTileSize * 0.05;
      const bobY = Math.sin(this.monkeyAppealTime * 2.3 + index * 0.5) * this.currentTileSize * 0.045;
      customer.setPosition(base.x + swayX, base.y - this.currentTileSize * 0.32 + bobY);
      customer.setScale(1 + Math.max(0, bobY) * 0.006);
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
      return;
    }
    const customer = this.customerTexts[customerIndex];
    const monkey = this.monkeyTexts[monkeyIndex];

    const banana = this.add.text(customer.x, customer.y - 12, BANANA_EMOJI, {
      fontFamily: 'sans-serif',
      fontSize: `${Math.max(18, Math.floor(this.currentTileSize * 0.5))}px`,
    }).setOrigin(0.5, 0.8);

    banana.setData('fromX', customer.x);
    banana.setData('fromY', customer.y - 12);
    banana.setData('toX', monkey.x);
    banana.setData('toY', monkey.y - 26);
    banana.setData('progress', 0);
    banana.setData('duration', Phaser.Math.FloatBetween(0.6, 0.95));

    this.bananaTexts.push(banana);
    this.actorLayer.add(banana);
    this.bananaFeedCount += 1;
    this.monkeyHungerTimes[monkeyIndex] = Math.max(0, this.monkeyHungerTimes[monkeyIndex] - 4.8);
    this.monkeyAppealScores[monkeyIndex] = Math.max(0, this.monkeyAppealScores[monkeyIndex] - 0.34);
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
   * GPT-5.3-Codex: 飛翔中バナナの軌道補間と着弾時の後処理を行う。
   */
  private updateBananas(deltaSeconds: number): void {
    this.bananaTexts = this.bananaTexts.filter((banana) => {
      const progress = Number(banana.getData('progress')) + deltaSeconds / Number(banana.getData('duration'));
      banana.setData('progress', progress);

      const fromX = Number(banana.getData('fromX'));
      const fromY = Number(banana.getData('fromY'));
      const toX = Number(banana.getData('toX'));
      const toY = Number(banana.getData('toY'));
      const arcHeight = this.currentTileSize * 0.85;

      const x = Phaser.Math.Linear(fromX, toX, progress);
      const y = Phaser.Math.Linear(fromY, toY, progress) - Math.sin(progress * Math.PI) * arcHeight;
      banana.setPosition(x, y);

      if (progress >= 1) {
        banana.destroy();
        return false;
      }

      return true;
    });
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
    const railTop = this.add.line(0, 0, from.x, from.y - tileSize * 0.8, to.x, to.y - tileSize * 0.8, FENCE_COLOR, isFront ? 0.9 : 0.72)
      .setLineWidth(isFront ? 3 : 2, isFront ? 3 : 2);
    const railBottom = this.add.line(0, 0, from.x, from.y - tileSize * 0.62, to.x, to.y - tileSize * 0.62, FENCE_COLOR, isFront ? 0.72 : 0.58)
      .setLineWidth(2, 2);
    this.groundLayer.add([railTop, railBottom]);
  }
}

new Phaser.Game(createConfig([SummaryScene]));
