const MIME_TYPE = 0x0000010;

const defaultLibmagicPath = '/usr/lib/libmagic.so'; // ldconfig aliases path; TODO: either parse ld.so.cache or use ldconfig -p to find this

const symbols = {
  magic_open: {
    parameters: [
      'i8',                               // flags
    ] as Deno.NativeType[],
    result: 'pointer' as Deno.NativeType, // cookie
  },
  magic_close: {
    parameters: [
      'pointer',                          // cookie
    ] as Deno.NativeType[],
    result: 'void' as Deno.NativeType,
  },
  magic_file: {
    parameters: [
      'pointer',                          // cookie
      'pointer',                          // path as cstring
    ] as Deno.NativeType[],
    result: 'pointer' as Deno.NativeType, // description as cstring
  },
  magic_load: {
    parameters: [
      'pointer',                          // cookie
      'pointer',                          // database path as cstring, null for default
    ] as Deno.NativeType[],
    result: 'i8' as Deno.NativeType,      // 0 on success, -1 on failure
  },
};

function makeCString(str: string): Uint8Array {
  return new Uint8Array([
    ...new TextEncoder().encode(str),
    0,
  ]);
}

export class LibMagic {
  private lib?: Deno.DynamicLibrary<typeof symbols>;
  private cookie?: Deno.UnsafePointer;

  constructor() {}

  open(libpath: string = defaultLibmagicPath): { errMsg?: string } {
    this.lib = Deno.dlopen(libpath, symbols);

    this.cookie = this.lib.symbols.magic_open(new Int8Array([MIME_TYPE])[0]) as Deno.UnsafePointer;
    if (this.cookie === null) {
      this.close();

      return {
        errMsg: 'could not open libmagic and obtain cookie',
      };
    }

    const loaded = this.lib.symbols.magic_load(this.cookie, null);
    if (loaded === -1) {
      this.close();

      return {
        errMsg: 'could not load default database entries for libmagic',
      };
    }

    return {};
  }

  file(path: string): { result?: string, errMsg?: string } {
    if (!this.lib || !this.cookie) return {
      errMsg: `libmagic is not initialized`,
    };

    const description = this.lib.symbols.magic_file(
      this.cookie,
      makeCString(path)
    ) as Deno.UnsafePointer;

    if (description === null) {
      this.close();

      return {
        errMsg: `could not analyze file ${path}`,
      };
    }

    const descriptionView = new Deno.UnsafePointerView(description)
      .getCString();

    return {
      result: descriptionView
    };
  }

  close() {
    if (!this.lib) return;

    if (this.cookie) this.lib.symbols.magic_close(this.cookie);
    this.lib.close();
  }
}
