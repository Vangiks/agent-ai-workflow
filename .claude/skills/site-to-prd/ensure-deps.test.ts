// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { checkAndInstall } from './ensure-deps.js';

describe('checkAndInstall', () => {
  it('не устанавливает если все зависимости уже есть', () => {
    const installDeps = vi.fn();
    const installPlaywrightBrowsers = vi.fn();
    const log = vi.fn();

    checkAndInstall({
      isInstalled: () => true,
      installDeps,
      installPlaywrightBrowsers,
      log,
    });

    expect(installDeps).not.toHaveBeenCalled();
    expect(installPlaywrightBrowsers).not.toHaveBeenCalled();
  });

  it('устанавливает playwright и tsx если они отсутствуют', () => {
    const installDeps = vi.fn();
    const installPlaywrightBrowsers = vi.fn();
    const log = vi.fn();

    checkAndInstall({
      isInstalled: () => false,
      installDeps,
      installPlaywrightBrowsers,
      log,
    });

    expect(installDeps).toHaveBeenCalledWith(
      expect.arrayContaining(['playwright', 'tsx']),
    );
  });

  it('скачивает Chromium если playwright отсутствует и устанавливается', () => {
    const installDeps = vi.fn();
    const installPlaywrightBrowsers = vi.fn();
    const log = vi.fn();

    checkAndInstall({
      isInstalled: () => false,
      installDeps,
      installPlaywrightBrowsers,
      log,
    });

    expect(installPlaywrightBrowsers).toHaveBeenCalled();
  });

  it('не скачивает Chromium если playwright уже установлен', () => {
    const installDeps = vi.fn();
    const installPlaywrightBrowsers = vi.fn();
    const log = vi.fn();

    checkAndInstall({
      isInstalled: (pkg) => pkg === 'playwright',
      installDeps,
      installPlaywrightBrowsers,
      log,
    });

    expect(installDeps).toHaveBeenCalledWith(['tsx']);
    expect(installPlaywrightBrowsers).not.toHaveBeenCalled();
  });

  it('показывает статус установки', () => {
    const log = vi.fn();

    checkAndInstall({
      isInstalled: () => false,
      installDeps: vi.fn(),
      installPlaywrightBrowsers: vi.fn(),
      log,
    });

    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('Устанавливаю зависимости'),
    );
  });

  it('показывает сообщение о завершении установки', () => {
    const log = vi.fn();

    checkAndInstall({
      isInstalled: () => false,
      installDeps: vi.fn(),
      installPlaywrightBrowsers: vi.fn(),
      log,
    });

    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('Зависимости установлены'),
    );
  });

  it('не выводит сообщений если всё установлено', () => {
    const log = vi.fn();

    checkAndInstall({
      isInstalled: () => true,
      installDeps: vi.fn(),
      installPlaywrightBrowsers: vi.fn(),
      log,
    });

    expect(log).not.toHaveBeenCalled();
  });
});
