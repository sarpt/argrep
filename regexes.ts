import { basename, extname } from "https://deno.land/std@0.120.0/path/mod.ts";

type regexes = {
  path?: string[];
  fileName?: string[];
  extension?: string[];
};

export function unmatchedByRegexes(path: string, regexes?: regexes): boolean {
  const pathRegexes = regexes && regexes.path ? regexes.path : [];
  if (
    pathRegexes.length > 0 &&
    !pathRegexes.some((pathRegex) => path.includes(pathRegex))
  ) {
    return true;
  }

  const fileNameRegexes = regexes && regexes.fileName ? regexes.fileName : [];
  if (
    fileNameRegexes.length > 0 &&
    !fileNameRegexes.some((fileNameRegex) =>
      basename(path).includes(fileNameRegex)
    )
  ) {
    return true;
  }

  const extensionRegexes = regexes && regexes.extension
    ? regexes.extension
    : [];
  if (
    extensionRegexes.length > 0 &&
    !extensionRegexes.some((fileNameRegex) =>
      extname(path).includes(fileNameRegex)
    )
  ) {
    return true;
  }

  return false;
}
