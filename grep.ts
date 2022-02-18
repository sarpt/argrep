export type isMimeTypeCb = (mime: string, filepath: string) => boolean;

export type result = {
  path: string,
  line: number,
  match: string,
};

const regularGrep = 'grep';
const grepVariants = [
  {
    cmd: 'xzgrep',
    predicate: (filePath: string, isMimeType: isMimeTypeCb) => {
      return isMimeType('application/x-xz', filePath);
    }
  },
  {
    cmd: 'lzgrep',
    predicate: (filePath: string, isMimeType: isMimeTypeCb) => {
      return isMimeType('application/x-lzma', filePath);
    }
  },
  {
    cmd: regularGrep,
    predicate: () => true
  }
];

export async function grepFiles(
  files: string[],
  {
    options,
    regex,
    isMimeType,
  }: {
    options: string[],
    regex: string,
    isMimeType: isMimeTypeCb,
  }
): Promise<result[]> {
  const matches: result[] = [];

  for (const filePath of files) {
    const grep = grepVariants.find(variant => variant.predicate(filePath, isMimeType))?.cmd || regularGrep;
    const cmd = [
      grep,
      ...options,
      '-n',
      regex,
      filePath,
    ];

    const p = Deno.run({
      cmd,
      stdout: 'piped',        
    });

    const output = await p.output();
    const textOutput = new TextDecoder().decode(output);
    const lines = textOutput.split('\n').filter(line => line);
    if (lines.length === 0) continue;

    const results: result[] = lines.map(line => {
      const [lineNumber, ...match] = line.split(':');
      
      return {
        path: filePath,
        line: Number.parseInt(lineNumber),
        match: match.join(':'),
      }
    });
    matches.push(...results);
  }

  return matches;
}
