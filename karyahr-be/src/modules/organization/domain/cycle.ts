/**
 * Returns true when assigning newParentId to nodeId would create a parent cycle.
 */
export function wouldCreateCycle(
  nodeId: string,
  newParentId: string | null,
  parentById: ReadonlyMap<string, string | null>,
): boolean {
  if (!newParentId) {
    return false;
  }
  if (newParentId === nodeId) {
    return true;
  }
  const visited = new Set<string>();
  let current: string | null | undefined = newParentId;
  while (current) {
    if (current === nodeId) {
      return true;
    }
    if (visited.has(current)) {
      return true;
    }
    visited.add(current);
    current = parentById.get(current);
  }
  return false;
}
