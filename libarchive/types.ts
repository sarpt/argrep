import { symbols } from "./symbols.ts";

export type LibArchiveDynamicLibrary = Deno.DynamicLibrary<typeof symbols>;

export enum ArchiveResults {
  OK = 0,
  EOF = 1,
  RETRY = -10,
  WARN = -20,
  FAILED = -25,
  FATAL = -30,
}

export enum ArchiveExtract {
  TIME = 0x0004,
  PERM = 0x0002,
  ACL = 0x0020,
  FFLAGS = 0x0040,
}

export enum ArchiveFormat {
  ARCHIVE_FORMAT_BASE_MASK = 0xff0000,
  ARCHIVE_FORMAT_CPIO = 0x10000,
  ARCHIVE_FORMAT_CPIO_POSIX = (ARCHIVE_FORMAT_CPIO | 1),
  ARCHIVE_FORMAT_CPIO_BIN_LE = (ARCHIVE_FORMAT_CPIO | 2),
  ARCHIVE_FORMAT_CPIO_BIN_BE = (ARCHIVE_FORMAT_CPIO | 3),
  ARCHIVE_FORMAT_CPIO_SVR4_NOCRC = (ARCHIVE_FORMAT_CPIO | 4),
  ARCHIVE_FORMAT_CPIO_SVR4_CRC = (ARCHIVE_FORMAT_CPIO | 5),
  ARCHIVE_FORMAT_CPIO_AFIO_LARGE = (ARCHIVE_FORMAT_CPIO | 6),
  ARCHIVE_FORMAT_CPIO_PWB = (ARCHIVE_FORMAT_CPIO | 7),
  ARCHIVE_FORMAT_SHAR = 0x20000,
  ARCHIVE_FORMAT_SHAR_BASE = (ARCHIVE_FORMAT_SHAR | 1),
  ARCHIVE_FORMAT_SHAR_DUMP = (ARCHIVE_FORMAT_SHAR | 2),
  ARCHIVE_FORMAT_TAR = 0x30000,
  ARCHIVE_FORMAT_TAR_USTAR = (ARCHIVE_FORMAT_TAR | 1),
  ARCHIVE_FORMAT_TAR_PAX_INTERCHANGE = (ARCHIVE_FORMAT_TAR | 2),
  ARCHIVE_FORMAT_TAR_PAX_RESTRICTED = (ARCHIVE_FORMAT_TAR | 3),
  ARCHIVE_FORMAT_TAR_GNUTAR = (ARCHIVE_FORMAT_TAR | 4),
  ARCHIVE_FORMAT_ISO9660 = 0x40000,
  ARCHIVE_FORMAT_ISO9660_ROCKRIDGE = (ARCHIVE_FORMAT_ISO9660 | 1),
  ARCHIVE_FORMAT_ZIP = 0x50000,
  ARCHIVE_FORMAT_EMPTY = 0x60000,
  ARCHIVE_FORMAT_AR = 0x70000,
  ARCHIVE_FORMAT_AR_GNU = (ARCHIVE_FORMAT_AR | 1),
  ARCHIVE_FORMAT_AR_BSD = (ARCHIVE_FORMAT_AR | 2),
  ARCHIVE_FORMAT_MTREE = 0x80000,
  ARCHIVE_FORMAT_RAW = 0x90000,
  ARCHIVE_FORMAT_XAR = 0xA0000,
  ARCHIVE_FORMAT_LHA = 0xB0000,
  ARCHIVE_FORMAT_CAB = 0xC0000,
  ARCHIVE_FORMAT_RAR = 0xD0000,
  ARCHIVE_FORMAT_7ZIP = 0xE0000,
  ARCHIVE_FORMAT_WARC = 0xF0000,
  ARCHIVE_FORMAT_RAR_V5 = 0x100000,
}

export type Options = {
  libpath?: string;
  skippableArchiveFormats?: ArchiveFormat[];
};

export type ArchiveContentsEntry = {
  archivePath: string;
  errMsg?: string;
  extracted: boolean;
  extractedPath: string;
  isDirectory: boolean;
  warnMsg?: string;
};

export type ArchiveWalkEntry = {
  isArchive: boolean;
} & ArchiveContentsEntry;

export type Result = {
  errMsg?: string;
};

export type OpenResult = {
  archive?: Deno.UnsafePointer;
} & Result;
