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

type Merchant = {
  emoji: string;
  stall: string;
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
const CHARACTER_COUNT = 22;
const EMOJI_SET = ['🧑‍🍳', '🧑‍🎤', '🧑‍🔧', '🧑‍💼', '🧋', '🍜', '🍎', '🐶', '🐱', '🦊', '🐼', '🤖'];
const STALL_SET = ['屋台準備', '接客中', '仕込み', '呼び込み', '補充中', '休憩中'];
const MOOD_SET = ['にぎやか', '集中', 'おしゃべり', 'わくわく', '試食中', '踊ってる'];

const TOP_COLORS = [0xfb7185, 0xf97316, 0xfacc15, 0xa855f7];
const LEFT_COLORS = [0xbe123c, 0xc2410c, 0xa16207, 0x6b21a8];
const RIGHT_COLORS = [0xe11d48, 0xea580c, 0xca8a04, 0x9333ea];

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts18SummaryScene';

  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private worldLayer!: Phaser.GameObjects.Container;
  private tileLayer!: Phaser.GameObjects.Container;
  private propLayer!: Phaser.GameObjects.Container;
  private actorLayer!: Phaser.GameObjects.Container;
  private characters: Merchant[] = [];
  private elapsedSeconds = 0;
  private elapsedTime = 0;
  private currentTileSize = 42;

  /**
   * GPT-5.3-Codex: クォータービュー市場観察シーンを初期化する。
   */
  public constructor() {
    super(SummaryScene.key);
  }

  /**
   * GPT-5.3-Codex: 市場UIと絵文字キャラクターを生成して観察を開始する。
   */
  public create(): void {
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);

    this.titleText = this.add.text(0, 0, TITLE, {
      fontFamily: 'sans-serif',
      fontSize: '42px',
      fontStyle: 'bold',
      color: '#fef9c3',
    }).setOrigin(0.5, 0);

    this.subtitleText = this.add.text(0, 0, SUBTITLE, {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      color: '#e9d5ff',
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

    this.createCharacters();
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
   * GPT-5.3-Codex: 毎フレームキャラクターの行動を更新し、表示文言を同期する。
   */
  public update(_: number, deltaMs: number): void {
    const deltaSec = deltaMs / 1000;
    this.elapsedTime += deltaSec;

    this.characters.forEach((character) => {
      this.advanceCharacter(character, deltaSec);
    });

    this.refreshCharacterPlacement(this.currentTileSize);
    const focused = this.characters[Math.floor((this.elapsedSeconds / 2) % this.characters.length)];
    this.statusText.setText(`経過: ${this.elapsedSeconds}s / 注目店舗: ${focused?.emoji ?? '🧋'} ${focused?.stall ?? '準備中'} / 来客: ${this.characters.length}体`);
  }

  /**
   * GPT-5.3-Codex: 画面サイズに応じて市場全体のレイアウト値を算出する。
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
   * GPT-5.3-Codex: レイアウト再計算時に市場タイル・屋台装飾・住人を再配置する。
   */
  protected renderLayout(layout: QuarterLayout): void {
    this.titleText.setPosition(layout.width * 0.5, layout.titleY).setFontSize(Math.max(28, Math.floor(layout.width * 0.034)));
    this.subtitleText.setPosition(layout.width * 0.5, layout.subtitleY).setFontSize(Math.max(13, Math.floor(layout.width * 0.015)));
    this.statusText.setPosition(layout.width * 0.5, layout.statusY).setFontSize(Math.max(12, Math.floor(layout.width * 0.014)));

    this.currentTileSize = layout.tileSize;
    const centerOffsetX = this.toIsometric((GRID_SIZE - 1) / 2, (GRID_SIZE - 1) / 2, layout.tileSize).x;
    this.worldLayer.setPosition(layout.worldCenterX - centerOffsetX, layout.worldCenterY);

    this.drawQuarterTiles(layout.tileSize);
    this.drawMarketProps(layout.tileSize);
    this.refreshCharacterPlacement(layout.tileSize);
  }

  /**
   * GPT-5.3-Codex: 市場向けに暖色系のクォータービュー床タイルを描画する。
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
          .setStrokeStyle(1, 0x3b0764, 0.3);

        this.tileLayer.add([left, right, top]);
      }
    }
  }

  /**
   * GPT-5.3-Codex: 屋台・提灯・看板を描いて市場の生活感を足す。
   */
  private drawMarketProps(tileSize: number): void {
    this.propLayer.removeAll(true);

    const stalls: Array<{ x: number; y: number; color: number; icon: string }> = [
      { x: 1.7, y: 2.3, color: 0xef4444, icon: '🍜' },
      { x: 5.3, y: 2.1, color: 0x3b82f6, icon: '🧋' },
      { x: 3.8, y: 5.2, color: 0xf59e0b, icon: '🍎' },
    ];

    stalls.forEach((stall) => {
      const pos = this.toIsometric(stall.x, stall.y, tileSize);
      const booth = this.add.rectangle(pos.x, pos.y - tileSize * 0.52, tileSize * 1.02, tileSize * 0.62, stall.color, 0.86)
        .setStrokeStyle(2, 0x111827, 0.38);
      const lantern = this.add.circle(pos.x + tileSize * 0.35, pos.y - tileSize * 0.95, tileSize * 0.12, 0xfef08a, 0.95);
      const icon = this.add.text(pos.x, pos.y - tileSize * 0.84, stall.icon, {
        fontFamily: 'sans-serif',
        fontSize: `${Math.max(11, Math.round(tileSize * 0.28))}px`,
      }).setOrigin(0.5);
      this.propLayer.add([booth, lantern, icon]);
    });
  }

  /**
   * GPT-5.3-Codex: 市場キャラクターをランダムに生成する。
   */
  private createCharacters(): void {
    this.characters = [];

    for (let i = 0; i < CHARACTER_COUNT; i += 1) {
      const gridX = Phaser.Math.Between(0, GRID_SIZE - 1);
      const gridY = Phaser.Math.Between(0, GRID_SIZE - 1);
      const shadow = this.add.ellipse(0, 0, 22, 9, 0x020617, 0.3);
      const bodyText = this.add.text(0, 0, Phaser.Utils.Array.GetRandom(EMOJI_SET), {
        fontFamily: 'sans-serif',
        fontSize: '27px',
      }).setOrigin(0.5, 0.85);
      const moodText = this.add.text(0, 0, '🎵', {
        fontFamily: 'sans-serif',
        fontSize: '12px',
        color: '#fef3c7',
      }).setOrigin(0.5, 1);

      this.actorLayer.add([shadow, bodyText, moodText]);
      this.characters.push({
        emoji: bodyText.text,
        stall: Phaser.Utils.Array.GetRandom(STALL_SET),
        mood: Phaser.Utils.Array.GetRandom(MOOD_SET),
        gridX,
        gridY,
        targetX: Phaser.Math.Between(0, GRID_SIZE - 1),
        targetY: Phaser.Math.Between(0, GRID_SIZE - 1),
        progress: Phaser.Math.FloatBetween(0, 0.95),
        speed: Phaser.Math.FloatBetween(0.17, 0.36),
        phaseOffset: Phaser.Math.FloatBetween(0, Math.PI * 2),
        bodyText,
        moodText,
        shadow,
      });
    }
  }

  /**
   * GPT-5.3-Codex: キャラクター移動の補間と行動ステータスの更新を行う。
   */
  private advanceCharacter(character: Merchant, deltaSec: number): void {
    character.progress += deltaSec * character.speed;

    if (character.progress >= 1) {
      character.gridX = character.targetX;
      character.gridY = character.targetY;
      character.targetX = Phaser.Math.Between(0, GRID_SIZE - 1);
      character.targetY = Phaser.Math.Between(0, GRID_SIZE - 1);
      character.progress = 0;
      character.stall = Phaser.Utils.Array.GetRandom(STALL_SET);
      character.mood = Phaser.Utils.Array.GetRandom(MOOD_SET);
      character.moodText.setText(Phaser.Math.Between(0, 1) === 0 ? '🛍️' : '🎵');
    }
  }

  /**
   * GPT-5.3-Codex: 補間座標に応じてキャラクター表示の位置と奥行きを更新する。
   */
  private refreshCharacterPlacement(tileSize: number): void {
    this.characters.forEach((character) => {
      const lerpX = Phaser.Math.Linear(character.gridX, character.targetX, character.progress);
      const lerpY = Phaser.Math.Linear(character.gridY, character.targetY, character.progress);
      const iso = this.toIsometric(lerpX, lerpY, tileSize);
      const bob = Math.sin(this.elapsedTime * 2.8 + character.phaseOffset) * (tileSize * 0.03);

      character.shadow.setPosition(iso.x, iso.y + tileSize * 0.19).setSize(tileSize * 0.46, tileSize * 0.2);
      character.bodyText.setPosition(iso.x, iso.y - tileSize * 0.24 + bob).setFontSize(Math.max(18, Math.round(tileSize * 0.52)));
      character.moodText.setPosition(iso.x, iso.y - tileSize * 0.72 + bob).setFontSize(Math.max(10, Math.round(tileSize * 0.22)));
      character.bodyText.setDepth(iso.y + 100);
      character.moodText.setDepth(iso.y + 101);
      character.shadow.setDepth(iso.y + 98);
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
