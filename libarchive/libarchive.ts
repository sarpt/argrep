import * as path from "https://deno.land/std@0.125.0/path/mod.ts";
import { ARCHIVE_EXTRACT, ARCHIVE_FORMAT, ARCHIVE_RESULTS, defaultLibarchivePath } from "./consts.ts";
import { symbols } from "./symbols.ts";

const blockSize = 10240; // taken from docs

function makeCString(str: string): Uint8Array {
  return new Uint8Array([
    ...new TextEncoder().encode(str),
    0,
  ]);
}

export class LibArchive {
  private lib: Deno.DynamicLibrary<typeof symbols>;

  constructor(libpath: string = defaultLibarchivePath) {
    this.lib = Deno.dlopen(libpath, symbols);
  }

  open(archivePath: string): { archive?: Deno.UnsafePointer, errMsg?: string } {
    const archive = this.lib.symbols.archive_read_new() as Deno.UnsafePointer;
    this.lib.symbols.archive_read_support_filter_all(archive);
    this.lib.symbols.archive_read_support_format_all(archive);

    const openFilenameResult = this.lib.symbols.archive_read_open_filename(archive, makeCString(archivePath), blockSize); 
    if (openFilenameResult !== ARCHIVE_RESULTS.OK) {
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
    // skip MTREE since libarchive can detect regular text files as MTREE archive (https://github.com/libarchive/libarchive/issues/1051)
    // TODO: check whether not enabling MTREE with archive_read_support_format_* as a format would also be fine as it's would be a preferable method
    // TODO: this shouldn't be here, separate somewhere and make it configurable by options in the constructor
    if (code === ARCHIVE_FORMAT.ARCHIVE_FORMAT_MTREE) return false;

    this.lib.symbols.archive_read_close(archive);
    this.lib.symbols.archive_read_free(archive);

    return true;
  }

  listFiles(archivePath: string): string[] {
    const paths: string[] = [];
    const archive_entry_address = new BigUint64Array(1);

    const { archive, errMsg } = this.open(archivePath);
    if (!archive || errMsg) return paths;

    while (this.isResultOk(this.lib.symbols.archive_read_next_header(archive, archive_entry_address) as number)) {
      const archive_entry = new Deno.UnsafePointer(archive_entry_address[0]);
      const filepath = this.getArchiveEntryPathname(archive_entry);
      paths.push(filepath);
      this.lib.symbols.archive_read_data_skip(archive);
    }

    this.lib.symbols.archive_read_free(archive);

    return paths;
  }

  *walk (archivePath: string, outPath: string): Generator<{ path: string, errMsg?: string, warnMsg?: string, extracted: boolean, isArchive: boolean }, { errMsg?: string }, void> {
    const contents = this.iterateContents(archivePath, outPath);
    for (const entry of contents) {
      if (entry.errMsg) {
        return {
          errMsg: entry.errMsg
        };
      }

      if (!entry.path) break;

      if (!this.isArchive(entry.path)) {
        yield { ...entry, isArchive: false }
        continue;
      }

      yield { ...entry, isArchive: true }

      const archiveWalker = this.walk(entry.path, outPath);
      for (const archiveEntry of archiveWalker) {
        yield archiveEntry
      }
    } 

    return {};
  }

  *iterateContents (archivePath: string, outPath: string): Generator<{ path: string, errMsg?: string, warnMsg?: string, extracted: boolean }, { errMsg?: string }, void> {
    const { archive, errMsg } = this.open(archivePath);
    if (!archive || errMsg) return { errMsg: `archive ${archivePath} could not be opened due to error: ${errMsg}` };

    let r: number;
    const flags = ARCHIVE_EXTRACT.ACL
      | ARCHIVE_EXTRACT.FFLAGS
      | ARCHIVE_EXTRACT.PERM
      | ARCHIVE_EXTRACT.TIME;

    const ext = this.lib.symbols.archive_write_disk_new() as Deno.UnsafePointer;
    this.lib.symbols.archive_write_disk_set_options(ext, flags);
    this.lib.symbols.archive_write_disk_set_standard_lookup(ext);

    const archive_entry_address = new BigUint64Array(1);
    while (true) {
      r = this.lib.symbols.archive_read_next_header(archive, archive_entry_address) as number;
      if (this.isResultEof(r)) break;

      if (this.isResultWarn(r)) {
        console.warn(this.getArchiveError(archive));
      } else if (!this.isResultOk(r)) {
        console.error(this.getArchiveError(archive));
        continue;
      }

      const archiveEntry = new Deno.UnsafePointer(archive_entry_address[0]);

      const pathname = this.getArchiveEntryPathname(archiveEntry);
      const targetPathname = path.join(outPath, pathname);
      this.lib.symbols.archive_entry_set_pathname(archiveEntry, makeCString(targetPathname));

      let extracted = false;
      let errMsg: string | undefined;
      let warnMsg: string | undefined;
      r = this.lib.symbols.archive_write_header(ext, archiveEntry) as number;

      if (!this.isResultOk(r)) {
        errMsg = this.getArchiveError(archive);
      } else if ((this.lib.symbols.archive_entry_size(archiveEntry) as number) <= 0) {
        warnMsg = `skipping entry '${pathname}' due to size being less or equal zero`;
      } else {
        r = this.copyData(archive, ext);

        if (this.isResultWarn(r)) {
          console.warn(this.getArchiveError(archive));
        } else if (!this.isResultOk(r)) {
          errMsg = this.getArchiveError(archive)
        } else {
          extracted = true;
        }
      }

      yield { path: targetPathname, errMsg, warnMsg, extracted };
    }
    
    this.lib.symbols.archive_read_close(archive);
    this.lib.symbols.archive_read_free(archive);
    this.lib.symbols.archive_write_close(ext);
    this.lib.symbols.archive_write_free(ext);
    return {};
  }

  private isResultEof(r: number): boolean {
    return r === ARCHIVE_RESULTS.EOF
  }

  private isResultOk(r: number): boolean {
    return r === ARCHIVE_RESULTS.OK
  }

  private isResultRetry(r: number): boolean {
    return r < ARCHIVE_RESULTS.EOF && r >= ARCHIVE_RESULTS.RETRY
  }

  private isResultWarn(r: number): boolean {
    return r < ARCHIVE_RESULTS.RETRY && r >= ARCHIVE_RESULTS.WARN
  }

  private isResultFailed(r: number): boolean {
    return r < ARCHIVE_RESULTS.WARN && r >= ARCHIVE_RESULTS.FAILED
  }

  private isResultFatal(r: number): boolean {
    return r < ARCHIVE_RESULTS.FAILED && r >= ARCHIVE_RESULTS.FATAL
  }

  private getArchiveError(archive: Deno.UnsafePointer): string {
    return new Deno.UnsafePointerView(this.lib.symbols.archive_error_string(archive) as Deno.UnsafePointer)
      .getCString()
  }

  private getArchiveEntryPathname(archiveEntry: Deno.UnsafePointer): string {
    return new Deno.UnsafePointerView(this.lib.symbols.archive_entry_pathname(archiveEntry) as Deno.UnsafePointer)
      .getCString()
  }

  private copyData(ar: Deno.UnsafePointer, aw: Deno.UnsafePointer): number {
    let r: number;
    
    while (true) {
      const buff = new BigUint64Array(1);
      const offset = new Uint32Array(1); // TODO: this should probably be BigUint64Array but deno gets aneurysm when passing BigUInt64
      const size = new Uint32Array(1); // TODO: this should probably be BigUint64Array but deno gets aneurysm when passing BigUInt64

      r = this.lib.symbols.archive_read_data_block(ar, buff, size, offset) as number;
      if (r === ARCHIVE_RESULTS.EOF)
        return ARCHIVE_RESULTS.OK;

      if (r < ARCHIVE_RESULTS.OK)
        return r;

      r = this.lib.symbols.archive_write_data_block(
        aw,
        new Deno.UnsafePointer(buff[0]),
        size[0],
        offset[0],
      ) as number;

      if (r < ARCHIVE_RESULTS.OK) {
        console.error(this.getArchiveError(aw));

        return r;
      }
    }
  }

  close() {
    if (!this.lib) return;

    this.lib.close();
  }
}
