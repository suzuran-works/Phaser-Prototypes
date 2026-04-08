import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BaseResponsiveScene } from '../baseResponsiveScene.ts';
import { BACKGROUND_COLOR, SUBTITLE, TITLE } from './define.ts';

type VillageLayout = {
  width: number;
  height: number;
  titleY: number;
  subtitleY: number;
  statusY: number;
  worldCenterX: number;
  worldCenterY: number;
  tileSize: number;
};

type Resident = {
  emoji: string;
  color: number;
  gridX: number;
  gridY: number;
  targetGridX: number;
  targetGridY: number;
  progress: number;
  speed: number;
  text: Phaser.GameObjects.Text;
  shadow: Phaser.GameObjects.Ellipse;
  mood: string;
};

type Cell = {
  x: number;
  y: number;
};

const WORLD_SIZE = 7;
const RESIDENT_COUNT = 18;
const EMOJI_SET = ['😀', '🐱', '🐶', '🦊', '🐼', '🐸', '🐰', '🦄', '🐤', '🧸', '👾', '🤖'];
const MOOD_SET = ['散歩中', 'お昼寝', '空想中', 'おしゃべり', 'のんびり', '景色観察'];
const TILE_TOP_COLOR = 0x4d7c0f;
const TILE_LEFT_COLOR = 0x3f6212;
const TILE_RIGHT_COLOR = 0x65a30d;
const BUILDING_COLOR = 0x334155;
const BUILDING_EDGE_COLOR = 0x94a3b8;

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts14SummaryScene';

  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private worldLayer!: Phaser.GameObjects.Container;
  private groundLayer!: Phaser.GameObjects.Container;
  private residentLayer!: Phaser.GameObjects.Container;
  private residents: Resident[] = [];
  private cells: Cell[] = [];
  private elapsedSeconds = 0;

  /**
   * Codex: クォータービュー箱庭シーンを初期化する。
   */
  public constructor() {
    super(SummaryScene.key);
  }

  /**
   * Codex: UIと住人を生成して観察ゲームを開始する。
   */
  public create(): void {
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);

    this.titleText = this.add.text(0, 0, TITLE, {
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      fontSize: '44px',
      color: '#f8fafc',
    }).setOrigin(0.5, 0);

    this.subtitleText = this.add.text(0, 0, SUBTITLE, {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#bfdbfe',
    }).setOrigin(0.5, 0);

    this.statusText = this.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#e2e8f0',
      align: 'center',
    }).setOrigin(0.5, 0);

    this.worldLayer = this.add.container(0, 0);
    this.groundLayer = this.add.container(0, 0);
    this.residentLayer = this.add.container(0, 0);
    this.worldLayer.add([this.groundLayer, this.residentLayer]);
    this.buildVillageGround();
    this.createResidents();

    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.elapsedSeconds += 1;
      },
    });

    this.bindResponsiveLayout();
  }

  /**
   * Codex: 毎フレーム住人の移動と状態表示を更新する。
   */
  public update(_: number, deltaMs: number): void {
    const deltaSeconds = deltaMs / 1000;
    this.residents.forEach((resident) => {
      this.advanceResident(resident, deltaSeconds);
    });

    const watchingMood = this.residents[Math.floor((this.elapsedSeconds / 2) % this.residents.length)]?.mood ?? 'のんびり';
    this.statusText.setText(`住人数: ${this.residents.length}体  経過: ${this.elapsedSeconds}s  今日の雰囲気: ${watchingMood}`);
  }

  /**
   * Codex: 画面サイズからUIと箱庭の配置情報を計算する。
   */
  protected computeLayout(width: number, height: number): VillageLayout {
    const tileSize = Math.max(28, Math.min(58, Math.floor(Math.min(width, height) * 0.052)));
    return {
      width,
      height,
      titleY: Math.max(14, height * 0.025),
      subtitleY: Math.max(62, height * 0.085),
      statusY: Math.max(102, height * 0.145),
      worldCenterX: width * 0.5,
      worldCenterY: Math.max(height * 0.61, 310),
      tileSize,
    };
  }

  /**
   * Codex: レイアウトに合わせてUIと住人描画位置を再配置する。
   */
  protected renderLayout(layout: VillageLayout): void {
    this.titleText.setPosition(layout.width * 0.5, layout.titleY).setFontSize(Math.max(28, Math.floor(layout.width * 0.036)));
    this.subtitleText.setPosition(layout.width * 0.5, layout.subtitleY).setFontSize(Math.max(14, Math.floor(layout.width * 0.018)));
    this.statusText.setPosition(layout.width * 0.5, layout.statusY).setFontSize(Math.max(13, Math.floor(layout.width * 0.015)));

    this.worldLayer.setPosition(layout.worldCenterX, layout.worldCenterY);
    this.redrawVillage(layout.tileSize);
    this.refreshResidentPlacement(layout.tileSize);
  }

  /**
   * Codex: 箱庭タイル座標キャッシュを生成する。
   */
  private buildVillageGround(): void {
    this.cells = [];
    for (let y = 0; y < WORLD_SIZE; y += 1) {
      for (let x = 0; x < WORLD_SIZE; x += 1) {
        this.cells.push({ x, y });
      }
    }
  }

  /**
   * Codex: クォータービューの地面と建物を描画する。
   */
  private redrawVillage(tileSize: number): void {
    this.groundLayer.removeAll(true);

    this.cells.forEach((cell) => {
      const isoPoint = this.toIsometric(cell.x, cell.y, tileSize);
      const halfW = tileSize;
      const halfH = tileSize * 0.5;
      const depth = Math.max(6, tileSize * 0.26);

      const top = this.add.polygon(isoPoint.x, isoPoint.y, [
        0, -halfH,
        halfW, 0,
        0, halfH,
        -halfW, 0,
      ], TILE_TOP_COLOR, 1).setStrokeStyle(1, 0x0f172a, 0.28);

      const left = this.add.polygon(isoPoint.x - halfW * 0.5, isoPoint.y + depth * 0.5, [
        0, -halfH * 0.5,
        halfW * 0.5, 0,
        halfW * 0.5, depth,
        0, depth - halfH * 0.5,
      ], TILE_LEFT_COLOR, 0.75);

      const right = this.add.polygon(isoPoint.x + halfW * 0.5, isoPoint.y + depth * 0.5, [
        0, -halfH * 0.5,
        halfW * 0.5, 0,
        halfW * 0.5, depth,
        0, depth - halfH * 0.5,
      ], TILE_RIGHT_COLOR, 0.75);

      this.groundLayer.add([left, right, top]);
    });

    this.drawBuilding(tileSize, 1.5, 2.1, 1.4);
    this.drawBuilding(tileSize, 4.8, 1.9, 1.2);
    this.drawBuilding(tileSize, 3.3, 4.9, 1.8);
  }

  /**
   * Codex: 箱庭内に小さな建物を追加して生活感を演出する。
   */
  private drawBuilding(tileSize: number, gridX: number, gridY: number, heightScale: number): void {
    const base = this.toIsometric(gridX, gridY, tileSize);
    const width = tileSize * 0.9;
    const depth = tileSize * 0.7;
    const height = tileSize * heightScale;

    const body = this.add.rectangle(base.x, base.y - height * 0.6, width, height, BUILDING_COLOR, 0.9)
      .setStrokeStyle(2, BUILDING_EDGE_COLOR, 0.55);
    const roof = this.add.ellipse(base.x, base.y - height - depth * 0.1, width * 1.05, depth, 0x64748b, 0.92);
    this.groundLayer.add([body, roof]);
  }

  /**
   * Codex: 住人絵文字をランダム配置で生成する。
   */
  private createResidents(): void {
    this.residents = [];

    for (let index = 0; index < RESIDENT_COUNT; index += 1) {
      const startX = Phaser.Math.Between(0, WORLD_SIZE - 1);
      const startY = Phaser.Math.Between(0, WORLD_SIZE - 1);
      const targetX = Phaser.Math.Between(0, WORLD_SIZE - 1);
      const targetY = Phaser.Math.Between(0, WORLD_SIZE - 1);

      const shadow = this.add.ellipse(0, 0, 22, 10, 0x020617, 0.32);
      const text = this.add.text(0, 0, Phaser.Utils.Array.GetRandom(EMOJI_SET), {
        fontFamily: 'sans-serif',
        fontSize: '34px',
      }).setOrigin(0.5);

      this.residentLayer.add([shadow, text]);

      this.residents.push({
        emoji: text.text,
        color: Phaser.Display.Color.RandomRGB().color,
        gridX: startX,
        gridY: startY,
        targetGridX: targetX,
        targetGridY: targetY,
        progress: Phaser.Math.FloatBetween(0, 1),
        speed: Phaser.Math.FloatBetween(0.16, 0.36),
        text,
        shadow,
        mood: Phaser.Utils.Array.GetRandom(MOOD_SET),
      });
    }
  }

  /**
   * Codex: 住人の移動進行を更新し、目標到達時に次の行き先を決める。
   */
  private advanceResident(resident: Resident, deltaSeconds: number): void {
    resident.progress += resident.speed * deltaSeconds;

    if (resident.progress >= 1) {
      resident.gridX = resident.targetGridX;
      resident.gridY = resident.targetGridY;
      resident.targetGridX = Phaser.Math.Between(0, WORLD_SIZE - 1);
      resident.targetGridY = Phaser.Math.Between(0, WORLD_SIZE - 1);
      resident.progress = 0;
      resident.mood = Phaser.Utils.Array.GetRandom(MOOD_SET);
    }
  }

  /**
   * Codex: 全住人を現在のタイルサイズに合わせて再配置する。
   */
  private refreshResidentPlacement(tileSize: number): void {
    this.residents.forEach((resident) => {
      const from = this.toIsometric(resident.gridX, resident.gridY, tileSize);
      const to = this.toIsometric(resident.targetGridX, resident.targetGridY, tileSize);
      const x = Phaser.Math.Linear(from.x, to.x, resident.progress);
      const y = Phaser.Math.Linear(from.y, to.y, resident.progress);
      const bob = Math.sin((this.elapsedSeconds + resident.progress) * 3.2) * Math.max(3, tileSize * 0.07);

      resident.shadow.setPosition(x, y + tileSize * 0.36).setSize(tileSize * 0.54, tileSize * 0.24);
      resident.text
        .setPosition(x, y - tileSize * 0.15 - bob)
        .setFontSize(Math.max(18, Math.floor(tileSize * 0.72)))
        .setTint(resident.color);
    });

    this.residents.sort((left, right) => left.text.y - right.text.y).forEach((resident, index) => {
      resident.shadow.setDepth(index * 2 + 1);
      resident.text.setDepth(index * 2 + 2);
    });
  }

  /**
   * Codex: タイル座標をクォータービュー描画座標へ変換する。
   */
  private toIsometric(gridX: number, gridY: number, tileSize: number): Phaser.Math.Vector2 {
    const centeredX = gridX - (WORLD_SIZE - 1) * 0.5;
    const centeredY = gridY - (WORLD_SIZE - 1) * 0.5;
    return new Phaser.Math.Vector2((centeredX - centeredY) * tileSize, (centeredX + centeredY) * tileSize * 0.5);
  }
}

new Phaser.Game(createConfig([SummaryScene]));
