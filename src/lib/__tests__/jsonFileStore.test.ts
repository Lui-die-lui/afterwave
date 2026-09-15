import { rm } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { JsonFileStore } from "../jsonFileStore";

const TEST_FILE = "test/json-file-store-spec.json";

afterEach(async () => {
  await rm(path.join(process.cwd(), "data", "test"), { recursive: true, force: true });
});

describe("JsonFileStore", () => {
  it("returns the default value when the file does not exist yet", async () => {
    const store = new JsonFileStore<string[]>(TEST_FILE, []);
    expect(await store.read()).toEqual([]);
  });

  it("persists writes across a fresh store instance pointed at the same file", async () => {
    const storeA = new JsonFileStore<string[]>(TEST_FILE, []);
    await storeA.update((current) => [...current, "a"]);

    const storeB = new JsonFileStore<string[]>(TEST_FILE, []);
    expect(await storeB.read()).toEqual(["a"]);
  });

  it("serializes concurrent updates so none are lost (upsert-by-key style usage)", async () => {
    const store = new JsonFileStore<Record<string, number>>(TEST_FILE, {});
    await Promise.all(
      ["a", "b", "c", "d", "e"].map((key, i) => store.update((current) => ({ ...current, [key]: i })))
    );
    const final = await store.read();
    expect(Object.keys(final).sort()).toEqual(["a", "b", "c", "d", "e"]);
  });
});
