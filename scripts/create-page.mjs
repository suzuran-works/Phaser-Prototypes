#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

/**
 * Codex: ページ追加スクリプトのCLI引数を解析する。
 */
function parseArgs(argv) {
  const options = {
    page: '',
    subtitle: '',
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--page' || arg === '-p') {
      options.page = argv[index + 1] ?? '';
      index += 1;
      continue;
    }

    if (arg === '--subtitle' || arg === '-s') {
      options.subtitle = argv[index + 1] ?? '';
      index += 1;
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
  }

  if (!options.page) {
    printUsage();
    throw new Error('Codex: --page は必須です。');
  }

  return options;
}

/**
 * Codex: スクリプトの使い方を標準出力へ表示する。
 */
function printUsage() {
  console.log('Usage: node scripts/create-page.mjs --page <number|pageXX> [--subtitle "説明"] [--dry-run]');
}

/**
 * Codex: 入力されたページ識別子を pageXX 形式へ正規化する。
 */
function normalizePageName(pageArg) {
  const trimmed = pageArg.trim();

  const pageNameMatch = trimmed.match(/^page(\d{2})$/);
  if (pageNameMatch) {
    return pageNameMatch[0];
  }

  const numberMatch = trimmed.match(/^\d{1,2}$/);
  if (numberMatch) {
    return `page${numberMatch[0].padStart(2, '0')}`;
  }

  throw new Error('Codex: --page は 2 桁数字（例: 2, 02）または pageXX（例: page02）で指定してください。');
}

/**
 * Codex: pageXX から scriptsXX 名と Scene キーを組み立てる。
 */
function buildPageMetadata(pageName, subtitle) {
  const suffix = pageName.replace('page', '');
  return {
    pageName,
    scriptsName: `scripts${suffix}`,
    sceneKey: `Scripts${suffix}SummaryScene`,
    subtitle: subtitle || `新規ページ ${pageName} の説明をここへ記述`,
  };
}

/**
 * Codex: 対象ページがすでに存在する場合は作成を停止する。
 */
function ensurePageDoesNotExist(metadata) {
  const pageDir = path.join(REPO_ROOT, metadata.pageName);
  const scriptsDir = path.join(REPO_ROOT, 'src', metadata.scriptsName);

  if (fs.existsSync(pageDir) || fs.existsSync(scriptsDir)) {
    throw new Error(`Codex: ${metadata.pageName} または src/${metadata.scriptsName} が既に存在します。`);
  }
}

/**
 * Codex: 追加予定ファイルの内容を組み立てる。
 */
function buildFilePlans(metadata) {
  const pageIndexPath = path.join(REPO_ROOT, metadata.pageName, 'index.html');
  const definePath = path.join(REPO_ROOT, 'src', metadata.scriptsName, 'define.ts');
  const summaryPath = path.join(REPO_ROOT, 'src', metadata.scriptsName, 'summaryScene.ts');

  return [
    {
      filePath: pageIndexPath,
      content: `<!doctype html>\n<html lang="ja">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>${metadata.pageName}</title>\n    <style>\n      html,\n      body {\n        width: 100%;\n        height: 100%;\n        margin: 0;\n        padding: 0;\n        background: #333333;\n        overflow: hidden;\n      }\n\n      #game-root {\n        width: 100vw;\n        height: 100vh;\n        height: 100dvh;\n      }\n    </style>\n  </head>\n  <body>\n    <div id="game-root"></div>\n    <script type="module" src="/src/${metadata.scriptsName}/summaryScene.ts"></script>\n  </body>\n</html>\n`,
    },
    {
      filePath: definePath,
      content: `export const TITLE = '${metadata.pageName}';\nexport const SUBTITLE = '${metadata.subtitle}';\nexport const BACKGROUND_COLOR = 0x123524;\n`,
    },
    {
      filePath: summaryPath,
      content: `import Phaser from 'phaser';\nimport { createConfig } from '../define.ts';\nimport { BaseResponsiveScene } from '../baseResponsiveScene.ts';\nimport { BACKGROUND_COLOR, TITLE } from './define.ts';\n\nconst TYPOGRAPHY_TOKENS = {\n  maxFontSizePx: 72,\n  minFontSizePx: 40,\n  widthRatio: 0.08,\n} as const;\n\ntype CenterTextLayout = {\n  x: number;\n  y: number;\n  textSizePx: number;\n};\n\nclass SummaryScene extends BaseResponsiveScene {\n  public static readonly key = '${metadata.sceneKey}';\n\n  public constructor() {\n    super(SummaryScene.key);\n  }\n\n  public create(): void {\n    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);\n    this.bindResponsiveLayout();\n  }\n\n  /**\n   * Codex: 表示幅に応じた中央テキストの座標と文字サイズを算出する。\n   */\n  protected computeLayout(width: number, height: number): CenterTextLayout {\n    return {\n      x: width / 2,\n      y: height / 2,\n      textSizePx: Math.min(\n        TYPOGRAPHY_TOKENS.maxFontSizePx,\n        Math.max(TYPOGRAPHY_TOKENS.minFontSizePx, Math.round(width * TYPOGRAPHY_TOKENS.widthRatio)),\n      ),\n    };\n  }\n\n  /**\n   * Codex: 計算結果を使って中央テキストを再描画する。\n   */\n  protected renderLayout(layout: CenterTextLayout): void {\n    this.children.removeAll(true);\n    this.add.text(layout.x, layout.y, TITLE, {\n      fontSize: String(layout.textSizePx) + 'px',\n      color: '#ecfdf5',\n      fontStyle: 'bold',\n    }).setOrigin(0.5);\n  }\n}\n\nnew Phaser.Game(createConfig([SummaryScene]));\n`,
    },
  ];
}

/**
 * Codex: ファイルを新規作成し、dry-run では出力だけ行う。
 */
function writeFilePlans(filePlans, dryRun) {
  filePlans.forEach(({ filePath, content }) => {
    if (!dryRun) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content, 'utf8');
    }

    console.log(`${dryRun ? '[dry-run] ' : ''}created: ${path.relative(REPO_ROOT, filePath)}`);
  });
}

/**
 * Codex: vite.config.ts へ追記すべき設定のガイドを表示する。
 */
function printViteGuide(metadata) {
  console.log('\nCodex: 次に vite.config.ts の rollupOptions.input へ以下を追加してください。');
  console.log(`  ${metadata.pageName}: resolve(__dirname, '${metadata.pageName}', 'index.html'),`);
}

/**
 * Codex: ページ雛形を生成し、追記ガイドを出力する。
 */
function main() {
  const { page, subtitle, dryRun } = parseArgs(process.argv.slice(2));
  const pageName = normalizePageName(page);
  const metadata = buildPageMetadata(pageName, subtitle);

  ensurePageDoesNotExist(metadata);

  const filePlans = buildFilePlans(metadata);
  writeFilePlans(filePlans, dryRun);
  printViteGuide(metadata);
}

main();
