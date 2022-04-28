import { writeAll } from "https://deno.land/std@0.136.0/streams/mod.ts";

export interface output {
  log(data: string): void;
  info(data: string): void;
  error(msg: string): void;
  warn(msg: string): void;
}

export class StandardOutput implements output {
  log(data: string): void {
    const text = new TextEncoder().encode(data);
    writeAll(Deno.stdout, text);
  }

  info(data: string): void {
    const text = new TextEncoder().encode(data);
    writeAll(Deno.stdout, text);
  }

  error(data: string): void {
    const text = new TextEncoder().encode(data);
    writeAll(Deno.stderr, text);
  }

  warn(data: string): void {
    const text = new TextEncoder().encode(data);
    writeAll(Deno.stdout, text);
  }
}

export class UnixSocketOutput implements output {
  private conn?: Deno.Conn;

  async connect(path: string): Promise<{ err?: string }> {
    try {
      this.conn = await Deno.connect({ path, transport: "unix" });
    } catch (err) {
      return { err };
    }

    return {};
  }

  log(data: string): void {
    this.write(data);
  }

  info(data: string): void {
    this.write(data);
  }

  error(msg: string): void {
    this.write(msg);
  }

  warn(msg: string): void {
    this.write(msg);
  }

  private write(data: string) {
    this.conn?.write(new TextEncoder().encode(data));
  }
}

export class TextOutput implements output {
  constructor(private parentOut: output) {}

  log(data: string): void {
    this.parentOut.log(`${data}\n`);
  }

  info(data: string): void {
    this.parentOut.info(`[INF] ${data}\n`);
  }

  error(msg: string): void {
    this.parentOut.error(`[ERR] ${msg}\n`);
  }

  warn(msg: string): void {
    this.parentOut.warn(`[WRN] ${msg}\n`);
  }
}

export class JSONOutput implements output {
  constructor(private parentOut: output) {}

  log(data: string): void {
    this.parentOut.log(JSON.stringify({ data }));
  }

  info(data: string): void {
    this.parentOut.log(JSON.stringify({ data }));
  }

  error(msg: string): void {
    this.parentOut.error(JSON.stringify({ err: msg }));
  }

  warn(msg: string): void {
    this.parentOut.warn(JSON.stringify({ wrn: msg }));
  }
}
