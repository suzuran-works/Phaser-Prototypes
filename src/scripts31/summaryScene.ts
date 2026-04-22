import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BaseResponsiveScene } from '../baseResponsiveScene.ts';
import { BACKGROUND_COLOR, SUBTITLE, TITLE } from './define.ts';

// Claude: クォータービュー猿ライフ観賞ゲーム。タップでアイテムが降り、猿が反応する。

const GRID_COLS = 9;
const GRID_ROWS = 9;
const MONKEY_COUNT = 4;

const LAYOUT_TOKENS = {
  field: {
    widthRatio: 0.88,
    heightRatio: 0.56,
    centerYRatio: 0.54,
    tileHeightToWidth: 0.5,
  },
  hud: {
    titlePaddingPx: 28,
    titleFontRatio: 0.045,
    subtitleFontRatio: 0.022,
    logFontRatio: 0.022,
    logLineHeightRatio: 1.3,
    logBottomMarginRatio: 0.06,
  },
} as const;

const TILE_COLORS = [0x4a6b3a, 0x3d5c30] as const;
const TILE_EDGE_COLOR = 0x2a3d22;
const SHADOW_COLOR = 0x000000;

const MONKEY_SPEED_TILES_PER_SEC = 1.2;
const MONKEY_WANDER_MIN_MS = 1600;
const MONKEY_WANDER_MAX_MS = 3600;
const MONKEY_ACTION_MS = 2600;
const ITEM_LIFETIME_MS = 14000;
const ITEM_FALL_MS = 520;
const LOG_MAX_LINES = 5;
const LOG_LIFETIME_MS = 5200;

type ItemKind = 'food' | 'tool' | 'special';

type ItemDefinition = {
  id: string;
  emoji: string;
  kind: ItemKind;
  label: string;
  actionText: string;
};

// Claude: 食べ物・道具・特殊アイテムの定義テーブル。組み合わせ判定のキーにもなる。
const ITEM_LIBRARY: readonly ItemDefinition[] = [
  { id: 'banana', emoji: '🍌', kind: 'food', label: 'バナナ', actionText: 'むしゃむしゃバナナを食べた' },
  { id: 'apple', emoji: '🍎', kind: 'food', label: 'リンゴ', actionText: 'シャキッとリンゴをかじった' },
  { id: 'grape', emoji: '🍇', kind: 'food', label: 'ぶどう', actionText: 'ぶどうを一粒ずつ楽しんだ' },
  { id: 'strawberry', emoji: '🍓', kind: 'food', label: 'いちご', actionText: 'いちごの甘さにうっとり' },
  { id: 'corn', emoji: '🌽', kind: 'food', label: 'とうもろこし', actionText: 'とうもろこしをかじりついた' },
  { id: 'cake', emoji: '🍰', kind: 'food', label: 'ケーキ', actionText: 'ケーキにほっぺが落ちた' },
  { id: 'meat', emoji: '🍗', kind: 'food', label: '骨付き肉', actionText: '骨付き肉にかぶりついた' },
  { id: 'icecream', emoji: '🍦', kind: 'food', label: 'アイス', actionText: '冷たいアイスに舌鼓' },
  { id: 'rod', emoji: '🎣', kind: 'tool', label: '釣り竿', actionText: '釣り竿をふりかぶって釣り開始' },
  { id: 'book', emoji: '📚', kind: 'tool', label: '本', actionText: '本をめくって勉強している' },
  { id: 'guitar', emoji: '🎸', kind: 'tool', label: 'ギター', actionText: 'ギターをかき鳴らし始めた' },
  { id: 'crown', emoji: '👑', kind: 'tool', label: '王冠', actionText: '王冠をかぶって王様気分' },
  { id: 'umbrella', emoji: '☂️', kind: 'tool', label: '傘', actionText: '傘をくるくる回している' },
  { id: 'drum', emoji: '🥁', kind: 'tool', label: 'ドラム', actionText: 'ドラムを叩きだしてノリノリ' },
  { id: 'camera', emoji: '📷', kind: 'tool', label: 'カメラ', actionText: 'カメラで仲間をパシャリ' },
  { id: 'palette', emoji: '🎨', kind: 'tool', label: '絵の具', actionText: '絵の具で絵を描き始めた' },
  { id: 'ball', emoji: '⚽', kind: 'tool', label: 'ボール', actionText: 'ボールでドリブルを披露' },
  { id: 'magic', emoji: '🔮', kind: 'special', label: '水晶玉', actionText: '水晶玉をのぞき込んで瞑想' },
  { id: 'fire', emoji: '🔥', kind: 'special', label: 'たき火', actionText: 'たき火に手をかざして暖まる' },
];

// Claude: 同時に近接した 2 アイテムの組み合わせイベント定義（id ペアは昇順比較）。
const COMBO_EVENTS: ReadonlyArray<{ a: string; b: string; text: string }> = [
  { a: 'banana', b: 'banana', text: '🎉 バナナを分け合って大宴会！' },
  { a: 'cake', b: 'icecream', text: '🎉 ケーキとアイスでお誕生日会！' },
  { a: 'guitar', b: 'drum', text: '🎉 ギターとドラムで野外ライブ開幕！' },
  { a: 'book', b: 'magic', text: '🎉 魔導書の研究がはじまった' },
  { a: 'fire', b: 'meat', text: '🎉 たき火で肉を焼いてバーベキュー！' },
  { a: 'crown', b: 'guitar', text: '🎉 王様ギタリスト誕生！' },
  { a: 'rod', b: 'corn', text: '🎉 とうもろこしを餌に大物狙い' },
  { a: 'umbrella', b: 'ball', text: '🎉 傘とボールでサーカス芸！' },
  { a: 'palette', b: 'apple', text: '🎉 リンゴの静物画を描き始めた' },
  { a: 'camera', b: 'crown', text: '🎉 王様の記念写真撮影会！' },
];

// Claude: 複数の猿が同じアイテム付近に集まった時の群がりイベント文面。
const CROWD_EVENT_TEXT = '👀 猿たちがわらわら集まってきた';

type FieldLayout = {
  width: number;
  height: number;
  originX: number;
  originY: number;
  tileWidth: number;
  tileHeight: number;
  monkeyFontPx: number;
  itemFontPx: number;
  titleFontPx: number;
  subtitleFontPx: number;
  logFontPx: number;
};

type MonkeyState = 'idle' | 'walking' | 'seeking' | 'acting';

type Monkey = {
  container: Phaser.GameObjects.Container;
  emoji: Phaser.GameObjects.Text;
  shadow: Phaser.GameObjects.Ellipse;
  bubble: Phaser.GameObjects.Text;
  col: number;
  row: number;
  targetCol: number;
  targetRow: number;
  state: MonkeyState;
  nextDecisionAt: number;
  actionEndsAt: number;
  targetItemId: number | null;
  facing: 1 | -1;
};

type FieldItem = {
  id: number;
  container: Phaser.GameObjects.Container;
  emoji: Phaser.GameObjects.Text;
  shadow: Phaser.GameObjects.Ellipse;
  def: ItemDefinition;
  col: number;
  row: number;
  state: 'falling' | 'resting' | 'inUse' | 'gone';
  spawnedAt: number;
  comboChecked: boolean;
};

type LogEntry = {
  text: Phaser.GameObjects.Text;
  createdAt: number;
};

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts31SummaryScene';

  private layout: FieldLayout | null = null;
  private fieldLayer!: Phaser.GameObjects.Container;
  private entityLayer!: Phaser.GameObjects.Container;
  private hudLayer!: Phaser.GameObjects.Container;
  private logLayer!: Phaser.GameObjects.Container;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private monkeys: Monkey[] = [];
  private items: FieldItem[] = [];
  private logs: LogEntry[] = [];
  private nextItemId = 0;

  public constructor() {
    super(SummaryScene.key);
  }

  /**
   * Claude: シーン生成時にレイヤー・エンティティ・入力を初期化する。
   */
  public create(): void {
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);

    this.fieldLayer = this.add.container(0, 0);
    this.entityLayer = this.add.container(0, 0);
    this.hudLayer = this.add.container(0, 0);
    this.logLayer = this.add.container(0, 0);

    this.titleText = this.add.text(0, 0, TITLE, { fontStyle: 'bold', color: '#fffaf0' }).setOrigin(0.5, 0);
    this.subtitleText = this.add.text(0, 0, SUBTITLE, { color: '#f6d38a' }).setOrigin(0.5, 0);
    this.hintText = this.add.text(0, 0, '画面をタップすると食べ物や道具が降ってきます', { color: '#ffeec2' }).setOrigin(0.5, 1);
    this.hudLayer.add([this.titleText, this.subtitleText, this.hintText]);

    this.bindResponsiveLayout();
    this.spawnInitialMonkeys();

    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      this.handleTap(pointer.x, pointer.y);
    });

    this.pushLog('🐒 猿たちがのんびり暮らし始めた');
  }

  /**
   * Claude: 毎フレーム、猿とアイテムの状態を進める。
   */
  public update(_time: number, delta: number): void {
    if (!this.layout) return;
    const now = this.time.now;

    this.updateItems(now);
    this.updateMonkeys(delta / 1000, now);
    this.detectCrowdEvent(now);
    this.syncEntityPositions();
    this.sortEntitiesByDepth();
    this.updateLogs(now);
  }

  /**
   * Claude: ウィンドウサイズからフィールドとUIの配置情報を計算する。
   */
  protected computeLayout(width: number, height: number): FieldLayout {
    const fieldWidth = width * LAYOUT_TOKENS.field.widthRatio;
    const fieldHeight = height * LAYOUT_TOKENS.field.heightRatio;
    // Claude: アイソメトリック投影に必要なタイル幅はグリッド合計幅で決まる。
    const widthByW = fieldWidth / (GRID_COLS + GRID_ROWS);
    const widthByH = fieldHeight / ((GRID_COLS + GRID_ROWS) * LAYOUT_TOKENS.field.tileHeightToWidth);
    const tileWidth = Math.max(18, Math.min(widthByW, widthByH) * 2);
    const tileHeight = tileWidth * LAYOUT_TOKENS.field.tileHeightToWidth;

    const originX = width / 2;
    const originY = height * LAYOUT_TOKENS.field.centerYRatio - ((GRID_COLS + GRID_ROWS) / 2) * (tileHeight / 2) + tileHeight / 2;

    const shortEdge = Math.min(width, height);
    return {
      width,
      height,
      originX,
      originY,
      tileWidth,
      tileHeight,
      monkeyFontPx: Math.round(tileHeight * 1.4),
      itemFontPx: Math.round(tileHeight * 1.05),
      titleFontPx: Math.round(shortEdge * LAYOUT_TOKENS.hud.titleFontRatio),
      subtitleFontPx: Math.round(shortEdge * LAYOUT_TOKENS.hud.subtitleFontRatio),
      logFontPx: Math.round(shortEdge * LAYOUT_TOKENS.hud.logFontRatio),
    };
  }

  /**
   * Claude: フィールドタイルと HUD を描画しなおす（エンティティは update で位置同期）。
   */
  protected renderLayout(layout: unknown): void {
    this.layout = layout as FieldLayout;
    const l = this.layout;

    this.fieldLayer.removeAll(true);
    this.drawIsoField(l);

    this.titleText.setPosition(l.width / 2, LAYOUT_TOKENS.hud.titlePaddingPx);
    this.titleText.setFontSize(l.titleFontPx);
    this.subtitleText.setPosition(l.width / 2, LAYOUT_TOKENS.hud.titlePaddingPx + l.titleFontPx + 4);
    this.subtitleText.setFontSize(l.subtitleFontPx);
    this.hintText.setPosition(l.width / 2, l.height - 12);
    this.hintText.setFontSize(l.subtitleFontPx);

    this.monkeys.forEach((monkey) => {
      monkey.emoji.setFontSize(l.monkeyFontPx);
      monkey.bubble.setFontSize(Math.round(l.monkeyFontPx * 0.5));
      monkey.shadow.setDisplaySize(l.tileWidth * 0.55, l.tileHeight * 0.55);
    });
    this.items.forEach((item) => {
      item.emoji.setFontSize(l.itemFontPx);
      item.shadow.setDisplaySize(l.tileWidth * 0.5, l.tileHeight * 0.5);
    });
    this.logs.forEach((entry) => entry.text.setFontSize(l.logFontPx));
    this.layoutLogs();
  }

  /**
   * Claude: アイソメトリック菱形タイルを敷き詰め、簡易フレームを描く。
   */
  private drawIsoField(l: FieldLayout): void {
    const g = this.add.graphics();
    const halfW = l.tileWidth / 2;
    const halfH = l.tileHeight / 2;

    for (let row = 0; row < GRID_ROWS; row += 1) {
      for (let col = 0; col < GRID_COLS; col += 1) {
        const { x, y } = this.tileToScreen(col + 0.5, row + 0.5, l);
        const color = TILE_COLORS[(col + row) % 2];
        g.lineStyle(1, TILE_EDGE_COLOR, 0.6);
        g.fillStyle(color, 1);
        g.beginPath();
        g.moveTo(x, y - halfH);
        g.lineTo(x + halfW, y);
        g.lineTo(x, y + halfH);
        g.lineTo(x - halfW, y);
        g.closePath();
        g.fillPath();
        g.strokePath();
      }
    }

    this.fieldLayer.add(g);
  }

  /**
   * Claude: タイル座標(col,row)をスクリーン座標へ変換する。
   */
  private tileToScreen(col: number, row: number, l: FieldLayout): { x: number; y: number } {
    const x = l.originX + (col - row) * (l.tileWidth / 2);
    const y = l.originY + (col + row) * (l.tileHeight / 2);
    return { x, y };
  }

  /**
   * Claude: スクリーン座標からタイル座標を逆算する。
   */
  private screenToTile(sx: number, sy: number, l: FieldLayout): { col: number; row: number } {
    const dx = sx - l.originX;
    const dy = sy - l.originY;
    const col = dx / l.tileWidth + dy / l.tileHeight;
    const row = dy / l.tileHeight - dx / l.tileWidth;
    return { col, row };
  }

  /**
   * Claude: 初期の猿たちを生成し、ランダムなタイルへ配置する。
   */
  private spawnInitialMonkeys(): void {
    for (let i = 0; i < MONKEY_COUNT; i += 1) {
      const col = Phaser.Math.Between(1, GRID_COLS - 2);
      const row = Phaser.Math.Between(1, GRID_ROWS - 2);
      this.monkeys.push(this.createMonkey(col, row));
    }
  }

  /**
   * Claude: 1 匹の猿を作り、影・絵文字・吹き出しをまとめたコンテナを返す。
   */
  private createMonkey(col: number, row: number): Monkey {
    const shadow = this.add.ellipse(0, 6, 20, 10, SHADOW_COLOR, 0.35);
    const emoji = this.add.text(0, 0, '🐒', { fontSize: '48px' }).setOrigin(0.5, 1);
    const bubble = this.add.text(0, -10, '', { fontSize: '18px', color: '#fff7d1', backgroundColor: '#00000099', padding: { x: 6, y: 2 } }).setOrigin(0.5, 1).setVisible(false);
    const container = this.add.container(0, 0, [shadow, emoji, bubble]);
    this.entityLayer.add(container);
    return {
      container,
      emoji,
      shadow,
      bubble,
      col,
      row,
      targetCol: col,
      targetRow: row,
      state: 'idle',
      nextDecisionAt: this.time.now + Phaser.Math.Between(MONKEY_WANDER_MIN_MS, MONKEY_WANDER_MAX_MS),
      actionEndsAt: 0,
      targetItemId: null,
      facing: 1,
    };
  }

  /**
   * Claude: 入力座標から最寄りタイルを算出し、ランダムアイテムを落下させる。
   */
  private handleTap(sx: number, sy: number): void {
    if (!this.layout) return;
    const tile = this.screenToTile(sx, sy, this.layout);
    const col = Phaser.Math.Clamp(Math.floor(tile.col), 0, GRID_COLS - 1);
    const row = Phaser.Math.Clamp(Math.floor(tile.row), 0, GRID_ROWS - 1);
    const def = Phaser.Utils.Array.GetRandom(ITEM_LIBRARY as unknown as ItemDefinition[]);
    this.spawnItem(def, col, row);
  }

  /**
   * Claude: 指定タイルへアイテムを生成し、上空から落下する tween を起動する。
   */
  private spawnItem(def: ItemDefinition, col: number, row: number): void {
    if (!this.layout) return;
    const shadow = this.add.ellipse(0, 4, 18, 9, SHADOW_COLOR, 0.35).setScale(0.2);
    const emoji = this.add.text(0, 0, def.emoji, { fontSize: `${this.layout.itemFontPx}px` }).setOrigin(0.5, 1);
    const container = this.add.container(0, 0, [shadow, emoji]);
    this.entityLayer.add(container);

    const item: FieldItem = {
      id: (this.nextItemId += 1),
      container,
      emoji,
      shadow,
      def,
      col: col + 0.5,
      row: row + 0.5,
      state: 'falling',
      spawnedAt: this.time.now,
      comboChecked: false,
    };
    this.items.push(item);

    // Claude: 絵文字本体を画面上空からタイル中心の地面高さ(y=0)まで落下させる。
    emoji.setY(-this.layout.height);
    this.tweens.add({
      targets: emoji,
      y: 0,
      duration: ITEM_FALL_MS,
      ease: 'Quad.easeIn',
      onComplete: () => {
        if (item.state === 'gone') return;
        item.state = 'resting';
        this.cameras.main.shake(120, 0.002);
        this.pushLog(`⬇ ${def.emoji} ${def.label} が落ちてきた`);
      },
    });
    this.tweens.add({ targets: shadow, scale: 1, duration: ITEM_FALL_MS, ease: 'Quad.easeIn' });
  }

  /**
   * Claude: 猿の状態遷移（徘徊・目標追尾・行動）と位置補間を進める。
   */
  private updateMonkeys(dt: number, now: number): void {
    this.monkeys.forEach((m) => {
      if (m.state === 'acting') {
        if (now >= m.actionEndsAt) {
          this.finishMonkeyAction(m);
        }
        return;
      }

      // Claude: アイドル中は近くのアイテムを探して seeking へ切り替える。
      if (m.state === 'idle' || m.state === 'walking') {
        const nearest = this.findAvailableItem(m);
        if (nearest) {
          m.state = 'seeking';
          m.targetItemId = nearest.id;
          m.targetCol = nearest.col;
          m.targetRow = nearest.row;
        }
      }

      if (m.state === 'idle' && now >= m.nextDecisionAt) {
        m.targetCol = Phaser.Math.Clamp(m.col + Phaser.Math.FloatBetween(-2.2, 2.2), 0.3, GRID_COLS - 0.3);
        m.targetRow = Phaser.Math.Clamp(m.row + Phaser.Math.FloatBetween(-2.2, 2.2), 0.3, GRID_ROWS - 0.3);
        m.state = 'walking';
      }

      if (m.state === 'walking' || m.state === 'seeking') {
        const reached = this.stepToward(m, dt);
        if (reached) {
          if (m.state === 'seeking' && m.targetItemId !== null) {
            const item = this.items.find((it) => it.id === m.targetItemId);
            if (item && item.state === 'resting') {
              this.beginMonkeyAction(m, item, now);
              return;
            }
            m.targetItemId = null;
          }
          m.state = 'idle';
          m.nextDecisionAt = now + Phaser.Math.Between(MONKEY_WANDER_MIN_MS, MONKEY_WANDER_MAX_MS);
        }
      }
    });
  }

  /**
   * Claude: 目標タイルへ dt 秒ぶん進め、到達したら true を返す。
   */
  private stepToward(m: Monkey, dt: number): boolean {
    const dx = m.targetCol - m.col;
    const dy = m.targetRow - m.row;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.05) {
      m.col = m.targetCol;
      m.row = m.targetRow;
      return true;
    }
    const step = MONKEY_SPEED_TILES_PER_SEC * dt;
    const ratio = Math.min(1, step / dist);
    m.col += dx * ratio;
    m.row += dy * ratio;
    // Claude: アイソメの見た目上、col+ または row- が画面右方向。左右の向きを目視用に更新。
    const screenDx = (dx) - (dy);
    if (Math.abs(screenDx) > 0.05) m.facing = screenDx > 0 ? 1 : -1;
    return false;
  }

  /**
   * Claude: 猿とアイテムのペアで行動を開始し、ログと吹き出しを出す。
   */
  private beginMonkeyAction(m: Monkey, item: FieldItem, now: number): void {
    m.state = 'acting';
    m.actionEndsAt = now + MONKEY_ACTION_MS;
    item.state = 'inUse';
    m.bubble.setText(item.def.emoji).setVisible(true);
    this.pushLog(`🐒 ${item.def.actionText}`);

    // Claude: 近くに別アイテムがあれば組み合わせイベントを発火。
    const combo = this.findComboPartner(item);
    if (combo) {
      this.pushLog(combo.text);
      this.cameras.main.flash(220, 255, 230, 120, false);
    }
  }

  /**
   * Claude: 行動終了時にアイテムを消費する（食べ物は消滅、道具は残留）。
   */
  private finishMonkeyAction(m: Monkey): void {
    m.bubble.setVisible(false);
    const item = this.items.find((it) => it.id === m.targetItemId);
    if (item) {
      if (item.def.kind === 'food') {
        this.removeItem(item);
      } else {
        item.state = 'resting';
      }
    }
    m.targetItemId = null;
    m.state = 'idle';
    m.nextDecisionAt = this.time.now + Phaser.Math.Between(MONKEY_WANDER_MIN_MS, MONKEY_WANDER_MAX_MS);
  }

  /**
   * Claude: 他の猿が確保していない最寄りの着地済アイテムを探す。
   */
  private findAvailableItem(m: Monkey): FieldItem | null {
    const claimed = new Set<number>();
    this.monkeys.forEach((other) => {
      if (other !== m && other.targetItemId !== null) claimed.add(other.targetItemId);
    });

    let best: FieldItem | null = null;
    let bestDist = Infinity;
    this.items.forEach((item) => {
      if (item.state !== 'resting') return;
      if (claimed.has(item.id)) return;
      const d = Math.hypot(item.col - m.col, item.row - m.row);
      if (d < bestDist) {
        best = item;
        bestDist = d;
      }
    });
    return best;
  }

  /**
   * Claude: 使用中アイテムから 2 タイル以内にある別種アイテムを探し、コンボ定義と照合する。
   */
  private findComboPartner(item: FieldItem): { text: string } | null {
    const partner = this.items.find((other) => {
      if (other === item) return false;
      if (other.state !== 'resting' && other.state !== 'inUse') return false;
      const d = Math.hypot(other.col - item.col, other.row - item.row);
      return d <= 2.0;
    });
    if (!partner) return null;
    const [a, b] = [item.def.id, partner.def.id].sort();
    const match = COMBO_EVENTS.find((c) => c.a === a && c.b === b);
    return match ? { text: match.text } : null;
  }

  /**
   * Claude: 期限切れアイテムの除去と寿命管理を行う。
   */
  private updateItems(now: number): void {
    this.items = this.items.filter((item) => {
      if (item.state === 'gone') return false;
      if (item.state === 'resting' && now - item.spawnedAt > ITEM_LIFETIME_MS) {
        this.removeItem(item);
        return false;
      }
      return true;
    });
  }

  /**
   * Claude: アイテムを削除し、それを狙っていた猿の参照もクリアする。
   */
  private removeItem(item: FieldItem): void {
    item.state = 'gone';
    item.container.destroy();
    this.monkeys.forEach((m) => {
      if (m.targetItemId === item.id) {
        m.targetItemId = null;
        if (m.state === 'seeking') m.state = 'idle';
      }
    });
  }

  /**
   * Claude: 同一アイテム付近に 3 匹以上集まった場合、群がりイベントを一度だけ通知する。
   */
  private detectCrowdEvent(_now: number): void {
    this.items.forEach((item) => {
      if (item.comboChecked) return;
      if (item.state !== 'resting' && item.state !== 'inUse') return;
      const near = this.monkeys.filter((m) => Math.hypot(m.col - item.col, m.row - item.row) < 1.8).length;
      if (near >= 3) {
        item.comboChecked = true;
        this.pushLog(`${CROWD_EVENT_TEXT}（${item.def.emoji} ${item.def.label}）`);
      }
    });
  }

  /**
   * Claude: 保持しているタイル座標から全エンティティの描画位置を更新する。
   */
  private syncEntityPositions(): void {
    if (!this.layout) return;
    const l = this.layout;
    this.monkeys.forEach((m) => {
      const { x, y } = this.tileToScreen(m.col, m.row, l);
      m.container.setPosition(x, y);
      m.emoji.setScale(m.facing, 1);
    });
    this.items.forEach((item) => {
      const { x, y } = this.tileToScreen(item.col, item.row, l);
      item.container.setPosition(x, y);
    });
  }

  /**
   * Claude: 画面奥行きに従ってエンティティを並び替え、アイソメの重なりを正しくする。
   */
  private sortEntitiesByDepth(): void {
    this.entityLayer.sort('y');
  }

  /**
   * Claude: 行動・イベントログを先頭に追加し、再レイアウトする。
   */
  private pushLog(text: string): void {
    if (!this.layout) return;
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: `${this.layout.logFontPx}px`,
      color: '#fff7d1',
      backgroundColor: '#00000080',
      padding: { x: 8, y: 3 },
    };
    const entry: LogEntry = {
      text: this.add.text(0, 0, text, style).setOrigin(0, 1),
      createdAt: this.time.now,
    };
    this.logLayer.add(entry.text);
    this.logs.unshift(entry);
    while (this.logs.length > LOG_MAX_LINES) {
      const removed = this.logs.pop();
      removed?.text.destroy();
    }
    this.layoutLogs();
  }

  /**
   * Claude: ログ表示を画面左下に積み上げ、位置と不透明度を更新する。
   */
  private layoutLogs(): void {
    if (!this.layout) return;
    const l = this.layout;
    const lineHeight = l.logFontPx * LAYOUT_TOKENS.hud.logLineHeightRatio;
    const baseX = Math.max(16, l.width * 0.04);
    const baseY = l.height - Math.max(32, l.height * LAYOUT_TOKENS.hud.logBottomMarginRatio);
    this.logs.forEach((entry, i) => {
      entry.text.setPosition(baseX, baseY - i * lineHeight);
    });
  }

  /**
   * Claude: 古いログをフェードアウトさせて削除する。
   */
  private updateLogs(now: number): void {
    this.logs = this.logs.filter((entry) => {
      const age = now - entry.createdAt;
      if (age > LOG_LIFETIME_MS) {
        entry.text.destroy();
        return false;
      }
      const remain = LOG_LIFETIME_MS - age;
      entry.text.setAlpha(Math.min(1, remain / 1200));
      return true;
    });
  }
}

new Phaser.Game(createConfig([SummaryScene]));
