import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';

export interface DepChecker {
  isInstalled: (pkg: string) => boolean;
  installDeps: (deps: string[]) => void;
  installPlaywrightBrowsers: () => void;
  log: (msg: string) => void;
}

const REQUIRED_DEPS = ['playwright', 'tsx'] as const;

export function checkAndInstall(checker: DepChecker): void {
  const missing = REQUIRED_DEPS.filter((dep) => !checker.isInstalled(dep));

  if (missing.length === 0) {
    return;
  }

  const needsPlaywright = missing.includes('playwright');

  checker.log(`Устанавливаю зависимости: ${missing.join(', ')}...`);
  checker.installDeps(missing);

  if (needsPlaywright) {
    checker.log('Скачиваю Chromium браузер...');
    checker.installPlaywrightBrowsers();
  }

  checker.log('Зависимости установлены.');
}

function isInstalledDefault(pkg: string): boolean {
  const candidates = [
    resolve(process.cwd(), 'node_modules', pkg),
    resolve(process.cwd(), 'node_modules', '.bin', pkg),
  ];
  return candidates.some((p) => existsSync(p));
}

function detectPackageManager(): string {
  if (existsSync(resolve(process.cwd(), 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(resolve(process.cwd(), 'yarn.lock'))) return 'yarn';
  return 'npm';
}

function main(): void {
  const pm = detectPackageManager();

  checkAndInstall({
    isInstalled: isInstalledDefault,
    installDeps: (deps) => {
      const cmd =
        pm === 'pnpm'
          ? `pnpm add ${deps.join(' ')}`
          : `npm install ${deps.join(' ')}`;
      execSync(cmd, { stdio: 'inherit' });
    },
    installPlaywrightBrowsers: () => {
      execSync('npx playwright install chromium', { stdio: 'inherit' });
    },
    log: (msg) => console.log(msg),
  });
}

if (
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('ensure-deps.ts') ||
    process.argv[1].endsWith('ensure-deps.js'))
) {
  main();
}
