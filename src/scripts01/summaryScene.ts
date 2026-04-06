import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BaseResponsiveScene } from '../baseResponsiveScene.ts';

const SCENE_BACKGROUND_COLOR = '#052b4f';
const MAX_FOOD_COUNT = 12;
const FOOD_LIFETIME_MS = 12000;
const BASE_CREATURE_SPEED = 110;
const SPEED_PER_LEVEL = 8;

type SceneLayout = {
  width: number;
  height: number;
};

type Food = {
  x: number;
  y: number;
  bornAt: number;
  sprite: Phaser.GameObjects.Arc;
};

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts01SummaryScene';

  private layout: SceneLayout = { width: 1080, height: 1080 };

  private readonly foods: Food[] = [];

  private creatureLevel = 1;

  private creatureExp = 0;

  private creatureSize = 1;

  private pointerHint?: Phaser.GameObjects.Text;

  private creatureContainer?: Phaser.GameObjects.Container;

  private creatureBody?: Phaser.GameObjects.Ellipse;

  private creatureEye?: Phaser.GameObjects.Arc;

  private creatureGlow?: Phaser.GameObjects.Ellipse;

  private creatureX = 540;

  private creatureY = 540;

  private velocityX = 0;

  private velocityY = 0;

  private backgroundLayer?: Phaser.GameObjects.Container;

  private foodLayer?: Phaser.GameObjects.Container;

  private fxLayer?: Phaser.GameObjects.Container;

  private uiLayer?: Phaser.GameObjects.Container;

  public constructor() {
    super(SummaryScene.key);
  }

  /**
   * Codex: 初期表示と入力ハンドリングを構築する。
   */
  public create(): void {
    this.cameras.main.setBackgroundColor(SCENE_BACKGROUND_COLOR);
    this.bindResponsiveLayout();

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.spawnFood(pointer.x, pointer.y);
      this.hideHint();
    });
  }

  /**
   * Codex: 毎フレームで海洋生物の追従移動と餌寿命を更新する。
   */
  public update(_time: number, delta: number): void {
    const deltaSec = delta / 1000;
    this.updateFoods();
    this.moveCreature(deltaSec);
    this.tryEatFood();
    this.animateBackground(deltaSec);
  }

  /**
   * Codex: レスポンシブ描画に利用する画面情報を返す。
   */
  protected computeLayout(width: number, height: number): SceneLayout {
    return { width, height };
  }

  /**
   * Codex: レイアウト更新時に表示レイヤを再構築する。
   */
  protected renderLayout(layout: SceneLayout): void {
    this.layout = layout;

    this.backgroundLayer?.destroy(true);
    this.foodLayer?.destroy(true);
    this.fxLayer?.destroy(true);
    this.uiLayer?.destroy(true);

    this.backgroundLayer = this.add.container(0, 0);
    this.foodLayer = this.add.container(0, 0);
    this.fxLayer = this.add.container(0, 0);
    this.uiLayer = this.add.container(0, 0);

    this.createOceanBackground(layout.width, layout.height);
    this.createCreature(layout.width, layout.height);
    this.rebuildFoodSprites();
    this.createUI(layout.width, layout.height);
  }

  /**
   * Codex: 海底の雰囲気を出す背景グラデーションと光帯を描画する。
   */
  private createOceanBackground(width: number, height: number): void {
    const deepSea = this.add.rectangle(width / 2, height / 2, width, height, 0x042647, 1);
    const shallowSea = this.add.ellipse(width / 2, height * 0.18, width * 1.4, height * 0.55, 0x1fbad6, 0.25);
    const coralGlow = this.add.ellipse(width * 0.2, height * 0.82, width * 0.55, height * 0.22, 0xff6b95, 0.18);
    const coralGlow2 = this.add.ellipse(width * 0.83, height * 0.85, width * 0.5, height * 0.2, 0xffc857, 0.2);

    this.backgroundLayer?.add([deepSea, shallowSea, coralGlow, coralGlow2]);

    for (let i = 0; i < 18; i += 1) {
      const ray = this.add.rectangle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(Math.round(height * 0.05), Math.round(height * 0.45)),
        Phaser.Math.Between(12, 28),
        Phaser.Math.Between(Math.round(height * 0.32), Math.round(height * 0.7)),
        0xa7f3ff,
        Phaser.Math.FloatBetween(0.06, 0.14),
      ).setAngle(Phaser.Math.Between(-20, 20));
      this.backgroundLayer?.add(ray);
    }

    for (let i = 0; i < 28; i += 1) {
      const bubble = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.Between(2, 8),
        0xe0f7ff,
        Phaser.Math.FloatBetween(0.15, 0.45),
      );
      this.tweens.add({
        targets: bubble,
        y: `-=${Phaser.Math.Between(Math.round(height * 0.15), Math.round(height * 0.45))}`,
        x: `+=${Phaser.Math.Between(-22, 22)}`,
        alpha: { from: bubble.alpha, to: 0.05 },
        duration: Phaser.Math.Between(2600, 5600),
        ease: 'Sine.InOut',
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 1200),
      });
      this.backgroundLayer?.add(bubble);
    }
  }

  /**
   * Codex: 海洋生物の見た目を作成し、前回位置を継承する。
   */
  private createCreature(width: number, height: number): void {
    this.creatureX = Phaser.Math.Clamp(this.creatureX, 0, width);
    this.creatureY = Phaser.Math.Clamp(this.creatureY, 0, height);

    const bodyColor = 0x6cf0ff;
    const accentColor = 0xff7fd8;

    const body = this.add.ellipse(0, 0, 140, 86, bodyColor, 0.98).setStrokeStyle(4, 0xd7fbff, 0.9);
    const tail = this.add.triangle(-80, 0, 0, 0, -52, -32, -52, 32, accentColor, 0.85);
    const finTop = this.add.triangle(-8, -42, 0, 0, 32, -28, -18, -18, 0xffcae9, 0.82);
    const finBottom = this.add.triangle(-10, 42, 0, 0, 28, 22, -18, 16, 0xffcae9, 0.72);
    const eyeWhite = this.add.circle(40, -10, 11, 0xffffff, 0.98);
    const eye = this.add.circle(44, -10, 5, 0x0b2f4f, 1);
    const cheek = this.add.circle(26, 8, 6, 0xffa8dd, 0.78);
    const glow = this.add.ellipse(0, 0, 210, 126, 0x7df9ff, 0.14);

    this.creatureContainer = this.add.container(this.creatureX, this.creatureY, [
      glow,
      tail,
      finTop,
      finBottom,
      body,
      cheek,
      eyeWhite,
      eye,
    ]);
    this.creatureContainer.setScale(this.creatureSize);

    this.creatureBody = body;
    this.creatureEye = eye;
    this.creatureGlow = glow;
  }

  /**
   * Codex: 最小限のUIとしてレベル表示とクリック誘導を置く。
   */
  private createUI(width: number, _height: number): void {
    const levelLabel = this.add.text(28, 28, this.getLevelLabel(), {
      fontFamily: 'sans-serif',
      fontSize: '26px',
      color: '#f8fdff',
      stroke: '#09223e',
      strokeThickness: 6,
      fontStyle: 'bold',
    }).setOrigin(0, 0);

    this.pointerHint = this.add.text(width / 2, 64, 'クリックでエサを落とす', {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      color: '#fefce8',
      stroke: '#5b2a57',
      strokeThickness: 5,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    this.tweens.add({
      targets: this.pointerHint,
      y: this.pointerHint.y + 10,
      alpha: { from: 1, to: 0.45 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    this.uiLayer?.add([levelLabel, this.pointerHint]);
  }

  /**
   * Codex: クリック位置に餌オブジェクトを追加する。
   */
  private spawnFood(rawX: number, rawY: number): void {
    if (!this.foodLayer) {
      return;
    }

    if (this.foods.length >= MAX_FOOD_COUNT) {
      const oldest = this.foods.shift();
      oldest?.sprite.destroy();
    }

    const x = Phaser.Math.Clamp(rawX, 24, this.layout.width - 24);
    const y = Phaser.Math.Clamp(rawY, 24, this.layout.height - 24);
    const sprite = this.add.circle(x, y, Phaser.Math.Between(8, 13), 0xffdf6b, 0.95)
      .setStrokeStyle(2, 0xfff3c3, 1);

    this.tweens.add({
      targets: sprite,
      scale: { from: 0.5, to: 1.2 },
      alpha: { from: 0.2, to: 1 },
      duration: 180,
      ease: 'Back.Out',
    });

    this.foodLayer.add(sprite);
    this.foods.push({ x, y, bornAt: this.time.now, sprite });
  }

  /**
   * Codex: 餌の寿命切れを検知して削除する。
   */
  private updateFoods(): void {
    const now = this.time.now;
    for (let i = this.foods.length - 1; i >= 0; i -= 1) {
      if (now - this.foods[i].bornAt > FOOD_LIFETIME_MS) {
        this.foods[i].sprite.destroy();
        this.foods.splice(i, 1);
      }
    }
  }

  /**
   * Codex: 最も近い餌に向かって海洋生物を移動させる。
   */
  private moveCreature(deltaSec: number): void {
    if (!this.creatureContainer) {
      return;
    }

    const target = this.findNearestFood();
    if (target) {
      const dx = target.x - this.creatureX;
      const dy = target.y - this.creatureY;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const speed = BASE_CREATURE_SPEED + this.creatureLevel * SPEED_PER_LEVEL;
      const desiredVX = (dx / distance) * speed;
      const desiredVY = (dy / distance) * speed;

      this.velocityX = Phaser.Math.Linear(this.velocityX, desiredVX, 0.11);
      this.velocityY = Phaser.Math.Linear(this.velocityY, desiredVY, 0.11);
    } else {
      this.velocityX = Phaser.Math.Linear(this.velocityX, 0, 0.08);
      this.velocityY = Phaser.Math.Linear(this.velocityY, 0, 0.08);
      this.velocityX += Math.sin(this.time.now * 0.0013) * 0.7;
      this.velocityY += Math.cos(this.time.now * 0.0011) * 0.5;
    }

    this.creatureX = Phaser.Math.Clamp(this.creatureX + this.velocityX * deltaSec, 48, this.layout.width - 48);
    this.creatureY = Phaser.Math.Clamp(this.creatureY + this.velocityY * deltaSec, 48, this.layout.height - 48);

    this.creatureContainer.setPosition(this.creatureX, this.creatureY);
    this.creatureContainer.setRotation(this.velocityY * 0.0022);
    this.creatureContainer.setScale(this.creatureSize);

    if (this.velocityX < -2) {
      this.creatureContainer.setScale(-this.creatureSize, this.creatureSize);
      this.creatureEye?.setX(-44);
    } else {
      this.creatureContainer.setScale(this.creatureSize);
      this.creatureEye?.setX(44);
    }
  }

  /**
   * Codex: 捕食判定を行って成長演出を再生する。
   */
  private tryEatFood(): void {
    for (let i = this.foods.length - 1; i >= 0; i -= 1) {
      const food = this.foods[i];
      const distance = Phaser.Math.Distance.Between(this.creatureX, this.creatureY, food.x, food.y);
      if (distance < 34 * this.creatureSize) {
        this.playEatEffect(food.x, food.y);
        food.sprite.destroy();
        this.foods.splice(i, 1);
        this.gainExp(1);
      }
    }
  }

  /**
   * Codex: 成長値を加算し、一定値でレベルアップさせる。
   */
  private gainExp(amount: number): void {
    this.creatureExp += amount;
    const nextLevelThreshold = this.creatureLevel * 4;

    if (this.creatureExp >= nextLevelThreshold) {
      this.creatureExp = 0;
      this.creatureLevel += 1;
      this.creatureSize = Math.min(1.85, this.creatureSize + 0.07);

      this.creatureBody?.setFillStyle(Phaser.Display.Color.RandomRGB(120, 255).color, 0.98);
      this.creatureGlow?.setFillStyle(Phaser.Display.Color.RandomRGB(120, 255).color, 0.16);
      this.cameras.main.shake(170, 0.0025);
    }

    const levelLabel = this.uiLayer?.getAt(0) as Phaser.GameObjects.Text | undefined;
    levelLabel?.setText(this.getLevelLabel());
  }

  /**
   * Codex: 食べた位置に小さなパーティクル風演出を生成する。
   */
  private playEatEffect(x: number, y: number): void {
    if (!this.fxLayer) {
      return;
    }

    for (let i = 0; i < 6; i += 1) {
      const sparkle = this.add.circle(x, y, Phaser.Math.Between(3, 6), 0xfff1a6, 0.95);
      this.fxLayer.add(sparkle);
      this.tweens.add({
        targets: sparkle,
        x: x + Phaser.Math.Between(-30, 30),
        y: y + Phaser.Math.Between(-30, 30),
        alpha: 0,
        duration: 280,
        scale: 0.2,
        ease: 'Quad.Out',
        onComplete: () => sparkle.destroy(),
      });
    }
  }

  /**
   * Codex: 画面リサイズ後に餌スプライトを再生成する。
   */
  private rebuildFoodSprites(): void {
    if (!this.foodLayer) {
      return;
    }

    this.foods.forEach((food) => {
      food.sprite = this.add.circle(food.x, food.y, 10, 0xffdf6b, 0.95).setStrokeStyle(2, 0xfff3c3, 1);
      this.foodLayer?.add(food.sprite);
    });
  }

  /**
   * Codex: 背景レイヤの軽いゆらぎ演出を付与する。
   */
  private animateBackground(deltaSec: number): void {
    const bg = this.backgroundLayer;
    if (!bg) {
      return;
    }

    bg.list.forEach((child: Phaser.GameObjects.GameObject, index: number) => {
      if (index <= 3) {
        return;
      }

      const driftingChild = child as unknown as { x: number };
      driftingChild.x += Math.sin((this.time.now * 0.001) + index) * 0.03 * deltaSec * 60;
    });
  }

  /**
   * Codex: 餌候補のうち最も近いものを返す。
   */
  private findNearestFood(): Food | undefined {
    if (this.foods.length === 0) {
      return undefined;
    }

    let nearest = this.foods[0];
    let minDistance = Number.MAX_VALUE;

    this.foods.forEach((food) => {
      const distance = Phaser.Math.Distance.Between(this.creatureX, this.creatureY, food.x, food.y);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = food;
      }
    });

    return nearest;
  }

  /**
   * Codex: レベル表示テキストを生成する。
   */
  private getLevelLabel(): string {
    return `Aqua Pet Lv.${this.creatureLevel}`;
  }

  /**
   * Codex: 誘導テキストをフェードアウトしてゲーム画面に馴染ませる。
   */
  private hideHint(): void {
    if (!this.pointerHint || this.pointerHint.alpha < 0.05) {
      return;
    }

    this.tweens.add({
      targets: this.pointerHint,
      alpha: 0,
      duration: 700,
      ease: 'Quad.Out',
    });
  }
}

new Phaser.Game(createConfig([SummaryScene]));
