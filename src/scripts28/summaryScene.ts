import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BaseResponsiveScene } from '../baseResponsiveScene.ts';
import { BACKGROUND_COLOR, SUBTITLE, TITLE } from './define.ts';

type Point = { x: number; y: number };

type RockState = {
  id: number;
  tile: Point;
  durability: number;
  isBroken: boolean;
  sprite: Phaser.GameObjects.Text | null;
};

type GemState = {
  id: number;
  tile: Point;
  offsetX: number;
  offsetY: number;
  sprite: Phaser.GameObjects.Text;
};

type MonkeyState = {
  id: number;
  sprite: Phaser.GameObjects.Text;
  targetRockId: number | null;
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
const MOVE_INTERVAL_MS = 900;
const GEM_DROP_RATE = 0.3;
const GEM_BURST_HEIGHT = 26;
const MONKEY_COUNT = 3;

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts28SummaryScene';

  private layout: QuarterViewLayout = { centerX: 0, baseY: 0, tileWidth: 64, tileHeight: 32, hudPadding: 14 };

  private worldLayer!: Phaser.GameObjects.Container;

  private hudTitle!: Phaser.GameObjects.Text;

  private hudScore!: Phaser.GameObjects.Text;

  private monkeys: MonkeyState[] = [];

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
    this.hudScore = this.add.text(0, 0, '散乱した💎: 0', { fontSize: '22px', color: '#fef08a', fontStyle: 'bold' });
    this.createMonkeys();
    this.createRocks();
    this.input.on('pointerdown', this.handleScreenTap, this);
    this.bindResponsiveLayout();
    this.startSimulation();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.miningEvent?.destroy();
      this.moveEvent?.destroy();
      this.input.off('pointerdown', this.handleScreenTap, this);
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
        isBroken: false,
        sprite: this.add.text(0, 0, '🪨', { fontSize: '32px' }).setOrigin(0.5, 1),
      });
    }
  }

  /**
   * Codex: 猿を3匹生成して個別に採掘対象を持てるようにする。
   */
  private createMonkeys(): void {
    this.monkeys = Array.from({ length: MONKEY_COUNT }, (_, index) => ({
      id: index,
      sprite: this.add.text(0, 0, '🐒⛏️', { fontSize: '34px' }).setOrigin(0.5, 1),
      targetRockId: null,
    }));
  }

  /**
   * Codex: 観賞ゲームの自動移動と採掘ループを開始する。
   */
  private startSimulation(): void {
    this.monkeys.forEach((monkey) => {
      this.selectNextTarget(monkey);
    });

    this.moveEvent = this.time.addEvent({
      delay: MOVE_INTERVAL_MS,
      loop: true,
      callback: () => {
        this.monkeys.forEach((monkey) => {
          const target = this.getMonkeyTarget(monkey);
          if (!target) {
            this.selectNextTarget(monkey);
            return;
          }
          this.moveMonkeyToRock(monkey, target);
        });
      },
    });

    this.miningEvent = this.time.addEvent({
      delay: MINE_INTERVAL_MS,
      loop: true,
      callback: () => {
        this.monkeys.forEach((monkey) => {
          const target = this.getMonkeyTarget(monkey);
          if (!target) {
            return;
          }
          this.mineRock(monkey, target);
        });
      },
    });
  }

  /**
   * Codex: 次に採掘する岩をランダムに選択する。
   */
  private selectNextTarget(monkey: MonkeyState): void {
    const candidates = this.rocks.filter((rock) => !rock.isBroken);
    if (candidates.length === 0) {
      monkey.targetRockId = null;
      return;
    }

    const index = Phaser.Math.Between(0, candidates.length - 1);
    const rock = candidates[index] ?? null;
    monkey.targetRockId = rock?.id ?? null;
    if (rock) {
      this.moveMonkeyToRock(monkey, rock);
    }
  }

  /**
   * Codex: 猿を対象の岩タイル位置へ滑らかに移動させる。
   */
  private moveMonkeyToRock(monkey: MonkeyState, rock: RockState): void {
    if (rock.isBroken) {
      monkey.targetRockId = null;
      return;
    }
    const position = this.tileToScreen(rock.tile.x, rock.tile.y);

    this.tweens.add({
      targets: monkey.sprite,
      x: position.x,
      y: position.y,
      duration: 420,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Codex: 岩を叩いて耐久値を減らし、一定確率で宝石をドロップする。
   */
  private mineRock(monkey: MonkeyState, rock: RockState): void {
    if (rock.isBroken) {
      monkey.targetRockId = null;
      return;
    }
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

    rock.isBroken = true;
    rock.sprite?.setVisible(false);
    monkey.targetRockId = null;
    this.selectNextTarget(monkey);
  }

  /**
   * Codex: 採掘済みの岩を新しい座標へ再配置して再度採掘可能にする。
   */
  private respawnRock(rock: RockState, tile?: Point): void {
    rock.tile = tile ?? this.pickRandomTile();
    rock.durability = ROCK_INITIAL_DURABILITY;
    rock.isBroken = false;

    if (rock.sprite) {
      const position = this.tileToScreen(rock.tile.x, rock.tile.y);
      rock.sprite.setVisible(true);
      rock.sprite.setPosition(position.x, position.y);
    }
  }

  /**
   * Codex: 宝石を地面から飛び出させ、転がった位置に残るよう配置する。
   */
  private spawnGem(tileX: number, tileY: number): void {
    const position = this.tileToScreen(tileX, tileY);
    const offsetX = Phaser.Math.Between(-24, 24);
    const offsetY = Phaser.Math.Between(-10, 12);
    const gemSprite = this.add.text(position.x, position.y, '💎', { fontSize: '30px' }).setOrigin(0.5, 1);

    const gem: GemState = {
      id: this.gemSequence,
      tile: { x: tileX, y: tileY },
      offsetX,
      offsetY,
      sprite: gemSprite,
    };
    this.gemSequence += 1;

    this.gems.push(gem);
    this.score += 1;
    this.hudScore.setText(`散乱した💎: ${this.score}`);

    this.tweens.add({
      targets: gemSprite,
      x: gemSprite.x + offsetX,
      y: gemSprite.y - GEM_BURST_HEIGHT + offsetY,
      alpha: { from: 0.9, to: 1 },
      ease: 'Sine.easeOut',
      duration: 280,
    });

    this.sortWorldDepth();
  }

  /**
   * Codex: 画面タップで壊れた岩を1個だけランダム位置にリスポーンする。
   */
  private handleScreenTap(pointer: Phaser.Input.Pointer): void {
    const brokenRocks = this.rocks.filter((rock) => rock.isBroken);
    if (brokenRocks.length === 0) {
      return;
    }

    const targetRock = brokenRocks[Phaser.Math.Between(0, brokenRocks.length - 1)];
    const tile = this.screenToTile(pointer.x, pointer.y);
    this.respawnRock(targetRock, tile);
    this.monkeys.forEach((monkey) => {
      if (!this.getMonkeyTarget(monkey)) {
        this.selectNextTarget(monkey);
      }
    });
    this.sortWorldDepth();
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
      const p = this.tileToScreen(gem.tile.x, gem.tile.y);
      gem.sprite.setPosition(p.x + gem.offsetX, p.y - 8 + gem.offsetY);
    });

    this.monkeys.forEach((monkey) => {
      const target = this.getMonkeyTarget(monkey);
      if (target) {
        const p = this.tileToScreen(target.tile.x, target.tile.y);
        monkey.sprite.setPosition(p.x, p.y);
      }
    });

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

    this.monkeys.forEach((monkey, index) => {
      monkey.sprite.setDepth(monkey.sprite.y + 4 + index * 0.1);
    });
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

  /**
   * Codex: 指定した猿が現在追跡している岩を取得する。
   */
  private getMonkeyTarget(monkey: MonkeyState): RockState | null {
    if (monkey.targetRockId === null) {
      return null;
    }
    return this.rocks.find((rock) => rock.id === monkey.targetRockId) ?? null;
  }

  /**
   * Codex: スクリーン座標を近傍のタイル座標へ変換する。
   */
  private screenToTile(screenX: number, screenY: number): Point {
    const dx = screenX - this.layout.centerX;
    const dy = screenY - this.layout.baseY;
    const halfW = this.layout.tileWidth / 2;
    const halfH = this.layout.tileHeight / 2;
    const rawX = (dx / halfW + dy / halfH) / 2;
    const rawY = (dy / halfH - dx / halfW) / 2;
    return {
      x: Phaser.Math.Clamp(Math.round(rawX), -FIELD_RADIUS + 1, FIELD_RADIUS - 1),
      y: Phaser.Math.Clamp(Math.round(rawY), -FIELD_RADIUS + 1, FIELD_RADIUS - 1),
    };
  }
}

new Phaser.Game(createConfig([SummaryScene]));
