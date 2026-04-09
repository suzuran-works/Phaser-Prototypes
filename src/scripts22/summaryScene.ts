import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BACKGROUND_COLOR, SUBTITLE, TITLE } from './define.ts';

type Lumina = {
  orb: Phaser.GameObjects.Arc;
  velocity: Phaser.Math.Vector2;
  radius: number;
};

type Wave = {
  ring: Phaser.GameObjects.Arc;
  radius: number;
  thickness: number;
};

const ROUND_TIME_MS = 60_000;
const START_COUNT = 14;
const MAX_COUNT = 26;
const BASE_SPEED = 120;
const WAVE_GROWTH_SPEED = 1_050;
const COMBO_WINDOW_MS = 1_300;

class SummaryScene extends Phaser.Scene {
  public static readonly key = 'Scripts22SummaryScene';

  private luminas: Lumina[] = [];
  private activeWave: Wave | null = null;
  private pointerGlow: Phaser.GameObjects.Arc | null = null;

  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;

  private score = 0;
  private combo = 0;
  private comboDeadline = 0;
  private roundStartedAt = 0;
  private isRoundOver = false;

  public constructor() {
    super(SummaryScene.key);
  }

  public create(): void {
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);
    this.roundStartedAt = this.time.now;

    this.createBackdrop();
    this.spawnLuminas(START_COUNT);
    this.createHud();
    this.createPointerGlow();
    this.bindInput();
  }

  public update(_time: number, delta: number): void {
    if (this.isRoundOver) {
      return;
    }

    this.updateTimer();
    this.updateLuminas(delta / 1000);
    this.updateWave(delta / 1000);
    this.updateComboState();
    this.maybeSpawnAdditionalLumina();
  }

  /**
   * Codex: 背景に低速の星屑を敷き、動いている感覚を作る。
   */
  private createBackdrop(): void {
    const graphics = this.add.graphics();
    const { width, height } = this.scale;

    graphics.fillStyle(0x07102a, 1).fillRect(0, 0, width, height);

    for (let i = 0; i < 120; i += 1) {
      const alpha = Phaser.Math.FloatBetween(0.18, 0.65);
      const radius = Phaser.Math.FloatBetween(1.2, 2.8);
      graphics.fillStyle(0x8aa9ff, alpha);
      graphics.fillCircle(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height), radius);
    }
  }

  /**
   * Codex: 可動粒子を指定数だけ生成する。
   */
  private spawnLuminas(count: number): void {
    const { width, height } = this.scale;

    for (let i = 0; i < count; i += 1) {
      const radius = Phaser.Math.FloatBetween(12, 24);
      const speed = BASE_SPEED + Phaser.Math.FloatBetween(10, 85);
      const velocity = new Phaser.Math.Vector2(1, 0).setAngle(Phaser.Math.FloatBetween(0, Math.PI * 2)).setLength(speed);

      const orb = this.add.circle(
        Phaser.Math.Between(Math.ceil(radius), Math.floor(width - radius)),
        Phaser.Math.Between(Math.ceil(radius), Math.floor(height - radius)),
        radius,
        Phaser.Math.Between(0x5eead4, 0xa78bfa),
        0.92,
      );

      orb.setStrokeStyle(2, 0xf8fafc, 0.5);
      this.luminas.push({ orb, velocity, radius });
    }
  }

  /**
   * Codex: UIテキスト群を初期化する。
   */
  private createHud(): void {
    this.scoreText = this.add.text(28, 24, '', {
      fontSize: '34px',
      color: '#f8fafc',
      fontStyle: 'bold',
    });

    this.comboText = this.add.text(28, 70, '', {
      fontSize: '26px',
      color: '#67e8f9',
      fontStyle: 'bold',
    });

    this.timerText = this.add.text(this.scale.width - 28, 24, '', {
      fontSize: '30px',
      color: '#fde68a',
      fontStyle: 'bold',
    }).setOrigin(1, 0);

    this.add.text(this.scale.width / 2, this.scale.height - 34, `${TITLE}\n${SUBTITLE}\nクリックで衝撃波を放つ`, {
      fontSize: '24px',
      align: 'center',
      color: '#dbeafe',
      lineSpacing: 10,
    }).setOrigin(0.5, 1);

    this.refreshHud();
  }

  /**
   * Codex: ポインター追従のガイドリングを生成する。
   */
  private createPointerGlow(): void {
    this.pointerGlow = this.add.circle(this.scale.width / 2, this.scale.height / 2, 16, 0x22d3ee, 0.28)
      .setStrokeStyle(2, 0xa5f3fc, 0.85);
  }

  /**
   * Codex: クリックで衝撃波を生成し、連打を防止する。
   */
  private bindInput(): void {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.pointerGlow?.setPosition(pointer.x, pointer.y);
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.activeWave || this.isRoundOver) {
        return;
      }

      const ring = this.add.circle(pointer.x, pointer.y, 12, 0x67e8f9, 0.08).setStrokeStyle(5, 0x22d3ee, 0.95);
      this.activeWave = { ring, radius: 12, thickness: 5 };
      this.tweens.add({
        targets: this.pointerGlow,
        scale: 1.35,
        duration: 120,
        yoyo: true,
      });
    });
  }

  /**
   * Codex: 粒子を移動させ、壁反射を処理する。
   */
  private updateLuminas(dt: number): void {
    const { width, height } = this.scale;

    this.luminas.forEach((lumina) => {
      lumina.orb.x += lumina.velocity.x * dt;
      lumina.orb.y += lumina.velocity.y * dt;

      if (lumina.orb.x < lumina.radius || lumina.orb.x > width - lumina.radius) {
        lumina.velocity.x *= -1;
        lumina.orb.x = Phaser.Math.Clamp(lumina.orb.x, lumina.radius, width - lumina.radius);
      }

      if (lumina.orb.y < lumina.radius || lumina.orb.y > height - lumina.radius) {
        lumina.velocity.y *= -1;
        lumina.orb.y = Phaser.Math.Clamp(lumina.orb.y, lumina.radius, height - lumina.radius);
      }
    });
  }

  /**
   * Codex: 衝撃波を拡大し、当たった粒子を得点化して回収する。
   */
  private updateWave(dt: number): void {
    if (!this.activeWave) {
      return;
    }

    this.activeWave.radius += WAVE_GROWTH_SPEED * dt;
    this.activeWave.thickness = Math.max(1.5, this.activeWave.thickness - dt * 4.5);
    this.activeWave.ring.setRadius(this.activeWave.radius).setStrokeStyle(this.activeWave.thickness, 0x22d3ee, 0.85);

    this.collectLuminasByWave(this.activeWave);

    if (this.activeWave.radius > Math.max(this.scale.width, this.scale.height) * 1.2) {
      this.activeWave.ring.destroy();
      this.activeWave = null;
    }
  }

  /**
   * Codex: 波面と粒子の交差判定を行い、得点加算と視覚効果を処理する。
   */
  private collectLuminasByWave(wave: Wave): void {
    const { x: cx, y: cy } = wave.ring;

    const survivors: Lumina[] = [];
    this.luminas.forEach((lumina) => {
      const distance = Phaser.Math.Distance.Between(cx, cy, lumina.orb.x, lumina.orb.y);
      const minHit = wave.radius - Math.max(20, lumina.radius * 1.35);
      const maxHit = wave.radius + Math.max(20, lumina.radius * 1.35);

      if (distance >= minHit && distance <= maxHit) {
        this.onLuminaCollected(lumina);
        return;
      }

      survivors.push(lumina);
    });

    this.luminas = survivors;
  }

  /**
   * Codex: コンボ状態を更新し、回収演出を表示する。
   */
  private onLuminaCollected(lumina: Lumina): void {
    lumina.orb.destroy();

    if (this.time.now <= this.comboDeadline) {
      this.combo += 1;
    } else {
      this.combo = 1;
    }

    this.comboDeadline = this.time.now + COMBO_WINDOW_MS;

    const earned = 90 + this.combo * 35;
    this.score += earned;

    const popText = this.add.text(lumina.orb.x, lumina.orb.y, `+${earned}`, {
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#fef08a',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: popText,
      y: lumina.orb.y - 60,
      alpha: 0,
      duration: 520,
      onComplete: () => popText.destroy(),
    });

    this.refreshHud();
  }

  /**
   * Codex: コンボ猶予切れ時に倍率表示を戻す。
   */
  private updateComboState(): void {
    if (this.combo > 0 && this.time.now > this.comboDeadline) {
      this.combo = 0;
      this.refreshHud();
    }
  }

  /**
   * Codex: 一定以下まで減ったら粒子を補充してテンポを維持する。
   */
  private maybeSpawnAdditionalLumina(): void {
    if (this.luminas.length <= 8 && this.luminas.length < MAX_COUNT) {
      this.spawnLuminas(4);
    }
  }

  /**
   * Codex: 残り時間を計算し、終了時は結果表示に切り替える。
   */
  private updateTimer(): void {
    const elapsed = this.time.now - this.roundStartedAt;
    const remaining = Math.max(0, ROUND_TIME_MS - elapsed);
    this.timerText.setText(`TIME ${Math.ceil(remaining / 1000)}`);

    if (remaining <= 0) {
      this.finishRound();
    }
  }

  /**
   * Codex: 画面左上のスコア表示を同期する。
   */
  private refreshHud(): void {
    this.scoreText.setText(`SCORE ${this.score}`);
    this.comboText.setText(this.combo > 0 ? `COMBO x${this.combo}` : 'COMBO x0');
  }

  /**
   * Codex: ラウンド終了演出と再挑戦の導線を表示する。
   */
  private finishRound(): void {
    if (this.isRoundOver) {
      return;
    }

    this.isRoundOver = true;
    this.activeWave?.ring.destroy();
    this.activeWave = null;

    const panel = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width * 0.78, this.scale.height * 0.4, 0x020617, 0.85)
      .setStrokeStyle(3, 0x67e8f9, 0.6);

    this.add.text(panel.x, panel.y - 80, 'TIME UP', {
      fontSize: '52px',
      fontStyle: 'bold',
      color: '#e2e8f0',
    }).setOrigin(0.5);

    this.add.text(panel.x, panel.y - 8, `最終スコア: ${this.score}`, {
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#fef08a',
    }).setOrigin(0.5);

    const retry = this.add.text(panel.x, panel.y + 88, 'クリックでリトライ', {
      fontSize: '30px',
      color: '#67e8f9',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    retry.once('pointerdown', () => {
      this.scene.restart();
    });
  }
}

new Phaser.Game(createConfig([SummaryScene]));
