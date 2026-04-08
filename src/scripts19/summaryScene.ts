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

type GardenResident = {
  emoji: string;
  activity: string;
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
const RESIDENT_COUNT = 20;
const EMOJI_SET = ['🧑‍🎣', '🧑‍🌾', '🧑‍🎨', '🦆', '🐟', '🐢', '🐸', '🐶', '🐱', '🦊', '🧘', '🤖'];
const ACTIVITY_SET = ['釣り', '水やり', '散策', '昼寝', '会話', '景色鑑賞'];
const MOOD_SET = ['穏やか', '癒やし', '静か', 'くつろぎ', '気分転換', '深呼吸'];

const TOP_COLORS = [0x38bdf8, 0x22d3ee, 0x2dd4bf, 0x67e8f9];
const LEFT_COLORS = [0x0369a1, 0x0e7490, 0x0f766e, 0x155e75];
const RIGHT_COLORS = [0x0284c7, 0x0891b2, 0x0d9488, 0x0ea5e9];

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts19SummaryScene';

  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private worldLayer!: Phaser.GameObjects.Container;
  private tileLayer!: Phaser.GameObjects.Container;
  private propLayer!: Phaser.GameObjects.Container;
  private actorLayer!: Phaser.GameObjects.Container;
  private residents: GardenResident[] = [];
  private elapsedSeconds = 0;
  private elapsedTime = 0;
  private currentTileSize = 42;

  /**
   * GPT-5.3-Codex: 水辺ガーデンのクォータービュー観察シーンを初期化する。
   */
  public constructor() {
    super(SummaryScene.key);
  }

  /**
   * GPT-5.3-Codex: ガーデンUIと住人を生成して観察ループを開始する。
   */
  public create(): void {
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);

    this.titleText = this.add.text(0, 0, TITLE, {
      fontFamily: 'sans-serif',
      fontSize: '42px',
      fontStyle: 'bold',
      color: '#e0f2fe',
    }).setOrigin(0.5, 0);

    this.subtitleText = this.add.text(0, 0, SUBTITLE, {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      color: '#bae6fd',
    }).setOrigin(0.5, 0);

    this.statusText = this.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#fef9c3',
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
   * GPT-5.3-Codex: 毎フレーム住人移動を更新し観察ステータスを表示する。
   */
  public update(_: number, deltaMs: number): void {
    const deltaSec = deltaMs / 1000;
    this.elapsedTime += deltaSec;

    this.residents.forEach((resident) => {
      this.advanceResident(resident, deltaSec);
    });

    this.refreshResidentPlacement(this.currentTileSize);
    const focused = this.residents[Math.floor((this.elapsedSeconds / 2) % this.residents.length)];
    this.statusText.setText(`経過: ${this.elapsedSeconds}s / 観察対象: ${focused?.emoji ?? '🐟'} ${focused?.activity ?? '散策'} / 住人: ${this.residents.length}体`);
  }

  /**
   * GPT-5.3-Codex: 画面サイズに合わせたガーデン表示レイアウト値を算出する。
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
   * GPT-5.3-Codex: レイアウト再計算時に地形・装飾・住人を再描画する。
   */
  protected renderLayout(layout: QuarterLayout): void {
    this.titleText.setPosition(layout.width * 0.5, layout.titleY).setFontSize(Math.max(28, Math.floor(layout.width * 0.034)));
    this.subtitleText.setPosition(layout.width * 0.5, layout.subtitleY).setFontSize(Math.max(13, Math.floor(layout.width * 0.015)));
    this.statusText.setPosition(layout.width * 0.5, layout.statusY).setFontSize(Math.max(12, Math.floor(layout.width * 0.014)));

    this.currentTileSize = layout.tileSize;
    const centerOffsetX = this.toIsometric((GRID_SIZE - 1) / 2, (GRID_SIZE - 1) / 2, layout.tileSize).x;
    this.worldLayer.setPosition(layout.worldCenterX - centerOffsetX, layout.worldCenterY);

    this.drawQuarterTiles(layout.tileSize);
    this.drawGardenProps(layout.tileSize);
    this.refreshResidentPlacement(layout.tileSize);
  }

  /**
   * GPT-5.3-Codex: 水辺テーマの寒色タイルをクォータービューで描画する。
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
          .setStrokeStyle(1, 0x0c4a6e, 0.3);

        this.tileLayer.add([left, right, top]);
      }
    }
  }

  /**
   * GPT-5.3-Codex: 池・橋・花壇を描いて眺めるゲームらしい景観を作る。
   */
  private drawGardenProps(tileSize: number): void {
    this.propLayer.removeAll(true);

    const pondCenter = this.toIsometric(3.7, 3.6, tileSize);
    const pond = this.add.ellipse(pondCenter.x, pondCenter.y - tileSize * 0.2, tileSize * 2.5, tileSize * 1.16, 0x38bdf8, 0.6)
      .setStrokeStyle(2, 0x0ea5e9, 0.6);
    const shine = this.add.ellipse(pondCenter.x + tileSize * 0.24, pondCenter.y - tileSize * 0.28, tileSize * 0.82, tileSize * 0.22, 0xe0f2fe, 0.35);

    const bridgePos = this.toIsometric(3.4, 2.7, tileSize);
    const bridge = this.add.rectangle(bridgePos.x, bridgePos.y - tileSize * 0.43, tileSize * 1.4, tileSize * 0.18, 0x92400e, 0.9)
      .setStrokeStyle(2, 0x451a03, 0.45);

    const flowerBeds: Array<{ x: number; y: number; color: number }> = [
      { x: 1.6, y: 5.3, color: 0xf472b6 },
      { x: 5.8, y: 1.7, color: 0xfacc15 },
      { x: 6.2, y: 4.8, color: 0x34d399 },
    ];

    this.propLayer.add([pond, shine, bridge]);
    flowerBeds.forEach((bed) => {
      const pos = this.toIsometric(bed.x, bed.y, tileSize);
      const flowers = this.add.circle(pos.x, pos.y - tileSize * 0.42, tileSize * 0.26, bed.color, 0.9)
        .setStrokeStyle(2, 0x1f2937, 0.35);
      this.propLayer.add(flowers);
    });
  }

  /**
   * GPT-5.3-Codex: ガーデン住人をランダム配置で生成する。
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
      const moodText = this.add.text(0, 0, '💧', {
        fontFamily: 'sans-serif',
        fontSize: '12px',
        color: '#e0f2fe',
      }).setOrigin(0.5, 1);

      this.actorLayer.add([shadow, bodyText, moodText]);
      this.residents.push({
        emoji: bodyText.text,
        activity: Phaser.Utils.Array.GetRandom(ACTIVITY_SET),
        mood: Phaser.Utils.Array.GetRandom(MOOD_SET),
        gridX,
        gridY,
        targetX: Phaser.Math.Between(0, GRID_SIZE - 1),
        targetY: Phaser.Math.Between(0, GRID_SIZE - 1),
        progress: Phaser.Math.FloatBetween(0, 0.95),
        speed: Phaser.Math.FloatBetween(0.15, 0.32),
        phaseOffset: Phaser.Math.FloatBetween(0, Math.PI * 2),
        bodyText,
        moodText,
        shadow,
      });
    }
  }

  /**
   * GPT-5.3-Codex: 住人移動の進行度を更新し、到達時に次行動へ切り替える。
   */
  private advanceResident(resident: GardenResident, deltaSec: number): void {
    resident.progress += deltaSec * resident.speed;

    if (resident.progress >= 1) {
      resident.gridX = resident.targetX;
      resident.gridY = resident.targetY;
      resident.targetX = Phaser.Math.Between(0, GRID_SIZE - 1);
      resident.targetY = Phaser.Math.Between(0, GRID_SIZE - 1);
      resident.progress = 0;
      resident.activity = Phaser.Utils.Array.GetRandom(ACTIVITY_SET);
      resident.mood = Phaser.Utils.Array.GetRandom(MOOD_SET);
      resident.moodText.setText(Phaser.Math.Between(0, 1) === 0 ? '🌿' : '💧');
    }
  }

  /**
   * GPT-5.3-Codex: 補間座標に合わせて住人描画位置と奥行きを更新する。
   */
  private refreshResidentPlacement(tileSize: number): void {
    this.residents.forEach((resident) => {
      const lerpX = Phaser.Math.Linear(resident.gridX, resident.targetX, resident.progress);
      const lerpY = Phaser.Math.Linear(resident.gridY, resident.targetY, resident.progress);
      const iso = this.toIsometric(lerpX, lerpY, tileSize);
      const bob = Math.sin(this.elapsedTime * 2.2 + resident.phaseOffset) * (tileSize * 0.03);

      resident.shadow.setPosition(iso.x, iso.y + tileSize * 0.19).setSize(tileSize * 0.46, tileSize * 0.2);
      resident.bodyText.setPosition(iso.x, iso.y - tileSize * 0.24 + bob).setFontSize(Math.max(18, Math.round(tileSize * 0.52)));
      resident.moodText.setPosition(iso.x, iso.y - tileSize * 0.72 + bob).setFontSize(Math.max(10, Math.round(tileSize * 0.22)));
      resident.bodyText.setDepth(iso.y + 100);
      resident.moodText.setDepth(iso.y + 101);
      resident.shadow.setDepth(iso.y + 98);
    });
  }

  /**
   * GPT-5.3-Codex: 直交グリッド座標をクォータービュー座標へ変換する。
   */
  private toIsometric(gridX: number, gridY: number, tileSize: number): { x: number; y: number } {
    return {
      x: (gridX - gridY) * tileSize,
      y: (gridX + gridY) * tileSize * 0.5,
    };
  }
}

new Phaser.Game(createConfig([SummaryScene]));
