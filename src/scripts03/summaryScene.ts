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

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts03SummaryScene';

  private layout: SceneLayout = { width: 1080, height: 1080 };

  private readonly fishes: Fish[] = [];

  private fishSpawnTimer = 0;

  private consumedCount = 0;

  private creatureStage = 0;

  private creatureX = 540;

  private creatureY = 540;

  private creatureVX = 0;

  private creatureVY = 0;

  private creatureFacing = 0;

  private backgroundLayer?: Phaser.GameObjects.Container;

  private fishLayer?: Phaser.GameObjects.Container;

  private fxLayer?: Phaser.GameObjects.Container;

  private uiLayer?: Phaser.GameObjects.Container;

  private creatureContainer?: Phaser.GameObjects.Container;

  private creatureGraphics?: Phaser.GameObjects.Graphics;

  private titleText?: Phaser.GameObjects.Text;

  private statusText?: Phaser.GameObjects.Text;

  private hintText?: Phaser.GameObjects.Text;

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
    this.tryConsumeFish();
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

    this.titleText = this.add.text(this.layout.width / 2, 28, CREATURE_NAME, {
      fontFamily: 'sans-serif',
      fontSize: '34px',
      color: '#e7fbff',
      stroke: '#001626',
      strokeThickness: 6,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    this.statusText = this.add.text(28, 28, '', {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      color: '#d8fff8',
      stroke: '#042038',
      strokeThickness: 5,
      fontStyle: 'bold',
    }).setOrigin(0, 0);

    this.hintText = this.add.text(this.layout.width / 2, this.layout.height - 42, '小魚を自動で追尾して捕食中...', {
      fontFamily: 'sans-serif',
      fontSize: '22px',
      color: '#dcf8ff',
      stroke: '#04203b',
      strokeThickness: 5,
      fontStyle: 'bold',
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

    this.uiLayer.add([this.titleText, this.statusText, this.hintText]);
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
    for (const fish of this.fishes) {
      fish.phase += deltaSec * 2.2;

      fish.vx += Math.cos(fish.phase * 0.85) * 8 * deltaSec;
      fish.vy += Math.sin(fish.phase * 1.1) * 8 * deltaSec;

      const velocityLength = Math.max(1, Math.hypot(fish.vx, fish.vy));
      fish.vx = (fish.vx / velocityLength) * fish.speed;
      fish.vy = (fish.vy / velocityLength) * fish.speed;

      fish.x += fish.vx * deltaSec;
      fish.y += fish.vy * deltaSec;

      if (fish.x < 20 || fish.x > this.layout.width - 20) {
        fish.vx *= -1;
      }

      if (fish.y < 76 || fish.y > this.layout.height - 18) {
        fish.vy *= -1;
      }

      fish.x = Phaser.Math.Clamp(fish.x, 20, this.layout.width - 20);
      fish.y = Phaser.Math.Clamp(fish.y, 76, this.layout.height - 18);

      fish.sprite.setPosition(fish.x, fish.y);
      fish.sprite.setRotation(Math.atan2(fish.vy, fish.vx));
    }
  }

  /**
   * Codex: もっとも近い小魚へ向けて生物を滑らかに誘導する。
   */
  private moveCreature(deltaSec: number): void {
    const nearest = this.findNearestFish();

    if (nearest) {
      const dx = nearest.x - this.creatureX;
      const dy = nearest.y - this.creatureY;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const speed = 108 + this.creatureStage * 12;
      const desiredVX = (dx / distance) * speed;
      const desiredVY = (dy / distance) * speed;

      this.creatureVX = Phaser.Math.Linear(this.creatureVX, desiredVX, 0.08);
      this.creatureVY = Phaser.Math.Linear(this.creatureVY, desiredVY, 0.08);
    } else {
      this.creatureVX = Phaser.Math.Linear(this.creatureVX, Math.cos(this.time.now * 0.0014) * 22, 0.05);
      this.creatureVY = Phaser.Math.Linear(this.creatureVY, Math.sin(this.time.now * 0.0012) * 18, 0.05);
    }

    this.creatureX = Phaser.Math.Clamp(this.creatureX + this.creatureVX * deltaSec, 84, this.layout.width - 84);
    this.creatureY = Phaser.Math.Clamp(this.creatureY + this.creatureVY * deltaSec, 84, this.layout.height - 84);
    this.creatureFacing = Phaser.Math.Angle.RotateTo(this.creatureFacing, Math.atan2(this.creatureVY, this.creatureVX), 0.07);

    this.creatureContainer?.setPosition(this.creatureX, this.creatureY);
    this.creatureContainer?.setRotation(this.creatureFacing);
  }

  /**
   * Codex: 捕食判定を行い、成長段階と演出を更新する。
   */
  private tryConsumeFish(): void {
    for (let i = this.fishes.length - 1; i >= 0; i -= 1) {
      const fish = this.fishes[i];
      const distance = Phaser.Math.Distance.Between(this.creatureX, this.creatureY, fish.x, fish.y);
      const consumeRadius = 42 + this.creatureStage * 5;

      if (distance < consumeRadius) {
        fish.sprite.destroy();
        this.fishes.splice(i, 1);
        this.consumedCount += 1;
        this.playConsumeEffect(fish.x, fish.y);

        const nextStage = this.getCreatureStage(this.consumedCount);
        if (nextStage > this.creatureStage) {
          this.creatureStage = nextStage;
          this.flashStageUp();
        }
      }
    }
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

    this.creatureGraphics.fillStyle(0xffffff, 0.96);
    this.creatureGraphics.fillCircle(bodyWidth * 0.19, -bodyHeight * 0.15, 11);
    this.creatureGraphics.fillStyle(0x0c2b43, 0.95);
    this.creatureGraphics.fillCircle(bodyWidth * 0.22 + Math.sin(this.time.now * 0.007) * 1.5, -bodyHeight * 0.15, 5.2);

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

    for (let i = 0; i < count; i += 1) {
      const spread = (i / (count - 1 || 1)) * Math.PI - Math.PI * 0.5;
      const baseX = Math.cos(spread) * 34;
      const baseY = bodyAnchorY(spread);
      const timeShift = this.time.now * 0.005 + i * 0.75;

      const cp1X = baseX + Math.sin(timeShift) * 16;
      const cp1Y = baseY + length * 0.28;
      const tipX = baseX + Math.sin(timeShift * 1.4) * 30;
      const tipY = baseY + length + Math.cos(timeShift) * 16;

      this.creatureGraphics.lineStyle(Phaser.Math.Linear(6, 2, i / count), color, 0.88);
      const curve = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(baseX, baseY),
        new Phaser.Math.Vector2(cp1X, cp1Y),
        new Phaser.Math.Vector2(tipX, tipY),
      );
      this.creatureGraphics.strokePoints(curve.getPoints(14), false, false);

      this.creatureGraphics.fillStyle(0xb8fdff, 0.62);
      this.creatureGraphics.fillCircle(tipX, tipY, 1.8);
    }

    /**
     * Codex: 触手基点のY位置を扇状に整えるための補助関数。
     */
    function bodyAnchorY(spread: number): number {
      return Math.sin(spread * 0.7) * 8 + 28;
    }
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
    this.statusText?.setText(`捕食: ${this.consumedCount}   段階: ${this.creatureStage + 1}   次: ${nextThreshold}`);
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
   * Codex: 最短距離の小魚を取得して追尾ターゲットにする。
   */
  private findNearestFish(): Fish | undefined {
    let nearest: Fish | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const fish of this.fishes) {
      const distance = Phaser.Math.Distance.Between(this.creatureX, this.creatureY, fish.x, fish.y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = fish;
      }
    }

    return nearest;
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
