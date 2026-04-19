import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BACKGROUND_COLOR } from './define.ts';

// ---- アイソメトリックグリッド定数 ----
const TILE_HW = 45;    // タイル幅の半分（グリッド1単位あたりのスクリーンX移動量）
const TILE_HH = 22.5;  // タイル高さの半分
const GRID_W = 11;
const GRID_H = 11;
const GX_C = 5;        // 温泉中心グリッドX
const GY_C = 5;        // 温泉中心グリッドY
const ISO_OX = 540;    // グリッド(0,0)のスクリーンX
const ISO_OY = 280;    // グリッド(0,0)のスクリーンY

// ---- 温泉のスクリーン座標 ----
const SPRING_SX = ISO_OX + (GX_C - GY_C) * TILE_HW; // 540
const SPRING_SY = ISO_OY + (GX_C + GY_C) * TILE_HH;  // 505
const SPRING_W = 210;
const SPRING_H = 112;
const SPRING_DEPTH = SPRING_SY + 1; // 506: この値より低いキャラは温泉の奥に見える

// ---- カラー ----
const C_GRASS_LIGHT = 0x5a9e45;
const C_GRASS_DARK  = 0x4a8e35;
const C_TILE_BORDER = 0x3a7025;
const C_SPRING_EDGE = 0x8a7060;
const C_WATER_BASE  = 0x3dd6e0;
const C_WATER_LITE  = 0x7bf5ff;

// ---- 温泉の入浴スロット（グリッド座標） ----
// Claude Code: 温泉の石枠周辺に配置し、奥・手前それぞれの深度で自然に見える位置を選択
const SLOTS: Array<{ gx: number; gy: number }> = [
  { gx: 3, gy: 6 }, // 左奥 (depth < 506 → 温泉の奥に見える)
  { gx: 4, gy: 3 }, // 右奥
  { gx: 4, gy: 7 }, // 左手前
  { gx: 6, gy: 7 }, // 中央手前
  { gx: 7, gy: 4 }, // 右手前
  { gx: 7, gy: 6 }, // 右手前2
];

// ---- スポーン位置（グリッド端） ----
const SPAWNS: Array<{ gx: number; gy: number }> = [
  { gx: 0, gy: 0 }, { gx: 10, gy: 0 },
  { gx: 0, gy: 10 }, { gx: 10, gy: 10 },
  { gx: 2, gy: 0 }, { gx: 0, gy: 4 },
  { gx: 8, gy: 0 }, { gx: 0, gy: 8 },
  { gx: 10, gy: 3 }, { gx: 10, gy: 7 },
];

// ---- 装飾オブジェクト ----
const DECORATIONS: Array<{ gx: number; gy: number; emoji: string }> = [
  { gx: 0, gy: 2, emoji: '🎋' }, { gx: 1, gy: 0, emoji: '🌿' },
  { gx: 9, gy: 0, emoji: '🎋' }, { gx: 10, gy: 2, emoji: '🌿' },
  { gx: 0, gy: 9, emoji: '🪨' }, { gx: 1, gy: 10, emoji: '🌿' },
  { gx: 9, gy: 10, emoji: '🪨' }, { gx: 10, gy: 9, emoji: '🎋' },
  { gx: 2, gy: 1, emoji: '🌸' }, { gx: 8, gy: 1, emoji: '🌸' },
  { gx: 1, gy: 8, emoji: '🌸' }, { gx: 9, gy: 8, emoji: '🌿' },
];

// ---- セリフ ----
const SOLO_LINES = [
  'ふぅ〜気持ちいい', '極楽極楽〜', '最高の温泉！',
  'お酒が進む〜', 'また来ようっと', '体がとろける...',
  'いいお湯だね', '疲れが取れる〜', 'まったり最高',
  '温泉サイコー！', 'のんびりしよ', 'ほんわか〜',
];

const PAIR_LINES: Array<[string, string]> = [
  ['いいお湯ですね', 'ほんとに！'],
  ['また来ましたよ', 'おひさしぶり！'],
  ['極楽ですねえ', 'ですよねー'],
  ['お酒いかが？🍶', 'ありがとう！'],
  ['のんびりしよ', '一緒に〜'],
  ['ここ最高〜', 'また来ます！'],
];

const DRINKS = ['🍶', '🍺', '🍵', '🥛'];

// ---- 型定義 ----
type RabbitState = 'walking_in' | 'soaking' | 'leaving' | 'done';

interface Rabbit {
  id: number;
  gx: number;
  gy: number;
  baseY: number;
  state: RabbitState;
  sprite: Phaser.GameObjects.Text;
  bubble: Phaser.GameObjects.Container | null;
  bubbleTimer: number;
  soakTimer: number;
  soakMax: number;
  drinkTimer: number;
  drinkSpr: Phaser.GameObjects.Text | null;
  slotIdx: number;
  exitGX: number;
  exitGY: number;
}

interface Coin {
  id: number;
  spr: Phaser.GameObjects.Text;
  life: number;
  maxLife: number;
}

/**
 * Claude Code: グリッド座標をアイソメトリックスクリーン座標に変換する
 */
function gs(gx: number, gy: number): { x: number; y: number } {
  return {
    x: ISO_OX + (gx - gy) * TILE_HW,
    y: ISO_OY + (gx + gy) * TILE_HH,
  };
}

// ---- シーン ----
class HotSpringScene extends Phaser.Scene {
  private rabbits: Rabbit[] = [];
  private coins: Coin[] = [];
  private slotFree: boolean[] = new Array(SLOTS.length).fill(true);

  private score = 0;
  private scoreText!: Phaser.GameObjects.Text;

  private spawnTimer = 2000;
  private spawnInterval = 5000;
  private pairTimer = 18000;

  private rabbitId = 0;
  private coinId = 0;

  constructor() {
    super({ key: 'HotSpringScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);
    this.drawGround();
    this.drawSpring();
    this.addDecorations();
    this.setupUI();
    this.input.on('pointerdown', this.onPointerDown, this);
  }

  update(_t: number, dt: number): void {
    this.tickSpawn(dt);
    this.tickRabbits(dt);
    this.tickCoins(dt);
    this.tickPairDialogue(dt);
  }

  /**
   * Claude Code: 11×11のアイソメトリック草地タイルをGraphicsで描画する
   */
  private drawGround(): void {
    const g = this.add.graphics().setDepth(1);
    for (let gx = 0; gx < GRID_W; gx++) {
      for (let gy = 0; gy < GRID_H; gy++) {
        const { x: cx, y: cy } = gs(gx, gy);
        const fill = (gx + gy) % 2 === 0 ? C_GRASS_LIGHT : C_GRASS_DARK;
        g.fillStyle(fill);
        g.beginPath();
        g.moveTo(cx,           cy - TILE_HH);
        g.lineTo(cx + TILE_HW, cy);
        g.lineTo(cx,           cy + TILE_HH);
        g.lineTo(cx - TILE_HW, cy);
        g.closePath();
        g.fillPath();
        g.lineStyle(1, C_TILE_BORDER, 0.3);
        g.strokePath();
      }
    }
  }

  /**
   * Claude Code: 温泉プール（石枠・水面・湯気アニメーション）を描画する
   */
  private drawSpring(): void {
    const g = this.add.graphics().setDepth(SPRING_DEPTH);
    const sx = SPRING_SX;
    const sy = SPRING_SY;

    // 石の縁
    g.fillStyle(C_SPRING_EDGE);
    g.fillEllipse(sx, sy + 12, SPRING_W + 24, SPRING_H + 24);

    // 水面
    g.fillStyle(C_WATER_BASE);
    g.fillEllipse(sx, sy + 8, SPRING_W, SPRING_H);

    // 光の反射ハイライト
    g.fillStyle(C_WATER_LITE, 0.38);
    g.fillEllipse(sx - 30, sy, SPRING_W * 0.48, SPRING_H * 0.48);

    // 水面のさざ波テキスト
    const ripple = this.add.text(sx, sy + 8, '〜〜〜', {
      fontSize: '20px', color: '#7bf5ff',
    }).setOrigin(0.5).setDepth(SPRING_DEPTH + 1).setAlpha(0.6);
    this.tweens.add({
      targets: ripple, scaleX: 1.18, alpha: 0.25,
      duration: 950, yoyo: true, repeat: -1,
    });

    // 湯気（3本）
    ([{ ox: -55, oy: -38 }, { ox: 4, oy: -52 }, { ox: 58, oy: -40 }] as const).forEach(({ ox, oy }) => {
      const steam = this.add.text(sx + ox, sy + oy, '〜', {
        fontSize: '26px', color: '#b2f0f4',
      }).setOrigin(0.5).setDepth(SPRING_DEPTH + 2).setAlpha(0.72);
      this.tweens.add({
        targets: steam, y: sy + oy - 24, alpha: 0.08,
        duration: 1700 + Math.random() * 800,
        repeat: -1,
        onRepeat: () => { steam.setY(sy + oy); steam.setAlpha(0.72); },
      });
    });
  }

  /**
   * Claude Code: フィールド縁に草木・石などの装飾絵文字を配置する
   */
  private addDecorations(): void {
    DECORATIONS.forEach(({ gx, gy, emoji }) => {
      const { x, y } = gs(gx, gy);
      this.add.text(x, y - 16, emoji, { fontSize: '30px' })
        .setOrigin(0.5).setDepth(y);
    });
  }

  /**
   * Claude Code: タイトル・説明・スコアのUIを構築する
   */
  private setupUI(): void {
    this.add.text(540, 52, '🐇 温泉うさぎ 🐇', {
      fontSize: '50px', color: '#ecfdf5',
      fontStyle: 'bold', stroke: '#1a3a2a', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(10000);

    this.add.text(540, 114, '温泉を上がったうさぎの 💰 をタップして集めよう！', {
      fontSize: '23px', color: '#a7f3d0',
    }).setOrigin(0.5).setDepth(10000);

    this.add.rectangle(540, 978, 380, 66, 0x071410, 0.88)
      .setOrigin(0.5).setDepth(10000);

    this.scoreText = this.add.text(540, 978, '💰  0', {
      fontSize: '40px', color: '#fbbf24', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10001);
  }

  /**
   * Claude Code: スポーンタイマーを進め、空きスロットがあればウサギを1匹生成する
   */
  private tickSpawn(dt: number): void {
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0 || this.rabbits.length >= 5) return;

    this.spawnTimer = this.spawnInterval + Phaser.Math.Between(-500, 2000);
    this.spawnInterval = Phaser.Math.Between(4000, 9000);

    const freeSlots = SLOTS.map((_, i) => i).filter(i => this.slotFree[i]);
    if (freeSlots.length === 0) return;

    const slotIdx = Phaser.Utils.Array.GetRandom(freeSlots) as number;
    this.slotFree[slotIdx] = false;

    const spawn = Phaser.Utils.Array.GetRandom(SPAWNS) as { gx: number; gy: number };
    const sp = gs(spawn.gx, spawn.gy);

    const sprite = this.add.text(sp.x, sp.y, '🐇', { fontSize: '40px' })
      .setOrigin(0.5).setDepth(sp.y);

    const rabbit: Rabbit = {
      id: this.rabbitId++,
      gx: spawn.gx, gy: spawn.gy,
      baseY: sp.y, state: 'walking_in',
      sprite, bubble: null,
      bubbleTimer: Phaser.Math.Between(6000, 13000),
      soakTimer: 0,
      soakMax: Phaser.Math.Between(16000, 30000),
      drinkTimer: Phaser.Math.Between(5000, 12000),
      drinkSpr: null,
      slotIdx,
      exitGX: spawn.gx, exitGY: spawn.gy,
    };
    this.rabbits.push(rabbit);
    this.walkTo(rabbit, SLOTS[slotIdx].gx, SLOTS[slotIdx].gy, () => {
      rabbit.state = 'soaking';
    });
  }

  /**
   * Claude Code: 全ウサギのステートを毎フレーム更新し、doneになったものを削除する
   */
  private tickRabbits(dt: number): void {
    for (let i = this.rabbits.length - 1; i >= 0; i--) {
      const r = this.rabbits[i];
      if (r.state === 'soaking') this.tickSoaking(r, dt);
      if (r.state === 'done') {
        this.destroyRabbit(r);
        this.rabbits.splice(i, 1);
      }
    }
  }

  /**
   * Claude Code: 入浴中ウサギの揺れ・会話・飲酒・退場タイミングを処理する
   */
  private tickSoaking(r: Rabbit, dt: number): void {
    r.soakTimer += dt;
    r.bubbleTimer -= dt;
    r.drinkTimer -= dt;

    // ゆらゆら揺れ
    r.sprite.setY(r.baseY + Math.sin(r.soakTimer / 560) * 3.5);

    if (r.bubbleTimer <= 0) {
      r.bubbleTimer = Phaser.Math.Between(7000, 15000);
      this.showBubble(r, Phaser.Utils.Array.GetRandom(SOLO_LINES) as string);
    }

    if (r.drinkTimer <= 0) {
      r.drinkTimer = Phaser.Math.Between(10000, 22000);
      this.showDrink(r);
    }

    if (r.soakTimer >= r.soakMax) {
      r.state = 'leaving';
      this.slotFree[r.slotIdx] = true;
      this.hideBubble(r);
      this.dropCoins(r.sprite.x, r.sprite.y);
      this.walkTo(r, r.exitGX, r.exitGY, () => { r.state = 'done'; });
    }
  }

  /**
   * Claude Code: 入浴中の2匹を選び定期的にペア会話を発生させる
   */
  private tickPairDialogue(dt: number): void {
    this.pairTimer -= dt;
    if (this.pairTimer > 0) return;
    this.pairTimer = Phaser.Math.Between(15000, 28000);

    const avail = this.rabbits.filter(r => r.state === 'soaking' && !r.bubble);
    if (avail.length < 2) return;

    const shuffled = Phaser.Utils.Array.Shuffle([...avail]) as Rabbit[];
    const [a, b] = shuffled;
    const pair = Phaser.Utils.Array.GetRandom(PAIR_LINES) as [string, string];

    this.showBubble(a, pair[0]);
    this.showBubble(b, pair[1]);
  }

  /**
   * Claude Code: ウサギの頭上に吹き出しコンテナを生成する。3.5秒後に自動消去
   */
  private showBubble(r: Rabbit, text: string): void {
    this.hideBubble(r);
    const tx = r.sprite.x;
    const ty = r.baseY - 62;

    const label = this.add.text(0, 0, text, {
      fontSize: '19px', color: '#1a3a2a',
      fontStyle: 'bold', wordWrap: { width: 150 },
    }).setOrigin(0.5);

    const pw = label.width + 20;
    const ph = label.height + 14;
    const bg = this.add.graphics();
    bg.fillStyle(0xf0fdf4, 0.95);
    bg.lineStyle(2, 0x3a7025);
    bg.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, 8);
    bg.strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, 8);
    // 吹き出しの尾
    bg.fillTriangle(-7, ph / 2, 7, ph / 2, 0, ph / 2 + 10);

    r.bubble = this.add.container(tx, ty, [bg, label]).setDepth(8000);
    this.time.delayedCall(3500, () => this.hideBubble(r));
  }

  /**
   * Claude Code: ウサギの吹き出しを破棄してnullにする
   */
  private hideBubble(r: Rabbit): void {
    if (!r.bubble) return;
    r.bubble.destroy();
    r.bubble = null;
  }

  /**
   * Claude Code: ウサギが飲み物を飲む演出（絵文字が浮かんで消える）を再生する
   */
  private showDrink(r: Rabbit): void {
    if (r.drinkSpr) return;
    const drink = Phaser.Utils.Array.GetRandom(DRINKS) as string;
    const spr = this.add.text(r.sprite.x + 28, r.baseY - 14, drink, { fontSize: '28px' })
      .setOrigin(0.5).setDepth(8001);
    r.drinkSpr = spr;
    this.tweens.add({
      targets: spr, y: spr.y - 24, alpha: 0,
      duration: 1700, ease: 'Quad.Out',
      onComplete: () => { spr.destroy(); r.drinkSpr = null; },
    });
  }

  /**
   * Claude Code: 退場するウサギの足元に1〜3枚のコインをバウンドさせて配置する
   */
  private dropCoins(sx: number, sy: number): void {
    const n = Phaser.Math.Between(1, 3);
    for (let i = 0; i < n; i++) {
      this.time.delayedCall(i * 170, () => {
        const jx = sx + Phaser.Math.Between(-42, 42);
        const jy = sy + Phaser.Math.Between(-20, 20);
        const spr = this.add.text(jx, jy - 38, '💰', { fontSize: '36px' })
          .setOrigin(0.5).setDepth(jy + 2).setInteractive({ useHandCursor: true });
        this.tweens.add({ targets: spr, y: jy, duration: 360, ease: 'Bounce.Out' });
        this.coins.push({ id: this.coinId++, spr, life: 0, maxLife: 6200 });
      });
    }
  }

  /**
   * Claude Code: コインの寿命を更新し、期限切れをフェードアウトして削除する
   */
  private tickCoins(dt: number): void {
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.life += dt;
      if (c.life > c.maxLife - 1200) {
        c.spr.setAlpha(1 - (c.life - (c.maxLife - 1200)) / 1200);
      }
      if (c.life >= c.maxLife) {
        c.spr.destroy();
        this.coins.splice(i, 1);
      }
    }
  }

  /**
   * Claude Code: タップ座標に近いコインを見つけて回収する
   */
  private onPointerDown(ptr: Phaser.Input.Pointer): void {
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      const dx = c.spr.x - ptr.x;
      const dy = c.spr.y - ptr.y;
      if (dx * dx + dy * dy < 44 * 44) {
        this.collectCoin(c, i);
        return;
      }
    }
  }

  /**
   * Claude Code: コインを回収してスコア加算・ポップアニメーション・+1フィードバックを出す
   */
  private collectCoin(c: Coin, idx: number): void {
    this.score++;
    this.scoreText.setText(`💰  ${this.score}`);
    this.coins.splice(idx, 1);

    this.tweens.add({
      targets: c.spr, y: c.spr.y - 52,
      scaleX: 1.7, scaleY: 1.7, alpha: 0,
      duration: 460, ease: 'Quad.Out',
      onComplete: () => c.spr.destroy(),
    });

    const fb = this.add.text(c.spr.x, c.spr.y - 16, '+1', {
      fontSize: '28px', color: '#fbbf24',
      fontStyle: 'bold', stroke: '#7c2d12', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10002);
    this.tweens.add({
      targets: fb, y: fb.y - 48, alpha: 0, duration: 680,
      onComplete: () => fb.destroy(),
    });
  }

  /**
   * Claude Code: ウサギをグリッド上の目標位置へTweenで移動させ、完了時にコールバックを呼ぶ
   */
  private walkTo(r: Rabbit, tgx: number, tgy: number, onDone: () => void): void {
    const tp = gs(tgx, tgy);
    const dist = Math.abs(r.gx - tgx) + Math.abs(r.gy - tgy);
    const dur = Math.max(800, dist * 460 + 200);

    r.sprite.setFlipX(tp.x < r.sprite.x);

    this.tweens.add({
      targets: r.sprite, x: tp.x, y: tp.y,
      duration: dur, ease: 'Sine.InOut',
      onUpdate: () => { r.sprite.setDepth(r.sprite.y); },
      onComplete: () => {
        r.gx = tgx; r.gy = tgy;
        r.baseY = tp.y;
        r.sprite.setDepth(tp.y);
        onDone();
      },
    });
  }

  /**
   * Claude Code: ウサギに関連する全GameObjectを破棄する
   */
  private destroyRabbit(r: Rabbit): void {
    this.hideBubble(r);
    if (r.drinkSpr) { r.drinkSpr.destroy(); r.drinkSpr = null; }
    r.sprite.destroy();
  }
}

new Phaser.Game(createConfig([HotSpringScene]));
