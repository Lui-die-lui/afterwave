import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_ROOT = path.join(process.cwd(), "data");

/**
 * Minimal durable JSON store: one file per collection, serialized writes
 * (in-process mutex) plus atomic rename so a crash mid-write can't corrupt
 * the file. This is server-only (Node `fs`) — never imported by client code.
 */
export class JsonFileStore<T> {
  private filePath: string;
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor(relativePath: string, private defaultValue: T) {
    this.filePath = path.join(DATA_ROOT, relativePath);
  }

  async read(): Promise<T> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return JSON.parse(raw) as T;
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
        return structuredClone(this.defaultValue);
      }
      throw err;
    }
  }

  /** Serializes read-modify-write cycles so concurrent requests can't clobber each other. */
  async update(mutator: (current: T) => T | Promise<T>): Promise<T> {
    const task = this.writeQueue.then(async () => {
      const current = await this.read();
      const next = await mutator(current);
      await this.writeAtomic(next);
      return next;
    });
    this.writeQueue = task.catch(() => undefined);
    return task;
  }

  private async writeAtomic(value: T): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const tmpPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmpPath, JSON.stringify(value, null, 2), "utf8");
    await rename(tmpPath, this.filePath);
  }
}
