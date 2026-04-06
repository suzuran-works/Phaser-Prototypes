import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BaseResponsiveScene } from '../baseResponsiveScene.ts';
import { BACKGROUND_COLOR } from './define.ts';

type SceneLayout = {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
};

type OrbitBall = {
  id: number;
  value: number;
  radius: number;
  mass: number;
  color: number;
  position: Phaser.Math.Vector2;
  velocity: Phaser.Math.Vector2;
  graphics: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
};

const INITIAL_BALL_COUNT = 14;
const CORE_RADIUS = 15;
const BASE_RADIUS = 6.5;
const RADIUS_GROWTH = 1.05;
const GRAVITY_STRENGTH = 600000;
const SOFTENING_DISTANCE = 36;

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts05SummaryScene';

  private layout: SceneLayout = { width: 1080, height: 1080, centerX: 540, centerY: 540 };

  private readonly balls: OrbitBall[] = [];

  private coreBall?: Phaser.GameObjects.Arc;

  private nextBallId = 0;

  /**
   * Codex: 軌道シミュレーションシーンの初期化を行う。
   */
  public constructor() {
    super(SummaryScene.key);
  }

  /**
   * Codex: 背景を黒に設定してレスポンシブ描画を開始する。
   */
  public create(): void {
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);
    this.bindResponsiveLayout();
  }

  /**
   * Codex: 毎フレーム重力計算・衝突判定・玉の再描画を更新する。
   */
  public update(_time: number, delta: number): void {
    if (this.balls.length === 0) {
      return;
    }

    const deltaSec = Math.min(0.04, delta / 1000);
    this.applyGravity(deltaSec);
    this.integratePositions(deltaSec);
    this.resolveCollisions();
    this.renderBalls();
  }

  /**
   * Codex: 現在の画面サイズから中心座標付きレイアウトを生成する。
   */
  protected computeLayout(width: number, height: number): SceneLayout {
    return {
      width,
      height,
      centerX: width / 2,
      centerY: height / 2,
    };
  }

  /**
   * Codex: 初期化時に玉群を生成し、リサイズ時は中心天体のみ再配置する。
   */
  protected renderLayout(layout: SceneLayout): void {
    const isFirstRender = this.balls.length === 0;
    this.layout = layout;

    if (isFirstRender) {
      this.children.removeAll(true);
      this.createCenterCore();
      this.createInitialBalls();
      this.renderBalls();
      return;
    }

    this.coreBall?.setPosition(layout.centerX, layout.centerY);
  }

  /**
   * Codex: 画面中央の黒い中心球を描画する。
   */
  private createCenterCore(): void {
    this.coreBall = this.add.circle(this.layout.centerX, this.layout.centerY, CORE_RADIUS, 0x000000, 1)
      .setStrokeStyle(2, 0x444444, 0.95);
  }

  /**
   * Codex: 初期状態の数値玉をランダム配置し、初速を与えて生成する。
   */
  private createInitialBalls(): void {
    this.balls.length = 0;

    for (let i = 0; i < INITIAL_BALL_COUNT; i += 1) {
      const spawn = this.pickSpawnPosition();
      const tangent = new Phaser.Math.Vector2(-(spawn.y - this.layout.centerY), spawn.x - this.layout.centerX).normalize();
      const randomDirection = Phaser.Math.FloatBetween(-1, 1);
      const orbitSpeed = Phaser.Math.FloatBetween(180, 380);

      this.createBall({
        value: 1,
        position: spawn,
        velocity: tangent.scale(orbitSpeed * randomDirection).add(new Phaser.Math.Vector2(
          Phaser.Math.Between(-90, 90),
          Phaser.Math.Between(-90, 90),
        )),
      });
    }
  }

  /**
   * Codex: 内外半径を制御したドーナツ領域から初期座標を抽選する。
   */
  private pickSpawnPosition(): Phaser.Math.Vector2 {
    const minDistance = 140;
    const maxDistance = Math.min(this.layout.width, this.layout.height) * 0.42;
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Phaser.Math.FloatBetween(minDistance, maxDistance);

    return new Phaser.Math.Vector2(
      this.layout.centerX + Math.cos(angle) * distance,
      this.layout.centerY + Math.sin(angle) * distance,
    );
  }

  /**
   * Codex: 値・座標・速度から表示オブジェクトを含む玉データを作成する。
   */
  private createBall(params: { value: number; position: Phaser.Math.Vector2; velocity: Phaser.Math.Vector2 }): void {
    const graphics = this.add.graphics();
    const label = this.add.text(params.position.x, params.position.y, String(params.value), {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    const radius = this.computeRadius(params.value);
    const mass = this.computeMass(params.value, radius);

    this.balls.push({
      id: this.nextBallId,
      value: params.value,
      radius,
      mass,
      color: this.pickBallColor(params.value),
      position: params.position.clone(),
      velocity: params.velocity.clone(),
      graphics,
      label,
    });

    this.nextBallId += 1;
  }

  /**
   * Codex: 中央球からの疑似万有引力を全玉へ適用する。
   */
  private applyGravity(deltaSec: number): void {
    for (const ball of this.balls) {
      const dx = this.layout.centerX - ball.position.x;
      const dy = this.layout.centerY - ball.position.y;
      const distSq = dx * dx + dy * dy + SOFTENING_DISTANCE * SOFTENING_DISTANCE;
      const dist = Math.sqrt(distSq);
      const accel = GRAVITY_STRENGTH / distSq;

      ball.velocity.x += (dx / dist) * accel * deltaSec;
      ball.velocity.y += (dy / dist) * accel * deltaSec;
    }
  }

  /**
   * Codex: 速度を積分して位置を更新し、画面外へ出た玉は反対側から再登場させる。
   */
  private integratePositions(deltaSec: number): void {
    for (const ball of this.balls) {
      ball.position.x += ball.velocity.x * deltaSec;
      ball.position.y += ball.velocity.y * deltaSec;
      this.wrapBallPosition(ball);
    }
  }

  /**
   * Codex: 画面端を越えた玉を反対側へワープさせ、端反射を発生させない。
   */
  private wrapBallPosition(ball: OrbitBall): void {
    const maxX = this.layout.width;
    const maxY = this.layout.height;

    if (ball.position.x < -ball.radius) {
      ball.position.x = maxX + ball.radius;
    } else if (ball.position.x > maxX + ball.radius) {
      ball.position.x = -ball.radius;
    }

    if (ball.position.y < -ball.radius) {
      ball.position.y = maxY + ball.radius;
    } else if (ball.position.y > maxY + ball.radius) {
      ball.position.y = -ball.radius;
    }
  }

  /**
   * Codex: 玉同士の衝突を判定し、同値加算または異値反射ルールを適用する。
   */
  private resolveCollisions(): void {
    for (let i = 0; i < this.balls.length; i += 1) {
      const a = this.balls[i];
      if (!a) {
        continue;
      }

      for (let j = i + 1; j < this.balls.length; j += 1) {
        const b = this.balls[j];
        if (!b) {
          continue;
        }

        const dx = b.position.x - a.position.x;
        const dy = b.position.y - a.position.y;
        const minDistance = a.radius + b.radius;
        const distSq = dx * dx + dy * dy;

        if (distSq > minDistance * minDistance) {
          continue;
        }

        if (a.value === b.value) {
          this.resolveEqualCollision(a, b);
          continue;
        }

        this.resolveDifferentCollision(a, b);
      }
    }
  }

  /**
   * Codex: 同じ数字同士は反射させ、双方の数値を +1 する。
   */
  private resolveEqualCollision(a: OrbitBall, b: OrbitBall): void {
    const normal = b.position.clone().subtract(a.position);
    const distance = Math.max(0.001, normal.length());
    normal.scale(1 / distance);

    const relativeVelocity = b.velocity.clone().subtract(a.velocity);
    const separatingSpeed = relativeVelocity.dot(normal);

    if (separatingSpeed < 0) {
      const impulse = (-(1 + 1) * separatingSpeed) / (1 / a.mass + 1 / b.mass);
      const impulseVector = normal.clone().scale(impulse);

      a.velocity.subtract(impulseVector.clone().scale(1 / a.mass));
      b.velocity.add(impulseVector.clone().scale(1 / b.mass));
    }

    const overlap = a.radius + b.radius - distance;
    if (overlap > 0) {
      const correction = normal.clone().scale(overlap / 2 + 0.5);
      a.position.subtract(correction);
      b.position.add(correction);
    }

    this.setBallValue(a, a.value + 1);
    this.setBallValue(b, b.value + 1);
  }

  /**
   * Codex: 異なる数字同士は数値を維持したまま弾性反射のみ適用する。
   */
  private resolveDifferentCollision(a: OrbitBall, b: OrbitBall): void {
    const normal = b.position.clone().subtract(a.position);
    const distance = Math.max(0.001, normal.length());
    normal.scale(1 / distance);

    const relativeVelocity = b.velocity.clone().subtract(a.velocity);
    const separatingSpeed = relativeVelocity.dot(normal);

    if (separatingSpeed < 0) {
      const impulse = (-(1 + 1) * separatingSpeed) / (1 / a.mass + 1 / b.mass);
      const impulseVector = normal.clone().scale(impulse);

      a.velocity.subtract(impulseVector.clone().scale(1 / a.mass));
      b.velocity.add(impulseVector.clone().scale(1 / b.mass));
    }

    const overlap = a.radius + b.radius - distance;
    if (overlap > 0) {
      const correction = normal.clone().scale(overlap / 2 + 0.5);
      a.position.subtract(correction);
      b.position.add(correction);
    }
  }

  /**
   * Codex: 玉の値に応じた半径・質量・色・ラベル表示を同期更新する。
   */
  private setBallValue(ball: OrbitBall, nextValue: number): void {
    ball.value = nextValue;
    ball.radius = this.computeRadius(ball.value);
    ball.mass = this.computeMass(ball.value, ball.radius);
    ball.color = this.pickBallColor(ball.value);
    ball.label.setText(String(ball.value));
  }

  /**
   * Codex: 全玉を半径・色・数値ラベル込みで再描画する。
   */
  private renderBalls(): void {
    for (const ball of this.balls) {
      ball.graphics.clear();
      ball.graphics.fillStyle(ball.color, 1);
      ball.graphics.fillCircle(ball.position.x, ball.position.y, ball.radius);
      ball.graphics.lineStyle(2, 0xffffff, 0.45);
      ball.graphics.strokeCircle(ball.position.x, ball.position.y, ball.radius);

      ball.label.setPosition(ball.position.x, ball.position.y);
      const fontSize = Math.max(16, Math.round(14 + ball.radius * 0.36));
      ball.label.setStyle({ fontSize: `${fontSize}px` });
    }
  }

  /**
   * Codex: 数値に応じて玉の半径を緩やかに増加させる。
   */
  private computeRadius(value: number): number {
    return BASE_RADIUS + Math.log2(value + 1) * RADIUS_GROWTH;
  }

  /**
   * Codex: 半径と数値から衝突計算用の仮想質量を求める。
   */
  private computeMass(value: number, radius: number): number {
    return value * 1.8 + radius * 0.7;
  }

  /**
   * Codex: 小さい数字を寒色、大きい数字を暖色に補間して色を返す。
   */
  private pickBallColor(value: number): number {
    const normalized = Phaser.Math.Clamp(Math.log2(value + 1) / 6, 0, 1);
    const hue = Phaser.Math.Linear(220, 18, normalized);
    const saturation = Phaser.Math.Linear(0.62, 0.88, normalized);
    const lightness = Phaser.Math.Linear(0.56, 0.58, normalized);

    const color = Phaser.Display.Color.HSLToColor(hue / 360, saturation, lightness);
    return color.color;
  }
}

new Phaser.Game(createConfig([SummaryScene]));
