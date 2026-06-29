import { PlatformAdapter } from "./platform-adapter";

export interface AdapterValidationResult {
  target: string;
  isValid: boolean;
  checks: Array<{ name: string; pass: boolean }>;
}

export async function validateRuntimeAdapters(
  adapters: PlatformAdapter[],
  sampleRoot: string
): Promise<AdapterValidationResult[]> {
  const results: AdapterValidationResult[] = [];

  for (const adapter of adapters) {
    const checks: Array<{ name: string; pass: boolean }> = [];

    try {
      await adapter.listMediaFiles(sampleRoot);
      checks.push({ name: "listMediaFiles", pass: true });
    } catch (_error) {
      checks.push({ name: "listMediaFiles", pass: false });
    }

    try {
      await adapter.listFolders(sampleRoot);
      checks.push({ name: "listFolders", pass: true });
    } catch (_error) {
      checks.push({ name: "listFolders", pass: false });
    }

    try {
      adapter.nowIso();
      checks.push({ name: "nowIso", pass: true });
    } catch (_error) {
      checks.push({ name: "nowIso", pass: false });
    }

    results.push({
      target: adapter.target,
      isValid: checks.every((check) => check.pass),
      checks,
    });
  }

  return results;
}
