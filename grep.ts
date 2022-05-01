import { readLines } from "https://deno.land/std@0.137.0/io/mod.ts";
import { readerFromStreamReader } from "https://deno.land/std@0.137.0/streams/conversion.ts";

export type isMimeTypeCb = (mime: string, filepath: string) => boolean;

export type result = {
  path: string;
  line: number;
  match: string;
};

const lineNumberArg = "-n";
const regexPatternArg = "-e";

const regularGrep = "grep";
const grepVariants = [
  {
    cmd: "xzgrep",
    predicate: (filePath: string, isMimeType: isMimeTypeCb) => {
      return isMimeType("application/x-xz", filePath);
    },
  },
  {
    cmd: "lzgrep",
    predicate: (filePath: string, isMimeType: isMimeTypeCb) => {
      return isMimeType("application/x-lzma", filePath);
    },
  },
  {
    cmd: regularGrep,
    predicate: () => true,
  },
];

export async function grepFile(
  filePath: string,
  {
    options,
    regexPatterns,
    isMimeType,
  }: {
    options: string[];
    regexPatterns: string[];
    isMimeType: isMimeTypeCb;
  },
): Promise<result[]> {
  const grep =
    grepVariants.find((variant) => variant.predicate(filePath, isMimeType))
      ?.cmd || regularGrep;

  const regexes = regexPatterns.reduce((acc, pattern) => {
    return [...acc, regexPatternArg, pattern];
  }, [] as string[]);

  const cmd = [
    grep,
    ...options,
    lineNumberArg,
    ...regexes,
    filePath,
  ];

  const p = Deno.run({
    cmd,
    stdout: "piped",
  });

  const results: result[] = [];
  const stdoutReader = readerFromStreamReader(p.stdout.readable.getReader());

  for await (const line of readLines(stdoutReader)) {
    const [lineNumber, ...match] = line.split(":");

    results.push(
      {
        path: filePath,
        line: Number.parseInt(lineNumber),
        match: match.join(":"),
      },
    );
  }

  return results;
}
