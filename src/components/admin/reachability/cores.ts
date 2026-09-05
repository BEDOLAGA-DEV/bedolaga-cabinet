/** Ядро Xray показываем номером версии, как оригинал bsbord.com; справочник приходит в статусе. */

export type CoreVersions = Record<string, string> | undefined;

export function coreVersion(cores: CoreVersions, core: string): string {
  return cores?.[core] ?? core;
}
