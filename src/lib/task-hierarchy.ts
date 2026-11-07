/**
 * Returns true when moving a task below candidateParentId would create a cycle.
 * Parent links are traversed all the way to the root, not just one level.
 * Pre-existing corrupt cycles are rejected as well.
 */
export async function wouldCreateTaskCycle(
  taskId: string,
  candidateParentId: string,
  parentOf: (id: string) => Promise<string | null>
): Promise<boolean> {
  const visited = new Set<string>();
  let current: string | null = candidateParentId;
  while (current !== null) {
    if (current === taskId || visited.has(current)) return true;
    visited.add(current);
    current = await parentOf(current);
  }
  return false;
}
