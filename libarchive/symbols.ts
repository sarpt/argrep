
export const symbols = {
  archive_read_new: {
    parameters: [] as Deno.NativeType[],
    result: 'pointer' as Deno.NativeType // struct archive *
  },
  archive_read_support_filter_all: {
    parameters: [
      'pointer', // struct archive *a
    ] as Deno.NativeType[],
    result: 'void' as Deno.NativeType // not sure
  },
  archive_read_support_format_all: {
    parameters: [
      'pointer', // struct archive *a
    ] as Deno.NativeType[],
    result: 'void' as Deno.NativeType // not sure
  },
  archive_read_support_format_raw: {
    parameters: [
      'pointer', // struct archive *a
    ] as Deno.NativeType[],
    result: 'void' as Deno.NativeType // not sure
  },
  archive_read_support_compression_all: {
    parameters: [
      'pointer', // struct archive *a
    ] as Deno.NativeType[],
    result: 'void' as Deno.NativeType // not sure
  },
  archive_read_open_filename: {
    parameters: [
      'pointer', // struct archive *
      'pointer', // c-string path
      'u32', // block-size
    ] as Deno.NativeType[],
    result: 'i8' as Deno.NativeType // r
  },
  archive_read_next_header: {
    parameters: [
      'pointer', // struct archive *
      'pointer', // struct archive_entry **
    ] as Deno.NativeType[],
    result: 'i8' as Deno.NativeType // r
  },
  archive_entry_pathname: {
    parameters: [
      'pointer', // struct archive_entry *
    ] as Deno.NativeType[],
    result: 'pointer' as Deno.NativeType // path c-string
  },
  archive_read_data_skip: {
    parameters: [
      'pointer', // struct archive *a
    ] as Deno.NativeType[],
    result: 'void' as Deno.NativeType // not sure
  },
  archive_read_free: {
    parameters: [
      'pointer', // struct archive *a
    ] as Deno.NativeType[],
    result: 'i8' as Deno.NativeType // r
  },
  archive_format: {
    parameters: [
      'pointer', // struct archive *a
    ] as Deno.NativeType[],
    result: 'i32' as Deno.NativeType // r
  },
  archive_write_disk_new: {
    parameters: [] as Deno.NativeType[],
    result: 'pointer' as Deno.NativeType // struct archive *
  },
  archive_write_disk_set_options: {
    parameters: [
      'pointer', // struct archive *
      'i32', // flags
    ] as Deno.NativeType[],
    result: 'void' as Deno.NativeType // not sure
  },
  archive_write_disk_set_standard_lookup: {
    parameters: [
      'pointer', // struct archive *
    ] as Deno.NativeType[],
    result: 'void' as Deno.NativeType // not sure
  },
  archive_write_header: {
    parameters: [
      'pointer', // struct archive *
      'pointer', // struct archive_entry **
    ] as Deno.NativeType[],
    result: 'i8' as Deno.NativeType // r
  },
  archive_write_finish_entry: {
    parameters: [
      'pointer', // struct archive *
    ] as Deno.NativeType[],
    result: 'i8' as Deno.NativeType // r
  },
  archive_read_data_block: {
    parameters: [
      'pointer', // struct archive *
      'pointer', // const void **
      'pointer', // size_t * size
      'pointer', // la_int64_t * offset
    ] as Deno.NativeType[],
    result: 'i8' as Deno.NativeType // path c-string
  },
  archive_write_data_block: {
    parameters: [
      'pointer', // struct archive *
      'pointer', // const void *
      'usize', // size_t size
      'u64', // la_int64_t offset
    ] as Deno.NativeType[],
    result: 'i8' as Deno.NativeType // path c-string
  },
  archive_read_close: {
    parameters: [
      'pointer', // struct archive *
    ] as Deno.NativeType[],
    result: 'void' as Deno.NativeType // not sure
  },
  archive_write_close: {
    parameters: [
      'pointer', // struct archive *
    ] as Deno.NativeType[],
    result: 'void' as Deno.NativeType // not sure
  },
  archive_write_free: {
    parameters: [
      'pointer', // struct archive *
    ] as Deno.NativeType[],
    result: 'void' as Deno.NativeType // not sure
  },
  archive_error_string: {
    parameters: [
      'pointer', // struct archive *
    ] as Deno.NativeType[],
    result: 'pointer' as Deno.NativeType // path c-string
  },
  archive_entry_size: {
    parameters: [
      'pointer', // struct archive_entry *
    ] as Deno.NativeType[],
    result: 'usize' as Deno.NativeType // size
  },
  archive_entry_set_pathname: {
    parameters: [
      'pointer', // struct archive_entry *
      'pointer', // c-string path
    ] as Deno.NativeType[],
    result: 'void' as Deno.NativeType
  },
};