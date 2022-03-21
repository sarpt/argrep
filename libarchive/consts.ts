import { ArchiveFormat } from "./types.ts";

export const defaultLibarchivePath = "/usr/lib/libarchive.so"; // ldconfig aliases path; TODO: either parse ld.so.cache or use ldconfig -p to find this

// skip MTREE since libarchive can detect regular text files as MTREE archive (https://github.com/libarchive/libarchive/issues/1051)
export const defaultSkippableFormats = [
  ArchiveFormat.ARCHIVE_FORMAT_MTREE,
];
