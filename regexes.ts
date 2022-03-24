import { basename, extname } from "https://deno.land/std@0.120.0/path/mod.ts";

type regexes = {
  path?: RegExp[];
  fileName?: RegExp[];
  extension?: RegExp[];
};

export function unmatchedByRegexes(path: string, regexes?: regexes): boolean {
  const pathRegexes = regexes && regexes.path ? regexes.path : [];
  if (
    pathRegexes.length > 0 &&
    !pathRegexes.some((pathRegex) => {
      return pathRegex.test(path);
    })
  ) {
    return true;
  }

  const fileNameRegexes = regexes && regexes.fileName ? regexes.fileName : [];
  if (
    fileNameRegexes.length > 0 &&
    !fileNameRegexes.some((fileNameRegex) => {
      return fileNameRegex.test(basename(path));
    })
  ) {
    return true;
  }

  const extensionRegexes = regexes && regexes.extension
    ? regexes.extension
    : [];
  if (
    extensionRegexes.length > 0 &&
    !extensionRegexes.some((extensionRegex) => {
      return extensionRegex.test(extname(path));
    })
  ) {
    return true;
  }

  return false;
}

export function patternsToRegexes(
  patterns: string[],
): { regexes: RegExp[]; errMsgs: string[] } {
  const errMsgs: string[] = [];
  const regexes: RegExp[] = [];

  patterns.forEach((pattern) => {
    try {
      const regex = new RegExp(pattern);
      regexes.push(regex);
    } catch (err) {
      errMsgs.push(
        `couldn't construct regexp from pattern "${pattern}": ${err}`,
      );
    }
  });

  return { regexes, errMsgs };
}
