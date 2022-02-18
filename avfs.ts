import { walk } from "https://deno.land/std@0.120.0/fs/mod.ts";
import { basename, extname, join } from "https://deno.land/std@0.120.0/path/mod.ts";

import { LibArchive } from "./libarchive.ts";
import { LibMagic } from "./libmagic.ts";

const supportedArchiveMimes = [
  'application/zip',
  // 'application/x-xz', // TODO: add attempt to read xz compressed archives and fallback to xzgrep for xz compressed regular files
  // 'application/x-lzma',
  'application/gzip',
];

type regexes = {
  path?: string[],
  fileName?: string[],
  extension?: string[]
};

export class Avfs {
  constructor(private libArchive: LibArchive, private libMagic: LibMagic, private tempdir: string) {}

  async extractFilesRecursive(archivePath: string, regexes?: regexes): Promise<string[]> {
    const outPath = join(this.tempdir, basename(archivePath));

    const result = this.libArchive.extractFiles(archivePath, outPath);
    if (result.errMsg) {
      console.error(`could not extract files in path ${archivePath} due to error: ${result.errMsg}`)
      return [];
    }

    const files: string[] = [];

    const archives: string[] = [];
    for await(const entry of walk(outPath)) {
      if (!entry.isFile) continue;

      const enterableArchive = this.isEnterableArchive(entry.path);
      if (enterableArchive) {
        archives.push(entry.path);
        continue;
      }

      if (Avfs.ShouldSkipFile(entry.path, regexes)) continue;

      files.push(entry.path);
    }

    for (const archive of archives) {
      const archiveFiles = await this.extractFilesRecursive(archive, regexes);
      files.push(...archiveFiles);
    }

    return files;
  }

  private isEnterableArchive(path: string): boolean {
    const result = this.libMagic.file(path);

    return supportedArchiveMimes.some(mime => mime ===  result.result);
  }

  private static ShouldSkipFile(path: string, regexes?: regexes): boolean {
    const pathRegexes = regexes && regexes.path ? regexes.path : [];
    if (
      pathRegexes.length > 0
        && !pathRegexes.some(pathRegex => path.includes(pathRegex))
    ) return true;

    const fileNameRegexes = regexes && regexes.fileName ? regexes.fileName : [];
    if (
      fileNameRegexes.length > 0
        && !fileNameRegexes.some(fileNameRegex => basename(path).includes(fileNameRegex))
    ) return true;

    const extensionRegexes = regexes && regexes.extension ? regexes.extension : [];
    if (
      extensionRegexes.length > 0
        && !extensionRegexes.some(fileNameRegex => extname(path).includes(fileNameRegex))
    ) return true;

    return false;
  }
}

