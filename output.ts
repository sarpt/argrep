export interface output {
  log(data: string): void;
  info(data: string): void;
  error(msg: string): void;
  warn(msg: string): void;
}

export class TextConsoleOutput implements output {
  log(data: string): void {
    console.log(data);
  }

  info(data: string): void {
    console.info(`[INF] ${data}`);
  }

  error(msg: string): void {
    console.error(`[ERR] ${msg}`);
  }

  warn(msg: string): void {
    console.warn(`[WRN] ${msg}`);
  }
}

export class JSONConsoleOutput implements output {
  log(data: string): void {
    console.log(JSON.stringify({ data }));
  }

  info(data: string): void {
    console.log(JSON.stringify({ data }));
  }

  error(msg: string): void {
    console.error(JSON.stringify({ err: msg }));
  }

  warn(msg: string): void {
    console.warn(JSON.stringify({ wrn: msg }));
  }
}
