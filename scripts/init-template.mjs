#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

/**
 * Codex: CLI 引数を解析して初期化オプションを返す。
 */
function parseArgs(argv) {
  const options = {
    id: '',
    title: '',
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--id' || arg === '-i') {
      options.id = argv[index + 1] ?? '';
      index += 1;
      continue;
    }

    if (arg === '--title' || arg === '-t') {
      options.title = argv[index + 1] ?? '';
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

  if (!options.id || !options.title) {
    printUsage();
    throw new Error('Codex: --id と --title は必須です。');
  }

  return options;
}

/**
 * Codex: スクリプトの使い方を標準出力へ表示する。
 */
function printUsage() {
  console.log('Usage: node scripts/init-template.mjs --id <project-id> --title <project-title> [--dry-run]');
}

/**
 * Codex: プロジェクトIDを npm package 名として安全な形式へ整形する。
 */
function normalizePackageName(rawId) {
  return rawId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Codex: README の GitHub Pages URL 用にリポジトリ名を整形する。
 */
function normalizeRepositoryNameForUrl(rawId) {
  return rawId
    .trim()
    .replace(/[^A-Za-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Codex: UTF-8 テキストを読み込む。
 */
function readTextFile(targetPath) {
  return fs.readFileSync(targetPath, 'utf8');
}

/**
 * Codex: 変更があるときだけテキストを書き戻す。
 */
function writeTextFile(targetPath, nextContent, dryRun) {
  const currentContent = readTextFile(targetPath);
  if (currentContent === nextContent) {
    return false;
  }

  if (!dryRun) {
    fs.writeFileSync(targetPath, nextContent, 'utf8');
  }

  return true;
}

/**
 * Codex: package.json の name フィールドを更新する。
 */
function updatePackageJson(packageJsonPath, packageName, dryRun) {
  const packageJson = JSON.parse(readTextFile(packageJsonPath));
  packageJson.name = packageName;
  const nextContent = `${JSON.stringify(packageJson, null, 2)}\n`;
  return writeTextFile(packageJsonPath, nextContent, dryRun);
}

/**
 * Codex: HTML の title タグを指定タイトルへ置換する。
 */
function updateHtmlTitle(htmlPath, title, dryRun) {
  const currentContent = readTextFile(htmlPath);
  const nextContent = currentContent.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  return writeTextFile(htmlPath, nextContent, dryRun);
}

/**
 * Codex: README の見出しと GitHub Pages 用 URL を初期化内容へ合わせる。
 */
function updateReadme(readmePath, packageName, repositoryNameForUrl, title, dryRun) {
  const currentContent = readTextFile(readmePath);
  let nextContent = currentContent.replace(/^# .+$/m, `# ${title}`);

  nextContent = nextContent.replace(
    /(https:\/\/[^/\s`]+\.github\.io\/)[^/\s`]+(\/(?:page\d{2}\/)?)/g,
    `$1${repositoryNameForUrl || packageName}$2`,
  );

  return writeTextFile(readmePath, nextContent, dryRun);
}

/**
 * Codex: pageXX ディレクトリ配下の index.html 一覧を返す。
 */
function listPageHtmlPaths(repoRoot) {
  return fs.readdirSync(repoRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^page\d{2}$/.test(entry.name))
    .map((entry) => path.join(repoRoot, entry.name, 'index.html'))
    .filter((targetPath) => fs.existsSync(targetPath))
    .sort((left, right) => left.localeCompare(right));
}

/**
 * Codex: 初期化時に更新したファイル一覧をログ出力する。
 */
function logSummary(changedFiles, dryRun) {
  if (changedFiles.length === 0) {
    console.log('Codex: 更新対象はありませんでした。');
    return;
  }

  const modeLabel = dryRun ? '[dry-run] ' : '';
  console.log(`Codex: ${modeLabel}更新ファイル`);
  changedFiles.forEach((filePath) => {
    console.log(`- ${path.relative(REPO_ROOT, filePath)}`);
  });
}

/**
 * Codex: テンプレート初期化を実行する。
 */
function main() {
  const { id, title, dryRun } = parseArgs(process.argv.slice(2));
  const packageName = normalizePackageName(id);
  const repositoryNameForUrl = normalizeRepositoryNameForUrl(id);

  if (!packageName) {
    throw new Error('Codex: 正規化後の package 名が空です。--id を見直してください。');
  }

  const changedFiles = [];

  const packageJsonPath = path.join(REPO_ROOT, 'package.json');
  if (updatePackageJson(packageJsonPath, packageName, dryRun)) {
    changedFiles.push(packageJsonPath);
  }

  const topIndexPath = path.join(REPO_ROOT, 'index.html');
  if (updateHtmlTitle(topIndexPath, title, dryRun)) {
    changedFiles.push(topIndexPath);
  }

  const readmePath = path.join(REPO_ROOT, 'README.md');
  if (updateReadme(readmePath, packageName, repositoryNameForUrl, title, dryRun)) {
    changedFiles.push(readmePath);
  }

  const pageHtmlPaths = listPageHtmlPaths(REPO_ROOT);
  pageHtmlPaths.forEach((pageHtmlPath) => {
    const pageName = path.basename(path.dirname(pageHtmlPath));
    const pageTitle = `${title} - ${pageName}`;
    if (updateHtmlTitle(pageHtmlPath, pageTitle, dryRun)) {
      changedFiles.push(pageHtmlPath);
    }
  });

  logSummary(changedFiles, dryRun);
}

main();
