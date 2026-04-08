import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BaseResponsiveScene } from '../baseResponsiveScene.ts';
import { BACKGROUND_COLOR, SUBTITLE, TITLE } from './define.ts';

type TableLayout = {
  width: number;
  height: number;
  titleY: number;
  subtitleY: number;
  statusY: number;
  centerX: number;
  centerY: number;
  tileSize: number;
};


type AnimalPlayer = {
  emoji: string;
  name: string;
  seatX: number;
  seatY: number;
  hand: number[];
  score: number;
  wins: number;
  losses: number;
  losesRound: boolean;
  mood: string;
  handGroup: Phaser.GameObjects.Container;
  avatarText: Phaser.GameObjects.Text;
  moodText: Phaser.GameObjects.Text;
  seatLabelText: Phaser.GameObjects.Text;
};

const GRID_SIZE = 6;
const PLAYER_EMOJIS = ['🐶', '🐱', '🐼', '🦊'] as const;
const PLAYER_NAMES = ['いぬ', 'ねこ', 'ぱんだ', 'きつね'] as const;
const MOOD_POOL = ['🙂', '😌', '🤔', '😤', '😺', '🧠'] as const;

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts16SummaryScene';

  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private tableLayer!: Phaser.GameObjects.Container;
  private tileLayer!: Phaser.GameObjects.Container;
  private actorLayer!: Phaser.GameObjects.Container;
  private handLayer!: Phaser.GameObjects.Container;
  private players: AnimalPlayer[] = [];
  private round = 1;
  private turnPlayerIndex = 0;
  private winnerIndex = 0;
  private countdown = 0;
  private currentTileSize = 42;

  /**
   * GPT-5.3-Codex: 観戦ゲームのシーンを初期化する。
   */
  public constructor() {
    super(SummaryScene.key);
  }

  /**
   * GPT-5.3-Codex: 卓面とプレイヤーUIを生成し、ラウンド進行タイマーを起動する。
   */
  public create(): void {
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);

    this.titleText = this.add.text(0, 0, TITLE, {
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      fontSize: '40px',
      color: '#f8fafc',
    }).setOrigin(0.5, 0);

    this.subtitleText = this.add.text(0, 0, SUBTITLE, {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      color: '#cbd5e1',
    }).setOrigin(0.5, 0);

    this.statusText = this.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#fde68a',
      align: 'center',
    }).setOrigin(0.5, 0);

    this.roundText = this.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#93c5fd',
    }).setOrigin(0.5, 0);

    this.tableLayer = this.add.container(0, 0);
    this.tileLayer = this.add.container(0, 0);
    this.actorLayer = this.add.container(0, 0);
    this.handLayer = this.add.container(0, 0);
    this.tableLayer.add([this.tileLayer, this.actorLayer, this.handLayer]);

    this.createTableGrid(this.currentTileSize);
    this.createPlayers();
    this.startNewRound();

    this.time.addEvent({
      delay: 900,
      loop: true,
      callback: () => {
        this.progressRoundStep();
      },
    });

    this.bindResponsiveLayout();
  }

  /**
   * GPT-5.3-Codex: 画面サイズからUIと卓の配置値を計算する。
   */
  protected computeLayout(width: number, height: number): TableLayout {
    const tileSize = Math.max(28, Math.min(52, Math.floor(Math.min(width, height) * 0.05)));
    return {
      width,
      height,
      titleY: Math.max(12, height * 0.02),
      subtitleY: Math.max(56, height * 0.08),
      statusY: Math.max(92, height * 0.135),
      centerX: width * 0.5,
      centerY: Math.max(height * 0.6, 310),
      tileSize,
    };
  }

  /**
   * GPT-5.3-Codex: レイアウト変更時に卓面・プレイヤー座席・手牌を再配置する。
   */
  protected renderLayout(layout: TableLayout): void {
    this.titleText.setPosition(layout.width * 0.5, layout.titleY).setFontSize(Math.max(30, Math.floor(layout.width * 0.034)));
    this.subtitleText.setPosition(layout.width * 0.5, layout.subtitleY).setFontSize(Math.max(14, Math.floor(layout.width * 0.016)));
    this.statusText.setPosition(layout.width * 0.5, layout.statusY).setFontSize(Math.max(13, Math.floor(layout.width * 0.015)));
    this.roundText.setPosition(layout.width * 0.5, layout.statusY + 30).setFontSize(Math.max(12, Math.floor(layout.width * 0.013)));

    this.currentTileSize = layout.tileSize;
    const centerOffsetX = this.toIsometric((GRID_SIZE - 1) / 2, (GRID_SIZE - 1) / 2, layout.tileSize).x;
    this.tableLayer.setPosition(layout.centerX - centerOffsetX, layout.centerY);
    this.createTableGrid(layout.tileSize);
    this.layoutPlayers(layout.tileSize);
  }

  /**
   * GPT-5.3-Codex: クォータービュー卓のタイルを再描画する。
   */
  private createTableGrid(tileSize: number): void {
    this.tileLayer.removeAll(true);

    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        const iso = this.toIsometric(x, y, tileSize);
        const topColor = (x + y) % 2 === 0 ? 0x166534 : 0x15803d;
        const lineColor = 0x052e16;
        const halfW = tileSize;
        const halfH = tileSize * 0.5;

        const top = this.add.polygon(iso.x, iso.y, [0, -halfH, halfW, 0, 0, halfH, -halfW, 0], topColor, 1)
          .setStrokeStyle(1, lineColor, 0.4);
        this.tileLayer.add(top);
      }
    }
  }

  /**
   * GPT-5.3-Codex: 4匹プレイヤーの座席・表情・手牌表示オブジェクトを生成する。
   */
  private createPlayers(): void {
    this.players = PLAYER_EMOJIS.map((emoji, index) => {
      const avatarText = this.add.text(0, 0, emoji, {
        fontFamily: 'sans-serif',
        fontSize: '42px',
      }).setOrigin(0.5, 0.5);

      const moodText = this.add.text(0, 0, '🙂', {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        color: '#e2e8f0',
      }).setOrigin(0.5, 0.5);

      const seatLabelText = this.add.text(0, 0, PLAYER_NAMES[index], {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#f8fafc',
      }).setOrigin(0.5, 0.5);

      const handGroup = this.add.container(0, 0);

      this.actorLayer.add([avatarText, moodText, seatLabelText]);
      this.handLayer.add(handGroup);

      return {
        emoji,
        name: PLAYER_NAMES[index],
        seatX: 0,
        seatY: 0,
        hand: [],
        score: 25000,
        wins: 0,
        losses: 0,
        winsRound: false,
        losesRound: false,
        mood: '🙂',
        handGroup,
        avatarText,
        moodText,
        seatLabelText,
      };
    });

    this.layoutPlayers(this.currentTileSize);
  }

  /**
   * GPT-5.3-Codex: クォータービュー卓の四辺へ各プレイヤーを配置する。
   */
  private layoutPlayers(tileSize: number): void {
    const seats = [
      this.toIsometric(2.5, -1.0, tileSize),
      this.toIsometric(6.0, 2.5, tileSize),
      this.toIsometric(2.5, 6.1, tileSize),
      this.toIsometric(-1.0, 2.5, tileSize),
    ];

    this.players.forEach((player, index) => {
      const seat = seats[index];
      player.seatX = seat.x;
      player.seatY = seat.y;
      player.avatarText.setPosition(seat.x, seat.y - tileSize * 0.65);
      player.moodText.setPosition(seat.x, seat.y - tileSize * 1.1);
      player.seatLabelText.setPosition(seat.x, seat.y - tileSize * 1.48).setFontSize(Math.max(12, Math.floor(tileSize * 0.34)));
    });

    this.redrawAllHands(tileSize);
  }

  /**
   * GPT-5.3-Codex: ラウンド開始時に配牌と勝敗候補を初期化する。
   */
  private startNewRound(): void {
    this.turnPlayerIndex = Phaser.Math.Between(0, this.players.length - 1);
    this.winnerIndex = Phaser.Math.Between(0, this.players.length - 1);

    this.players.forEach((player) => {
      player.hand = this.createInitialHand();
      player.losesRound = false;
      player.mood = '🙂';
    });

    const loserCandidates = this.players.map((_, index) => index).filter((index) => index !== this.winnerIndex);
    const loserIndex = loserCandidates[Phaser.Math.Between(0, loserCandidates.length - 1)];
    this.players[loserIndex].losesRound = true;

    this.countdown = Phaser.Math.Between(5, 8);
    this.updateStatusTexts('配牌完了。手作り開始！');
    this.redrawAllHands(this.currentTileSize);
  }

  /**
   * GPT-5.3-Codex: 一巡ごとのツモ切りを進め、規定手数で勝敗処理を行う。
   */
  private progressRoundStep(): void {
    const player = this.players[this.turnPlayerIndex];
    const drawn = Phaser.Math.Between(1, 9);
    player.hand.push(drawn);

    this.keepBestTiles(player.hand);
    player.mood = MOOD_POOL[Phaser.Math.Between(0, MOOD_POOL.length - 1)];

    this.countdown -= 1;

    if (this.countdown <= 0) {
      this.resolveRound();
      this.round += 1;
      this.startNewRound();
      return;
    }

    this.updateStatusTexts(`${player.emoji}${player.name} が牌を整えた（残り${this.countdown}手）`);
    this.redrawAllHands(this.currentTileSize);
    this.turnPlayerIndex = (this.turnPlayerIndex + 1) % this.players.length;
  }

  /**
   * GPT-5.3-Codex: 勝者と敗者に点棒差分を適用し、戦績を更新する。
   */
  private resolveRound(): void {
    const winner = this.players[this.winnerIndex];
    const loser = this.players.find((player) => player.losesRound);

    winner.score += 3000;
    winner.wins += 1;
    winner.mood = '🎉';

    if (loser) {
      loser.score -= 3000;
      loser.losses += 1;
      loser.mood = '😭';
    }

    this.players.forEach((player) => {
      if (player !== winner && player !== loser) {
        player.mood = '😮';
      }
    });

    this.updateStatusTexts(`和了！ ${winner.emoji}${winner.name} の勝ち / ${loser ? `${loser.emoji}${loser.name}` : '他家'} が放銃`);
    this.redrawAllHands(this.currentTileSize);
  }

  /**
   * GPT-5.3-Codex: 13牌相当の初期手牌を乱数で生成する。
   */
  private createInitialHand(): number[] {
    const hand: number[] = [];
    for (let i = 0; i < 13; i += 1) {
      hand.push(Phaser.Math.Between(1, 9));
    }
    hand.sort((a, b) => a - b);
    return hand;
  }

  /**
   * GPT-5.3-Codex: 手牌を昇順に整え、13牌だけを保持する。
   */
  private keepBestTiles(hand: number[]): void {
    hand.sort((a, b) => a - b);
    while (hand.length > 13) {
      hand.splice(Phaser.Math.Between(0, hand.length - 1), 1);
    }
  }

  /**
   * GPT-5.3-Codex: 全プレイヤーの手牌表示を再生成して可視化する。
   */
  private redrawAllHands(tileSize: number): void {
    this.players.forEach((player, index) => {
      player.handGroup.removeAll(true);
      const compactHand = this.summarizeHand(player.hand);
      compactHand.forEach((tile, tileIndex) => {
        const tileText = this.add.text(tileIndex * tileSize * 0.36, 0, `${tile.value}${tile.label}`, {
          fontFamily: 'monospace',
          fontSize: `${Math.max(12, Math.floor(tileSize * 0.3))}px`,
          color: '#f8fafc',
          backgroundColor: '#0f172a',
          padding: { left: 2, right: 2, top: 1, bottom: 1 },
        }).setOrigin(0.5, 0.5);
        player.handGroup.add(tileText);
      });

      const handOffset = this.computeHandOffset(index, tileSize);
      player.handGroup.setPosition(player.seatX + handOffset.x, player.seatY + handOffset.y);
      player.moodText.setText(player.mood);
    });
  }

  /**
   * GPT-5.3-Codex: 手牌を枚数圧縮し、同牌数を表す簡易ラベルへ変換する。
   */
  private summarizeHand(hand: number[]): Array<{ value: number; label: string }> {
    const countByTile = new Map<number, number>();
    hand.forEach((tile) => {
      countByTile.set(tile, (countByTile.get(tile) ?? 0) + 1);
    });

    return [...countByTile.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([value, count]) => ({
        value,
        label: '🀇'.repeat(Math.min(3, count)),
      }));
  }

  /**
   * GPT-5.3-Codex: 座席ごとに手牌表示位置をずらし、卓を見やすく整える。
   */
  private computeHandOffset(index: number, tileSize: number): { x: number; y: number } {
    const offsets = [
      { x: 0, y: -tileSize * 1.35 },
      { x: tileSize * 1.2, y: 0 },
      { x: 0, y: tileSize * 1.3 },
      { x: -tileSize * 1.2, y: 0 },
    ];
    return offsets[index];
  }

  /**
   * GPT-5.3-Codex: 画面上部の進行情報と戦績テキストを更新する。
   */
  private updateStatusTexts(message: string): void {
    this.statusText.setText(message);
    const scoreLine = this.players
      .map((player) => `${player.emoji}${player.name}:${player.score}`)
      .join('  ');
    const resultLine = this.players
      .map((player) => `勝${player.wins}/負${player.losses}`)
      .join('  ');
    this.roundText.setText(`Round ${this.round}  |  ${scoreLine}\n${resultLine}`);
  }

  /**
   * GPT-5.3-Codex: グリッド座標をクォータービュー向けの等角座標へ変換する。
   */
  private toIsometric(x: number, y: number, tileSize: number): { x: number; y: number } {
    return {
      x: (x - y) * tileSize,
      y: (x + y) * tileSize * 0.5,
    };
  }
}

new Phaser.Game(createConfig([SummaryScene]));
