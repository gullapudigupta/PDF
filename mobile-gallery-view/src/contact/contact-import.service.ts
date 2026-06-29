import { ContactImportRecord, ContactProfile, MediaItem } from "../domain";
import { PlatformAdapter } from "../adapters/platform-adapter";
import { randomFallbackName, safeId } from "../utils";

export class ContactImportService {
  constructor(private readonly adapter: PlatformAdapter) {}

  async importContacts(filePath: string): Promise<ContactImportRecord[]> {
    const lower = filePath.toLowerCase();
    if (lower.endsWith(".csv")) {
      const csv = await this.adapter.readTextFile(filePath);
      return this.parseDelimited(csv, ",");
    }
    if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
      return this.parseExcel(filePath);
    }
    throw new Error(`Unsupported contact import format: ${filePath}`);
  }

  mapContacts(
    mediaItems: MediaItem[],
    imported: ContactImportRecord[] | null
  ): ContactProfile[] {
    const results: ContactProfile[] = [];

    if (imported && imported.length > 0) {
      for (const item of imported) {
        const linked = mediaItems
          .filter((media) => media.path.includes(item.contactId) || media.path.includes(item.displayName))
          .map((media) => media.id);

        results.push({
          id: item.contactId,
          displayName: item.displayName,
          sourceType: "imported",
          groupId: item.groupId,
          linkedMediaIds: linked,
          totalMediaSize: mediaItems
            .filter((media) => linked.includes(media.id))
            .reduce((acc, media) => acc + media.fileSize, 0),
        });
      }
      return results;
    }

    let seed = 13;
    for (const media of mediaItems) {
      const id = safeId(media.sourceApp + media.folderType);
      const existing = results.find((row) => row.id === id);
      if (!existing) {
        const generated = randomFallbackName(seed);
        seed += 1;
        results.push({
          id,
          displayName: generated,
          sourceType: "generated",
          linkedMediaIds: [media.id],
          totalMediaSize: media.fileSize,
        });
      } else {
        existing.linkedMediaIds.push(media.id);
        existing.totalMediaSize += media.fileSize;
      }
    }

    return results;
  }

  private parseDelimited(input: string, delimiter: string): ContactImportRecord[] {
    const lines = input
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      return [];
    }

    const headers = lines[0].split(delimiter).map((cell) => cell.trim().toLowerCase());
    const idIndex = headers.findIndex((cell) => cell.includes("id"));
    const nameIndex = headers.findIndex((cell) => cell.includes("name"));
    const groupIndex = headers.findIndex((cell) => cell.includes("group"));

    if (idIndex < 0 || nameIndex < 0) {
      throw new Error("Import must include id and name columns");
    }

    return lines.slice(1).map((line) => {
      const row = line.split(delimiter).map((cell) => cell.trim());
      return {
        contactId: row[idIndex],
        displayName: row[nameIndex],
        groupId: groupIndex >= 0 ? row[groupIndex] : undefined,
      };
    });
  }

  private async parseExcel(filePath: string): Promise<ContactImportRecord[]> {
    try {
      const xlsx = await import("xlsx");
      const binary = await this.adapter.readBinaryFile(filePath);
      const workbook = xlsx.read(binary, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = xlsx.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
      return rows.map((row, index) => ({
        contactId: String(row.id || row.contactId || `contact-${index + 1}`).trim(),
        displayName: String(row.name || row.displayName || `Contact ${index + 1}`).trim(),
        groupId: row.group ? String(row.group).trim() : undefined,
      }));
    } catch (_error) {
      const textFallback = await this.adapter.readTextFile(filePath);
      return this.parseDelimited(textFallback, "\t");
    }
  }
}
