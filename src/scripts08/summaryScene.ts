import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BaseResponsiveScene } from '../baseResponsiveScene.ts';
import { BACKGROUND_COLOR, SUBTITLE, TITLE } from './define.ts';

type TileType = 'wall' | 'floor' | 'stairs';
type Direction = 'up' | 'down' | 'left' | 'right';
type GameState = 'playing' | 'gameOver' | 'floorClear';

type Cell = {
  x: number;
  y: number;
};

type Room = {
  x: number;
  y: number;
  width: number;
  height: number;
  center: Cell;
};

type Enemy = Cell & {
  hp: number;
  maxHp: number;
  atk: number;
  exp: number;
};

type ItemType = 'potion' | 'coin';

type Item = Cell & {
  type: ItemType;
  amount: number;
};

type Player = Cell & {
  hp: number;
  maxHp: number;
  atk: number;
  level: number;
  exp: number;
  nextExp: number;
  potions: number;
  coins: number;
};

type DungeonLayout = {
  width: number;
  height: number;
  boardSize: number;
  boardLeft: number;
  boardTop: number;
  cellSize: number;
  panelX: number;
  panelY: number;
  panelWidth: number;
  panelHeight: number;
  controlPad: ControlPadLayout;
};

type ControlPadLayout = {
  size: number;
  centerX: number;
  centerY: number;
  spacing: number;
};

type DungeonData = {
  tiles: TileType[][];
  rooms: Room[];
  start: Cell;
  stairs: Cell;
};

const MAP_SIZE = 31;
const ROOM_TRY_COUNT = 90;
const MIN_ROOM_SIZE = 4;
const MAX_ROOM_SIZE = 8;
const MAX_LOG_LINES = 6;
const BASE_ENEMY_COUNT = 7;
const BASE_ITEM_COUNT = 6;
const MOVE_COOLDOWN_MS = 90;
const TOUCH_SWIPE_THRESHOLD = 26;

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts08SummaryScene';

  private layout: DungeonLayout = {
    width: 1080,
    height: 1080,
    boardSize: 760,
    boardLeft: 80,
    boardTop: 42,
    cellSize: 24,
    panelX: 68,
    panelY: 830,
    panelWidth: 944,
    panelHeight: 210,
    controlPad: {
      size: 68,
      centerX: 900,
      centerY: 960,
      spacing: 12,
    },
  };

  private graphics!: Phaser.GameObjects.Graphics;

  private headerText!: Phaser.GameObjects.Text;

  private statsText!: Phaser.GameObjects.Text;

  private hintText!: Phaser.GameObjects.Text;

  private logText!: Phaser.GameObjects.Text;

  private tiles: TileType[][] = [];

  private enemies: Enemy[] = [];

  private items: Item[] = [];

  private stairs: Cell = { x: 1, y: 1 };

  private player: Player = {
    x: 1,
    y: 1,
    hp: 14,
    maxHp: 14,
    atk: 3,
    level: 1,
    exp: 0,
    nextExp: 12,
    potions: 1,
    coins: 0,
  };

  private floor = 1;

  private gameState: GameState = 'playing';

  private logs: string[] = [];

  private lastMoveAt = 0;

  private touchStart: Phaser.Math.Vector2 | null = null;

  /**
   * Codex: ローグライク用シーンを初期化する。
   */
  public constructor() {
    super(SummaryScene.key);
  }

  /**
   * Codex: UI生成と入力バインドを行い、初期フロアを開始する。
   */
  public create(): void {
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);

    this.graphics = this.add.graphics();
    this.headerText = this.add.text(0, 0, '', {
      fontFamily: 'sans-serif',
      fontSize: '26px',
      color: '#f8fafc',
      fontStyle: 'bold',
      stroke: '#0f172a',
      strokeThickness: 5,
    }).setOrigin(0.5, 0);

    this.statsText = this.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: '21px',
      color: '#e2e8f0',
      lineSpacing: 8,
    }).setOrigin(0, 0);

    this.logText = this.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#cbd5e1',
      lineSpacing: 6,
      wordWrap: { width: 640, useAdvancedWrap: true },
    }).setOrigin(0, 0);

    this.hintText = this.add.text(0, 0, '', {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      color: '#fde68a',
      align: 'right',
    }).setOrigin(1, 0);

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'z') {
        this.usePotion();
        return;
      }

      this.handleKeyboardMove(event.key);
    });

    this.bindTouchInput();
    this.startRun();
    this.bindResponsiveLayout();
  }

  /**
   * Codex: 表示サイズから盤面・情報パネル・操作パッドの配置を算出する。
   */
  protected computeLayout(width: number, height: number): DungeonLayout {
    const boardSize = Math.floor(Math.min(width * 0.9, height * 0.68));
    const cellSize = Math.floor(boardSize / MAP_SIZE);
    const snappedBoardSize = cellSize * MAP_SIZE;
    const boardLeft = Math.floor((width - snappedBoardSize) / 2);
    const boardTop = Math.floor(height * 0.04);

    const panelY = boardTop + snappedBoardSize + Math.floor(height * 0.02);
    const panelHeight = Math.max(190, height - panelY - Math.floor(height * 0.03));
    const panelWidth = Math.floor(width * 0.9);
    const panelX = Math.floor((width - panelWidth) / 2);

    const controlSize = Math.max(40, Math.floor(cellSize * 1.45));
    const controlPadHalf = controlSize * 1.5;

    return {
      width,
      height,
      boardSize: snappedBoardSize,
      boardLeft,
      boardTop,
      cellSize,
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      controlPad: {
        size: controlSize,
        centerX: Math.floor(width - panelX - controlPadHalf),
        centerY: Math.floor(height - Math.max(controlPadHalf, 54)),
        spacing: Math.max(8, Math.floor(controlSize * 0.2)),
      },
    };
  }

  /**
   * Codex: レイアウト更新時に保持値を更新して再描画する。
   */
  protected renderLayout(layout: DungeonLayout): void {
    this.layout = layout;
    this.drawScene();
  }

  /**
   * Codex: ラン開始時にプレイヤー能力を初期化して1階を開始する。
   */
  private startRun(): void {
    this.player = {
      x: 1,
      y: 1,
      hp: 14,
      maxHp: 14,
      atk: 3,
      level: 1,
      exp: 0,
      nextExp: 12,
      potions: 1,
      coins: 0,
    };
    this.floor = 1;
    this.logs = [];
    this.appendLog('冒険開始。地下1階へ。');
    this.startFloor(this.floor);
  }

  /**
   * Codex: フロア用のマップ・敵・アイテムを生成し状態を開始する。
   */
  private startFloor(floor: number): void {
    this.floor = floor;
    this.gameState = 'playing';

    const dungeon = this.generateDungeon();
    this.tiles = dungeon.tiles;
    this.player.x = dungeon.start.x;
    this.player.y = dungeon.start.y;
    this.stairs = dungeon.stairs;

    this.enemies = this.spawnEnemies(dungeon.rooms);
    this.items = this.spawnItems(dungeon.rooms);

    this.appendLog(`地下${this.floor}階を探索開始。`);
    this.drawScene();
  }

  /**
   * Codex: 部屋を複数生成して通路で接続したダンジョン情報を返す。
   */
  private generateDungeon(): DungeonData {
    const tiles: TileType[][] = Array.from({ length: MAP_SIZE }, () => Array.from({ length: MAP_SIZE }, () => 'wall'));
    const rooms: Room[] = [];

    for (let i = 0; i < ROOM_TRY_COUNT; i += 1) {
      const width = Phaser.Math.Between(MIN_ROOM_SIZE, MAX_ROOM_SIZE);
      const height = Phaser.Math.Between(MIN_ROOM_SIZE, MAX_ROOM_SIZE);
      const x = Phaser.Math.Between(1, MAP_SIZE - width - 2);
      const y = Phaser.Math.Between(1, MAP_SIZE - height - 2);

      const candidate: Room = {
        x,
        y,
        width,
        height,
        center: { x: Math.floor(x + width / 2), y: Math.floor(y + height / 2) },
      };

      if (this.isOverlappingRoom(candidate, rooms)) {
        continue;
      }

      this.carveRoom(tiles, candidate);

      if (rooms.length > 0) {
        this.carveCorridor(tiles, rooms[rooms.length - 1].center, candidate.center);
      }

      rooms.push(candidate);
      if (rooms.length >= 12) {
        break;
      }
    }

    if (rooms.length < 2) {
      // Codex: まれな生成失敗時は再帰で再作成し、必ず遊べる盤面にする。
      return this.generateDungeon();
    }

    const start = rooms[0].center;
    const stairs = rooms[rooms.length - 1].center;
    tiles[stairs.y][stairs.x] = 'stairs';

    return { tiles, rooms, start, stairs };
  }

  /**
   * Codex: 候補の部屋が既存部屋と接触・近接しているかを判定する。
   */
  private isOverlappingRoom(candidate: Room, existingRooms: Room[]): boolean {
    return existingRooms.some((room) => (
      candidate.x - 1 < room.x + room.width + 1
      && candidate.x + candidate.width + 1 > room.x - 1
      && candidate.y - 1 < room.y + room.height + 1
      && candidate.y + candidate.height + 1 > room.y - 1
    ));
  }

  /**
   * Codex: 指定した部屋領域を床タイルへ掘る。
   */
  private carveRoom(tiles: TileType[][], room: Room): void {
    for (let y = room.y; y < room.y + room.height; y += 1) {
      for (let x = room.x; x < room.x + room.width; x += 1) {
        tiles[y][x] = 'floor';
      }
    }
  }

  /**
   * Codex: 2点をL字通路で接続して移動可能経路を作る。
   */
  private carveCorridor(tiles: TileType[][], from: Cell, to: Cell): void {
    let x = from.x;
    let y = from.y;

    while (x !== to.x) {
      tiles[y][x] = 'floor';
      x += x < to.x ? 1 : -1;
    }

    while (y !== to.y) {
      tiles[y][x] = 'floor';
      y += y < to.y ? 1 : -1;
    }

    tiles[y][x] = 'floor';
  }

  /**
   * Codex: 部屋中心周辺に敵を配置し、フロアに応じて強化する。
   */
  private spawnEnemies(rooms: Room[]): Enemy[] {
    const enemies: Enemy[] = [];
    const enemyCount = BASE_ENEMY_COUNT + Math.floor(this.floor * 1.5);

    for (let i = 0; i < enemyCount; i += 1) {
      const room = rooms[Phaser.Math.Between(1, rooms.length - 1)];
      const x = Phaser.Math.Between(room.x, room.x + room.width - 1);
      const y = Phaser.Math.Between(room.y, room.y + room.height - 1);

      if (this.isCellBlocked(x, y, enemies)) {
        continue;
      }

      const maxHp = 4 + Math.floor(this.floor * 0.8) + Phaser.Math.Between(0, 2);
      enemies.push({
        x,
        y,
        hp: maxHp,
        maxHp,
        atk: 1 + Math.floor(this.floor * 0.4),
        exp: 3 + Math.floor(this.floor * 0.6),
      });
    }

    return enemies;
  }

  /**
   * Codex: 消耗品とコインを部屋へ散らして探索報酬を作る。
   */
  private spawnItems(rooms: Room[]): Item[] {
    const items: Item[] = [];
    const itemCount = BASE_ITEM_COUNT + Math.floor(this.floor * 0.6);

    for (let i = 0; i < itemCount; i += 1) {
      const room = rooms[Phaser.Math.Between(1, rooms.length - 1)];
      const x = Phaser.Math.Between(room.x, room.x + room.width - 1);
      const y = Phaser.Math.Between(room.y, room.y + room.height - 1);

      if (this.isCellBlocked(x, y, this.enemies) || items.some((item) => item.x === x && item.y === y)) {
        continue;
      }

      const isPotion = Phaser.Math.Between(0, 100) < 32;
      if (isPotion) {
        items.push({ x, y, type: 'potion', amount: 1 });
      } else {
        items.push({ x, y, type: 'coin', amount: Phaser.Math.Between(3, 8) + Math.floor(this.floor * 0.4) });
      }
    }

    return items;
  }

  /**
   * Codex: 共通のセル占有判定を行う。
   */
  private isCellBlocked(x: number, y: number, actors: Cell[]): boolean {
    if (this.player.x === x && this.player.y === y) {
      return true;
    }

    if (this.stairs.x === x && this.stairs.y === y) {
      return true;
    }

    return actors.some((actor) => actor.x === x && actor.y === y);
  }

  /**
   * Codex: キーボード入力を方向へ変換して移動を実行する。
   */
  private handleKeyboardMove(key: string): void {
    const normalized = key.toLowerCase();
    const directionByKey: Record<string, Direction> = {
      arrowup: 'up',
      w: 'up',
      arrowdown: 'down',
      s: 'down',
      arrowleft: 'left',
      a: 'left',
      arrowright: 'right',
      d: 'right',
    };

    const direction = directionByKey[normalized];
    if (!direction) {
      return;
    }

    this.handleDirectionMove(direction);
  }

  /**
   * Codex: スワイプと仮想パッドを有効化し、スマホ操作を提供する。
   */
  private bindTouchInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const buttonDirection = this.getDirectionByControlPad(pointer.x, pointer.y);
      if (buttonDirection) {
        this.handleDirectionMove(buttonDirection);
        this.touchStart = null;
        return;
      }

      this.touchStart = new Phaser.Math.Vector2(pointer.x, pointer.y);
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.touchStart) {
        return;
      }

      const dx = pointer.x - this.touchStart.x;
      const dy = pointer.y - this.touchStart.y;
      this.touchStart = null;

      if (Math.abs(dx) < TOUCH_SWIPE_THRESHOLD && Math.abs(dy) < TOUCH_SWIPE_THRESHOLD) {
        return;
      }

      if (Math.abs(dx) > Math.abs(dy)) {
        this.handleDirectionMove(dx > 0 ? 'right' : 'left');
      } else {
        this.handleDirectionMove(dy > 0 ? 'down' : 'up');
      }
    });
  }

  /**
   * Codex: 仮想パッド上のタッチ位置から方向を返す。
   */
  private getDirectionByControlPad(pointerX: number, pointerY: number): Direction | null {
    const { centerX, centerY, size, spacing } = this.layout.controlPad;

    const controls: Array<{ direction: Direction; x: number; y: number }> = [
      { direction: 'up', x: centerX, y: centerY - (size + spacing) },
      { direction: 'down', x: centerX, y: centerY + (size + spacing) },
      { direction: 'left', x: centerX - (size + spacing), y: centerY },
      { direction: 'right', x: centerX + (size + spacing), y: centerY },
    ];

    return controls.find(({ x, y }) => Phaser.Math.Distance.Between(pointerX, pointerY, x, y) <= size * 0.55)?.direction ?? null;
  }

  /**
   * Codex: 方向入力を移動/戦闘処理へ渡し、ターンを進める。
   */
  private handleDirectionMove(direction: Direction): void {
    if (this.gameState !== 'playing') {
      if (this.gameState === 'gameOver') {
        this.startRun();
      }
      return;
    }

    const now = this.time.now;
    if (now - this.lastMoveAt < MOVE_COOLDOWN_MS) {
      return;
    }
    this.lastMoveAt = now;

    const offsetByDirection: Record<Direction, Cell> = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    };

    const nextX = this.player.x + offsetByDirection[direction].x;
    const nextY = this.player.y + offsetByDirection[direction].y;

    if (!this.isInside(nextX, nextY) || this.tiles[nextY][nextX] === 'wall') {
      this.appendLog('壁に阻まれた。');
      this.drawScene();
      return;
    }

    const enemy = this.enemies.find((candidate) => candidate.x === nextX && candidate.y === nextY);
    if (enemy) {
      this.resolvePlayerAttack(enemy);
      this.afterPlayerTurn();
      return;
    }

    this.player.x = nextX;
    this.player.y = nextY;
    this.collectItemAtPlayer();

    if (this.player.x === this.stairs.x && this.player.y === this.stairs.y) {
      this.gameState = 'floorClear';
      this.appendLog('階段を発見。次のフロアへ。');
      this.drawScene();
      this.time.delayedCall(420, () => {
        this.startFloor(this.floor + 1);
      });
      return;
    }

    this.afterPlayerTurn();
  }

  /**
   * Codex: プレイヤー攻撃の命中・経験値獲得・撃破時処理をまとめる。
   */
  private resolvePlayerAttack(enemy: Enemy): void {
    const damage = this.player.atk + Phaser.Math.Between(0, 2);
    enemy.hp -= damage;
    this.appendLog(`敵へ${damage}ダメージ。`);

    if (enemy.hp > 0) {
      return;
    }

    this.enemies = this.enemies.filter((candidate) => candidate !== enemy);
    this.player.exp += enemy.exp;
    this.appendLog(`敵を倒した。EXP+${enemy.exp}`);
    this.tryLevelUp();
  }

  /**
   * Codex: プレイヤー座標にあるアイテムを拾って効果を適用する。
   */
  private collectItemAtPlayer(): void {
    const found = this.items.find((item) => item.x === this.player.x && item.y === this.player.y);
    if (!found) {
      return;
    }

    this.items = this.items.filter((item) => item !== found);

    if (found.type === 'coin') {
      this.player.coins += found.amount;
      this.appendLog(`コインを${found.amount}枚入手。`);
      return;
    }

    this.player.potions += found.amount;
    this.appendLog('ポーションを拾った。');
  }

  /**
   * Codex: ポーション使用で体力を回復し、在庫を更新する。
   */
  private usePotion(): void {
    if (this.gameState !== 'playing') {
      return;
    }

    if (this.player.potions <= 0) {
      this.appendLog('ポーションがない。');
      this.drawScene();
      return;
    }

    if (this.player.hp >= this.player.maxHp) {
      this.appendLog('体力は満タンだ。');
      this.drawScene();
      return;
    }

    this.player.potions -= 1;
    const healed = Math.min(this.player.maxHp - this.player.hp, 7 + this.player.level);
    this.player.hp += healed;
    this.appendLog(`ポーション使用。HP+${healed}`);
    this.afterPlayerTurn();
  }

  /**
   * Codex: 必要経験値を満たした場合にレベルアップ処理を実行する。
   */
  private tryLevelUp(): void {
    while (this.player.exp >= this.player.nextExp) {
      this.player.exp -= this.player.nextExp;
      this.player.level += 1;
      this.player.maxHp += 3;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 4);
      this.player.atk += 1;
      this.player.nextExp = Math.floor(this.player.nextExp * 1.35);
      this.appendLog(`Lv${this.player.level}に上昇。能力アップ。`);
    }
  }

  /**
   * Codex: プレイヤー行動後に敵ターンを処理し、ゲームオーバー判定する。
   */
  private afterPlayerTurn(): void {
    this.runEnemyTurn();
    if (this.player.hp <= 0) {
      this.gameState = 'gameOver';
      this.appendLog('力尽きた……。方向キーで再挑戦。');
    }
    this.drawScene();
  }

  /**
   * Codex: 敵を1歩移動させ、隣接時はプレイヤーへ攻撃する。
   */
  private runEnemyTurn(): void {
    for (const enemy of this.enemies) {
      const manhattan = Math.abs(enemy.x - this.player.x) + Math.abs(enemy.y - this.player.y);
      if (manhattan === 1) {
        const damage = enemy.atk + Phaser.Math.Between(0, 1);
        this.player.hp -= damage;
        this.appendLog(`敵の攻撃。HP-${damage}`);
        continue;
      }

      if (manhattan > 9) {
        continue;
      }

      const next = this.pickEnemyStep(enemy);
      if (!next) {
        continue;
      }

      enemy.x = next.x;
      enemy.y = next.y;
    }
  }

  /**
   * Codex: 敵の候補移動先を評価し、最もプレイヤーへ近い座標を返す。
   */
  private pickEnemyStep(enemy: Enemy): Cell | null {
    const candidates: Cell[] = [
      { x: enemy.x + 1, y: enemy.y },
      { x: enemy.x - 1, y: enemy.y },
      { x: enemy.x, y: enemy.y + 1 },
      { x: enemy.x, y: enemy.y - 1 },
    ];

    const valid = candidates
      .filter(({ x, y }) => this.isInside(x, y) && this.tiles[y][x] !== 'wall')
      .filter(({ x, y }) => !(x === this.stairs.x && y === this.stairs.y))
      .filter(({ x, y }) => !(x === this.player.x && y === this.player.y))
      .filter(({ x, y }) => !this.enemies.some((other) => other !== enemy && other.x === x && other.y === y));

    if (valid.length === 0) {
      return null;
    }

    valid.sort((a, b) => {
      const distA = Math.abs(a.x - this.player.x) + Math.abs(a.y - this.player.y);
      const distB = Math.abs(b.x - this.player.x) + Math.abs(b.y - this.player.y);
      return distA - distB;
    });

    return valid[0];
  }

  /**
   * Codex: 指定座標がマップ範囲内かを判定する。
   */
  private isInside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < MAP_SIZE && y < MAP_SIZE;
  }

  /**
   * Codex: ログを末尾追加し、上限件数を超えた古い行を削除する。
   */
  private appendLog(message: string): void {
    this.logs.push(message);
    if (this.logs.length > MAX_LOG_LINES) {
      this.logs.shift();
    }
  }

  /**
   * Codex: 盤面・UI・仮想パッドを一括で再描画する。
   */
  private drawScene(): void {
    this.graphics.clear();

    const { boardLeft, boardTop, cellSize, panelX, panelY, panelWidth, panelHeight } = this.layout;

    this.graphics.fillStyle(0x020617, 0.92);
    this.graphics.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 16);
    this.graphics.lineStyle(2, 0x334155, 0.95);
    this.graphics.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 16);

    this.drawDungeonTiles(boardLeft, boardTop, cellSize);
    this.drawItems(boardLeft, boardTop, cellSize);
    this.drawEnemies(boardLeft, boardTop, cellSize);
    this.drawPlayer(boardLeft, boardTop, cellSize);
    this.drawControlPad();

    this.updateTexts();
  }

  /**
   * Codex: タイル種別に応じた色で盤面を描画する。
   */
  private drawDungeonTiles(boardLeft: number, boardTop: number, cellSize: number): void {
    const viewRadius = 6;

    for (let y = 0; y < MAP_SIZE; y += 1) {
      for (let x = 0; x < MAP_SIZE; x += 1) {
        const dx = Math.abs(x - this.player.x);
        const dy = Math.abs(y - this.player.y);
        const isVisible = dx + dy <= viewRadius;

        if (!isVisible) {
          this.graphics.fillStyle(0x020617, 0.98);
          this.graphics.fillRect(boardLeft + x * cellSize, boardTop + y * cellSize, cellSize, cellSize);
          continue;
        }

        const tile = this.tiles[y][x];
        const color = tile === 'wall' ? 0x111827 : tile === 'stairs' ? 0x334155 : 0x1f2937;
        this.graphics.fillStyle(color, 1);
        this.graphics.fillRect(boardLeft + x * cellSize, boardTop + y * cellSize, cellSize, cellSize);

        if (tile === 'stairs') {
          this.graphics.fillStyle(0xf8fafc, 0.95);
          this.graphics.fillCircle(
            boardLeft + x * cellSize + cellSize * 0.5,
            boardTop + y * cellSize + cellSize * 0.5,
            cellSize * 0.16,
          );
        }
      }
    }
  }

  /**
   * Codex: アイテムを種類ごとの見た目で描画する。
   */
  private drawItems(boardLeft: number, boardTop: number, cellSize: number): void {
    this.items.forEach((item) => {
      const x = boardLeft + item.x * cellSize + cellSize * 0.5;
      const y = boardTop + item.y * cellSize + cellSize * 0.5;

      if (item.type === 'coin') {
        this.graphics.fillStyle(0xf59e0b, 0.96);
        this.graphics.fillCircle(x, y, cellSize * 0.2);
        return;
      }

      this.graphics.fillStyle(0x22d3ee, 0.94);
      this.graphics.fillRoundedRect(x - cellSize * 0.18, y - cellSize * 0.2, cellSize * 0.36, cellSize * 0.4, 4);
    });
  }

  /**
   * Codex: 敵ユニットを体力割合に応じた色で描画する。
   */
  private drawEnemies(boardLeft: number, boardTop: number, cellSize: number): void {
    this.enemies.forEach((enemy) => {
      const hpRatio = enemy.hp / enemy.maxHp;
      const color = hpRatio > 0.6 ? 0xef4444 : hpRatio > 0.3 ? 0xf97316 : 0x991b1b;
      this.graphics.fillStyle(color, 0.95);
      this.graphics.fillRect(
        boardLeft + enemy.x * cellSize + cellSize * 0.2,
        boardTop + enemy.y * cellSize + cellSize * 0.2,
        cellSize * 0.6,
        cellSize * 0.6,
      );
    });
  }

  /**
   * Codex: プレイヤーを視認性の高い円で描画する。
   */
  private drawPlayer(boardLeft: number, boardTop: number, cellSize: number): void {
    this.graphics.fillStyle(0x38bdf8, 1);
    this.graphics.fillCircle(
      boardLeft + this.player.x * cellSize + cellSize * 0.5,
      boardTop + this.player.y * cellSize + cellSize * 0.5,
      cellSize * 0.28,
    );
    this.graphics.lineStyle(2, 0xe0f2fe, 0.95);
    this.graphics.strokeCircle(
      boardLeft + this.player.x * cellSize + cellSize * 0.5,
      boardTop + this.player.y * cellSize + cellSize * 0.5,
      cellSize * 0.28,
    );
  }

  /**
   * Codex: 仮想方向パッドを描画してタッチ操作を案内する。
   */
  private drawControlPad(): void {
    const { centerX, centerY, size, spacing } = this.layout.controlPad;

    this.graphics.lineStyle(2, 0x64748b, 0.75);
    this.graphics.fillStyle(0x0f172a, 0.88);

    // Codex: 再描画頻度が高いため、ラベル文字は使わず図形で方向を示す。
    const drawButton = (x: number, y: number, triangle: [number, number, number, number, number, number]): void => {
      this.graphics.fillRoundedRect(x - size * 0.5, y - size * 0.5, size, size, 10);
      this.graphics.strokeRoundedRect(x - size * 0.5, y - size * 0.5, size, size, 10);
      this.graphics.fillStyle(0xe2e8f0, 0.92);
      this.graphics.fillTriangle(
        x + triangle[0] * size,
        y + triangle[1] * size,
        x + triangle[2] * size,
        y + triangle[3] * size,
        x + triangle[4] * size,
        y + triangle[5] * size,
      );
      this.graphics.fillStyle(0x0f172a, 0.88);
    };

    drawButton(centerX, centerY - (size + spacing), [0, -0.24, -0.2, 0.16, 0.2, 0.16]);
    drawButton(centerX, centerY + (size + spacing), [0, 0.24, -0.2, -0.16, 0.2, -0.16]);
    drawButton(centerX - (size + spacing), centerY, [-0.24, 0, 0.16, -0.2, 0.16, 0.2]);
    drawButton(centerX + (size + spacing), centerY, [0.24, 0, -0.16, -0.2, -0.16, 0.2]);
  }

  /**
   * Codex: ヘッダー・ステータス・ログなどのUIテキストを更新する。
   */
  private updateTexts(): void {
    const { panelX, panelY, panelWidth } = this.layout;

    this.headerText
      .setPosition(this.layout.width * 0.5, Math.floor(this.layout.boardTop * 0.24))
      .setText(`${TITLE} - ${SUBTITLE} / 地下${this.floor}階`);

    this.statsText
      .setPosition(panelX + 22, panelY + 16)
      .setText([
        `HP ${this.player.hp}/${this.player.maxHp}    ATK ${this.player.atk}`,
        `LV ${this.player.level}    EXP ${this.player.exp}/${this.player.nextExp}`,
        `POTION ${this.player.potions}    COIN ${this.player.coins}`,
      ].join('\n'));

    this.logText
      .setPosition(panelX + Math.floor(panelWidth * 0.42), panelY + 16)
      .setWordWrapWidth(Math.floor(panelWidth * 0.54), true)
      .setText(this.logs.map((log) => `・${log}`).join('\n'));

    this.hintText
      .setPosition(panelX + panelWidth - 18, panelY + this.layout.panelHeight - 72)
      .setText(this.gameState === 'gameOver'
        ? 'ゲームオーバー\n方向入力で再開'
        : '移動: 矢印/WASD/スワイプ\nポーション: Z\n階段で次の階へ');
  }
}

new Phaser.Game(createConfig([SummaryScene]));
