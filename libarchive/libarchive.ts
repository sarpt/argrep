import * as path from "https://deno.land/std@0.125.0/path/mod.ts";
import { defaultLibarchivePath, defaultSkippableFormats } from "./consts.ts";
import { symbols } from "./symbols.ts";
import {
  ArchiveContentsEntry,
  ArchiveExtract,
  ArchiveFormat,
  ArchiveResults,
  ArchiveWalkEntry,
  LibArchiveDynamicLibrary,
  OpenResult,
  Options,
  Result,
} from "./types.ts";

const blockSize = 10240; // taken from docs

function makeCString(str: string): Uint8Array {
  return new Uint8Array([
    ...new TextEncoder().encode(str),
    0,
  ]);
}

export class LibArchive {
  private lib: LibArchiveDynamicLibrary;
  private skippableArchiveFormats: ArchiveFormat[];

  constructor({
    libpath = defaultLibarchivePath,
    skippableArchiveFormats = defaultSkippableFormats,
  }: Options = {}) {
    this.lib = Deno.dlopen(libpath, symbols);
    this.skippableArchiveFormats = skippableArchiveFormats;
  }

  open(archivePath: string): OpenResult {
    const archive = this.lib.symbols.archive_read_new() as Deno.UnsafePointer;
    this.lib.symbols.archive_read_support_filter_all(archive);
    this.lib.symbols.archive_read_support_format_all(archive);

    const openFilenameResult = this.lib.symbols.archive_read_open_filename(
      archive,
      makeCString(archivePath),
      blockSize,
    );
    if (openFilenameResult !== ArchiveResults.OK) {
      return { errMsg: this.getArchiveError(archive) };
    }

    return { archive };
  }

  isArchive(archivePath: string): boolean {
    const { archive, errMsg } = this.open(archivePath);
    if (!archive || errMsg) return false;

    const archive_entry_address = new BigUint64Array(1);
    this.lib.symbols.archive_read_next_header(archive, archive_entry_address);
    const code = this.lib.symbols.archive_format(archive);
    if (this.skippableArchiveFormats.some((format) => format === code)) {
      return false;
    }

    this.lib.symbols.archive_read_close(archive);
    this.lib.symbols.archive_read_free(archive);

    return true;
  }

  listFiles(archivePath: string): string[] {
    const paths: string[] = [];
    const archive_entry_address = new BigUint64Array(1);

    const { archive, errMsg } = this.open(archivePath);
    if (!archive || errMsg) return paths;

    while (
      this.isResultOk(
        this.lib.symbols.archive_read_next_header(
          archive,
          archive_entry_address,
        ) as number,
      )
    ) {
      const archive_entry = new Deno.UnsafePointer(archive_entry_address[0]);
      const filepath = this.getArchiveEntryPathname(archive_entry);
      paths.push(filepath);
      this.lib.symbols.archive_read_data_skip(archive);
    }

    this.lib.symbols.archive_read_free(archive);

    return paths;
  }

  *walk(
    archivePath: string,
    outPath: string,
    keepUnpackedFiles?: boolean,
  ): Generator<ArchiveWalkEntry, Result, void> {
    const contents = this.iterateContents(
      archivePath,
      outPath,
      keepUnpackedFiles,
    );
    for (const entry of contents) {
      if (entry.errMsg) {
        return {
          errMsg: entry.errMsg,
        };
      }

      if (!entry.path) break;

      if (!this.isArchive(entry.path)) {
        yield { ...entry, isArchive: false };
        continue;
      }

      yield { ...entry, isArchive: true };

      const archiveOutPath = path.join(outPath, path.basename(entry.path));
      const archiveWalker = this.walk(entry.path, archiveOutPath, keepUnpackedFiles);
      for (const archiveEntry of archiveWalker) {
        yield archiveEntry;
      }
    }

    return {};
  }

  *iterateContents(
    archivePath: string,
    outPath: string,
    keepUnpackedFiles?: boolean,
  ): Generator<ArchiveContentsEntry, Result, void> {
    const { archive, errMsg } = this.open(archivePath);
    if (!archive || errMsg) {
      return {
        errMsg:
          `archive ${archivePath} could not be opened due to error: ${errMsg}`,
      };
    }

    let r: number;
    const flags = ArchiveExtract.ACL |
      ArchiveExtract.FFLAGS |
      ArchiveExtract.PERM |
      ArchiveExtract.TIME;

    const ext = this.lib.symbols.archive_write_disk_new() as Deno.UnsafePointer;
    this.lib.symbols.archive_write_disk_set_options(ext, flags);
    this.lib.symbols.archive_write_disk_set_standard_lookup(ext);

    const archive_entry_address = new BigUint64Array(1);
    while (true) {
      r = this.lib.symbols.archive_read_next_header(
        archive,
        archive_entry_address,
      ) as number;
      if (this.isResultEof(r)) break;

      if (this.isResultWarn(r)) {
        console.warn(
          `[WRN] read next header: ${this.getArchiveError(archive)}`,
        );
      } else if (!this.isResultOk(r)) {
        return {
          errMsg:
            `archive "${archivePath}" iteration failed - unsuccessful read of the next header: ${
              this.getArchiveError(archive)
            }`,
        };
      }

      const archiveEntry = new Deno.UnsafePointer(archive_entry_address[0]);

      const pathname = this.getArchiveEntryPathname(archiveEntry);
      const targetPathname = path.join(outPath, pathname);
      this.lib.symbols.archive_entry_set_pathname(
        archiveEntry,
        makeCString(targetPathname),
      );

      let extracted = false;
      let errMsg: string | undefined;
      let warnMsg: string | undefined;
      r = this.lib.symbols.archive_write_header(ext, archiveEntry) as number;

      if (!this.isResultOk(r)) {
        errMsg = this.getArchiveError(archive);
      } else if (
        (this.lib.symbols.archive_entry_size(archiveEntry) as number) <= 0
      ) {
        errMsg =
          `skipping entry '${pathname}' due to size being less or equal zero`;
      } else {
        r = this.copyData(archive, ext);

        if (this.isResultWarn(r)) {
          warnMsg = `warning during copy of entry '${pathname}': ${
            this.getArchiveError(archive)
          }`;
        } else if (!this.isResultOk(r)) {
          errMsg = this.getArchiveError(archive);
        } else {
          extracted = true;
        }
      }

      yield { path: targetPathname, errMsg, warnMsg, extracted };
      if (!keepUnpackedFiles) {
        try {
          Deno.remove(targetPathname, { recursive: true });
        } catch (_err) {
          console.error(`[ERR] Could not delete file ${targetPathname}`);
        }
      }
    }

    this.lib.symbols.archive_read_close(archive);
    this.lib.symbols.archive_read_free(archive);
    this.lib.symbols.archive_write_close(ext);
    this.lib.symbols.archive_write_free(ext);
    return {};
  }

  private isResultEof(r: number): boolean {
    return r === ArchiveResults.EOF;
  }

  private isResultOk(r: number): boolean {
    return r === ArchiveResults.OK;
  }

  private isResultRetry(r: number): boolean {
    return r < ArchiveResults.EOF && r >= ArchiveResults.RETRY;
  }

  private isResultWarn(r: number): boolean {
    return r < ArchiveResults.RETRY && r >= ArchiveResults.WARN;
  }

  private isResultFailed(r: number): boolean {
    return r < ArchiveResults.WARN && r >= ArchiveResults.FAILED;
  }

  private isResultFatal(r: number): boolean {
    return r < ArchiveResults.FAILED && r >= ArchiveResults.FATAL;
  }

  private getArchiveError(archive: Deno.UnsafePointer): string {
    return new Deno.UnsafePointerView(
      this.lib.symbols.archive_error_string(archive) as Deno.UnsafePointer,
    )
      .getCString();
  }

  private getArchiveEntryPathname(archiveEntry: Deno.UnsafePointer): string {
    return new Deno.UnsafePointerView(
      this.lib.symbols.archive_entry_pathname(
        archiveEntry,
      ) as Deno.UnsafePointer,
    )
      .getCString();
  }

  private copyData(ar: Deno.UnsafePointer, aw: Deno.UnsafePointer): number {
    let r = 0;

    while (true) {
      const buff = new BigUint64Array(1);
      const offset = new Uint32Array(1); // TODO: this should probably be BigUint64Array but deno gets aneurysm when passing BigUInt64
      const size = new Uint32Array(1); // TODO: this should probably be BigUint64Array but deno gets aneurysm when passing BigUInt64

      r = this.lib.symbols.archive_read_data_block(
        ar,
        buff,
        size,
        offset,
      ) as number;
      if (r === ArchiveResults.EOF) {
        return ArchiveResults.OK;
      }

      if (r < ArchiveResults.OK) {
        return r;
      }

      r = this.lib.symbols.archive_write_data_block(
        aw,
        new Deno.UnsafePointer(buff[0]),
        size[0],
        offset[0],
      ) as number;

      if (r < ArchiveResults.OK) {
        console.error(`[ERR] copyData failure: ${this.getArchiveError(aw)}`);

        return r;
      }
    }
  }

  close() {
    if (!this.lib) return;

    this.lib.close();
  }
}
