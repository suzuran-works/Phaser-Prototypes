import Phaser from 'phaser';
import { createConfig } from '../define.ts';
import { BaseResponsiveScene } from '../baseResponsiveScene.ts';
import { BACKGROUND_COLOR, SUBTITLE, TITLE } from './define.ts';

type ShapeKind = 'triangle' | 'square' | 'pentagon';

type ShapeUnit = {
  kind: ShapeKind;
  level: number;
  energy: number;
  age: number;
  speed: number;
  drift: Phaser.Math.Vector2;
  body: Phaser.GameObjects.Polygon;
  aura: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
};

type SceneLayout = {
  width: number;
  height: number;
  titleY: number;
  subtitleY: number;
  statusY: number;
  fieldX: number;
  fieldY: number;
  fieldWidth: number;
  fieldHeight: number;
};

const KIND_ORDER: ShapeKind[] = ['triangle', 'square', 'pentagon'];

class SummaryScene extends BaseResponsiveScene {
  public static readonly key = 'Scripts12SummaryScene';

  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private fieldFrame!: Phaser.GameObjects.Rectangle;

  private units: ShapeUnit[] = [];
  private fusionGauge = 0;
  private observationScore = 0;
  private spawnCooldown = 0;

  /**
   * Codex: 幾何学と観察と育成テーマのゲームシーンを初期化する。
   */
  public constructor() {
    super(SummaryScene.key);
  }

  /**
   * Codex: UI・観察フィールド・初期図形を生成してゲームを開始する。
   */
  public create(): void {
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);

    this.titleText = this.add.text(0, 0, TITLE, {
      fontFamily: 'sans-serif',
      fontSize: '42px',
      color: '#dbeafe',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    this.subtitleText = this.add.text(0, 0, SUBTITLE, {
      fontFamily: 'sans-serif',
      fontSize: '23px',
      color: '#93c5fd',
    }).setOrigin(0.5, 0);

    this.statusText = this.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#bfdbfe',
      align: 'center',
      lineSpacing: 7,
    }).setOrigin(0.5, 0);

    this.fieldFrame = this.add.rectangle(0, 0, 100, 100, 0x0b2538, 0.9)
      .setStrokeStyle(4, 0x60a5fa, 0.8)
      .setOrigin(0, 0);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handlePointer(pointer.x, pointer.y);
    });

    this.bindResponsiveLayout();
    this.seedInitialUnits();
  }

  /**
   * Codex: 図形の挙動更新・融合判定・スコア更新を毎フレーム処理する。
   */
  public update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.05);
    this.spawnCooldown = Math.max(0, this.spawnCooldown - dt);

    this.units.forEach((unit) => {
      unit.age += dt;
      unit.energy = Math.min(100, unit.energy + dt * (2 + unit.level * 0.5));
      this.moveUnit(unit, dt);
      this.renderUnit(unit);
    });

    this.tryAutoFusion();
    this.observationScore += this.units.reduce((sum, unit) => sum + unit.level * 0.5 * dt, 0);

    this.statusText.setText([
      `観察スコア: ${Math.floor(this.observationScore)}   融合ゲージ: ${Math.floor(this.fusionGauge)}%`,
      `図形数: ${this.units.length}   最高レベル: ${this.getHighestLevel()}   クリック: 育成 / 合成`,
      '同種・同レベルを近づけると融合し、より高次の図形へ進化',
    ]);
  }

  /**
   * Codex: 画面サイズに応じてUIと観察フィールドの配置を算出する。
   */
  protected computeLayout(width: number, height: number): SceneLayout {
    const fieldWidth = Math.min(width * 0.82, 880);
    const fieldHeight = Math.min(height * 0.66, 740);
    return {
      width,
      height,
      titleY: Math.max(12, height * 0.025),
      subtitleY: Math.max(56, height * 0.078),
      statusY: Math.max(92, height * 0.13),
      fieldX: (width - fieldWidth) * 0.5,
      fieldY: Math.max(height * 0.23, 170),
      fieldWidth,
      fieldHeight,
    };
  }

  /**
   * Codex: レイアウト反映と図形の境界補正を行う。
   */
  protected renderLayout(layout: SceneLayout): void {
    const titleSize = Math.max(28, Math.floor(Math.min(layout.width, layout.height) * 0.041));
    const subSize = Math.max(16, Math.floor(Math.min(layout.width, layout.height) * 0.022));
    const statusSize = Math.max(13, Math.floor(Math.min(layout.width, layout.height) * 0.02));

    this.titleText.setPosition(layout.width * 0.5, layout.titleY).setFontSize(titleSize);
    this.subtitleText.setPosition(layout.width * 0.5, layout.subtitleY).setFontSize(subSize);
    this.statusText.setPosition(layout.width * 0.5, layout.statusY).setFontSize(statusSize);

    this.fieldFrame
      .setPosition(layout.fieldX, layout.fieldY)
      .setSize(layout.fieldWidth, layout.fieldHeight);

    this.units.forEach((unit) => {
      unit.body.x = Phaser.Math.Clamp(unit.body.x, layout.fieldX + 30, layout.fieldX + layout.fieldWidth - 30);
      unit.body.y = Phaser.Math.Clamp(unit.body.y, layout.fieldY + 30, layout.fieldY + layout.fieldHeight - 30);
      this.renderUnit(unit);
    });
  }

  /**
   * Codex: 開始時の図形ユニットを観察フィールドに配置する。
   */
  private seedInitialUnits(): void {
    for (let index = 0; index < 6; index += 1) {
      const kind = KIND_ORDER[index % KIND_ORDER.length];
      this.spawnUnit(kind, 1);
    }
  }

  /**
   * Codex: クリック位置に応じて育成または新規配置を実行する。
   */
  private handlePointer(x: number, y: number): void {
    const hit = this.units.find((unit) => Phaser.Math.Distance.Between(unit.body.x, unit.body.y, x, y) < 40);
    if (hit) {
      hit.energy = Math.min(100, hit.energy + 30);
      this.observationScore += 6;
      hit.aura.setStrokeStyle(3, 0xfcd34d, 1);
      this.time.delayedCall(120, () => {
        hit.aura.setStrokeStyle(2, 0x93c5fd, 0.8);
      });
      return;
    }

    if (!this.isInsideField(x, y) || this.spawnCooldown > 0 || this.units.length >= 18) {
      return;
    }

    const kind = KIND_ORDER[Phaser.Math.Between(0, KIND_ORDER.length - 1)];
    this.spawnUnit(kind, 1, x, y);
    this.spawnCooldown = 0.25;
  }

  /**
   * Codex: 図形ユニットの移動をフィールド内に制限しながら更新する。
   */
  private moveUnit(unit: ShapeUnit, dt: number): void {
    const bounds = this.fieldFrame.getBounds();
    unit.body.x += unit.drift.x * unit.speed * dt;
    unit.body.y += unit.drift.y * unit.speed * dt;

    const margin = 32;
    if (unit.body.x < bounds.left + margin || unit.body.x > bounds.right - margin) {
      unit.drift.x *= -1;
    }
    if (unit.body.y < bounds.top + margin || unit.body.y > bounds.bottom - margin) {
      unit.drift.y *= -1;
    }

    unit.body.x = Phaser.Math.Clamp(unit.body.x, bounds.left + margin, bounds.right - margin);
    unit.body.y = Phaser.Math.Clamp(unit.body.y, bounds.top + margin, bounds.bottom - margin);
  }

  /**
   * Codex: 図形の見た目と付随ラベルを現在状態に合わせて描画する。
   */
  private renderUnit(unit: ShapeUnit): void {
    const size = 20 + unit.level * 7;
    unit.body.setTo(this.createPolygonPoints(unit.kind, size));
    unit.body.setFillStyle(this.getKindColor(unit.kind, unit.level), 0.95);
    unit.body.setStrokeStyle(2, 0xe0f2fe, 0.9);

    const pulse = 1 + Math.sin(unit.age * 3) * 0.08;
    unit.aura
      .setPosition(unit.body.x, unit.body.y)
      .setRadius(size * 1.15 * pulse)
      .setStrokeStyle(2, 0x93c5fd, 0.75);

    unit.label
      .setPosition(unit.body.x, unit.body.y + size + 12)
      .setText(`Lv.${unit.level} E:${Math.floor(unit.energy)}`);
  }

  /**
   * Codex: 一定条件を満たす同種ユニット同士を自動融合させる。
   */
  private tryAutoFusion(): void {
    for (let first = 0; first < this.units.length; first += 1) {
      for (let second = first + 1; second < this.units.length; second += 1) {
        const a = this.units[first];
        const b = this.units[second];
        if (a.kind !== b.kind || a.level !== b.level || a.energy < 80 || b.energy < 80) {
          continue;
        }

        const distance = Phaser.Math.Distance.Between(a.body.x, a.body.y, b.body.x, b.body.y);
        if (distance > 56) {
          continue;
        }

        this.fuseUnits(a, b);
        return;
      }
    }
  }

  /**
   * Codex: 2つのユニットを1つ上位レベルへ融合させる。
   */
  private fuseUnits(first: ShapeUnit, second: ShapeUnit): void {
    const centerX = (first.body.x + second.body.x) * 0.5;
    const centerY = (first.body.y + second.body.y) * 0.5;

    this.destroyUnit(first);
    this.destroyUnit(second);

    const evolvedLevel = Math.min(9, first.level + 1);
    const evolvedKind = this.nextKind(first.kind, evolvedLevel);
    this.spawnUnit(evolvedKind, evolvedLevel, centerX, centerY);

    this.fusionGauge = Math.min(100, this.fusionGauge + 14);
    this.observationScore += 30 + evolvedLevel * 8;
  }

  /**
   * Codex: 図形ユニットを新規生成して管理配列へ登録する。
   */
  private spawnUnit(kind: ShapeKind, level: number, x?: number, y?: number): void {
    const bounds = this.fieldFrame.getBounds();
    const spawnX = x ?? Phaser.Math.Between(bounds.left + 40, bounds.right - 40);
    const spawnY = y ?? Phaser.Math.Between(bounds.top + 40, bounds.bottom - 40);

    const body = this.add.polygon(spawnX, spawnY, this.createPolygonPoints(kind, 28), 0xffffff, 0.9);
    const aura = this.add.circle(spawnX, spawnY, 28, 0x000000, 0).setStrokeStyle(2, 0x93c5fd, 0.8);
    const label = this.add.text(spawnX, spawnY + 36, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#dbeafe',
    }).setOrigin(0.5, 0);

    const unit: ShapeUnit = {
      kind,
      level,
      energy: Phaser.Math.Between(35, 70),
      age: Phaser.Math.FloatBetween(0, Math.PI * 2),
      speed: Phaser.Math.Between(38, 86),
      drift: new Phaser.Math.Vector2(Phaser.Math.FloatBetween(-1, 1), Phaser.Math.FloatBetween(-1, 1)).normalize(),
      body,
      aura,
      label,
    };

    this.units.push(unit);
    this.renderUnit(unit);
  }

  /**
   * Codex: 図形種別に応じた多角形ポイント列を返す。
   */
  private createPolygonPoints(kind: ShapeKind, radius: number): number[] {
    const sides = kind === 'triangle' ? 3 : kind === 'square' ? 4 : 5;
    const points: number[] = [];
    for (let index = 0; index < sides; index += 1) {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / sides;
      points.push(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    return points;
  }

  /**
   * Codex: 種別とレベルから図形カラーを決定する。
   */
  private getKindColor(kind: ShapeKind, level: number): number {
    const base = kind === 'triangle' ? 0x60a5fa : kind === 'square' ? 0x34d399 : 0xf59e0b;
    const color = Phaser.Display.Color.ValueToColor(base);
    const boost = Math.min(55, level * 7);
    return Phaser.Display.Color.GetColor(
      Phaser.Math.Clamp(color.red + boost, 0, 255),
      Phaser.Math.Clamp(color.green + boost, 0, 255),
      Phaser.Math.Clamp(color.blue + boost, 0, 255),
    );
  }

  /**
   * Codex: 融合後に遷移する図形種別を返す。
   */
  private nextKind(kind: ShapeKind, level: number): ShapeKind {
    if (level % 3 === 0) {
      return 'pentagon';
    }
    if (kind === 'triangle') {
      return 'square';
    }
    if (kind === 'square') {
      return 'pentagon';
    }
    return 'triangle';
  }

  /**
   * Codex: 対象座標が観察フィールド内部かどうかを判定する。
   */
  private isInsideField(x: number, y: number): boolean {
    const bounds = this.fieldFrame.getBounds();
    return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
  }

  /**
   * Codex: 図形ユニットを破棄して管理配列から除外する。
   */
  private destroyUnit(target: ShapeUnit): void {
    target.body.destroy();
    target.aura.destroy();
    target.label.destroy();
    this.units = this.units.filter((unit) => unit !== target);
  }

  /**
   * Codex: 現在ユニットの最高レベルを取得する。
   */
  private getHighestLevel(): number {
    return this.units.reduce((max, unit) => Math.max(max, unit.level), 0);
  }
}

new Phaser.Game(createConfig([SummaryScene]));
