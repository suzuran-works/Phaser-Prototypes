import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BaseResponsiveScene } from '../baseResponsiveScene.ts';
import { BACKGROUND_COLOR, SUBTITLE, TITLE } from './define.ts';

type EmojiSet = {
  base: string;
  odd: string;
};

type StageLayout = {
  width: number;
  height: number;
  titleY: number;
  subtitleY: number;
  statusY: number;
  timerY: number;
  fieldX: number;
  fieldY: number;
  fieldWidth: number;
  fieldHeight: number;
  cellSize: number;
};

type EmojiCell = {
  row: number;
  col: number;
  text: Phaser.GameObjects.Text;
  isOdd: boolean;
};

const EMOJI_SETS: EmojiSet[] = [
  { base: '😀', odd: '😃' },
  { base: '🐱', odd: '🐯' },
  { base: '🍎', odd: '🍏' },
  { base: '🌙', odd: '🌛' },
  { base: '⭐', odd: '🌟' },
  { base: '🧁', odd: '🍰' },
  { base: '🦋', odd: '🪲' },
  { base: '🎈', odd: '🎉' },
];

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts13SummaryScene';

  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private fieldFrame!: Phaser.GameObjects.Rectangle;

  private gridRows = 3;
  private gridCols = 4;
  private emojiCells: EmojiCell[] = [];
  private score = 0;
  private streak = 0;
  private stage = 1;
  private timeLeft = 45;
  private isFinished = false;

  /**
   * Codex: 絵文字観察ゲームシーンを初期化する。
   */
  public constructor() {
    super(SummaryScene.key);
  }

  /**
   * Codex: UIを準備し、ゲーム開始時の問題を生成する。
   */
  public create(): void {
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);

    this.titleText = this.add.text(0, 0, TITLE, {
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      fontSize: '40px',
      color: '#f9fafb',
    }).setOrigin(0.5, 0);

    this.subtitleText = this.add.text(0, 0, SUBTITLE, {
      fontFamily: 'sans-serif',
      fontSize: '21px',
      color: '#cbd5e1',
    }).setOrigin(0.5, 0);

    this.statusText = this.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: '19px',
      color: '#e2e8f0',
      align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5, 0);

    this.timerText = this.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontStyle: 'bold',
      fontSize: '28px',
      color: '#fbbf24',
    }).setOrigin(0.5, 0);

    this.fieldFrame = this.add.rectangle(0, 0, 100, 100, 0x0f172a, 0.9)
      .setOrigin(0, 0)
      .setStrokeStyle(4, 0x60a5fa, 0.7);

    this.bindResponsiveLayout();
    this.generateRound();

    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        if (this.isFinished) {
          return;
        }
        this.timeLeft = Math.max(0, this.timeLeft - 0.1);
        if (this.timeLeft <= 0) {
          this.finishGame();
        }
      },
    });
  }

  /**
   * Codex: フレーム更新ごとに表示テキストを最新状態へ同期する。
   */
  public update(): void {
    this.statusText.setText([
      `スコア: ${this.score}   連続正解: ${this.streak}   ステージ: ${this.stage}`,
      '違う絵文字を1つだけ探してタップしてください',
    ]);
    this.timerText.setText(`残り時間 ${this.timeLeft.toFixed(1)}s`);
  }

  /**
   * Codex: 画面サイズに応じてUI配置とセルサイズを算出する。
   */
  protected computeLayout(width: number, height: number): StageLayout {
    const fieldWidth = Math.min(width * 0.88, 760);
    const fieldHeight = Math.min(height * 0.6, 560);
    const cellSize = Math.min(fieldWidth / this.gridCols, fieldHeight / this.gridRows);

    return {
      width,
      height,
      titleY: Math.max(14, height * 0.03),
      subtitleY: Math.max(56, height * 0.09),
      statusY: Math.max(94, height * 0.15),
      timerY: Math.max(150, height * 0.23),
      fieldX: (width - fieldWidth) * 0.5,
      fieldY: Math.max(height * 0.3, 205),
      fieldWidth,
      fieldHeight,
      cellSize,
    };
  }

  /**
   * Codex: レイアウト値を各UIと絵文字マスへ反映する。
   */
  protected renderLayout(layout: StageLayout): void {
    this.titleText.setPosition(layout.width * 0.5, layout.titleY).setFontSize(Math.max(28, Math.floor(layout.width * 0.04)));
    this.subtitleText.setPosition(layout.width * 0.5, layout.subtitleY).setFontSize(Math.max(15, Math.floor(layout.width * 0.02)));
    this.statusText.setPosition(layout.width * 0.5, layout.statusY).setFontSize(Math.max(13, Math.floor(layout.width * 0.018)));
    this.timerText.setPosition(layout.width * 0.5, layout.timerY).setFontSize(Math.max(22, Math.floor(layout.width * 0.028)));

    this.fieldFrame
      .setPosition(layout.fieldX, layout.fieldY)
      .setSize(layout.fieldWidth, layout.fieldHeight);

    this.repositionEmojiCells(layout);
  }

  /**
   * Codex: 現在のステージ難易度で新しい観察ラウンドを生成する。
   */
  private generateRound(): void {
    this.clearEmojiCells();
    this.updateDifficultyByStage();

    const selectedSet = Phaser.Utils.Array.GetRandom(EMOJI_SETS);
    const oddIndex = Phaser.Math.Between(0, this.gridRows * this.gridCols - 1);

    for (let row = 0; row < this.gridRows; row += 1) {
      for (let col = 0; col < this.gridCols; col += 1) {
        const index = row * this.gridCols + col;
        const isOdd = index === oddIndex;
        const emojiText = this.add.text(0, 0, isOdd ? selectedSet.odd : selectedSet.base, {
          fontFamily: 'sans-serif',
          fontSize: '48px',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        emojiText.on('pointerdown', () => {
          this.handleCellSelection(isOdd, emojiText);
        });

        this.emojiCells.push({
          row,
          col,
          text: emojiText,
          isOdd,
        });
      }
    }

    this.repositionEmojiCells(this.computeLayout(this.scale.width, this.scale.height));
  }

  /**
   * Codex: タップ結果に応じて得点処理と次ラウンド遷移を行う。
   */
  private handleCellSelection(isOdd: boolean, target: Phaser.GameObjects.Text): void {
    if (this.isFinished) {
      return;
    }

    if (isOdd) {
      this.streak += 1;
      this.score += 100 + this.streak * 20;
      this.stage += 1;
      target.setScale(1.25);
      this.timeLeft = Math.min(60, this.timeLeft + 1.8);
      this.tweens.add({
        targets: target,
        scale: 1,
        alpha: 0,
        duration: 180,
        onComplete: () => this.generateRound(),
      });
      return;
    }

    this.streak = 0;
    this.timeLeft = Math.max(0, this.timeLeft - 3.5);
    this.cameras.main.shake(120, 0.0035);
  }

  /**
   * Codex: ステージ進行に応じてグリッド密度を更新する。
   */
  private updateDifficultyByStage(): void {
    if (this.stage >= 13) {
      this.gridRows = 6;
      this.gridCols = 7;
    } else if (this.stage >= 9) {
      this.gridRows = 5;
      this.gridCols = 6;
    } else if (this.stage >= 5) {
      this.gridRows = 4;
      this.gridCols = 5;
    } else {
      this.gridRows = 3;
      this.gridCols = 4;
    }
  }

  /**
   * Codex: レイアウト変更時に絵文字セルの位置と文字サイズを再計算する。
   */
  private repositionEmojiCells(layout: StageLayout): void {
    const startX = layout.fieldX + layout.cellSize * 0.5;
    const startY = layout.fieldY + layout.cellSize * 0.5;
    const emojiSize = Math.max(26, Math.floor(layout.cellSize * 0.54));

    this.emojiCells.forEach((cell) => {
      cell.text
        .setPosition(startX + cell.col * layout.cellSize, startY + cell.row * layout.cellSize)
        .setFontSize(emojiSize);
    });
  }

  /**
   * Codex: 現在ラウンドの絵文字オブジェクトを破棄する。
   */
  private clearEmojiCells(): void {
    this.emojiCells.forEach((cell) => cell.text.destroy());
    this.emojiCells = [];
  }

  /**
   * Codex: 制限時間終了時の表示へ切り替える。
   */
  private finishGame(): void {
    this.isFinished = true;
    this.clearEmojiCells();
    this.subtitleText.setText('ゲーム終了: 画面タップで再挑戦');
    this.statusText.setText(`最終スコア: ${this.score} / 到達ステージ: ${this.stage}`);
    this.timerText.setText('TIME UP');

    this.input.once('pointerdown', () => {
      this.scene.restart();
    });
  }
}

new Phaser.Game(createConfig([SummaryScene]));
