import assert from "node:assert/strict";
import { test } from "node:test";
import { wouldCreateTaskCycle } from "../src/lib/task-hierarchy";

function lookup(tree: Record<string, string | null>) {
  return async (id: string): Promise<string | null> => {
    if (!(id in tree)) throw new Error("Unknown task");
    return tree[id];
  };
}

test("allows a task to be moved under an unrelated sibling", async () => {
  assert.equal(await wouldCreateTaskCycle("c", "b", lookup({ a: null, b: "a", c: "a" })), false);
});

test("rejects direct self-parenting", async () => {
  assert.equal(await wouldCreateTaskCycle("a", "a", lookup({ a: null })), true);
});

test("rejects multi-level ancestor cycles", async () => {
  assert.equal(await wouldCreateTaskCycle("a", "d", lookup({ a: null, b: "a", c: "b", d: "c" })), true);
});

test("rejects existing corrupt parent chains", async () => {
  assert.equal(await wouldCreateTaskCycle("x", "b", lookup({ x: null, a: "b", b: "a" })), true);
});

test("does not swallow invalid hierarchy references", async () => {
  await assert.rejects(wouldCreateTaskCycle("a", "unknown", lookup({ a: null })), /Unknown task/);
});
