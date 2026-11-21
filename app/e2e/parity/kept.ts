// Since the cutover the app is where new content goes (bosses, skill sets, themes,
// ability sounds). The parity checks compare what the backup page already had:
// those entries must stay as they were, and new ones are left out of the comparison.

/** The entries of `mine` that the backup page also has. */
export const kept = <T>(mine: Record<string, T>, theirs: object): Record<string, T> => Object.fromEntries(Object.entries(mine).filter(([k]) => k in theirs))

/** The items of `mine` whose key the backup page also has, in the app's order. */
export const keptList = <T>(mine: T[], theirs: unknown[], key: (x: T) => unknown, theirKey: (x: never) => unknown = key as never) => {
  const have = new Set(theirs.map((x) => theirKey(x as never)))
  return mine.filter((x) => have.has(key(x)))
}
