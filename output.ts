import { writeAll } from "https://deno.land/std@0.136.0/streams/mod.ts";
import { result } from "./grep.ts";

export interface logger {
  log(data: string): void;
  info(data: string): void;
  error(msg: string): void;
  warn(msg: string): void;
}

export interface output {
  result(data: result): void;
  info(data: string): void;
  error(msg: string): void;
  warn(msg: string): void;
}

export class StandardOutput implements logger {
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

export class UnixSocketOutput implements logger {
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
  constructor(private logger: logger) {}

  result(result: result): void {
    const resultText = `${result.path}#${result.line}: ${result.match}`;
    this.logger.log(`${resultText}\n`);
  }

  info(data: string): void {
    this.logger.info(`[INF] ${data}\n`);
  }

  error(msg: string): void {
    this.logger.error(`[ERR] ${msg}\n`);
  }

  warn(msg: string): void {
    this.logger.warn(`[WRN] ${msg}\n`);
  }
}

export class JSONOutput implements output {
  constructor(private logger: logger) {}

  result(data: result): void {
    this.logger.log(`${JSON.stringify({ ...data })}\n`);
  }

  info(msg: string): void {
    this.logger.log(`${JSON.stringify({ info: msg })}\n`);
  }

  error(msg: string): void {
    this.logger.error(`${JSON.stringify({ err: msg })}\n`);
  }

  warn(msg: string): void {
    this.logger.warn(`${JSON.stringify({ wrn: msg })}\n`);
  }
}
