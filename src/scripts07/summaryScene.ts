import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BaseResponsiveScene } from '../baseResponsiveScene.ts';
import { BACKGROUND_COLOR, SUBTITLE, TITLE } from './define.ts';

type DungeonLayout = {
  width: number;
  height: number;
  boardSize: number;
  cellSize: number;
  boardLeft: number;
  boardTop: number;
  panelTop: number;
  controlPad: ControlPadLayout;
};

type ControlPadLayout = {
  size: number;
  centerX: number;
  centerY: number;
  spacing: number;
};

type Cell = {
  x: number;
  y: number;
};

type Enemy = Cell & {
  hp: number;
};

type GameState = 'explore' | 'clear';

const GRID_SIZE = 9;
const PLAYER_MAX_HP = 10;
const MOVE_COOLDOWN_MS = 130;
const ENEMY_COUNT = 5;

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts07SummaryScene';

  private layout: DungeonLayout = {
    width: 1080,
    height: 1080,
    boardSize: 720,
    cellSize: 80,
    boardLeft: 180,
    boardTop: 190,
    panelTop: 56,
    controlPad: {
      size: 92,
      centerX: 150,
      centerY: 940,
      spacing: 22,
    },
  };

  private player: Cell = { x: 0, y: 0 };

  private stairs: Cell = { x: GRID_SIZE - 1, y: GRID_SIZE - 1 };

  private enemies: Enemy[] = [];

  private floor = 1;

  private score = 0;

  private hp = PLAYER_MAX_HP;

  private turnCount = 0;

  private lastMoveAt = 0;

  private gameState: GameState = 'explore';

  private graphics!: Phaser.GameObjects.Graphics;

  private headerText!: Phaser.GameObjects.Text;

  private hintText!: Phaser.GameObjects.Text;

  private touchStart: Phaser.Math.Vector2 | null = null;

  /**
   * Codex: ローグライク試作シーンを初期化する。
   */
  public constructor() {
    super(SummaryScene.key);
  }

  /**
   * Codex: 描画オブジェクトを生成し、入力と初期フロアを設定する。
   */
  public create(): void {
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);

    this.graphics = this.add.graphics();
    this.headerText = this.add.text(0, 0, '', {
      fontFamily: 'sans-serif',
      fontSize: '28px',
      color: '#f8fafc',
      stroke: '#0f172a',
      strokeThickness: 5,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    this.hintText = this.add.text(0, 0, '', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#e2e8f0',
      stroke: '#0f172a',
      strokeThickness: 4,
      align: 'center',
    }).setOrigin(0.5, 0);

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      this.handleKeyboardMove(event.key);
    });

    this.bindTouchInput();

    this.startFloor(1);
    this.bindResponsiveLayout();
  }

  /**
   * Codex: 画面サイズからダンジョン盤面とUIの配置を計算する。
   */
  protected computeLayout(width: number, height: number): DungeonLayout {
    const boardSize = Math.min(width * 0.88, height * 0.74);
    const cellSize = Math.floor(boardSize / GRID_SIZE);
    const snappedBoardSize = cellSize * GRID_SIZE;

    const panelTop = Math.floor(height * 0.05);
    const boardTop = Math.floor(height * 0.2);
    const controlSize = Math.max(52, Math.floor(cellSize * 0.66));
    const rawControlCenterY = Math.floor(boardTop + snappedBoardSize + controlSize * 1.4);

    return {
      width,
      height,
      boardSize: snappedBoardSize,
      cellSize,
      boardLeft: Math.floor((width - snappedBoardSize) / 2),
      boardTop,
      panelTop,
      controlPad: {
        size: controlSize,
        centerX: Math.floor(width * 0.5),
        centerY: Math.min(height - Math.floor(controlSize * 1.95), rawControlCenterY),
        spacing: Math.max(10, Math.floor(controlSize * 0.22)),
      },
    };
  }

  /**
   * Codex: リサイズ時にレイアウトを保持して盤面全体を再描画する。
   */
  protected renderLayout(layout: DungeonLayout): void {
    this.layout = layout;
    this.drawScene();
  }

  /**
   * Codex: 指定フロア向けにプレイヤー・敵・階段の位置を再生成する。
   */
  private startFloor(nextFloor: number): void {
    this.floor = nextFloor;
    this.gameState = 'explore';
    this.player = { x: 0, y: 0 };
    this.stairs = this.pickRandomEmptyCell([this.player]);

    const enemySlots = Math.min(GRID_SIZE, ENEMY_COUNT + Math.floor((this.floor - 1) / 2));
    this.enemies = [];

    for (let i = 0; i < enemySlots; i += 1) {
      const cell = this.pickRandomEmptyCell([this.player, this.stairs, ...this.enemies]);
      this.enemies.push({ ...cell, hp: 1 + Math.floor((this.floor - 1) / 3) });
    }

    this.drawScene();
  }

  /**
   * Codex: 既存配置と重ならないランダムなセル座標を返す。
   */
  private pickRandomEmptyCell(occupiedCells: Cell[]): Cell {
    const occupied = new Set(occupiedCells.map((cell) => `${cell.x}:${cell.y}`));

    while (true) {
      const candidate = {
        x: Phaser.Math.Between(0, GRID_SIZE - 1),
        y: Phaser.Math.Between(0, GRID_SIZE - 1),
      };

      if (!occupied.has(`${candidate.x}:${candidate.y}`)) {
        return candidate;
      }
    }
  }


  /**
   * Codex: スワイプとタップの入力を受け取り、スマートフォン操作を有効化する。
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

      const deltaX = pointer.x - this.touchStart.x;
      const deltaY = pointer.y - this.touchStart.y;
      this.touchStart = null;

      const threshold = Math.max(18, Math.floor(this.layout.cellSize * 0.2));
      if (Math.abs(deltaX) < threshold && Math.abs(deltaY) < threshold) {
        return;
      }

      if (Math.abs(deltaX) >= Math.abs(deltaY)) {
        this.handleDirectionMove({ x: deltaX > 0 ? 1 : -1, y: 0 });
      } else {
        this.handleDirectionMove({ x: 0, y: deltaY > 0 ? 1 : -1 });
      }
    });
  }

  /**
   * Codex: 押下キーから移動量を計算して1ターン進行する。
   */
  private handleKeyboardMove(key: string): void {
    const direction = this.getDirectionByKey(key);
    if (!direction) {
      return;
    }

    this.handleDirectionMove(direction);
  }

  /**
   * Codex: 方向ベクトルを使って移動・攻撃・敵ターンを1回進行する。
   */
  private handleDirectionMove(direction: Cell): void {
    const now = this.time.now;

    if (now - this.lastMoveAt < MOVE_COOLDOWN_MS || this.gameState !== 'explore') {
      return;
    }

    this.lastMoveAt = now;

    const targetX = Phaser.Math.Clamp(this.player.x + direction.x, 0, GRID_SIZE - 1);
    const targetY = Phaser.Math.Clamp(this.player.y + direction.y, 0, GRID_SIZE - 1);

    if (targetX === this.player.x && targetY === this.player.y) {
      return;
    }

    const enemy = this.enemies.find((item) => item.x === targetX && item.y === targetY);
    if (enemy) {
      this.attackEnemy(enemy);
    } else {
      this.player = { x: targetX, y: targetY };
    }

    this.turnCount += 1;
    this.moveEnemies();
    this.checkGoal();
    this.drawScene();
  }

  /**
   * Codex: キー入力を上下左右ベクトルへ変換する。
   */
  private getDirectionByKey(key: string): Cell | null {
    const normalized = key.toLowerCase();

    if (normalized === 'arrowup' || normalized === 'w') {
      return { x: 0, y: -1 };
    }
    if (normalized === 'arrowdown' || normalized === 's') {
      return { x: 0, y: 1 };
    }
    if (normalized === 'arrowleft' || normalized === 'a') {
      return { x: -1, y: 0 };
    }
    if (normalized === 'arrowright' || normalized === 'd') {
      return { x: 1, y: 0 };
    }

    return null;
  }

  /**
   * Codex: プレイヤー攻撃を処理し、敵撃破時にスコア加算する。
   */
  private attackEnemy(enemy: Enemy): void {
    enemy.hp -= 1;

    if (enemy.hp <= 0) {
      this.score += 40 + this.floor * 10;
      this.enemies = this.enemies.filter((item) => item !== enemy);
      return;
    }

    this.score += 10;
  }

  /**
   * Codex: 各敵をプレイヤーへ1マス近づけつつ接触ダメージを処理する。
   */
  private moveEnemies(): void {
    for (const enemy of this.enemies) {
      const stepX = this.computeStep(enemy.x, this.player.x);
      const stepY = this.computeStep(enemy.y, this.player.y);
      const firstAxisX = Math.abs(this.player.x - enemy.x) >= Math.abs(this.player.y - enemy.y);

      const nextCandidates: Cell[] = firstAxisX
        ? [{ x: enemy.x + stepX, y: enemy.y }, { x: enemy.x, y: enemy.y + stepY }]
        : [{ x: enemy.x, y: enemy.y + stepY }, { x: enemy.x + stepX, y: enemy.y }];

      for (const candidate of nextCandidates) {
        if (!this.isInsideBoard(candidate)) {
          continue;
        }

        const isBlocked = this.enemies.some((other) => other !== enemy && other.x === candidate.x && other.y === candidate.y);
        if (isBlocked) {
          continue;
        }

        if (candidate.x === this.player.x && candidate.y === this.player.y) {
          this.hp = Math.max(0, this.hp - 1);
          this.score = Math.max(0, this.score - 15);
          break;
        }

        enemy.x = candidate.x;
        enemy.y = candidate.y;
        break;
      }
    }

    if (this.hp <= 0) {
      this.restartRun();
    }
  }

  /**
   * Codex: プレイヤーが階段到達済みなら次フロアへ進める。
   */
  private checkGoal(): void {
    if (this.player.x !== this.stairs.x || this.player.y !== this.stairs.y) {
      return;
    }

    this.score += 120 + this.floor * 20;
    this.gameState = 'clear';

    this.time.delayedCall(220, () => {
      this.startFloor(this.floor + 1);
    });
  }

  /**
   * Codex: 全滅時に状態を初期化して1Fから再開する。
   */
  private restartRun(): void {
    this.hp = PLAYER_MAX_HP;
    this.score = 0;
    this.turnCount = 0;
    this.startFloor(1);
  }

  /**
   * Codex: 2点の大小関係から移動ステップ値を返す。
   */
  private computeStep(from: number, to: number): number {
    if (from === to) {
      return 0;
    }
    return from < to ? 1 : -1;
  }

  /**
   * Codex: 座標が盤面内にあるかを判定する。
   */
  private isInsideBoard(cell: Cell): boolean {
    return cell.x >= 0 && cell.x < GRID_SIZE && cell.y >= 0 && cell.y < GRID_SIZE;
  }

  /**
   * Codex: 背景・ユニット・UIテキストをまとめて描画する。
   */
  private drawScene(): void {
    const graphics = this.graphics;
    graphics.clear();

    this.drawBoardBackground(graphics);
    this.drawBoardFrame(graphics);
    this.drawStairs(graphics);
    this.drawEnemies(graphics);
    this.drawPlayer(graphics);
    this.drawControlPad(graphics);
    this.drawUi();
  }

  /**
   * Codex: 盤面全体の背景色を塗る。
   */
  private drawBoardBackground(graphics: Phaser.GameObjects.Graphics): void {
    graphics.fillStyle(0x0f172a, 1);
    graphics.fillRect(0, 0, this.layout.width, this.layout.height);

    graphics.fillStyle(0x111827, 1);
    graphics.fillRect(this.layout.boardLeft, this.layout.boardTop, this.layout.boardSize, this.layout.boardSize);
  }

  /**
   * Codex: マス目グリッドと外枠を描画する。
   */
  private drawBoardFrame(graphics: Phaser.GameObjects.Graphics): void {
    graphics.lineStyle(1, 0x334155, 0.8);
    for (let i = 0; i <= GRID_SIZE; i += 1) {
      const linePos = this.layout.boardLeft + i * this.layout.cellSize;
      graphics.beginPath();
      graphics.moveTo(linePos, this.layout.boardTop);
      graphics.lineTo(linePos, this.layout.boardTop + this.layout.boardSize);
      graphics.strokePath();

      graphics.beginPath();
      graphics.moveTo(this.layout.boardLeft, linePos);
      graphics.lineTo(this.layout.boardLeft + this.layout.boardSize, linePos);
      graphics.strokePath();
    }

    graphics.lineStyle(3, 0x64748b, 0.95);
    graphics.strokeRect(this.layout.boardLeft, this.layout.boardTop, this.layout.boardSize, this.layout.boardSize);
  }

  /**
   * Codex: 階段セルをハイライト表示する。
   */
  private drawStairs(graphics: Phaser.GameObjects.Graphics): void {
    const stairRect = this.toCellRect(this.stairs);

    graphics.fillStyle(0x38bdf8, 0.9);
    graphics.fillRoundedRect(stairRect.x, stairRect.y, stairRect.size, stairRect.size, 10);

    graphics.lineStyle(3, 0xe0f2fe, 0.9);
    graphics.beginPath();
    graphics.moveTo(stairRect.x + stairRect.size * 0.24, stairRect.y + stairRect.size * 0.32);
    graphics.lineTo(stairRect.x + stairRect.size * 0.75, stairRect.y + stairRect.size * 0.32);
    graphics.moveTo(stairRect.x + stairRect.size * 0.24, stairRect.y + stairRect.size * 0.55);
    graphics.lineTo(stairRect.x + stairRect.size * 0.75, stairRect.y + stairRect.size * 0.55);
    graphics.moveTo(stairRect.x + stairRect.size * 0.24, stairRect.y + stairRect.size * 0.78);
    graphics.lineTo(stairRect.x + stairRect.size * 0.75, stairRect.y + stairRect.size * 0.78);
    graphics.strokePath();
  }

  /**
   * Codex: 敵コマを赤色円で描画する。
   */
  private drawEnemies(graphics: Phaser.GameObjects.Graphics): void {
    for (const enemy of this.enemies) {
      const center = this.toCellCenter(enemy);
      const radius = Math.floor(this.layout.cellSize * 0.28);

      graphics.fillStyle(0xef4444, 1);
      graphics.fillCircle(center.x, center.y, radius);

      graphics.fillStyle(0xfef2f2, 1);
      graphics.fillCircle(center.x - radius * 0.3, center.y - radius * 0.12, Math.max(2, radius * 0.16));
      graphics.fillCircle(center.x + radius * 0.3, center.y - radius * 0.12, Math.max(2, radius * 0.16));
    }
  }

  /**
   * Codex: プレイヤーを緑色円で描画する。
   */
  private drawPlayer(graphics: Phaser.GameObjects.Graphics): void {
    const center = this.toCellCenter(this.player);
    const radius = Math.floor(this.layout.cellSize * 0.3);

    graphics.fillStyle(0x22c55e, 1);
    graphics.fillCircle(center.x, center.y, radius);

    graphics.fillStyle(0xf0fdf4, 1);
    graphics.fillCircle(center.x, center.y - radius * 0.15, Math.max(2, radius * 0.18));
  }


  /**
   * Codex: スマートフォン向けの方向パッドを描画する。
   */
  private drawControlPad(graphics: Phaser.GameObjects.Graphics): void {
    const buttons = this.getControlButtons();

    for (const button of buttons) {
      graphics.fillStyle(0x1e293b, 0.78);
      graphics.fillRoundedRect(button.x, button.y, button.size, button.size, Math.floor(button.size * 0.24));

      graphics.lineStyle(2, 0x94a3b8, 0.9);
      graphics.strokeRoundedRect(button.x, button.y, button.size, button.size, Math.floor(button.size * 0.24));

      graphics.fillStyle(0xf8fafc, 0.95);
      this.drawArrowGlyph(graphics, button);
    }
  }

  /**
   * Codex: 方向パッドの矢印記号を描画する。
   */
  private drawArrowGlyph(
    graphics: Phaser.GameObjects.Graphics,
    button: { x: number; y: number; size: number; direction: Cell },
  ): void {
    const centerX = button.x + button.size / 2;
    const centerY = button.y + button.size / 2;
    const body = button.size * 0.2;
    const tip = button.size * 0.28;

    if (button.direction.y === -1) {
      graphics.fillTriangle(centerX, centerY - tip, centerX - tip * 0.8, centerY, centerX + tip * 0.8, centerY);
      graphics.fillRect(centerX - body / 2, centerY - body * 0.1, body, tip * 0.8);
      return;
    }
    if (button.direction.y === 1) {
      graphics.fillTriangle(centerX, centerY + tip, centerX - tip * 0.8, centerY, centerX + tip * 0.8, centerY);
      graphics.fillRect(centerX - body / 2, centerY - tip * 0.7, body, tip * 0.8);
      return;
    }
    if (button.direction.x === -1) {
      graphics.fillTriangle(centerX - tip, centerY, centerX, centerY - tip * 0.8, centerX, centerY + tip * 0.8);
      graphics.fillRect(centerX - body * 0.1, centerY - body / 2, tip * 0.8, body);
      return;
    }

    graphics.fillTriangle(centerX + tip, centerY, centerX, centerY - tip * 0.8, centerX, centerY + tip * 0.8);
    graphics.fillRect(centerX - tip * 0.7, centerY - body / 2, tip * 0.8, body);
  }

  /**
   * Codex: ステータス表示と操作説明を更新する。
   */
  private drawUi(): void {
    this.headerText.setPosition(this.layout.width / 2, this.layout.panelTop);
    this.headerText.setText(`${TITLE} ${SUBTITLE} | FLOOR ${this.floor} | HP ${this.hp} | SCORE ${this.score}`);

    const hintY = this.layout.controlPad.centerY + this.layout.controlPad.size * 1.15;
    this.hintText.setPosition(this.layout.width / 2, hintY);
    this.hintText.setText(`矢印キー / WASD / スワイプ / 画面下ボタンで移動・攻撃\n赤い敵を避けながら青い階段へ。TURN ${this.turnCount}`);
  }

  /**
   * Codex: 方向パッドの各ボタン矩形を返す。
   */
  private getControlButtons(): Array<{ x: number; y: number; size: number; direction: Cell }> {
    const { centerX, centerY, size, spacing } = this.layout.controlPad;
    const gap = size + spacing;

    return [
      { x: centerX - size / 2, y: centerY - gap - size / 2, size, direction: { x: 0, y: -1 } },
      { x: centerX - gap - size / 2, y: centerY - size / 2, size, direction: { x: -1, y: 0 } },
      { x: centerX + gap - size / 2, y: centerY - size / 2, size, direction: { x: 1, y: 0 } },
      { x: centerX - size / 2, y: centerY + gap - size / 2, size, direction: { x: 0, y: 1 } },
    ];
  }

  /**
   * Codex: タップ座標が方向パッド上なら該当方向を返す。
   */
  private getDirectionByControlPad(x: number, y: number): Cell | null {
    const hitButton = this.getControlButtons().find((button) => x >= button.x && x <= button.x + button.size
      && y >= button.y && y <= button.y + button.size);

    return hitButton ? { ...hitButton.direction } : null;
  }

  /**
   * Codex: セル座標から中心座標を求める。
   */
  private toCellCenter(cell: Cell): { x: number; y: number } {
    return {
      x: this.layout.boardLeft + cell.x * this.layout.cellSize + this.layout.cellSize / 2,
      y: this.layout.boardTop + cell.y * this.layout.cellSize + this.layout.cellSize / 2,
    };
  }

  /**
   * Codex: セル座標から描画用矩形情報を返す。
   */
  private toCellRect(cell: Cell): { x: number; y: number; size: number } {
    return {
      x: this.layout.boardLeft + cell.x * this.layout.cellSize + 4,
      y: this.layout.boardTop + cell.y * this.layout.cellSize + 4,
      size: this.layout.cellSize - 8,
    };
  }
}

new Phaser.Game(createConfig([SummaryScene]));
