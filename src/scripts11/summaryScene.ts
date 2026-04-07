import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BaseResponsiveScene } from '../baseResponsiveScene.ts';
import { BACKGROUND_COLOR, SUBTITLE, TITLE } from './define.ts';

type GhostAgent = {
  sprite: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  reward: number;
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

  private combo = 0;

  private spawnTimer = 0;

  private elapsedSeconds = 0;

  /**
   * GPT-5.3-Codex: 幽霊クリッカーのメインシーンを初期化する。
   */
  public constructor() {
    super(SummaryScene.key);
  }

  /**
   * GPT-5.3-Codex: UIと初期幽霊を生成してレスポンシブ描画を開始する。
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
      color: '#94a3b8',
    }).setOrigin(0.5, 0);

    this.statusText = this.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#cbd5e1',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5, 0);

    this.spawnGhost(4);
    this.bindResponsiveLayout();
  }

  /**
   * GPT-5.3-Codex: 幽霊の移動とスポーン周期を更新し、表示文言を再計算する。
   */
  public update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.05);
    this.elapsedSeconds += dt;
    this.spawnTimer += dt;

    const spawnInterval = Math.max(0.35, 1.35 - this.elapsedSeconds * 0.02);
    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      this.spawnGhost(1 + Math.floor(this.elapsedSeconds / 18));
    }

    this.ghosts.forEach((ghost) => {
      ghost.sprite.x += ghost.vx * dt;
      ghost.sprite.y += ghost.vy * dt;
      this.reflectGhostIfNeeded(ghost);
    });

    this.statusText.setText([
      `SOUL: ${this.score}`,
      `COMBO: x${this.combo}`,
      `GHOSTS: ${this.ghosts.length}`,
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
    const statusSize = Math.max(16, Math.floor(Math.min(layout.width, layout.height) * 0.024));

    this.titleText.setPosition(layout.width * 0.5, layout.titleY).setFontSize(titleSize);
    this.subtitleText.setPosition(layout.width * 0.5, layout.subtitleY).setFontSize(subSize);
    this.statusText.setPosition(layout.width * 0.5, layout.statusY).setFontSize(statusSize);
  }

  /**
   * GPT-5.3-Codex: 指定数の幽霊を生成し、クリック判定と報酬値を設定する。
   */
  private spawnGhost(count: number): void {
    for (let index = 0; index < count; index += 1) {
      const radius = Phaser.Math.Between(20, 38);
      const speed = Phaser.Math.Between(90, 180) + this.elapsedSeconds * 2;
      const x = Phaser.Math.Between(radius, Math.max(radius, this.layout.width - radius));
      const y = Phaser.Math.Between(Math.max(200, radius), Math.max(220, this.layout.height - radius));
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const hp = radius >= 32 ? 3 : radius >= 26 ? 2 : 1;

      const sprite = this.add.circle(x, y, radius, 0xffffff, 0.9)
        .setStrokeStyle(4, 0x93c5fd, 0.75)
        .setInteractive({ useHandCursor: true });

      const ghost: GhostAgent = {
        sprite,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        hp,
        maxHp: hp,
        reward: radius >= 32 ? 7 : radius >= 26 ? 4 : 2,
      };

      sprite.on('pointerdown', () => {
        this.onGhostClicked(ghost);
      });

      this.ghosts.push(ghost);
    }
  }

  /**
   * GPT-5.3-Codex: クリック時のダメージ・加点・消滅エフェクトを処理する。
   */
  private onGhostClicked(ghost: GhostAgent): void {
    const targetIndex = this.ghosts.indexOf(ghost);
    if (targetIndex < 0) {
      return;
    }

    ghost.hp -= 1;
    ghost.sprite.setScale(0.9);
    this.tweens.add({
      targets: ghost.sprite,
      scale: 1,
      duration: 90,
      ease: 'Sine.Out',
    });

    if (ghost.hp > 0) {
      const colorRatio = ghost.hp / ghost.maxHp;
      ghost.sprite.setFillStyle(0xffffff, 0.45 + colorRatio * 0.4);
      return;
    }

    this.combo += 1;
    const bonus = Math.min(12, Math.floor(this.combo / 5));
    this.score += ghost.reward + bonus;

    this.tweens.add({
      targets: ghost.sprite,
      scale: 0.1,
      alpha: 0,
      duration: 120,
      onComplete: () => {
        ghost.sprite.destroy();
      },
    });

    this.ghosts.splice(targetIndex, 1);

    // GPT-5.3-Codex: 盤面が空になった時だけテンポ良く再配置して遊びを継続させる。
    if (this.ghosts.length === 0) {
      this.spawnGhost(5 + Math.floor(this.elapsedSeconds / 12));
    }
  }

  /**
   * GPT-5.3-Codex: 幽霊が画面端に到達したら反射させてプレイ範囲内に留める。
   */
  private reflectGhostIfNeeded(ghost: GhostAgent): void {
    const radius = ghost.sprite.radius;
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
      if (ghost.sprite.y >= maxY) {
        this.combo = 0;
      }
    }
  }
}

new Phaser.Game(createConfig([SummaryScene]));
