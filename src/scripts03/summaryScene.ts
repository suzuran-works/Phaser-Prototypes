import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BaseResponsiveScene } from '../baseResponsiveScene.ts';

const SCENE_BACKGROUND_COLOR = '#041123';
const CREATURE_NAME = '深海幻蛸 ネビュリオン';
const MAX_FISH_COUNT = 24;
const INITIAL_FISH_COUNT = 14;
const FISH_RESPAWN_INTERVAL_MS = 760;
const GROWTH_THRESHOLDS = [5, 11, 18, 28] as const;

const STAGE_SHAPES = [
  { bodyWidth: 136, bodyHeight: 106, tentacles: 4, tentacleLength: 56, color: 0x87f3ff },
  { bodyWidth: 154, bodyHeight: 114, tentacles: 6, tentacleLength: 72, color: 0x79e9ff },
  { bodyWidth: 178, bodyHeight: 124, tentacles: 8, tentacleLength: 92, color: 0x71dcff },
  { bodyWidth: 196, bodyHeight: 132, tentacles: 10, tentacleLength: 114, color: 0x77cbff },
  { bodyWidth: 224, bodyHeight: 146, tentacles: 12, tentacleLength: 136, color: 0x8bb3ff },
] as const;

type SceneLayout = {
  width: number;
  height: number;
};

type Fish = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  phase: number;
  size: number;
  bornAt: number;
  sprite: Phaser.GameObjects.Container;
};

type TentacleTip = {
  x: number;
  y: number;
};

type GrabSequence = {
  fishId: number;
  tentacleIndex: number;
  progress: number;
  phase: 'extend' | 'retract' | 'chew';
};

type LockedTarget = {
  fishId: number;
  lockUntil: number;
};

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts03SummaryScene';

  private layout: SceneLayout = { width: 1080, height: 1080 };

  private readonly fishes: Fish[] = [];

  private fishSpawnTimer = 0;

  private consumedCount = 0;

  private fishSerial = 0;

  private creatureStage = 0;

  private creatureX = 540;

  private creatureY = 540;

  private creatureVX = 0;

  private creatureVY = 0;

  private creatureTilt = 0;

  private creatureFacingScaleX = 1;

  private backgroundLayer?: Phaser.GameObjects.Container;

  private fishLayer?: Phaser.GameObjects.Container;

  private fxLayer?: Phaser.GameObjects.Container;

  private uiLayer?: Phaser.GameObjects.Container;

  private creatureContainer?: Phaser.GameObjects.Container;

  private creatureGraphics?: Phaser.GameObjects.Graphics;

  private tentacleTips: TentacleTip[] = [];

  private grabSequence?: GrabSequence;

  private lockedTarget?: LockedTarget;

  private nextGrabAllowedAt = 0;

  private titleText?: Phaser.GameObjects.Text;

  private statusText?: Phaser.GameObjects.Text;

  private hintText?: Phaser.GameObjects.Text;

  private uiPanel?: Phaser.GameObjects.Rectangle;

  public constructor() {
    super(SummaryScene.key);
  }

  /**
   * Codex: シーン初期化とレスポンシブ描画を開始する。
   */
  public create(): void {
    this.cameras.main.setBackgroundColor(SCENE_BACKGROUND_COLOR);
    this.bindResponsiveLayout();
  }

  /**
   * Codex: 生物の追従移動・有機描画・小魚更新を毎フレーム実行する。
   */
  public update(_time: number, delta: number): void {
    const deltaSec = delta / 1000;
    this.fishSpawnTimer += delta;

    this.spawnFishIfNeeded();
    this.updateFishMotion(deltaSec);
    this.moveCreature(deltaSec);
    this.updatePredationSequence(deltaSec);
    this.drawCreatureOrganicForm();
    this.animateBackground();
    this.refreshUI();
  }

  /**
   * Codex: 画面サイズをゲーム描画用レイアウトへ変換する。
   */
  protected computeLayout(width: number, height: number): SceneLayout {
    return { width, height };
  }

  /**
   * Codex: レイヤーを再構築し、海中演出と初期オブジェクトを配置する。
   */
  protected renderLayout(layout: SceneLayout): void {
    this.layout = layout;

    this.backgroundLayer?.destroy(true);
    this.fishLayer?.destroy(true);
    this.fxLayer?.destroy(true);
    this.uiLayer?.destroy(true);
    this.creatureContainer?.destroy(true);

    this.backgroundLayer = this.add.container(0, 0);
    this.fishLayer = this.add.container(0, 0);
    this.fxLayer = this.add.container(0, 0);
    this.uiLayer = this.add.container(0, 0);

    this.createOceanBackground();
    this.createCreature();
    this.recreateFishSprites();
    this.createUI();

    if (this.fishes.length === 0) {
      for (let i = 0; i < INITIAL_FISH_COUNT; i += 1) {
        this.spawnFish();
      }
    }
  }

  /**
   * Codex: 海の奥行きを感じる背景グラデーションと気泡を作成する。
   */
  private createOceanBackground(): void {
    if (!this.backgroundLayer) {
      return;
    }

    const { width, height } = this.layout;
    const base = this.add.rectangle(width / 2, height / 2, width, height, 0x041123, 1);
    const lightRay = this.add.ellipse(width * 0.52, height * 0.08, width * 1.25, height * 0.35, 0x38d9ff, 0.22);
    const coralGlowA = this.add.ellipse(width * 0.14, height * 0.86, width * 0.55, height * 0.25, 0x2dffb7, 0.14);
    const coralGlowB = this.add.ellipse(width * 0.86, height * 0.82, width * 0.64, height * 0.28, 0x7d5dff, 0.18);

    this.backgroundLayer.add([base, lightRay, coralGlowA, coralGlowB]);

    for (let i = 0; i < 36; i += 1) {
      const bubble = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.Between(2, 8),
        0xd8f9ff,
        Phaser.Math.FloatBetween(0.12, 0.34),
      );

      this.tweens.add({
        targets: bubble,
        y: `-=${Phaser.Math.Between(Math.round(height * 0.08), Math.round(height * 0.32))}`,
        x: `+=${Phaser.Math.Between(-24, 24)}`,
        alpha: { from: bubble.alpha, to: 0.03 },
        duration: Phaser.Math.Between(2400, 5600),
        ease: 'Sine.InOut',
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 1800),
      });

      this.backgroundLayer.add(bubble);
    }
  }

  /**
   * Codex: 生物描画用のコンテナとグラフィックスを初期化する。
   */
  private createCreature(): void {
    this.creatureX = Phaser.Math.Clamp(this.creatureX, 100, this.layout.width - 100);
    this.creatureY = Phaser.Math.Clamp(this.creatureY, 100, this.layout.height - 100);

    this.creatureGraphics = this.add.graphics();
    this.creatureContainer = this.add.container(this.creatureX, this.creatureY, [this.creatureGraphics]);
    this.drawCreatureOrganicForm();
  }

  /**
   * Codex: 画面上部に名称・進化情報・操作ヒントを表示する。
   */
  private createUI(): void {
    if (!this.uiLayer) {
      return;
    }

    const isMobile = this.layout.width < 640;
    const titleFontSize = isMobile ? '22px' : '34px';
    const statusFontSize = isMobile ? '18px' : '24px';
    const hintFontSize = isMobile ? '16px' : '22px';
    const topPadding = isMobile ? 16 : 28;
    const titleY = topPadding;
    const statusY = isMobile ? titleY + 42 : topPadding;
    const hintY = this.layout.height - (isMobile ? 20 : 42);

    this.uiPanel = this.add.rectangle(
      this.layout.width / 2,
      isMobile ? 44 : 38,
      this.layout.width - (isMobile ? 24 : 48),
      isMobile ? 84 : 64,
      0x02101f,
      0.42,
    ).setOrigin(0.5, 0);

    this.titleText = this.add.text(this.layout.width / 2, titleY, CREATURE_NAME, {
      fontFamily: 'sans-serif',
      fontSize: titleFontSize,
      color: '#e7fbff',
      stroke: '#001626',
      strokeThickness: 6,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    this.statusText = this.add.text(isMobile ? this.layout.width / 2 : 28, statusY, '', {
      fontFamily: 'sans-serif',
      fontSize: statusFontSize,
      color: '#d8fff8',
      stroke: '#042038',
      strokeThickness: 5,
      fontStyle: 'bold',
      align: isMobile ? 'center' : 'left',
    }).setOrigin(isMobile ? 0.5 : 0, 0);

    this.hintText = this.add.text(this.layout.width / 2, hintY, '触手で小魚を掴み、口元へ運んで捕食中', {
      fontFamily: 'sans-serif',
      fontSize: hintFontSize,
      color: '#dcf8ff',
      stroke: '#04203b',
      strokeThickness: 5,
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: this.layout.width - (isMobile ? 48 : 120), useAdvancedWrap: true },
    }).setOrigin(0.5, 1);

    this.tweens.add({
      targets: this.hintText,
      alpha: { from: 1, to: 0.45 },
      y: this.hintText.y - 8,
      duration: 860,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    this.uiLayer.add([this.uiPanel, this.titleText, this.statusText, this.hintText]);
    this.refreshUI();
  }

  /**
   * Codex: 餌となる小魚を不足時に補充して観察体験を維持する。
   */
  private spawnFishIfNeeded(): void {
    if (this.fishes.length >= MAX_FISH_COUNT || this.fishSpawnTimer < FISH_RESPAWN_INTERVAL_MS) {
      return;
    }

    this.fishSpawnTimer = 0;
    this.spawnFish();
  }

  /**
   * Codex: 小魚オブジェクトを生成し、自然な遊泳パラメータを与える。
   */
  private spawnFish(): void {
    if (!this.fishLayer) {
      return;
    }

    const x = Phaser.Math.Between(36, this.layout.width - 36);
    const y = Phaser.Math.Between(90, this.layout.height - 30);
    const speed = Phaser.Math.FloatBetween(60, 124);
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const size = Phaser.Math.FloatBetween(0.82, 1.22);

    const fishSprite = this.createFishSprite(size);
    fishSprite.setPosition(x, y);

    this.fishes.push({
      id: this.fishSerial,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      speed,
      phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
      size,
      bornAt: this.time.now,
      sprite: fishSprite,
    });
    this.fishSerial += 1;

    this.fishLayer.add(fishSprite);
  }

  /**
   * Codex: 小魚の見た目を生成し、尾びれを含むシルエットを表現する。
   */
  private createFishSprite(size: number): Phaser.GameObjects.Container {
    const body = this.add.ellipse(0, 0, 18 * size, 11 * size, 0xffe08a, 0.95).setStrokeStyle(2, 0xfff4cf, 0.9);
    const tail = this.add.triangle(-11 * size, 0, 0, 0, -9 * size, -5 * size, -9 * size, 5 * size, 0xffb36d, 0.92);
    const eye = this.add.circle(5 * size, -2 * size, 1.7 * size, 0x233145, 0.95);
    return this.add.container(0, 0, [tail, body, eye]);
  }

  /**
   * Codex: 小魚群の遊泳と壁反射を更新し、群れらしい揺らぎを与える。
   */
  private updateFishMotion(deltaSec: number): void {
    const grabbedFishId = this.grabSequence?.fishId;
    const topBoundary = this.layout.width < 640 ? 128 : 84;

    for (const fish of this.fishes) {
      if (fish.id === grabbedFishId) {
        continue;
      }

      fish.phase += deltaSec * 2.2;

      fish.vx += Math.cos(fish.phase * 0.85) * 8 * deltaSec;
      fish.vy += Math.sin(fish.phase * 1.1) * 8 * deltaSec;
      const fleeVector = this.computeFishFleeVector(fish);
      fish.vx += fleeVector.x * deltaSec;
      fish.vy += fleeVector.y * deltaSec;

      const velocityLength = Math.max(1, Math.hypot(fish.vx, fish.vy));
      fish.vx = (fish.vx / velocityLength) * fish.speed;
      fish.vy = (fish.vy / velocityLength) * fish.speed;

      fish.x += fish.vx * deltaSec;
      fish.y += fish.vy * deltaSec;

      if (fish.x < 20 || fish.x > this.layout.width - 20) {
        fish.vx *= -1;
      }

      if (fish.y < topBoundary || fish.y > this.layout.height - 18) {
        fish.vy *= -1;
      }

      fish.x = Phaser.Math.Clamp(fish.x, 20, this.layout.width - 20);
      fish.y = Phaser.Math.Clamp(fish.y, topBoundary, this.layout.height - 18);

      fish.sprite.setPosition(fish.x, fish.y);
      fish.sprite.setRotation(Math.atan2(fish.vy, fish.vx));
    }
  }

  /**
   * Codex: 小魚が生物本体と触手先端から逃げるための反発ベクトルを算出する。
   */
  private computeFishFleeVector(fish: Fish): Phaser.Math.Vector2 {
    let repelX = 0;
    let repelY = 0;
    const bodySafeRadius = 220 + this.creatureStage * 26;
    const bodyDx = fish.x - this.creatureX;
    const bodyDy = fish.y - this.creatureY;
    const bodyDistance = Math.max(1, Math.hypot(bodyDx, bodyDy));

    if (bodyDistance < bodySafeRadius) {
      const rate = (1 - bodyDistance / bodySafeRadius) * (230 + this.creatureStage * 34);
      repelX += (bodyDx / bodyDistance) * rate;
      repelY += (bodyDy / bodyDistance) * rate;
    }

    const sensedTentacles = Math.min(this.tentacleTips.length, 7);
    for (let i = 0; i < sensedTentacles; i += 1) {
      const tipWorld = this.getTentacleTipWorldPosition(i);
      const tipDx = fish.x - tipWorld.x;
      const tipDy = fish.y - tipWorld.y;
      const tipDistance = Math.max(1, Math.hypot(tipDx, tipDy));
      const tipSafeRadius = 92 + this.creatureStage * 10;
      if (tipDistance < tipSafeRadius) {
        const rate = (1 - tipDistance / tipSafeRadius) * 140;
        repelX += (tipDx / tipDistance) * rate;
        repelY += (tipDy / tipDistance) * rate;
      }
    }

    return new Phaser.Math.Vector2(repelX, repelY);
  }

  /**
   * Codex: 狙いを定めた小魚へ向けて、生物を有機的に滑走させる。
   */
  private moveCreature(deltaSec: number): void {
    const target = this.selectCreatureTarget();

    if (target) {
      const dx = target.x - this.creatureX;
      const dy = target.y - this.creatureY;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const speed = 86 + this.creatureStage * 11;
      const desiredVX = (dx / distance) * speed;
      const desiredVY = (dy / distance) * speed;

      this.creatureVX = Phaser.Math.Linear(this.creatureVX, desiredVX, 0.052);
      this.creatureVY = Phaser.Math.Linear(this.creatureVY, desiredVY, 0.04);
    } else {
      this.creatureVX = Phaser.Math.Linear(this.creatureVX, Math.cos(this.time.now * 0.0014) * 24, 0.04);
      this.creatureVY = Phaser.Math.Linear(this.creatureVY, Math.sin(this.time.now * 0.0012) * 22, 0.035);
    }

    this.creatureX = Phaser.Math.Clamp(this.creatureX + this.creatureVX * deltaSec, 84, this.layout.width - 84);
    this.creatureY = Phaser.Math.Clamp(this.creatureY + this.creatureVY * deltaSec, 84, this.layout.height - 84);
    if (Math.abs(this.creatureVX) > 4) {
      this.creatureFacingScaleX = this.creatureVX >= 0 ? 1 : -1;
    }

    const swimPulse = Math.sin(this.time.now * 0.0052) * 0.06;
    const velocityTilt = Phaser.Math.Clamp(this.creatureVY / 240, -0.14, 0.14);
    this.creatureTilt = Phaser.Math.Linear(this.creatureTilt, velocityTilt + swimPulse, 0.12);

    this.creatureContainer?.setPosition(this.creatureX, this.creatureY);
    this.creatureContainer?.setScale(this.creatureFacingScaleX, 1);
    this.creatureContainer?.setRotation(this.creatureTilt);
  }

  /**
   * Codex: 触手の伸展→捕獲→口元への搬送という捕食シーケンスを制御する。
   */
  private updatePredationSequence(deltaSec: number): void {
    if (!this.grabSequence) {
      this.tryStartGrabSequence();
      return;
    }

    const fish = this.findFishById(this.grabSequence.fishId);
    if (!fish) {
      this.grabSequence = undefined;
      return;
    }

    const mouth = this.getMouthWorldPosition();
    const tipWorld = this.getTentacleTipWorldPosition(this.grabSequence.tentacleIndex);
    const tipToFishLerp = Phaser.Math.Clamp(this.grabSequence.progress * 1.6, 0, 1);

    if (this.grabSequence.phase === 'extend') {
      this.grabSequence.progress = Phaser.Math.Clamp(this.grabSequence.progress + deltaSec * 2.8, 0, 1);
      fish.x = Phaser.Math.Linear(tipWorld.x, fish.x, 1 - tipToFishLerp);
      fish.y = Phaser.Math.Linear(tipWorld.y, fish.y, 1 - tipToFishLerp);
      if (this.grabSequence.progress >= 1) {
        this.grabSequence.phase = 'retract';
      }
    } else if (this.grabSequence.phase === 'retract') {
      this.grabSequence.progress = Phaser.Math.Clamp(this.grabSequence.progress - deltaSec * 2.4, 0, 1);
      const retractLerp = Phaser.Math.Clamp(1 - this.grabSequence.progress, 0, 1);
      fish.x = Phaser.Math.Linear(fish.x, mouth.x, retractLerp);
      fish.y = Phaser.Math.Linear(fish.y, mouth.y, retractLerp);

      if (Phaser.Math.Distance.Between(fish.x, fish.y, mouth.x, mouth.y) < 12) {
        this.grabSequence.phase = 'chew';
        this.grabSequence.progress = 0;
      }
    } else {
      this.grabSequence.progress = Phaser.Math.Clamp(this.grabSequence.progress + deltaSec * 2.3, 0, 1);
      const chewPhase = this.grabSequence.progress * Math.PI * 5;
      fish.x = mouth.x + Math.sin(chewPhase) * 7;
      fish.y = mouth.y + Math.cos(chewPhase * 0.8) * 4;
      fish.sprite.setScale(1 - this.grabSequence.progress * 0.6);
      if (this.grabSequence.progress >= 1) {
        this.finishEating(fish);
      }
    }

    fish.sprite.setPosition(fish.x, fish.y);
    fish.sprite.setRotation(Math.atan2(mouth.y - fish.y, mouth.x - fish.x));
  }

  /**
   * Codex: 生物の近傍に魚が来たら、最適な触手を選んで捕獲を開始する。
   */
  private tryStartGrabSequence(): void {
    if (this.time.now < this.nextGrabAllowedAt) {
      return;
    }

    const target = this.selectCreatureTarget();
    if (!target || this.tentacleTips.length === 0) {
      return;
    }

    const engageDistance = 220 + this.creatureStage * 20;
    const distanceToCreature = Phaser.Math.Distance.Between(this.creatureX, this.creatureY, target.x, target.y);
    if (distanceToCreature > engageDistance) {
      return;
    }

    const tentacleIndex = this.findClosestTentacleToFish(target);
    this.grabSequence = {
      fishId: target.id,
      tentacleIndex,
      progress: 0,
      phase: 'extend',
    };
    this.nextGrabAllowedAt = this.time.now + Phaser.Math.Between(400, 900);
  }

  /**
   * Codex: 口元に到達した小魚を消費し、進化判定と演出を反映する。
   */
  private finishEating(fish: Fish): void {
    fish.sprite.destroy();
    this.fishes.splice(this.fishes.indexOf(fish), 1);
    this.grabSequence = undefined;
    this.consumedCount += 1;
    this.playConsumeEffect(fish.x, fish.y);

    const nextStage = this.getCreatureStage(this.consumedCount);
    if (nextStage > this.creatureStage) {
      this.creatureStage = nextStage;
      this.flashStageUp();
    }

    this.lockedTarget = undefined;
  }

  /**
   * Codex: 生物の現在段階に応じた有機シルエットを描画する。
   */
  private drawCreatureOrganicForm(): void {
    if (!this.creatureGraphics) {
      return;
    }

    const stageProfile = STAGE_SHAPES[this.creatureStage];
    const pulse = Math.sin(this.time.now * 0.0046) * 0.08;
    const bodyWidth = stageProfile.bodyWidth * (1 + pulse * 0.38);
    const bodyHeight = stageProfile.bodyHeight * (1 - pulse * 0.3);

    this.creatureGraphics.clear();

    this.creatureGraphics.fillStyle(stageProfile.color, 0.2);
    this.creatureGraphics.fillEllipse(0, 0, bodyWidth * 1.5, bodyHeight * 1.2);

    this.creatureGraphics.fillStyle(stageProfile.color, 0.96);
    this.creatureGraphics.lineStyle(4, 0xd4f7ff, 0.86);
    this.creatureGraphics.fillEllipse(0, 0, bodyWidth, bodyHeight);
    this.creatureGraphics.strokeEllipse(0, 0, bodyWidth, bodyHeight);

    this.drawTentacles(stageProfile.tentacles, stageProfile.tentacleLength, stageProfile.color);

    this.drawEyes(bodyWidth, bodyHeight);

    this.creatureGraphics.fillStyle(0x8ae9ff, 0.84);
    this.creatureGraphics.fillEllipse(bodyWidth * 0.06, bodyHeight * 0.08, bodyWidth * 0.32, bodyHeight * 0.2);
  }

  /**
   * Codex: 段階に応じて触手を増加させ、うねる動きを線で表現する。
   */
  private drawTentacles(count: number, length: number, color: number): void {
    if (!this.creatureGraphics) {
      return;
    }

    this.tentacleTips = [];

    for (let i = 0; i < count; i += 1) {
      const ratio = count === 1 ? 0.5 : i / (count - 1);
      const baseSpread = Phaser.Math.Easing.Sine.InOut(ratio) * Math.PI - Math.PI * 0.5;
      const organicOffset = Math.sin(i * 1.92 + this.creatureStage * 0.7) * 0.16;
      const spread = baseSpread + organicOffset;
      const baseX = Math.cos(spread) * (30 + Math.sin(i * 1.13) * 7);
      const baseY = bodyAnchorY(spread, i);
      const jitterSeed = Math.sin(i * 12.9898) * 43758.5453;
      const jitter = jitterSeed - Math.floor(jitterSeed);
      const swingWeight = 0.65 + jitter * 0.75;
      const timeShift = this.time.now * (0.0045 + jitter * 0.0014) + i * (0.62 + jitter * 0.35);
      const focusPull = this.grabSequence?.tentacleIndex === i ? 0.9 : 0.25;

      const cp1X = baseX + Math.sin(timeShift) * (14 + 8 * swingWeight);
      const cp1Y = baseY + length * (0.2 + jitter * 0.09);
      const cp2X = baseX + Math.sin(timeShift * 1.2 + 0.8) * (26 + 18 * swingWeight) + focusPull * 10;
      const cp2Y = baseY + length * (0.58 + jitter * 0.11);
      const tipX = baseX + Math.sin(timeShift * 1.45 + jitter * 3) * (24 + 28 * swingWeight) + focusPull * 18;
      const tipY = baseY + length * (0.92 + jitter * 0.14) + Math.cos(timeShift * 0.9) * (12 + 7 * swingWeight);

      const curve = new Phaser.Curves.CubicBezier(
        new Phaser.Math.Vector2(baseX, baseY),
        new Phaser.Math.Vector2(cp1X, cp1Y),
        new Phaser.Math.Vector2(cp2X, cp2Y),
        new Phaser.Math.Vector2(tipX, tipY),
      );
      const thickness = Phaser.Math.Linear(12, 4, i / count);
      this.creatureGraphics.lineStyle(thickness + 2, 0xdffcff, 0.22);
      this.creatureGraphics.strokePoints(curve.getPoints(18), false, false);
      this.creatureGraphics.lineStyle(thickness, color, 0.92);
      this.creatureGraphics.strokePoints(curve.getPoints(18), false, false);
      this.tentacleTips.push({ x: tipX, y: tipY });

      this.creatureGraphics.fillStyle(0xb8fdff, 0.62);
      this.creatureGraphics.fillCircle(tipX, tipY, 1.8);
    }

    this.drawGrabTentacleOverlay();

    /**
     * Codex: 触手基点のY位置を扇状に整えるための補助関数。
     */
    function bodyAnchorY(spread: number, index: number): number {
      return Math.sin(spread * 0.7) * 8 + 24 + Math.cos(index * 0.91) * 5;
    }
  }

  /**
   * Codex: 捕食中の触手のみを強調し、対象まで伸びる演出線を描画する。
   */
  private drawGrabTentacleOverlay(): void {
    if (!this.creatureGraphics || !this.grabSequence) {
      return;
    }

    const fish = this.findFishById(this.grabSequence.fishId);
    const tip = this.tentacleTips[this.grabSequence.tentacleIndex];
    if (!fish || !tip) {
      return;
    }

    const localFishPosition = this.worldToCreatureLocal(fish.x, fish.y);
    const localFishX = localFishPosition.x;
    const localFishY = localFishPosition.y;
    const controlX = Phaser.Math.Linear(tip.x, localFishX, 0.55) + Math.sin(this.time.now * 0.012) * 10;
    const controlY = Phaser.Math.Linear(tip.y, localFishY, 0.55) - 14;

    const grabCurve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(tip.x, tip.y),
      new Phaser.Math.Vector2(controlX, controlY),
      new Phaser.Math.Vector2(localFishX, localFishY),
    );

    this.creatureGraphics.lineStyle(4.5, 0xf8fdff, 0.95);
    this.creatureGraphics.strokePoints(grabCurve.getPoints(20), false, false);
  }

  /**
   * Codex: 捕食時に粒子を発生させ、食べた手応えを強化する。
   */
  private playConsumeEffect(x: number, y: number): void {
    if (!this.fxLayer) {
      return;
    }

    for (let i = 0; i < 8; i += 1) {
      const shard = this.add.circle(x, y, Phaser.Math.Between(2, 5), 0xf8f5a4, 0.95);
      this.fxLayer.add(shard);

      this.tweens.add({
        targets: shard,
        x: x + Phaser.Math.Between(-40, 40),
        y: y + Phaser.Math.Between(-40, 40),
        alpha: 0,
        scale: 0.2,
        duration: 380,
        ease: 'Quad.Out',
        onComplete: () => shard.destroy(),
      });
    }
  }

  /**
   * Codex: 背景レイヤに微細なドリフトを付与して海流感を出す。
   */
  private animateBackground(): void {
    if (!this.backgroundLayer) {
      return;
    }

    const drift = Math.sin(this.time.now * 0.00045) * 7;
    this.backgroundLayer.y = drift;
  }

  /**
   * Codex: UIテキストを現在の捕食数と進化段階へ同期する。
   */
  private refreshUI(): void {
    const nextThreshold = GROWTH_THRESHOLDS[this.creatureStage] ?? 'MAX';
    const isMobile = this.layout.width < 640;
    const actionLabel = this.grabSequence ? '触手捕獲中' : '追尾中';
    const statusLine = `捕食 ${this.consumedCount} / 段階 ${this.creatureStage + 1} / 次 ${nextThreshold}`;
    this.statusText?.setText(isMobile ? `${statusLine}\n${actionLabel}` : `${statusLine}   状態: ${actionLabel}`);
  }

  /**
   * Codex: 進化段階アップ時に短いバッジ演出を表示する。
   */
  private flashStageUp(): void {
    if (!this.uiLayer) {
      return;
    }

    const badge = this.add.text(this.layout.width / 2, this.layout.height * 0.16, `進化! Stage ${this.creatureStage + 1}`, {
      fontFamily: 'sans-serif',
      fontSize: '30px',
      color: '#fff4cc',
      stroke: '#382114',
      strokeThickness: 6,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    this.uiLayer.add(badge);
    this.cameras.main.shake(180, 0.0026);

    this.tweens.add({
      targets: badge,
      y: badge.y - 30,
      alpha: 0,
      duration: 980,
      ease: 'Quad.Out',
      onComplete: () => badge.destroy(),
    });
  }

  /**
   * Codex: 魚IDをキーに配列から生存中の小魚を取得する。
   */
  private findFishById(id: number): Fish | undefined {
    return this.fishes.find((fish) => fish.id === id);
  }

  /**
   * Codex: 捕食中の魚に最も近い触手インデックスを選出する。
   */
  private findClosestTentacleToFish(target: Fish): number {
    let bestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < this.tentacleTips.length; i += 1) {
      const tipWorld = this.getTentacleTipWorldPosition(i);
      const distance = Phaser.Math.Distance.Between(target.x, target.y, tipWorld.x, tipWorld.y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        bestIndex = i;
      }
    }

    return bestIndex;
  }

  /**
   * Codex: 指定触手先端のローカル座標をワールド座標へ変換する。
   */
  private getTentacleTipWorldPosition(index: number): Phaser.Math.Vector2 {
    const tip = this.tentacleTips[index] ?? { x: 0, y: 0 };
    return this.creatureLocalToWorld(tip.x, tip.y);
  }

  /**
   * Codex: 生物の口元位置を算出し、捕食リトラクトの終点として利用する。
   */
  private getMouthWorldPosition(): Phaser.Math.Vector2 {
    const mouthOffsetX = 44;
    const mouthOffsetY = 8;
    return this.creatureLocalToWorld(mouthOffsetX, mouthOffsetY);
  }

  /**
   * Codex: 一定時間ロックした獲物を優先し、生物の狙いに揺らぎを与える。
   */
  private selectCreatureTarget(): Fish | undefined {
    if (this.grabSequence) {
      return this.findFishById(this.grabSequence.fishId);
    }

    if (this.lockedTarget && this.time.now <= this.lockedTarget.lockUntil) {
      const lockedFish = this.findFishById(this.lockedTarget.fishId);
      if (lockedFish) {
        return lockedFish;
      }
    }

    const candidate = this.pickWeightedFishTarget();
    if (!candidate) {
      this.lockedTarget = undefined;
      return undefined;
    }

    this.lockedTarget = {
      fishId: candidate.id,
      lockUntil: this.time.now + Phaser.Math.Between(700, 1800),
    };
    return candidate;
  }

  /**
   * Codex: 距離・年齢・位相から重み付けして、毎回違う獲物選択を行う。
   */
  private pickWeightedFishTarget(): Fish | undefined {
    if (this.fishes.length === 0) {
      return undefined;
    }

    let bestFish: Fish | undefined;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const fish of this.fishes) {
      const distance = Phaser.Math.Distance.Between(this.creatureX, this.creatureY, fish.x, fish.y);
      const ageSec = Math.min((this.time.now - fish.bornAt) / 1000, 8);
      const jitter = Math.sin(fish.phase * 1.7 + this.time.now * 0.002 + fish.id * 0.31) * 26;
      const score = -distance + ageSec * 30 + jitter;
      if (score > bestScore) {
        bestScore = score;
        bestFish = fish;
      }
    }

    return bestFish;
  }

  /**
   * Codex: 生物ローカル座標を反転・傾き込みでワールド座標へ変換する。
   */
  private creatureLocalToWorld(localX: number, localY: number): Phaser.Math.Vector2 {
    const mirroredX = localX * this.creatureFacingScaleX;
    const rotatedX = mirroredX * Math.cos(this.creatureTilt) - localY * Math.sin(this.creatureTilt);
    const rotatedY = mirroredX * Math.sin(this.creatureTilt) + localY * Math.cos(this.creatureTilt);
    return new Phaser.Math.Vector2(this.creatureX + rotatedX, this.creatureY + rotatedY);
  }

  /**
   * Codex: ワールド座標を生物ローカル座標へ戻し、触手演算に利用する。
   */
  private worldToCreatureLocal(worldX: number, worldY: number): Phaser.Math.Vector2 {
    const dx = worldX - this.creatureX;
    const dy = worldY - this.creatureY;
    const unrotatedX = dx * Math.cos(-this.creatureTilt) - dy * Math.sin(-this.creatureTilt);
    const unrotatedY = dx * Math.sin(-this.creatureTilt) + dy * Math.cos(-this.creatureTilt);
    return new Phaser.Math.Vector2(unrotatedX * this.creatureFacingScaleX, unrotatedY);
  }

  /**
   * Codex: 進化段階ごとに目を追加し、群体的なビジュアル変化を与える。
   */
  private drawEyes(bodyWidth: number, bodyHeight: number): void {
    if (!this.creatureGraphics) {
      return;
    }

    const eyeCount = Phaser.Math.Clamp(2 + this.creatureStage * 2, 2, 10);
    const timePhase = this.time.now * 0.007;
    const gazeTarget = this.selectCreatureTarget();
    const gazeLocal = gazeTarget ? this.worldToCreatureLocal(gazeTarget.x, gazeTarget.y) : undefined;
    const placements = this.generateEyePlacements(eyeCount, bodyWidth, bodyHeight);

    for (let i = 0; i < eyeCount; i += 1) {
      const placement = placements[i];
      const x = placement.x;
      const y = placement.y + Math.sin(timePhase * 0.65 + i * 1.4) * 1.2;
      const radius = placement.radius;

      this.creatureGraphics.fillStyle(0xffffff, 0.95);
      this.creatureGraphics.fillCircle(x, y, radius);

      let pupilX = x + Math.sin(timePhase + i * 0.82) * 1.2;
      let pupilY = y + Math.cos(timePhase * 0.9 + i * 0.64) * 0.8;
      if (gazeLocal) {
        const lookDx = gazeLocal.x - x;
        const lookDy = gazeLocal.y - y;
        const lookDistance = Math.max(1, Math.hypot(lookDx, lookDy));
        const maxShift = radius * 0.44;
        pupilX = x + (lookDx / lookDistance) * maxShift;
        pupilY = y + (lookDy / lookDistance) * maxShift;
      }

      this.creatureGraphics.fillStyle(0x0c2b43, 0.95);
      this.creatureGraphics.fillCircle(pupilX, pupilY, Math.max(2.2, radius * 0.45));
    }
  }

  /**
   * Codex: 目の増殖位置を有機的な群生配置で生成し、過密衝突を避ける。
   */
  private generateEyePlacements(
    eyeCount: number,
    bodyWidth: number,
    bodyHeight: number,
  ): Array<{ x: number; y: number; radius: number }> {
    const placements: Array<{ x: number; y: number; radius: number }> = [];
    const goldenAngle = 2.399963229728653;
    const centerX = bodyWidth * 0.16;
    const centerY = -bodyHeight * 0.1;

    for (let i = 0; i < eyeCount; i += 1) {
      const ratio = (i + 1) / (eyeCount + 1);
      const radiusBase = 7 - ratio * 2.2;
      const spiralDistance = Math.sqrt(ratio) * bodyWidth * 0.22;
      const jitter = this.computeStableNoise(i);
      const angle = goldenAngle * i + jitter * 0.8;
      const x = centerX + Math.cos(angle) * spiralDistance * (0.85 + jitter * 0.3);
      const y = centerY + Math.sin(angle) * spiralDistance * 0.65;
      const clampedX = Phaser.Math.Clamp(x, -bodyWidth * 0.22, bodyWidth * 0.42);
      const clampedY = Phaser.Math.Clamp(y, -bodyHeight * 0.34, bodyHeight * 0.2);
      placements.push({
        x: clampedX,
        y: clampedY,
        radius: Phaser.Math.Clamp(radiusBase + jitter * 0.9, 4.2, 7.6),
      });
    }

    return placements;
  }

  /**
   * Codex: インデックス依存の安定ノイズを返し、有機配置の再現性を保つ。
   */
  private computeStableNoise(index: number): number {
    const noise = Math.sin(index * 78.233 + this.creatureStage * 12.17) * 43758.5453;
    return noise - Math.floor(noise);
  }

  /**
   * Codex: リサイズ後に小魚スプライトを再生成して表示を復元する。
   */
  private recreateFishSprites(): void {
    if (!this.fishLayer) {
      return;
    }

    for (const fish of this.fishes) {
      fish.sprite = this.createFishSprite(fish.size);
      fish.sprite.setPosition(fish.x, fish.y);
      fishLayerSafeAdd(this.fishLayer, fish.sprite);
    }

    /**
     * Codex: 型安全を保ちながら魚レイヤーへ追加する補助関数。
     */
    function fishLayerSafeAdd(layer: Phaser.GameObjects.Container, sprite: Phaser.GameObjects.Container): void {
      layer.add(sprite);
    }
  }

  /**
   * Codex: 捕食数から現在の進化段階を計算する。
   */
  private getCreatureStage(consumed: number): number {
    let stage = 0;
    for (let i = 0; i < GROWTH_THRESHOLDS.length; i += 1) {
      if (consumed >= GROWTH_THRESHOLDS[i]) {
        stage = i + 1;
      }
    }

    return Phaser.Math.Clamp(stage, 0, STAGE_SHAPES.length - 1);
  }
}

new Phaser.Game(createConfig([SummaryScene]));
