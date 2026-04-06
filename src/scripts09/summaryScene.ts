import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BaseResponsiveScene } from '../baseResponsiveScene.ts';
import { BACKGROUND_COLOR, SUBTITLE, TITLE } from './define.ts';

type SceneLayout = {
  width: number;
  height: number;
  panelX: number;
  panelY: number;
  panelWidth: number;
  panelHeight: number;
  actionAreaY: number;
  actionGap: number;
};

type FlavorProfile = {
  creaminess: number;
  sweetness: number;
  chill: number;
};

type ActionButton = {
  label: string;
  description: string;
  onClick: () => void;
  x: number;
  y: number;
  width: number;
  height: number;
};

type DailyOrder = {
  customer: string;
  requested: FlavorProfile;
  rewardBase: number;
};

const MAX_STAT = 100;
const MAX_DAY = 12;
const ROUND_TIME_SEC = 28;
const BUTTON_WIDTH = 240;
const BUTTON_HEIGHT = 66;

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts09SummaryScene';

  private layout: SceneLayout = {
    width: 1080,
    height: 1080,
    panelX: 100,
    panelY: 140,
    panelWidth: 880,
    panelHeight: 660,
    actionAreaY: 860,
    actionGap: 22,
  };

  private mainGraphics!: Phaser.GameObjects.Graphics;

  private titleText!: Phaser.GameObjects.Text;

  private statusText!: Phaser.GameObjects.Text;

  private orderText!: Phaser.GameObjects.Text;

  private helpText!: Phaser.GameObjects.Text;

  private ephemeralTexts: Phaser.GameObjects.Text[] = [];

  private actionButtons: ActionButton[] = [];

  private day = 1;

  private score = 0;

  private reputation = 35;

  private coins = 100;

  private milkStock = 8;

  private sugarStock = 8;

  private iceStock = 8;

  private profile: FlavorProfile = {
    creaminess: 52,
    sweetness: 50,
    chill: 55,
  };

  private order: DailyOrder = this.createOrder();

  private roundTimerSec = ROUND_TIME_SEC;

  private gameEnded = false;

  /**
   * GPT-5.3-Codex: アイス育成シミュレーションシーンを初期化する。
   */
  public constructor() {
    super(SummaryScene.key);
  }

  /**
   * GPT-5.3-Codex: UI構築とボタン入力を設定し、レスポンシブ描画を開始する。
   */
  public create(): void {
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);

    this.mainGraphics = this.add.graphics();
    this.titleText = this.add.text(0, 0, '', {
      fontFamily: 'sans-serif',
      fontSize: '34px',
      color: '#7c2d12',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    this.statusText = this.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#431407',
      lineSpacing: 8,
    }).setOrigin(0, 0);

    this.orderText = this.add.text(0, 0, '', {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      color: '#7c2d12',
      lineSpacing: 10,
      wordWrap: { width: 700, useAdvancedWrap: true },
    }).setOrigin(0, 0);

    this.helpText = this.add.text(0, 0, '', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#9a3412',
      align: 'center',
    }).setOrigin(0.5, 1);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const button = this.actionButtons.find((candidate) => this.isInButton(pointer.x, pointer.y, candidate));
      if (!button || this.gameEnded) {
        return;
      }
      button.onClick();
      this.drawScene();
    });

    this.bindResponsiveLayout();
  }

  /**
   * GPT-5.3-Codex: タイマー経過と自然変化を適用し、期限切れで次の日へ進める。
   */
  public update(_time: number, delta: number): void {
    if (this.gameEnded) {
      return;
    }

    const deltaSec = Math.min(0.08, delta / 1000);
    this.roundTimerSec = Math.max(0, this.roundTimerSec - deltaSec);

    // GPT-5.3-Codex: 時間経過で少しずつ溶け、味バランスが崩れる圧力を作る。
    this.profile.chill = Math.max(0, this.profile.chill - deltaSec * 1.8);
    this.profile.sweetness = Phaser.Math.Clamp(this.profile.sweetness - deltaSec * 0.3, 0, MAX_STAT);

    if (this.roundTimerSec <= 0) {
      this.submitOrder(true);
      return;
    }

    this.drawScene();
  }

  /**
   * GPT-5.3-Codex: 画面サイズに応じた情報パネルと操作領域を算出する。
   */
  protected computeLayout(width: number, height: number): SceneLayout {
    const panelWidth = Math.floor(Math.min(width * 0.92, 980));
    const panelHeight = Math.floor(Math.min(height * 0.68, 760));
    return {
      width,
      height,
      panelX: Math.floor((width - panelWidth) / 2),
      panelY: Math.floor(height * 0.1),
      panelWidth,
      panelHeight,
      actionAreaY: Math.floor(height * 0.84),
      actionGap: Math.max(14, Math.floor(width * 0.015)),
    };
  }

  /**
   * GPT-5.3-Codex: レイアウト更新時にボタン配置を再生成し、画面を再描画する。
   */
  protected renderLayout(layout: SceneLayout): void {
    this.layout = layout;
    this.setupButtons();
    this.drawScene();
  }

  /**
   * GPT-5.3-Codex: 操作ボタン群を現在レイアウト基準で構築する。
   */
  private setupButtons(): void {
    const labels = [
      {
        label: 'ミルク追加',
        description: 'コク +12 / 冷たさ -4 / 在庫1',
        onClick: () => this.applyIngredient('milk'),
      },
      {
        label: '砂糖追加',
        description: '甘さ +14 / 冷たさ -2 / 在庫1',
        onClick: () => this.applyIngredient('sugar'),
      },
      {
        label: '急速冷却',
        description: '冷たさ +18 / 在庫1',
        onClick: () => this.applyIngredient('ice'),
      },
      {
        label: '仕上げる',
        description: '注文へ提出して結果判定',
        onClick: () => this.submitOrder(false),
      },
    ] as const;

    const totalWidth = labels.length * BUTTON_WIDTH + (labels.length - 1) * this.layout.actionGap;
    const startX = Math.floor((this.layout.width - totalWidth) / 2);

    this.actionButtons = labels.map((item, index) => ({
      label: item.label,
      description: item.description,
      onClick: item.onClick,
      x: startX + index * (BUTTON_WIDTH + this.layout.actionGap),
      y: this.layout.actionAreaY,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
    }));
  }

  /**
   * GPT-5.3-Codex: 材料投入処理を行い、在庫と味プロファイルを更新する。
   */
  private applyIngredient(type: 'milk' | 'sugar' | 'ice'): void {
    if (type === 'milk') {
      if (this.milkStock <= 0) {
        return;
      }
      this.milkStock -= 1;
      this.profile.creaminess = Phaser.Math.Clamp(this.profile.creaminess + 12, 0, MAX_STAT);
      this.profile.chill = Phaser.Math.Clamp(this.profile.chill - 4, 0, MAX_STAT);
      return;
    }

    if (type === 'sugar') {
      if (this.sugarStock <= 0) {
        return;
      }
      this.sugarStock -= 1;
      this.profile.sweetness = Phaser.Math.Clamp(this.profile.sweetness + 14, 0, MAX_STAT);
      this.profile.chill = Phaser.Math.Clamp(this.profile.chill - 2, 0, MAX_STAT);
      return;
    }

    if (this.iceStock <= 0) {
      return;
    }
    this.iceStock -= 1;
    this.profile.chill = Phaser.Math.Clamp(this.profile.chill + 18, 0, MAX_STAT);
    this.profile.creaminess = Phaser.Math.Clamp(this.profile.creaminess - 3, 0, MAX_STAT);
  }

  /**
   * GPT-5.3-Codex: 注文提出時に一致度を評価し、通貨・評判・日数を進める。
   */
  private submitOrder(isTimeout: boolean): void {
    const gap =
      Math.abs(this.profile.creaminess - this.order.requested.creaminess)
      + Math.abs(this.profile.sweetness - this.order.requested.sweetness)
      + Math.abs(this.profile.chill - this.order.requested.chill);

    const quality = Phaser.Math.Clamp(100 - Math.floor(gap / 2), 0, 100);
    const reward = Math.floor(this.order.rewardBase * (quality / 100));
    const bonus = quality >= 85 ? 40 : 0;
    const penalty = isTimeout ? 30 : 0;

    this.coins += Math.max(0, reward + bonus - penalty);
    this.score += quality * 5 + bonus;
    this.reputation = Phaser.Math.Clamp(this.reputation + Math.floor((quality - 55) / 8) - (isTimeout ? 2 : 0), 0, 100);

    this.day += 1;

    if (this.day > MAX_DAY || this.reputation <= 0) {
      this.gameEnded = true;
      this.drawScene();
      return;
    }

    this.restockByDay();
    this.profile = {
      creaminess: Phaser.Math.Between(44, 58),
      sweetness: Phaser.Math.Between(44, 58),
      chill: Phaser.Math.Between(44, 58),
    };
    this.roundTimerSec = ROUND_TIME_SEC;
    this.order = this.createOrder();
  }

  /**
   * GPT-5.3-Codex: 日次進行に応じて在庫を補充し、後半ほど補充量を増やす。
   */
  private restockByDay(): void {
    const restockPower = 2 + Math.floor(this.day / 4);
    this.milkStock += restockPower;
    this.sugarStock += restockPower;
    this.iceStock += restockPower + 1;
  }

  /**
   * GPT-5.3-Codex: 顧客要求パラメータと報酬基準をランダム生成する。
   */
  private createOrder(): DailyOrder {
    const customers = ['駅前ファミリー', '部活帰り高校生', '常連のバリスタ', '観光客カップル', '夜勤明けスタッフ'];
    return {
      customer: customers[Phaser.Math.Between(0, customers.length - 1)] ?? '通りすがりのお客さん',
      requested: {
        creaminess: Phaser.Math.Between(35, 90),
        sweetness: Phaser.Math.Between(35, 90),
        chill: Phaser.Math.Between(35, 90),
      },
      rewardBase: Phaser.Math.Between(85, 145),
    };
  }

  /**
   * GPT-5.3-Codex: ボタン領域内にポインタがあるかを判定する。
   */
  private isInButton(x: number, y: number, button: ActionButton): boolean {
    return x >= button.x && x <= button.x + button.width && y >= button.y && y <= button.y + button.height;
  }

  /**
   * GPT-5.3-Codex: 背景パネル・グラフ・テキスト・ボタンをまとめて描画する。
   */
  private drawScene(): void {
    this.mainGraphics.clear();
    this.clearEphemeralTexts();

    this.drawPanels();
    this.drawProfileBars();
    this.drawButtons();
    this.drawTexts();
  }

  /**
   * GPT-5.3-Codex: メイン情報パネルと進捗ゲージの土台を描画する。
   */
  private drawPanels(): void {
    this.mainGraphics.fillStyle(0xffedd5, 1);
    this.mainGraphics.fillRoundedRect(this.layout.panelX, this.layout.panelY, this.layout.panelWidth, this.layout.panelHeight, 22);
    this.mainGraphics.lineStyle(3, 0xfb923c, 0.8);
    this.mainGraphics.strokeRoundedRect(this.layout.panelX, this.layout.panelY, this.layout.panelWidth, this.layout.panelHeight, 22);

    const timerRatio = Phaser.Math.Clamp(this.roundTimerSec / ROUND_TIME_SEC, 0, 1);
    this.mainGraphics.fillStyle(0xfdba74, 0.8);
    this.mainGraphics.fillRoundedRect(this.layout.panelX + 24, this.layout.panelY + 18, this.layout.panelWidth - 48, 20, 8);
    this.mainGraphics.fillStyle(0xea580c, 0.95);
    this.mainGraphics.fillRoundedRect(this.layout.panelX + 24, this.layout.panelY + 18, Math.floor((this.layout.panelWidth - 48) * timerRatio), 20, 8);
  }

  /**
   * GPT-5.3-Codex: 現在値と注文値を比較できる3本のバーを描画する。
   */
  private drawProfileBars(): void {
    const baseX = this.layout.panelX + 28;
    const barWidth = this.layout.panelWidth - 56;
    const startY = this.layout.panelY + 240;

    const entries: Array<{ label: string; value: number; target: number; color: number; y: number }> = [
      {
        label: 'コク',
        value: this.profile.creaminess,
        target: this.order.requested.creaminess,
        color: 0xf97316,
        y: startY,
      },
      {
        label: '甘さ',
        value: this.profile.sweetness,
        target: this.order.requested.sweetness,
        color: 0xfacc15,
        y: startY + 92,
      },
      {
        label: '冷たさ',
        value: this.profile.chill,
        target: this.order.requested.chill,
        color: 0x38bdf8,
        y: startY + 184,
      },
    ];

    entries.forEach((entry) => {
      this.mainGraphics.fillStyle(0xfff7ed, 0.9);
      this.mainGraphics.fillRoundedRect(baseX, entry.y, barWidth, 52, 12);

      this.mainGraphics.fillStyle(entry.color, 0.9);
      this.mainGraphics.fillRoundedRect(baseX, entry.y, Math.floor(barWidth * (entry.value / 100)), 52, 12);

      // GPT-5.3-Codex: 注文値を縦ラインで示して目標との差分を視覚化する。
      const targetX = baseX + Math.floor(barWidth * (entry.target / 100));
      this.mainGraphics.lineStyle(4, 0x7c2d12, 0.92);
      this.mainGraphics.beginPath();
      this.mainGraphics.moveTo(targetX, entry.y - 5);
      this.mainGraphics.lineTo(targetX, entry.y + 57);
      this.mainGraphics.strokePath();

      const labelText = this.add.text(baseX + 8, entry.y + 10, `${entry.label} ${Math.round(entry.value)} / 目標 ${entry.target}`, {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        color: '#431407',
        fontStyle: 'bold',
      }).setOrigin(0, 0);
      this.ephemeralTexts.push(labelText);
    });
  }

  /**
   * GPT-5.3-Codex: 操作ボタン群を描画し、各ボタン説明を添える。
   */
  private drawButtons(): void {
    this.actionButtons.forEach((button) => {
      this.mainGraphics.fillStyle(0xfffbeb, 1);
      this.mainGraphics.fillRoundedRect(button.x, button.y, button.width, button.height, 14);
      this.mainGraphics.lineStyle(2, 0xf97316, 0.9);
      this.mainGraphics.strokeRoundedRect(button.x, button.y, button.width, button.height, 14);

      const labelText = this.add.text(button.x + button.width * 0.5, button.y + 10, button.label, {
        fontFamily: 'sans-serif',
        fontSize: '21px',
        color: '#9a3412',
        fontStyle: 'bold',
      }).setOrigin(0.5, 0);
      this.ephemeralTexts.push(labelText);

      const descText = this.add.text(button.x + button.width * 0.5, button.y + 38, button.description, {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#7c2d12',
      }).setOrigin(0.5, 0);
      this.ephemeralTexts.push(descText);
    });
  }

  /**
   * GPT-5.3-Codex: ステータス・注文内容・終了メッセージを更新表示する。
   */
  private drawTexts(): void {
    const fontSize = this.layout.width < 820 ? '18px' : '24px';
    this.titleText
      .setPosition(this.layout.width / 2, 24)
      .setText(`${TITLE} - ${SUBTITLE}`)
      .setFontSize(this.layout.width < 820 ? '26px' : '34px');

    this.statusText
      .setPosition(this.layout.panelX + 28, this.layout.panelY + 58)
      .setFontSize(fontSize)
      .setText([
        `DAY ${this.day}/${MAX_DAY}  SCORE ${this.score}  評判 ${this.reputation}`,
        `コイン ${this.coins}  ミルク ${this.milkStock}  砂糖 ${this.sugarStock}  氷 ${this.iceStock}`,
        `制限時間 ${Math.ceil(this.roundTimerSec)} 秒`,
      ].join('\n'));

    this.orderText
      .setPosition(this.layout.panelX + 28, this.layout.panelY + 155)
      .setWordWrapWidth(this.layout.panelWidth - 56, true)
      .setText([
        `本日の注文: ${this.order.customer}`,
        `求める味: コク ${this.order.requested.creaminess} / 甘さ ${this.order.requested.sweetness} / 冷たさ ${this.order.requested.chill}`,
        '縦線が目標値です。材料を調整して「仕上げる」を押してください。',
      ].join('\n'));

    this.helpText
      .setPosition(this.layout.width / 2, this.layout.height - 18)
      .setFontSize(this.layout.width < 760 ? '15px' : '20px')
      .setText(this.gameEnded
        ? `ゲーム終了！ 最終スコア ${this.score}\nページを再読み込みして再挑戦してください。`
        : 'ヒント: 先に「急速冷却」で土台を作り、最後に甘さを微調整すると安定します。');
  }

  /**
   * GPT-5.3-Codex: 毎フレーム再生成する補助テキストを破棄してメモリ増加を防ぐ。
   */
  private clearEphemeralTexts(): void {
    this.ephemeralTexts.forEach((text) => text.destroy());
    this.ephemeralTexts = [];
  }
}

new Phaser.Game(createConfig([SummaryScene]));
