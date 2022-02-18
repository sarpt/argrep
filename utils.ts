export function forceArrayArgument<T>(arg: T | T[] | undefined): T[] {
  return Array.isArray(arg) ? arg : (arg ? [arg] : []);
}
