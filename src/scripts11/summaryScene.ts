import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BaseResponsiveScene } from '../baseResponsiveScene.ts';
import { BACKGROUND_COLOR, SUBTITLE, TITLE } from './define.ts';

type GhostResident = {
  sprite: Phaser.GameObjects.Text;
  roomIndex: number;
  mood: 'calm' | 'happy' | 'sleepy';
  phase: number;
  driftSpeed: number;
};

type WindowCell = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type SceneLayout = {
  width: number;
  height: number;
  titleY: number;
  subtitleY: number;
  statusY: number;
  buildingX: number;
  buildingY: number;
  buildingWidth: number;
  buildingHeight: number;
};

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts11SummaryScene';

  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private buildingFrame!: Phaser.GameObjects.Rectangle;
  private windows: WindowCell[] = [];
  private windowGraphics!: Phaser.GameObjects.Graphics;
  private residents: GhostResident[] = [];

  private elapsedSeconds = 0;
  private moodPoints = 0;

  /**
   * GPT-5.3-Codex: 幽霊アパート観察ゲームのシーンを初期化する。
   */
  public constructor() {
    super(SummaryScene.key);
  }

  /**
   * GPT-5.3-Codex: UI・建物・初期住人を作成して観察ゲームを開始する。
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

    this.buildingFrame = this.add.rectangle(0, 0, 100, 100, 0x0f172a, 0.9)
      .setStrokeStyle(4, 0x64748b, 0.95)
      .setOrigin(0, 0);
    this.windowGraphics = this.add.graphics();

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.tryAssignGhost(pointer.x, pointer.y);
    });

    this.bindResponsiveLayout();
    this.spawnInitialResidents(7);
  }

  /**
   * GPT-5.3-Codex: 日照・住人アニメーション・気分ポイントの進行を更新する。
   */
  public update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.05);
    this.elapsedSeconds += dt;

    const dayRatio = (Math.sin(this.elapsedSeconds * 0.12) + 1) * 0.5;
    const tint = Phaser.Display.Color.Interpolate.ColorWithColor(
      new Phaser.Display.Color(10, 15, 30),
      new Phaser.Display.Color(40, 62, 90),
      100,
      Math.floor(dayRatio * 100),
    );
    this.cameras.main.setBackgroundColor(Phaser.Display.Color.GetColor(tint.r, tint.g, tint.b));

    this.updateResidents(dt, dayRatio);
    this.windowGraphics.clear();
    this.drawWindows(dayRatio);

    const occupied = this.residents.length;
    const capacity = this.windows.length;
    const timeLabel = dayRatio > 0.52 ? '昼' : '夜';
    this.statusText.setText([
      `入居: ${occupied}/${capacity}   空室: ${Math.max(0, capacity - occupied)}`,
      `観察ポイント: ${Math.floor(this.moodPoints)}   時間帯: ${timeLabel}`,
      'クリック: 空室に幽霊を住まわせる / 入居中を押すと気分変化',
    ]);
  }

  /**
   * GPT-5.3-Codex: 画面サイズに応じてUIと建物のレイアウトを計算する。
   */
  protected computeLayout(width: number, height: number): SceneLayout {
    const buildingWidth = Math.min(width * 0.72, 760);
    const buildingHeight = Math.min(height * 0.68, 860);
    return {
      width,
      height,
      titleY: Math.max(16, height * 0.03),
      subtitleY: Math.max(54, height * 0.08),
      statusY: Math.max(95, height * 0.13),
      buildingX: (width - buildingWidth) * 0.5,
      buildingY: Math.max(height * 0.21, 180),
      buildingWidth,
      buildingHeight,
    };
  }

  /**
   * GPT-5.3-Codex: レイアウト情報を反映してUI・窓・住人の配置を更新する。
   */
  protected renderLayout(layout: SceneLayout): void {
    const titleSize = Math.max(28, Math.floor(Math.min(layout.width, layout.height) * 0.04));
    const subSize = Math.max(16, Math.floor(Math.min(layout.width, layout.height) * 0.022));
    const statusSize = Math.max(14, Math.floor(Math.min(layout.width, layout.height) * 0.021));

    this.titleText.setPosition(layout.width * 0.5, layout.titleY).setFontSize(titleSize);
    this.subtitleText.setPosition(layout.width * 0.5, layout.subtitleY).setFontSize(subSize);
    this.statusText.setPosition(layout.width * 0.5, layout.statusY).setFontSize(statusSize);

    this.buildingFrame
      .setPosition(layout.buildingX, layout.buildingY)
      .setSize(layout.buildingWidth, layout.buildingHeight);

    this.windows = this.createWindows(layout);
    this.repositionResidentsToRooms();
  }

  /**
   * GPT-5.3-Codex: 建物内の窓セル一覧を生成する。
   */
  private createWindows(layout: SceneLayout): WindowCell[] {
    const cells: WindowCell[] = [];
    const rows = 4;
    const cols = 3;
    const marginX = layout.buildingWidth * 0.12;
    const marginY = layout.buildingHeight * 0.1;
    const gapX = layout.buildingWidth * 0.07;
    const gapY = layout.buildingHeight * 0.08;
    const cellWidth = (layout.buildingWidth - marginX * 2 - gapX * (cols - 1)) / cols;
    const cellHeight = (layout.buildingHeight - marginY * 2 - gapY * (rows - 1)) / rows;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        cells.push({
          x: layout.buildingX + marginX + col * (cellWidth + gapX),
          y: layout.buildingY + marginY + row * (cellHeight + gapY),
          width: cellWidth,
          height: cellHeight,
        });
      }
    }

    return cells;
  }

  /**
   * GPT-5.3-Codex: 建物と窓の発光状態を時間帯に合わせて描画する。
   */
  private drawWindows(dayRatio: number): void {
    const dayLight = Phaser.Math.Linear(0.32, 0.9, dayRatio);
    this.windows.forEach((room, index) => {
      const hasResident = this.residents.some((ghost) => ghost.roomIndex === index);
      const litColor = hasResident ? 0xfef3c7 : 0x93c5fd;
      const darkColor = hasResident ? 0xfde68a : 0x334155;
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(darkColor),
        Phaser.Display.Color.ValueToColor(litColor),
        100,
        Math.floor(dayLight * 100),
      );

      this.windowGraphics.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b), 0.95);
      this.windowGraphics.fillRoundedRect(room.x, room.y, room.width, room.height, 6);
      this.windowGraphics.lineStyle(2, 0x1e293b, 0.9);
      this.windowGraphics.strokeRoundedRect(room.x, room.y, room.width, room.height, 6);
    });
  }

  /**
   * GPT-5.3-Codex: 初期入居者をランダムな空室へ配置する。
   */
  private spawnInitialResidents(count: number): void {
    const firstBatch = Math.min(count, this.windows.length);
    for (let index = 0; index < firstBatch; index += 1) {
      const availableRoom = this.findRandomEmptyRoom();
      if (availableRoom < 0) {
        break;
      }
      this.spawnResident(availableRoom);
    }
  }

  /**
   * GPT-5.3-Codex: クリック位置に応じて入居追加または気分変更を行う。
   */
  private tryAssignGhost(x: number, y: number): void {
    const roomIndex = this.findRoomFromPoint(x, y);
    if (roomIndex < 0) {
      return;
    }

    const resident = this.residents.find((ghost) => ghost.roomIndex === roomIndex);
    if (resident) {
      resident.mood = this.rotateMood(resident.mood);
      this.moodPoints += 8;
      resident.sprite.setText(this.getGhostEmoji(resident.mood));
      return;
    }

    this.spawnResident(roomIndex);
    this.moodPoints += 12;
  }

  /**
   * GPT-5.3-Codex: 住人幽霊を指定した部屋へ生成する。
   */
  private spawnResident(roomIndex: number): void {
    const room = this.windows[roomIndex];
    const sprite = this.add.text(room.x + room.width * 0.5, room.y + room.height * 0.58, '👻', {
      fontFamily: 'sans-serif',
      fontSize: `${Math.max(24, Math.floor(room.height * 0.44))}px`,
    }).setOrigin(0.5);

    this.residents.push({
      sprite,
      roomIndex,
      mood: 'calm',
      phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
      driftSpeed: Phaser.Math.FloatBetween(0.8, 1.4),
    });
  }

  /**
   * GPT-5.3-Codex: 住人のゆらぎ移動と気分ポイント加算を更新する。
   */
  private updateResidents(dt: number, dayRatio: number): void {
    this.residents.forEach((ghost) => {
      const room = this.windows[ghost.roomIndex];
      ghost.phase += dt * ghost.driftSpeed;

      // GPT-5.3-Codex: 観察対象として見やすいように、室内で小さく浮遊させる。
      const bobX = Math.cos(ghost.phase * 1.2) * room.width * 0.08;
      const bobY = Math.sin(ghost.phase * 1.8) * room.height * 0.07;
      ghost.sprite.setPosition(room.x + room.width * 0.5 + bobX, room.y + room.height * 0.58 + bobY);

      const moodGain = ghost.mood === 'happy' ? 2.4 : ghost.mood === 'sleepy' ? 1.1 : 1.7;
      this.moodPoints += moodGain * dt * (0.7 + dayRatio * 0.6);
    });
  }

  /**
   * GPT-5.3-Codex: 画面リサイズ時に住人を部屋中央へ再配置する。
   */
  private repositionResidentsToRooms(): void {
    this.residents.forEach((ghost) => {
      const room = this.windows[ghost.roomIndex];
      ghost.sprite
        .setPosition(room.x + room.width * 0.5, room.y + room.height * 0.58)
        .setFontSize(Math.max(24, Math.floor(room.height * 0.44)));
    });
  }

  /**
   * GPT-5.3-Codex: 指定座標に対応する部屋インデックスを返す。
   */
  private findRoomFromPoint(x: number, y: number): number {
    return this.windows.findIndex((room) => (
      x >= room.x
      && x <= room.x + room.width
      && y >= room.y
      && y <= room.y + room.height
    ));
  }

  /**
   * GPT-5.3-Codex: 空室の中からランダムな部屋を1つ返す。
   */
  private findRandomEmptyRoom(): number {
    const occupied = new Set(this.residents.map((ghost) => ghost.roomIndex));
    const emptyRooms = this.windows
      .map((_, index) => index)
      .filter((index) => !occupied.has(index));

    if (emptyRooms.length <= 0) {
      return -1;
    }

    return emptyRooms[Phaser.Math.Between(0, emptyRooms.length - 1)] ?? -1;
  }

  /**
   * GPT-5.3-Codex: クリック時に幽霊の気分を順番に切り替える。
   */
  private rotateMood(current: GhostResident['mood']): GhostResident['mood'] {
    if (current === 'calm') {
      return 'happy';
    }
    if (current === 'happy') {
      return 'sleepy';
    }
    return 'calm';
  }

  /**
   * GPT-5.3-Codex: 気分状態に応じた幽霊絵文字を返す。
   */
  private getGhostEmoji(mood: GhostResident['mood']): string {
    if (mood === 'happy') {
      return '😄';
    }
    if (mood === 'sleepy') {
      return '😪';
    }
    return '👻';
  }
}

new Phaser.Game(createConfig([SummaryScene]));
