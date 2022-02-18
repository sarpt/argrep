import dir from "https://deno.land/x/dir@v1.2.0/mod.ts";
import { parse, Args } from "https://deno.land/std@0.120.0/flags/mod.ts";

import { grepFiles } from './grep.ts';
import { Avfs } from "./avfs.ts";
import { forceArrayArgument } from "./utils.ts";
import { LibMagic } from "./libmagic.ts";
import { LibArchive } from "./libarchive.ts";

type Arguments = {
  ['--']: string[],               // arguments to grep after --
  i?: string | string[],          // -i, --i : input file
  r?: string,                     // -r, --r : regex for grep
  pr?: string | string[],         // --pr : path regex
  fr?: string | string[],         // --fr : filename regex
  v?: string,                     // -v : verbose logging
  er?: string | string[],         // --er : extension regex
} & Args;

const args = parse(Deno.args, { "--": true }) as unknown as Arguments;
const homeDir = dir('home');
if (!homeDir) {
  console.error('[ERR] Could not resolve home directory');
  Deno.exit(1);
}

const grepRegex = args.r;
if (!grepRegex) {
  console.error('[ERR] grep regex not provided');
  Deno.exit(1);
}

const providedRootPaths: string[] = args._.length > 0
  ? args._.map(arg => `${arg}`)
  : forceArrayArgument(args.i);


const pathRegexes = forceArrayArgument(args.pr);
const fileNameRegexes = forceArrayArgument(args.fr);
const extensionsRegexes = forceArrayArgument(args.er);
const verbose = !!(args.v);

const libarchive = new LibArchive();
const libmagic = new LibMagic();
const { errMsg: libMagicErr } = libmagic.open();
if (libMagicErr) {
  console.error(`[ERR] could not open libmagic for format deduction: ${libMagicErr}`);
  Deno.exit(1);
}

const avfs = new Avfs(libarchive, libmagic);

const allFilePaths: string[] = [];

for (const rootPath of providedRootPaths) {
  try {
    await Deno.stat(rootPath);
  } catch(err) {
    console.error(`[ERR] Couldn't stat root path '${rootPath}' - could not read the contents: ${err}`);
    continue;
  }

  const regexes = {
    path: pathRegexes,
    fileName: fileNameRegexes,
    extension: extensionsRegexes
  };
  const filePaths = await avfs.extractFiles(rootPath, regexes);

  if (verbose) {
    console.info(`[INF] Found ${filePaths.length} files to grep in path ${rootPath}`);
  }

  allFilePaths.push(...filePaths);
}

const results = await grepFiles(
  allFilePaths,
  {
    options: args['--'],
    regex: grepRegex,
    isMimeType: (mime: string, filePath: string): boolean => {
      const { errMsg, result } = libmagic.file(filePath);
      if (errMsg) {
        return false;
      }

      return result === mime;
    }
  },
);

if (results.length === 0) {
  if (verbose) {
    console.warn(`[WRN] No matches found`);
  }
  libmagic.close();
  Deno.exit(0);
}

for (const result of results) {
  console.log(`${result.path}#${result.line}: ${result.match}`);
}

libmagic.close();