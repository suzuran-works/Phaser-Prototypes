import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BaseResponsiveScene } from '../baseResponsiveScene.ts';
import { BACKGROUND_COLOR, SUBTITLE, TITLE } from './define.ts';

type GhostAgent = {
  sprite: Phaser.GameObjects.Text;
  vx: number;
  vy: number;
  tier: number;
  size: number;
  value: number;
};

type SceneLayout = {
  width: number;
  height: number;
  titleY: number;
  subtitleY: number;
  statusY: number;
};

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts11SummaryScene';

  private layout: SceneLayout = {
    width: 1080,
    height: 1080,
    titleY: 40,
    subtitleY: 96,
    statusY: 142,
  };

  private ghosts: GhostAgent[] = [];

  private titleText!: Phaser.GameObjects.Text;

  private subtitleText!: Phaser.GameObjects.Text;

  private statusText!: Phaser.GameObjects.Text;

  private score = 0;

  private elapsedSeconds = 0;

  private summonLevel = 1;

  private mergeLevel = 1;

  private autoTapLevel = 0;

  private autoTapTimer = 0;

  private ritualTapCount = 0;

  /**
   * GPT-5.3-Codex: 幽霊タップ合成クリッカーのメインシーンを初期化する。
   */
  public constructor() {
    super(SummaryScene.key);
  }

  /**
   * GPT-5.3-Codex: UI・入力・初期幽霊を生成してゲームを開始する。
   */
  public create(): void {
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);

    this.titleText = this.add.text(0, 0, TITLE, {
      fontFamily: 'sans-serif',
      fontSize: '42px',
      color: '#e2e8f0',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    this.subtitleText = this.add.text(0, 0, SUBTITLE, {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      color: '#c4b5fd',
    }).setOrigin(0.5, 0);

    this.statusText = this.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#cbd5e1',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5, 0);

    this.spawnGhost(6);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.performRitualTap(pointer.x, pointer.y);
    });

    this.bindResponsiveLayout();
  }

  /**
   * GPT-5.3-Codex: 幽霊移動・放置収益・オートタップ・オート強化を毎フレーム更新する。
   */
  public update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.05);
    this.elapsedSeconds += dt;

    let passiveIncome = 0;
    this.ghosts.forEach((ghost) => {
      ghost.sprite.x += ghost.vx * dt;
      ghost.sprite.y += ghost.vy * dt;
      this.reflectGhostIfNeeded(ghost);
      passiveIncome += ghost.value;
    });

    this.score += passiveIncome * dt * (1 + this.mergeLevel * 0.08);

    const autoInterval = this.getAutoTapInterval();
    if (Number.isFinite(autoInterval)) {
      this.autoTapTimer += dt;
      while (this.autoTapTimer >= autoInterval) {
        this.autoTapTimer -= autoInterval;
        const x = Phaser.Math.Between(60, Math.max(60, this.layout.width - 60));
        const y = Phaser.Math.Between(220, Math.max(220, this.layout.height - 60));
        this.performRitualTap(x, y, true);
      }
    }

    this.applyAutoUpgrades();

    this.statusText.setText([
      `SOUL: ${Math.floor(this.score)}`,
      `GHOSTS: ${this.ghosts.length} / RITUAL TAP: ${this.ritualTapCount}`,
      `召喚Lv.${this.summonLevel}  合成Lv.${this.mergeLevel}  AUTO Lv.${this.autoTapLevel}`,
    ]);
  }

  /**
   * GPT-5.3-Codex: 画面サイズに応じてUIの表示位置を計算する。
   */
  protected computeLayout(width: number, height: number): SceneLayout {
    return {
      width,
      height,
      titleY: Math.max(16, height * 0.03),
      subtitleY: Math.max(54, height * 0.08),
      statusY: Math.max(95, height * 0.13),
    };
  }

  /**
   * GPT-5.3-Codex: レイアウト情報を反映してUIサイズと座標を更新する。
   */
  protected renderLayout(layout: SceneLayout): void {
    this.layout = layout;

    const titleSize = Math.max(28, Math.floor(Math.min(layout.width, layout.height) * 0.04));
    const subSize = Math.max(16, Math.floor(Math.min(layout.width, layout.height) * 0.022));
    const statusSize = Math.max(14, Math.floor(Math.min(layout.width, layout.height) * 0.022));

    this.titleText.setPosition(layout.width * 0.5, layout.titleY).setFontSize(titleSize);
    this.subtitleText.setPosition(layout.width * 0.5, layout.subtitleY).setFontSize(subSize);
    this.statusText.setPosition(layout.width * 0.5, layout.statusY).setFontSize(statusSize);
  }

  /**
   * GPT-5.3-Codex: タップ時に幽霊増殖か結合を実行し、軽い演出で反応を返す。
   */
  private performRitualTap(x: number, y: number, isAuto = false): void {
    this.ritualTapCount += 1;

    const spawnChance = Math.max(0.35, 0.72 - this.mergeLevel * 0.03);
    const shouldSpawn = this.ghosts.length < 2 || Math.random() < spawnChance;

    if (shouldSpawn) {
      const spawnCount = Math.max(1, Math.floor(this.summonLevel / 2));
      this.spawnGhost(spawnCount, x, y);
    } else if (!this.tryMergeNearestGhost(x, y)) {
      this.spawnGhost(1, x, y);
    }

    if (!isAuto) {
      this.tweens.add({
        targets: this.cameras.main,
        zoom: 1.01,
        duration: 45,
        yoyo: true,
      });
    }
  }

  /**
   * GPT-5.3-Codex: 幽霊を指定位置付近へ生成し、可愛い見た目と移動速度を設定する。
   */
  private spawnGhost(count: number, originX?: number, originY?: number): void {
    for (let index = 0; index < count; index += 1) {
      const tier = Phaser.Math.Between(1, Math.max(1, this.summonLevel));
      const size = 34 + tier * 5;
      const x = Phaser.Math.Clamp(
        (originX ?? Phaser.Math.Between(size, this.layout.width - size)) + Phaser.Math.Between(-90, 90),
        size,
        Math.max(size, this.layout.width - size),
      );
      const y = Phaser.Math.Clamp(
        (originY ?? Phaser.Math.Between(220, this.layout.height - size)) + Phaser.Math.Between(-90, 90),
        Math.max(this.layout.statusY + 100, size),
        Math.max(Math.max(this.layout.statusY + 100, size), this.layout.height - size),
      );

      const speed = Phaser.Math.Between(35, 95) + tier * 9;
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);

      const sprite = this.add.text(x, y, '👻', {
        fontFamily: 'sans-serif',
        fontSize: `${size}px`,
      }).setOrigin(0.5);

      const ghost: GhostAgent = {
        sprite,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        tier,
        size,
        value: 1.2 + tier * tier * 0.75,
      };

      this.ghosts.push(ghost);
    }
  }

  /**
   * GPT-5.3-Codex: タップ地点に最も近い2体を結合し、上位幽霊へ進化させる。
   */
  private tryMergeNearestGhost(x: number, y: number): boolean {
    if (this.ghosts.length < 2) {
      return false;
    }

    const sorted = [...this.ghosts].sort((a, b) => {
      const da = Phaser.Math.Distance.Between(x, y, a.sprite.x, a.sprite.y);
      const db = Phaser.Math.Distance.Between(x, y, b.sprite.x, b.sprite.y);
      return da - db;
    });

    const left = sorted[0];
    const right = sorted[1];
    const distance = Phaser.Math.Distance.Between(left.sprite.x, left.sprite.y, right.sprite.x, right.sprite.y);

    if (distance > 260) {
      return false;
    }

    const nextTier = Math.min(12, Math.max(left.tier, right.tier) + 1);
    const mergeBonus = (left.value + right.value) * (0.25 + this.mergeLevel * 0.1);
    this.score += mergeBonus;

    this.removeGhost(left);
    this.removeGhost(right);

    this.spawnMergedGhost((left.sprite.x + right.sprite.x) * 0.5, (left.sprite.y + right.sprite.y) * 0.5, nextTier);
    return true;
  }

  /**
   * GPT-5.3-Codex: 結合専用の上位幽霊を生成し、演出で進化感を出す。
   */
  private spawnMergedGhost(x: number, y: number, tier: number): void {
    const size = 34 + tier * 6;
    const speed = Phaser.Math.Between(45, 88) + tier * 7;
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);

    const sprite = this.add.text(x, y, '👻', {
      fontFamily: 'sans-serif',
      fontSize: `${size}px`,
      color: '#f5d0fe',
      stroke: '#a855f7',
      strokeThickness: 2,
    }).setOrigin(0.5).setScale(0.65);

    this.tweens.add({
      targets: sprite,
      scale: 1,
      duration: 180,
      ease: 'Back.Out',
    });

    this.ghosts.push({
      sprite,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      tier,
      size,
      value: 1.2 + tier * tier * 0.9,
    });
  }

  /**
   * GPT-5.3-Codex: 魂が一定値に達したら自動で段階強化を購入する。
   */
  private applyAutoUpgrades(): void {
    const summonCost = 28 * Math.pow(1.7, this.summonLevel - 1);
    if (this.score >= summonCost) {
      this.score -= summonCost;
      this.summonLevel += 1;
    }

    const mergeCost = 45 * Math.pow(1.95, this.mergeLevel - 1);
    if (this.score >= mergeCost) {
      this.score -= mergeCost;
      this.mergeLevel += 1;
    }

    const autoCost = 70 * Math.pow(2.15, this.autoTapLevel);
    if (this.score >= autoCost) {
      this.score -= autoCost;
      this.autoTapLevel += 1;
    }
  }

  /**
   * GPT-5.3-Codex: オートタップ速度をレベルに応じて返す。
   */
  private getAutoTapInterval(): number {
    if (this.autoTapLevel <= 0) {
      return Number.POSITIVE_INFINITY;
    }

    return Math.max(0.18, 1.5 - this.autoTapLevel * 0.12);
  }

  /**
   * GPT-5.3-Codex: 指定幽霊を配列と表示から安全に削除する。
   */
  private removeGhost(ghost: GhostAgent): void {
    const index = this.ghosts.indexOf(ghost);
    if (index < 0) {
      return;
    }

    this.ghosts.splice(index, 1);
    ghost.sprite.destroy();
  }

  /**
   * GPT-5.3-Codex: 幽霊が画面外へ出ないように反射させる。
   */
  private reflectGhostIfNeeded(ghost: GhostAgent): void {
    const radius = ghost.size * 0.45;
    const minX = radius;
    const maxX = this.layout.width - radius;
    const minY = Math.max(this.layout.statusY + 110, radius);
    const maxY = this.layout.height - radius;

    if (ghost.sprite.x < minX || ghost.sprite.x > maxX) {
      ghost.vx *= -1;
      ghost.sprite.x = Phaser.Math.Clamp(ghost.sprite.x, minX, maxX);
    }

    if (ghost.sprite.y < minY || ghost.sprite.y > maxY) {
      ghost.vy *= -1;
      ghost.sprite.y = Phaser.Math.Clamp(ghost.sprite.y, minY, maxY);
    }
  }
}

new Phaser.Game(createConfig([SummaryScene]));
