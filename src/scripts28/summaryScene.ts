import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BaseResponsiveScene } from '../baseResponsiveScene.ts';
import { BACKGROUND_COLOR, SUBTITLE, TITLE } from './define.ts';

type Point = { x: number; y: number };

type RockState = {
  id: number;
  tile: Point;
  durability: number;
  sprite: Phaser.GameObjects.Text | null;
};

type GemState = {
  id: number;
  worldX: number;
  worldY: number;
  sprite: Phaser.GameObjects.Text;
};

type QuarterViewLayout = {
  centerX: number;
  baseY: number;
  tileWidth: number;
  tileHeight: number;
  hudPadding: number;
};

const FIELD_RADIUS = 4;
const ROCK_COUNT = 10;
const ROCK_INITIAL_DURABILITY = 6;
const MINE_INTERVAL_MS = 520;
const MOVE_INTERVAL_MS = 1300;
const GEM_DROP_RATE = 0.3;
const GEM_BURST_HEIGHT = 26;

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts28SummaryScene';

  private layout: QuarterViewLayout = { centerX: 0, baseY: 0, tileWidth: 64, tileHeight: 32, hudPadding: 14 };

  private worldLayer!: Phaser.GameObjects.Container;

  private hudTitle!: Phaser.GameObjects.Text;

  private hudScore!: Phaser.GameObjects.Text;

  private monkey!: Phaser.GameObjects.Text;

  private monkeyTarget: RockState | null = null;

  private rocks: RockState[] = [];

  private gems: GemState[] = [];

  private score = 0;

  private gemSequence = 0;

  private miningEvent: Phaser.Time.TimerEvent | null = null;

  private moveEvent: Phaser.Time.TimerEvent | null = null;

  public constructor() {
    super(SummaryScene.key);
  }

  public create(): void {
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);

    this.worldLayer = this.add.container(0, 0);
    this.hudTitle = this.add.text(0, 0, `${TITLE} | ${SUBTITLE}`, { fontSize: '14px', color: '#e5e7eb' });
    this.hudScore = this.add.text(0, 0, '回収した💎: 0', { fontSize: '22px', color: '#fef08a', fontStyle: 'bold' });
    this.monkey = this.add.text(0, 0, '🐒⛏️', { fontSize: '34px' }).setOrigin(0.5, 1);

    this.createRocks();
    this.bindResponsiveLayout();
    this.startSimulation();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.miningEvent?.destroy();
      this.moveEvent?.destroy();
    });
  }

  /**
   * Codex: 画面サイズに応じてクォータービューの基本寸法を計算する。
   */
  protected computeLayout(width: number, height: number): QuarterViewLayout {
    const tileWidth = Phaser.Math.Clamp(Math.round(width * 0.12), 48, 96);
    const tileHeight = Math.round(tileWidth * 0.5);

    return {
      centerX: width * 0.5,
      baseY: height * 0.56,
      tileWidth,
      tileHeight,
      hudPadding: Math.max(12, Math.round(width * 0.02)),
    };
  }

  /**
   * Codex: 計算済みレイアウトを反映して地形・オブジェクト・HUDを再配置する。
   */
  protected renderLayout(layout: QuarterViewLayout): void {
    this.layout = layout;
    this.drawGround();
    this.repositionAllObjects();

    this.hudTitle.setPosition(layout.hudPadding, layout.hudPadding);
    this.hudScore.setPosition(layout.hudPadding, layout.hudPadding + 24);
  }

  /**
   * Codex: 岩の初期配置をランダムに生成する。
   */
  private createRocks(): void {
    const used = new Set<string>();

    while (this.rocks.length < ROCK_COUNT) {
      const tile = this.pickRandomTile();
      const key = `${tile.x},${tile.y}`;
      if (used.has(key)) {
        continue;
      }

      used.add(key);
      this.rocks.push({
        id: this.rocks.length,
        tile,
        durability: ROCK_INITIAL_DURABILITY,
        sprite: this.add.text(0, 0, '🪨', { fontSize: '32px' }).setOrigin(0.5, 1),
      });
    }
  }

  /**
   * Codex: 観賞ゲームの自動移動と採掘ループを開始する。
   */
  private startSimulation(): void {
    this.selectNextTarget();

    this.moveEvent = this.time.addEvent({
      delay: MOVE_INTERVAL_MS,
      loop: true,
      callback: () => {
        if (!this.monkeyTarget) {
          this.selectNextTarget();
        }
        if (this.monkeyTarget) {
          this.moveMonkeyToRock(this.monkeyTarget);
        }
      },
    });

    this.miningEvent = this.time.addEvent({
      delay: MINE_INTERVAL_MS,
      loop: true,
      callback: () => {
        if (!this.monkeyTarget) {
          return;
        }
        this.mineRock(this.monkeyTarget);
      },
    });
  }

  /**
   * Codex: 次に採掘する岩をランダムに選択する。
   */
  private selectNextTarget(): void {
    if (this.rocks.length === 0) {
      return;
    }

    const index = Phaser.Math.Between(0, this.rocks.length - 1);
    this.monkeyTarget = this.rocks[index] ?? null;
    if (this.monkeyTarget) {
      this.moveMonkeyToRock(this.monkeyTarget);
    }
  }

  /**
   * Codex: 猿を対象の岩タイル位置へ滑らかに移動させる。
   */
  private moveMonkeyToRock(rock: RockState): void {
    const position = this.tileToScreen(rock.tile.x, rock.tile.y);

    this.tweens.add({
      targets: this.monkey,
      x: position.x,
      y: position.y,
      duration: 420,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Codex: 岩を叩いて耐久値を減らし、一定確率で宝石をドロップする。
   */
  private mineRock(rock: RockState): void {
    rock.durability -= 1;

    if (rock.sprite) {
      this.tweens.add({
        targets: rock.sprite,
        scaleX: 0.8,
        scaleY: 0.8,
        yoyo: true,
        duration: 90,
      });
    }

    if (Math.random() < GEM_DROP_RATE) {
      this.spawnGem(rock.tile.x, rock.tile.y);
    }

    if (rock.durability > 0) {
      return;
    }

    this.respawnRock(rock);
    this.selectNextTarget();
  }

  /**
   * Codex: 採掘済みの岩を新しい座標へ再配置してループを継続する。
   */
  private respawnRock(rock: RockState): void {
    rock.tile = this.pickRandomTile();
    rock.durability = ROCK_INITIAL_DURABILITY;

    if (rock.sprite) {
      const position = this.tileToScreen(rock.tile.x, rock.tile.y);
      rock.sprite.setPosition(position.x, position.y);
    }
  }

  /**
   * Codex: 宝石を地面から飛び出す演出付きで生成し、タップ回収を有効化する。
   */
  private spawnGem(tileX: number, tileY: number): void {
    const position = this.tileToScreen(tileX, tileY);
    const gemSprite = this.add.text(position.x, position.y, '💎', { fontSize: '30px' })
      .setOrigin(0.5, 1)
      .setInteractive({ useHandCursor: true });

    const gem: GemState = {
      id: this.gemSequence,
      worldX: tileX,
      worldY: tileY,
      sprite: gemSprite,
    };
    this.gemSequence += 1;

    gemSprite.on('pointerdown', () => {
      this.collectGem(gem.id);
    });

    this.gems.push(gem);

    this.tweens.add({
      targets: gemSprite,
      y: gemSprite.y - GEM_BURST_HEIGHT,
      alpha: { from: 0, to: 1 },
      yoyo: true,
      duration: 260,
      onYoyo: () => {
        gemSprite.setAlpha(1);
      },
    });

    this.sortWorldDepth();
  }

  /**
   * Codex: タップされた宝石を回収してスコアを更新する。
   */
  private collectGem(gemId: number): void {
    const gemIndex = this.gems.findIndex((item) => item.id === gemId);
    if (gemIndex < 0) {
      return;
    }

    const [gem] = this.gems.splice(gemIndex, 1);
    gem.sprite.destroy();

    this.score += 1;
    this.hudScore.setText(`回収した💎: ${this.score}`);
  }

  /**
   * Codex: 地面の菱形タイルを描画して鉱山らしい見た目を作る。
   */
  private drawGround(): void {
    this.worldLayer.removeAll(true);

    const graphics = this.add.graphics();
    for (let y = -FIELD_RADIUS; y <= FIELD_RADIUS; y += 1) {
      for (let x = -FIELD_RADIUS; x <= FIELD_RADIUS; x += 1) {
        const p = this.tileToScreen(x, y);
        const hW = this.layout.tileWidth / 2;
        const hH = this.layout.tileHeight / 2;

        graphics.fillStyle((x + y) % 2 === 0 ? 0x3f3f46 : 0x52525b, 1);
        graphics.lineStyle(1, 0x18181b, 0.35);
        graphics.beginPath();
        graphics.moveTo(p.x, p.y - hH);
        graphics.lineTo(p.x + hW, p.y);
        graphics.lineTo(p.x, p.y + hH);
        graphics.lineTo(p.x - hW, p.y);
        graphics.closePath();
        graphics.fillPath();
        graphics.strokePath();
      }
    }

    this.worldLayer.add(graphics);
  }

  /**
   * Codex: 岩・宝石・猿の座標を最新レイアウトへ更新する。
   */
  private repositionAllObjects(): void {
    this.rocks.forEach((rock) => {
      if (!rock.sprite) {
        return;
      }
      const p = this.tileToScreen(rock.tile.x, rock.tile.y);
      rock.sprite.setPosition(p.x, p.y);
    });

    this.gems.forEach((gem) => {
      const p = this.tileToScreen(gem.worldX, gem.worldY);
      gem.sprite.setPosition(p.x, p.y - 8);
    });

    if (this.monkeyTarget) {
      const p = this.tileToScreen(this.monkeyTarget.tile.x, this.monkeyTarget.tile.y);
      this.monkey.setPosition(p.x, p.y);
    }

    this.sortWorldDepth();
  }

  /**
   * Codex: オブジェクトのY座標順で奥行き感を維持して描画順を整える。
   */
  private sortWorldDepth(): void {
    this.rocks.forEach((rock) => {
      if (rock.sprite) {
        rock.sprite.setDepth(rock.sprite.y);
      }
    });

    this.gems.forEach((gem) => {
      gem.sprite.setDepth(gem.sprite.y + 2);
    });

    this.monkey.setDepth(this.monkey.y + 4);
  }

  /**
   * Codex: クォータービュー座標系へ変換してスクリーン座標を返す。
   */
  private tileToScreen(tileX: number, tileY: number): Point {
    return {
      x: this.layout.centerX + (tileX - tileY) * (this.layout.tileWidth / 2),
      y: this.layout.baseY + (tileX + tileY) * (this.layout.tileHeight / 2),
    };
  }

  /**
   * Codex: 採掘場の範囲内からランダムなタイル座標を取得する。
   */
  private pickRandomTile(): Point {
    return {
      x: Phaser.Math.Between(-FIELD_RADIUS + 1, FIELD_RADIUS - 1),
      y: Phaser.Math.Between(-FIELD_RADIUS + 1, FIELD_RADIUS - 1),
    };
  }
}

new Phaser.Game(createConfig([SummaryScene]));
