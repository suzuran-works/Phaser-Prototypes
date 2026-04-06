import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BaseResponsiveScene } from '../baseResponsiveScene.ts';

const SCENE_BACKGROUND_COLOR = '#031f3d';
const MAX_FOOD_COUNT = 16;
const FOOD_LIFETIME_MS = 13000;
const BASE_CREATURE_SPEED = 125;
const SPEED_PER_LEVEL = 9;
const EVOLUTION_THRESHOLDS = [2, 4, 6, 8] as const;

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

type CreatureParts = {
  glow: Phaser.GameObjects.Ellipse;
  body: Phaser.GameObjects.Ellipse;
  tail: Phaser.GameObjects.Triangle;
  finTop: Phaser.GameObjects.Triangle;
  finBottom: Phaser.GameObjects.Triangle;
  eyeWhite: Phaser.GameObjects.Arc;
  eyePupil: Phaser.GameObjects.Arc;
  cheek: Phaser.GameObjects.Arc;
  tentacleLeft?: Phaser.GameObjects.Ellipse;
  tentacleRight?: Phaser.GameObjects.Ellipse;
  dorsalFin?: Phaser.GameObjects.Triangle;
  wingFinLeft?: Phaser.GameObjects.Triangle;
  wingFinRight?: Phaser.GameObjects.Triangle;
  crown?: Phaser.GameObjects.Triangle;
};

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts02SummaryScene';

  private layout: SceneLayout = { width: 1080, height: 1080 };

  private readonly foods: Food[] = [];

  private creatureLevel = 1;

  private creatureExp = 0;

  private creatureSize = 1;

  private pointerHint?: Phaser.GameObjects.Text;

  private evolutionLabel?: Phaser.GameObjects.Text;

  private creatureContainer?: Phaser.GameObjects.Container;

  private creatureParts?: CreatureParts;

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
   * Codex: 毎フレームで追従移動・捕食・背景演出を更新する。
   */
  public update(_time: number, delta: number): void {
    const deltaSec = delta / 1000;
    this.updateFoods();
    this.moveCreature(deltaSec);
    this.tryEatFood();
    this.animateBackground(deltaSec);
    this.animateCreatureParts();
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
   * Codex: 深海風の背景と漂う気泡を描画する。
   */
  private createOceanBackground(width: number, height: number): void {
    const deepSea = this.add.rectangle(width / 2, height / 2, width, height, 0x032548, 1);
    const shallowSea = this.add.ellipse(width / 2, height * 0.16, width * 1.45, height * 0.5, 0x42d6ff, 0.22);
    const coralGlow = this.add.ellipse(width * 0.18, height * 0.84, width * 0.58, height * 0.24, 0xff6ca0, 0.2);
    const coralGlow2 = this.add.ellipse(width * 0.86, height * 0.82, width * 0.52, height * 0.22, 0xffd166, 0.24);

    this.backgroundLayer?.add([deepSea, shallowSea, coralGlow, coralGlow2]);

    for (let i = 0; i < 26; i += 1) {
      const bubble = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.Between(2, 9),
        0xe4fbff,
        Phaser.Math.FloatBetween(0.18, 0.5),
      );
      this.tweens.add({
        targets: bubble,
        y: `-=${Phaser.Math.Between(Math.round(height * 0.1), Math.round(height * 0.36))}`,
        x: `+=${Phaser.Math.Between(-20, 20)}`,
        alpha: { from: bubble.alpha, to: 0.04 },
        duration: Phaser.Math.Between(2200, 5200),
        ease: 'Sine.InOut',
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 1400),
      });
      this.backgroundLayer?.add(bubble);
    }
  }

  /**
   * Codex: 生物の基本パーツを作成し、進化段階に応じた部位を追加する。
   */
  private createCreature(width: number, height: number): void {
    this.creatureX = Phaser.Math.Clamp(this.creatureX, 0, width);
    this.creatureY = Phaser.Math.Clamp(this.creatureY, 0, height);

    const glow = this.add.ellipse(0, 0, 210, 130, 0x7cf7ff, 0.18);
    const body = this.add.ellipse(0, 0, 142, 88, 0x7af0ff, 0.98).setStrokeStyle(4, 0xd8fdff, 0.9);
    const tail = this.add.triangle(-82, 0, 0, 0, -55, -35, -55, 35, 0xff89d6, 0.86);
    const finTop = this.add.triangle(-6, -43, 0, 0, 33, -31, -18, -18, 0xffcde9, 0.82);
    const finBottom = this.add.triangle(-8, 44, 0, 0, 30, 24, -18, 18, 0xffcde9, 0.76);
    const eyeWhite = this.add.circle(42, -10, 11, 0xffffff, 0.98);
    const eyePupil = this.add.circle(46, -10, 5, 0x0b2f4f, 1);
    const cheek = this.add.circle(28, 8, 6, 0xffa9dd, 0.75);

    this.creatureContainer = this.add.container(this.creatureX, this.creatureY, [
      glow,
      tail,
      finTop,
      finBottom,
      body,
      cheek,
      eyeWhite,
      eyePupil,
    ]);

    this.creatureParts = {
      glow,
      body,
      tail,
      finTop,
      finBottom,
      eyeWhite,
      eyePupil,
      cheek,
    };

    this.applyEvolutionParts();
    this.creatureContainer.setScale(this.creatureSize);
  }

  /**
   * Codex: UIとしてレベルと進化段階、操作ヒントを表示する。
   */
  private createUI(width: number, height: number): void {
    const levelLabel = this.add.text(28, 28, this.getLevelLabel(), {
      fontFamily: 'sans-serif',
      fontSize: '25px',
      color: '#f8fdff',
      stroke: '#08213a',
      strokeThickness: 6,
      fontStyle: 'bold',
    }).setOrigin(0, 0);

    this.evolutionLabel = this.add.text(28, 66, this.getEvolutionLabel(), {
      fontFamily: 'sans-serif',
      fontSize: '21px',
      color: '#ffd8f0',
      stroke: '#341b49',
      strokeThickness: 5,
      fontStyle: 'bold',
    }).setOrigin(0, 0);

    this.pointerHint = this.add.text(width / 2, height * 0.06, 'クリックでエサを落とす', {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      color: '#fefce8',
      stroke: '#532b5f',
      strokeThickness: 5,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    this.tweens.add({
      targets: this.pointerHint,
      y: this.pointerHint.y + 9,
      alpha: { from: 1, to: 0.5 },
      duration: 860,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    this.uiLayer?.add([levelLabel, this.evolutionLabel, this.pointerHint]);
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
    const sprite = this.add.circle(x, y, Phaser.Math.Between(8, 13), 0xffdf6b, 0.95).setStrokeStyle(2, 0xfff3c3, 1);

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
   * Codex: 最も近い餌に向かって生物を移動させる。
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
      this.velocityX += Math.sin(this.time.now * 0.0012) * 0.75;
      this.velocityY += Math.cos(this.time.now * 0.00105) * 0.55;
    }

    this.creatureX = Phaser.Math.Clamp(this.creatureX + this.velocityX * deltaSec, 54, this.layout.width - 54);
    this.creatureY = Phaser.Math.Clamp(this.creatureY + this.velocityY * deltaSec, 54, this.layout.height - 54);

    this.creatureContainer.setPosition(this.creatureX, this.creatureY);
    this.creatureContainer.setRotation(this.velocityY * 0.0023);
    this.creatureContainer.setScale(this.creatureSize);

    if (this.velocityX < -2) {
      this.creatureContainer.setScale(-this.creatureSize, this.creatureSize);
      this.creatureParts?.eyePupil?.setX(-46);
      this.creatureParts?.eyeWhite?.setX(-42);
    } else {
      this.creatureContainer.setScale(this.creatureSize);
      this.creatureParts?.eyePupil?.setX(46);
      this.creatureParts?.eyeWhite?.setX(42);
    }
  }

  /**
   * Codex: 捕食判定を行って成長と進化演出を発火する。
   */
  private tryEatFood(): void {
    for (let i = this.foods.length - 1; i >= 0; i -= 1) {
      const food = this.foods[i];
      const distance = Phaser.Math.Distance.Between(this.creatureX, this.creatureY, food.x, food.y);
      if (distance < 36 * this.creatureSize) {
        this.playEatEffect(food.x, food.y);
        food.sprite.destroy();
        this.foods.splice(i, 1);
        this.gainExp(1);
      }
    }
  }

  /**
   * Codex: 経験値を加算し、進化段階に応じて部位追加と見た目変化を行う。
   */
  private gainExp(amount: number): void {
    this.creatureExp += amount;
    const nextLevelThreshold = this.creatureLevel * 4;

    if (this.creatureExp >= nextLevelThreshold) {
      this.creatureExp = 0;
      this.creatureLevel += 1;
      this.creatureSize = Math.min(2.05, this.creatureSize + 0.07);

      this.creatureParts?.body.setFillStyle(Phaser.Display.Color.RandomRGB(110, 255).color, 0.98);
      this.creatureParts?.glow.setFillStyle(Phaser.Display.Color.RandomRGB(110, 255).color, 0.18);

      const previousStage = this.getEvolutionStage(this.creatureLevel - 1);
      const currentStage = this.getEvolutionStage(this.creatureLevel);
      if (currentStage > previousStage) {
        this.applyEvolutionParts();
      }

      this.cameras.main.shake(180, 0.003);
    }

    const levelLabel = this.uiLayer?.getAt(0) as Phaser.GameObjects.Text | undefined;
    levelLabel?.setText(this.getLevelLabel());
    this.evolutionLabel?.setText(this.getEvolutionLabel());
  }

  /**
   * Codex: 進化段階を計算して該当する部位を描画へ反映する。
   */
  private applyEvolutionParts(): void {
    if (!this.creatureContainer || !this.creatureParts) {
      return;
    }

    const stage = this.getEvolutionStage(this.creatureLevel);

    if (stage >= 1 && !this.creatureParts.tentacleLeft && !this.creatureParts.tentacleRight) {
      this.creatureParts.tentacleLeft = this.add.ellipse(28, 40, 16, 52, 0xb4f5ff, 0.78);
      this.creatureParts.tentacleRight = this.add.ellipse(52, 36, 14, 46, 0xb4f5ff, 0.72);
      this.creatureContainer.add([this.creatureParts.tentacleLeft, this.creatureParts.tentacleRight]);
    }

    if (stage >= 2 && !this.creatureParts.dorsalFin) {
      this.creatureParts.dorsalFin = this.add.triangle(-10, -56, 0, 0, 44, -30, -18, -18, 0xfff2b4, 0.85);
      this.creatureContainer.add(this.creatureParts.dorsalFin);
    }

    if (stage >= 3 && !this.creatureParts.wingFinLeft && !this.creatureParts.wingFinRight) {
      this.creatureParts.wingFinLeft = this.add.triangle(-20, -6, 0, 0, -34, -42, -42, 20, 0x9ef7ff, 0.72);
      this.creatureParts.wingFinRight = this.add.triangle(-22, 8, 0, 0, -34, 42, -42, -20, 0x9ef7ff, 0.7);
      this.creatureContainer.add([this.creatureParts.wingFinLeft, this.creatureParts.wingFinRight]);
    }

    if (stage >= 4 && !this.creatureParts.crown) {
      this.creatureParts.crown = this.add.triangle(26, -52, 0, 0, 14, -22, -14, -22, 0xffd46b, 0.9);
      this.creatureContainer.add(this.creatureParts.crown);
    }

    this.flashEvolutionText(stage);
  }

  /**
   * Codex: 生物の追加部位にうねり演出を与えて生命感を出す。
   */
  private animateCreatureParts(): void {
    if (!this.creatureParts) {
      return;
    }

    const t = this.time.now * 0.005;

    if (this.creatureParts.tentacleLeft) {
      this.creatureParts.tentacleLeft.angle = Math.sin(t) * 18;
    }

    if (this.creatureParts.tentacleRight) {
      this.creatureParts.tentacleRight.angle = Math.cos(t + 0.8) * 20;
    }

    if (this.creatureParts.dorsalFin) {
      this.creatureParts.dorsalFin.angle = Math.sin(t * 0.9) * 5;
    }

    if (this.creatureParts.wingFinLeft) {
      this.creatureParts.wingFinLeft.angle = Math.sin(t * 1.2) * 10;
    }

    if (this.creatureParts.wingFinRight) {
      this.creatureParts.wingFinRight.angle = -Math.sin(t * 1.2) * 10;
    }
  }

  /**
   * Codex: 進化到達時に短いテキスト演出を表示する。
   */
  private flashEvolutionText(stage: number): void {
    if (!this.uiLayer || stage === 0) {
      return;
    }

    const badge = this.add.text(this.layout.width / 2, this.layout.height * 0.14, `進化: Stage ${stage}`, {
      fontFamily: 'sans-serif',
      fontSize: '28px',
      color: '#fff2c7',
      stroke: '#3c2a1a',
      strokeThickness: 6,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    this.uiLayer.add(badge);
    this.tweens.add({
      targets: badge,
      y: badge.y - 26,
      alpha: 0,
      duration: 980,
      ease: 'Quad.Out',
      onComplete: () => badge.destroy(),
    });
  }

  /**
   * Codex: 食べた位置に小さな発光粒子エフェクトを生成する。
   */
  private playEatEffect(x: number, y: number): void {
    if (!this.fxLayer) {
      return;
    }

    for (let i = 0; i < 7; i += 1) {
      const sparkle = this.add.circle(x, y, Phaser.Math.Between(3, 6), 0xfff1a6, 0.95);
      this.fxLayer.add(sparkle);
      this.tweens.add({
        targets: sparkle,
        x: x + Phaser.Math.Between(-32, 32),
        y: y + Phaser.Math.Between(-32, 32),
        alpha: 0,
        duration: 300,
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
      driftingChild.x += Math.sin((this.time.now * 0.001) + index) * 0.04 * deltaSec * 60;
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
   * Codex: レベルに応じた進化段階を返す。
   */
  private getEvolutionStage(level: number): number {
    return EVOLUTION_THRESHOLDS.filter((threshold) => level >= threshold).length;
  }

  /**
   * Codex: レベル表示テキストを生成する。
   */
  private getLevelLabel(): string {
    return `Aqua Morph Lv.${this.creatureLevel}`;
  }

  /**
   * Codex: 進化表示テキストを生成する。
   */
  private getEvolutionLabel(): string {
    return `進化段階: Stage ${this.getEvolutionStage(this.creatureLevel)}`;
  }

  /**
   * Codex: 誘導テキストをフェードアウトして画面に馴染ませる。
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
