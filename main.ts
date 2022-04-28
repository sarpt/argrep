import * as path from "https://deno.land/std@0.125.0/path/mod.ts";
import dir from "https://deno.land/x/dir@v1.2.0/mod.ts";
import { Args, parse } from "https://deno.land/std@0.120.0/flags/mod.ts";
import { LibArchive } from "https://raw.githubusercontent.com/sarpt/deno-libarchive/master/mod.ts";

import { grepFile, result } from "./grep.ts";
import { patternsToRegexes, unmatchedByRegexes } from "./regexes.ts";
import { forceArrayArgument } from "./utils.ts";
import { defaultLibmagicPath, LibMagic } from "./libmagic.ts";
import { basename, join } from "https://deno.land/std@0.125.0/path/mod.ts";
import {
  JSONOutput,
  output,
  StandardOutput,
  TextOutput,
  UnixSocketOutput,
} from "./output.ts";

export const defaultLibarchivePath = "/usr/lib/libarchive.so"; // ldconfig aliases path; TODO: either parse ld.so.cache or use ldconfig -p to find this

type Arguments = {
  ["--"]: string[]; // arguments to grep after --
  i?: string | string[]; // -i, --i : input file
  json?: boolean; // --json : json output
  e?: string; // -e, --e : regex pattern for grep
  pe?: string | string[]; // --pe : path regex patterns
  fe?: string | string[]; // --fe : filename regex patterns
  v?: boolean; // -v : verbose logging
  ee?: string | string[]; // --ee : extension regex patterns
  td?: string; // --td : temporary directory for archives extraction
  libmagic?: string; // --libmagic : path to libmagic library
  libarchive?: string; // --libarchive : path to libarchive library
  ["unix-socket-path"]?: string; // --unix-socket-path: path to a unix socket file
  ["ignore-invalid-regex"]?: boolean; // --ignore-invalid-regex : exit on incorrect patterns
} & Args;

const tempDirPrefix = "argrep_";

const args = parse(Deno.args, { "--": true }) as unknown as Arguments;

let parentOut: output;
const unixSocketPath = args["unix-socket-path"];
if (unixSocketPath) {
  const unixout = new UnixSocketOutput();
  const { err: connectionError } = await unixout.connect(unixSocketPath);
  if (connectionError) {
    console.error(
      `'Could not estabilish connection to unix socket at '${unixSocketPath}': ${connectionError}`,
    );
    Deno.exit(1);
  }

  parentOut = unixout;
} else {
  parentOut = new StandardOutput();
}

const out: output = args.json
  ? new JSONOutput(parentOut)
  : new TextOutput(parentOut);

const homeDir = dir("home");
if (!homeDir) {
  out.error("Could not resolve home directory");
  Deno.exit(1);
}

const grepRegexPatterns = forceArrayArgument(args.e);
if (grepRegexPatterns.length < 1) {
  out.error("grep regex patterns not provided");
  Deno.exit(1);
}

const providedRootPaths: string[] = args._.length > 0
  ? args._.map((arg) => `${arg}`)
  : forceArrayArgument(args.i);

const verbose = args.v;

const libArchivePath = args.libarchive
  ? args.libarchive
  : defaultLibarchivePath;
if (verbose) {
  out.info(
    `using '${libArchivePath}' as libarchive path`,
  );
}
const libArchive = new LibArchive({ libpath: libArchivePath });

const libMagicPath = args.libmagic ? args.libmagic : defaultLibmagicPath;
if (verbose) {
  out.info(
    `using '${libMagicPath}' as libmagic path`,
  );
}
const libMagic = new LibMagic();
const { errMsg: libMagicErr } = libMagic.open(libMagicPath);
if (libMagicErr) {
  out.error(
    `could not open libmagic for format deduction: ${libMagicErr}`,
  );
  Deno.exit(1);
}

const tempDir = args.td
  ? args.td
  : await Deno.makeTempDir({ prefix: tempDirPrefix });
if (verbose) {
  out.info(
    `using '${tempDir}' as temporary path for archive extraction`,
  );
}

const ignoreInvalidRegex = args["ignore-invalid-regex"];
const pathPatterns = forceArrayArgument(args.pe);
const { regexes: pathRegexes, errMsgs: pathRegexesErrMsgs } = patternsToRegexes(
  pathPatterns,
);

const fileNamePatterns = forceArrayArgument(args.fe);
const { regexes: fileNameRegexes, errMsgs: fileNameRegexesErrMsgs } =
  patternsToRegexes(fileNamePatterns);

const extensionPatterns = forceArrayArgument(args.ee);
const { regexes: extensionRegexes, errMsgs: extensionRegexesErrMsgs } =
  patternsToRegexes(extensionPatterns);

const regexErrorsPrinter = ignoreInvalidRegex
  ? (wrn: string) => out.warn(`Ignored invalid regex pattern - ${wrn}`)
  : (err: string) => out.error(`Caught invalid regex pattern - ${err}`);
const allRegexErrors = [
  ...pathRegexesErrMsgs,
  ...fileNameRegexesErrMsgs,
  ...extensionRegexesErrMsgs,
];
allRegexErrors.forEach(regexErrorsPrinter);
if (allRegexErrors.length > 0 && !ignoreInvalidRegex) {
  out.error(`Exiting program due to invalid regex pattern provided`);
  Deno.exit(1);
}

const regexes = {
  path: pathRegexes,
  fileName: fileNameRegexes,
  extension: extensionRegexes,
};

const keepUnpackedFiles = false;

const sourcePathsToTempPaths = new Map<string, string>();
const allResults: result[] = [];
for (const rootPath of providedRootPaths) {
  try {
    await Deno.stat(rootPath);
  } catch (err) {
    out.error(
      `couldn't stat root path '${rootPath}' - could not read the contents: ${err}`,
    );
    continue;
  }

  const outPath = join(tempDir, basename(rootPath));
  for await (
    const entry of libArchive.walk(rootPath, outPath, keepUnpackedFiles)
  ) {
    if (entry.errMsg) {
      out.error(
        `error while walking through the "${rootPath}" file: ${entry.errMsg}`,
      );
      continue;
    }
    if (
      entry.isDirectory || entry.isArchive ||
      unmatchedByRegexes(entry.extractedPath, regexes)
    ) {
      continue;
    }

    sourcePathsToTempPaths.set(
      entry.extractedPath,
      entry.extractedPath.replace(tempDir, path.dirname(rootPath)),
    );
    const results = await grepFile(
      entry.extractedPath,
      {
        options: args["--"],
        regexPatterns: grepRegexPatterns,
        isMimeType: (mime: string, filePath: string): boolean => {
          const { errMsg, result } = libMagic.file(filePath);
          if (errMsg) {
            return false;
          }

          return result === mime;
        },
      },
    );

    for (const result of results) {
      out.log(
        `${
          sourcePathsToTempPaths.get(result.path)
        }#${result.line}: ${result.match}`,
      );
    }
    allResults.push(...results);
  }
}

if (!keepUnpackedFiles) {
  try {
    Deno.remove(tempDir, { recursive: true });
  } catch (_err) {
    out.error(`could not delete temporary dir ${tempDir}`);
  }
}

if (allResults.length === 0) {
  if (verbose) {
    out.warn(`no matches found`);
  }
  libMagic.close();
  Deno.exit(0);
}

libMagic.close();
