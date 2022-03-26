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

  const output = await p.output();
  const textOutput = new TextDecoder().decode(output);
  const lines = textOutput.split("\n").filter((line) => line);
  if (lines.length === 0) return [];

  const results: result[] = lines.map((line) => {
    const [lineNumber, ...match] = line.split(":");

    return {
      path: filePath,
      line: Number.parseInt(lineNumber),
      match: match.join(":"),
    };
  });

  return results;
}
