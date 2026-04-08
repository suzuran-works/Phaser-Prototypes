import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BaseResponsiveScene } from '../baseResponsiveScene.ts';
import { BACKGROUND_COLOR, SUBTITLE, TITLE } from './define.ts';

type QuarterLayout = {
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
  role: string;
  mood: string;
  gridX: number;
  gridY: number;
  targetX: number;
  targetY: number;
  progress: number;
  speed: number;
  phaseOffset: number;
  bodyText: Phaser.GameObjects.Text;
  moodText: Phaser.GameObjects.Text;
  shadow: Phaser.GameObjects.Ellipse;
};

const GRID_SIZE = 8;
const RESIDENT_COUNT = 24;
const EMOJI_SET = ['😀', '🧑‍🍳', '🧑‍🌾', '🧑‍🎨', '🐶', '🐱', '🐼', '🦊', '🐸', '🧸', '🤖', '🧑‍🔧'];
const ROLE_SET = ['散歩', '買い物', '談笑', '休憩', '配達', '観察'];
const MOOD_SET = ['のんびり', 'わくわく', 'ほっと一息', '作業中', '移動中', '交流中'];

const TOP_COLORS = [0x22c55e, 0x34d399, 0x4ade80, 0x86efac];
const LEFT_COLORS = [0x15803d, 0x047857, 0x16a34a, 0x65a30d];
const RIGHT_COLORS = [0x4d7c0f, 0x65a30d, 0x22c55e, 0x10b981];

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts17SummaryScene';

  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private worldLayer!: Phaser.GameObjects.Container;
  private tileLayer!: Phaser.GameObjects.Container;
  private propLayer!: Phaser.GameObjects.Container;
  private actorLayer!: Phaser.GameObjects.Container;
  private residents: Resident[] = [];
  private elapsedSeconds = 0;
  private elapsedTime = 0;
  private currentTileSize = 42;

  /**
   * GPT-5.3-Codex: クォータービュー生活観察シーンを初期化する。
   */
  public constructor() {
    super(SummaryScene.key);
  }

  /**
   * GPT-5.3-Codex: UIと箱庭オブジェクトを生成して観察ゲームを開始する。
   */
  public create(): void {
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);

    this.titleText = this.add.text(0, 0, TITLE, {
      fontFamily: 'sans-serif',
      fontSize: '42px',
      fontStyle: 'bold',
      color: '#f8fafc',
    }).setOrigin(0.5, 0);

    this.subtitleText = this.add.text(0, 0, SUBTITLE, {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      color: '#bfdbfe',
    }).setOrigin(0.5, 0);

    this.statusText = this.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#fde68a',
      align: 'center',
    }).setOrigin(0.5, 0);

    this.worldLayer = this.add.container(0, 0);
    this.tileLayer = this.add.container(0, 0);
    this.propLayer = this.add.container(0, 0);
    this.actorLayer = this.add.container(0, 0);
    this.worldLayer.add([this.tileLayer, this.propLayer, this.actorLayer]);

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
   * GPT-5.3-Codex: 毎フレーム住人の移動を進め、観察メモを更新する。
   */
  public update(_: number, deltaMs: number): void {
    const deltaSec = deltaMs / 1000;
    this.elapsedTime += deltaSec;

    this.residents.forEach((resident) => {
      this.advanceResident(resident, deltaSec);
    });

    this.refreshResidentPlacement(this.currentTileSize);
    const focused = this.residents[Math.floor((this.elapsedSeconds / 2) % this.residents.length)];
    this.statusText.setText(`観察時間: ${this.elapsedSeconds}s / 注目: ${focused?.emoji ?? '😀'} ${focused?.mood ?? 'のんびり'} / 住人: ${this.residents.length}体`);
  }

  /**
   * GPT-5.3-Codex: 画面サイズに応じてUIと箱庭配置を算出する。
   */
  protected computeLayout(width: number, height: number): QuarterLayout {
    const tileSize = Math.max(26, Math.min(56, Math.floor(Math.min(width, height) * 0.05)));
    return {
      width,
      height,
      titleY: Math.max(10, height * 0.02),
      subtitleY: Math.max(56, height * 0.08),
      statusY: Math.max(90, height * 0.13),
      worldCenterX: width * 0.5,
      worldCenterY: Math.max(height * 0.62, 320),
      tileSize,
    };
  }

  /**
   * GPT-5.3-Codex: レイアウト変更に合わせてタイル・装飾・住人を再配置する。
   */
  protected renderLayout(layout: QuarterLayout): void {
    this.titleText.setPosition(layout.width * 0.5, layout.titleY).setFontSize(Math.max(28, Math.floor(layout.width * 0.034)));
    this.subtitleText.setPosition(layout.width * 0.5, layout.subtitleY).setFontSize(Math.max(13, Math.floor(layout.width * 0.015)));
    this.statusText.setPosition(layout.width * 0.5, layout.statusY).setFontSize(Math.max(12, Math.floor(layout.width * 0.014)));

    this.currentTileSize = layout.tileSize;
    const centerOffsetX = this.toIsometric((GRID_SIZE - 1) / 2, (GRID_SIZE - 1) / 2, layout.tileSize).x;
    this.worldLayer.setPosition(layout.worldCenterX - centerOffsetX, layout.worldCenterY);

    this.drawQuarterTiles(layout.tileSize);
    this.drawProps(layout.tileSize);
    this.refreshResidentPlacement(layout.tileSize);
  }

  /**
   * GPT-5.3-Codex: クォータービューの床タイルを明るい配色で描画する。
   */
  private drawQuarterTiles(tileSize: number): void {
    this.tileLayer.removeAll(true);

    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        const index = (x + y) % TOP_COLORS.length;
        const iso = this.toIsometric(x, y, tileSize);
        const halfW = tileSize;
        const halfH = tileSize * 0.5;
        const depth = Math.max(6, tileSize * 0.22);

        const left = this.add.polygon(iso.x - halfW * 0.5, iso.y + depth * 0.5, [0, -halfH * 0.5, halfW * 0.5, 0, halfW * 0.5, depth, 0, depth - halfH * 0.5], LEFT_COLORS[index], 0.86);
        const right = this.add.polygon(iso.x + halfW * 0.5, iso.y + depth * 0.5, [0, -halfH * 0.5, halfW * 0.5, 0, halfW * 0.5, depth, 0, depth - halfH * 0.5], RIGHT_COLORS[index], 0.86);
        const top = this.add.polygon(iso.x, iso.y, [0, -halfH, halfW, 0, 0, halfH, -halfW, 0], TOP_COLORS[index], 1)
          .setStrokeStyle(1, 0x0f172a, 0.25);

        this.tileLayer.add([left, right, top]);
      }
    }
  }

  /**
   * GPT-5.3-Codex: 木や噴水を置いて暮らしの気配を表現する。
   */
  private drawProps(tileSize: number): void {
    this.propLayer.removeAll(true);

    const treePositions: Array<{ x: number; y: number }> = [{ x: 1.4, y: 2.2 }, { x: 5.5, y: 1.6 }, { x: 2.3, y: 5.6 }];
    treePositions.forEach((cell) => {
      const pos = this.toIsometric(cell.x, cell.y, tileSize);
      const trunk = this.add.rectangle(pos.x, pos.y - tileSize * 0.8, tileSize * 0.16, tileSize * 0.56, 0x78350f, 0.9);
      const leaves = this.add.circle(pos.x, pos.y - tileSize * 1.05, tileSize * 0.38, 0x22c55e, 0.9)
        .setStrokeStyle(2, 0x14532d, 0.45);
      this.propLayer.add([trunk, leaves]);
    });

    const fountainPos = this.toIsometric(3.6, 3.7, tileSize);
    const basin = this.add.ellipse(fountainPos.x, fountainPos.y - tileSize * 0.15, tileSize * 1.3, tileSize * 0.64, 0x93c5fd, 0.7);
    const water = this.add.ellipse(fountainPos.x, fountainPos.y - tileSize * 0.3, tileSize * 0.7, tileSize * 0.28, 0x38bdf8, 0.92);
    this.propLayer.add([basin, water]);
  }

  /**
   * GPT-5.3-Codex: 絵文字住人をランダムな初期状態で生成する。
   */
  private createResidents(): void {
    this.residents = [];

    for (let i = 0; i < RESIDENT_COUNT; i += 1) {
      const gridX = Phaser.Math.Between(0, GRID_SIZE - 1);
      const gridY = Phaser.Math.Between(0, GRID_SIZE - 1);
      const shadow = this.add.ellipse(0, 0, 22, 9, 0x020617, 0.3);
      const bodyText = this.add.text(0, 0, Phaser.Utils.Array.GetRandom(EMOJI_SET), {
        fontFamily: 'sans-serif',
        fontSize: '27px',
      }).setOrigin(0.5, 0.85);
      const moodText = this.add.text(0, 0, '✨', {
        fontFamily: 'sans-serif',
        fontSize: '12px',
        color: '#f8fafc',
      }).setOrigin(0.5, 1);

      this.actorLayer.add([shadow, bodyText, moodText]);
      this.residents.push({
        emoji: bodyText.text,
        role: Phaser.Utils.Array.GetRandom(ROLE_SET),
        mood: Phaser.Utils.Array.GetRandom(MOOD_SET),
        gridX,
        gridY,
        targetX: Phaser.Math.Between(0, GRID_SIZE - 1),
        targetY: Phaser.Math.Between(0, GRID_SIZE - 1),
        progress: Phaser.Math.FloatBetween(0, 0.95),
        speed: Phaser.Math.FloatBetween(0.16, 0.34),
        phaseOffset: Phaser.Math.FloatBetween(0, Math.PI * 2),
        bodyText,
        moodText,
        shadow,
      });
    }
  }

  /**
   * GPT-5.3-Codex: 住人の移動進行と行動状態の切り替えを管理する。
   */
  private advanceResident(resident: Resident, deltaSec: number): void {
    resident.progress += deltaSec * resident.speed;

    if (resident.progress >= 1) {
      resident.gridX = resident.targetX;
      resident.gridY = resident.targetY;
      resident.targetX = Phaser.Math.Between(0, GRID_SIZE - 1);
      resident.targetY = Phaser.Math.Between(0, GRID_SIZE - 1);
      resident.progress = 0;
      resident.role = Phaser.Utils.Array.GetRandom(ROLE_SET);
      resident.mood = Phaser.Utils.Array.GetRandom(MOOD_SET);
      resident.moodText.setText(Phaser.Math.Between(0, 1) === 0 ? '💬' : '✨');
    }
  }

  /**
   * GPT-5.3-Codex: 補間したグリッド座標から絵文字住人の表示座標を更新する。
   */
  private refreshResidentPlacement(tileSize: number): void {
    this.residents.forEach((resident) => {
      const lerpX = Phaser.Math.Linear(resident.gridX, resident.targetX, resident.progress);
      const lerpY = Phaser.Math.Linear(resident.gridY, resident.targetY, resident.progress);
      const iso = this.toIsometric(lerpX, lerpY, tileSize);
      const bob = Math.sin(this.elapsedTime * 2.6 + resident.phaseOffset) * (tileSize * 0.03);

      resident.shadow.setPosition(iso.x, iso.y + tileSize * 0.19).setSize(tileSize * 0.46, tileSize * 0.2);
      resident.bodyText.setPosition(iso.x, iso.y - tileSize * 0.24 + bob).setFontSize(Math.max(18, Math.round(tileSize * 0.52)));
      resident.moodText.setPosition(iso.x, iso.y - tileSize * 0.72 + bob).setFontSize(Math.max(10, Math.round(tileSize * 0.22)));
      resident.bodyText.setDepth(iso.y + 100);
      resident.moodText.setDepth(iso.y + 101);
      resident.shadow.setDepth(iso.y + 98);
    });
  }

  /**
   * GPT-5.3-Codex: 直交座標のタイル位置をクォータービュー座標へ変換する。
   */
  private toIsometric(gridX: number, gridY: number, tileSize: number): { x: number; y: number } {
    return {
      x: (gridX - gridY) * tileSize,
      y: (gridX + gridY) * tileSize * 0.5,
    };
  }
}

new Phaser.Game(createConfig([SummaryScene]));
