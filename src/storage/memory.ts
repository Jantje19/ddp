import { Cursor, Doc } from "../subscription";
import { IStorage } from "../storage";

class MemoryStore extends Cursor implements IStorage {
  private storage: Map<string, Record<string, unknown>>;
  private _name: string;

  get name(): string {
    return this._name;
  }

  constructor(name: string) {
    super();
    this._name = name;
    this.storage = new Map();
  }

  async getAll(): Promise<Doc | undefined> {
    return structuredClone(this.storage);
  }

  async get(id: string): Promise<Record<string, unknown> | undefined> {
    return this.storage.get(id);
  }

  async add(id: string, value: Record<string, unknown>): Promise<boolean> {
    if (this.storage.has(id)) {
      return false;
    }
    this.storage.set(id, value);
    this.emit("added", { id, value });
    return true;
  }

  async set(id: string, value: Record<string, unknown>): Promise<boolean> {
    if (!this.storage.has(id)) {
      return false;
    }
    const prevValue = this.storage.get(id)!;
    this.storage.set(id, value);
    this.emit("changed", { id, value, prevValue });
    return true;
  }

  async remove(id: string): Promise<boolean> {
    const removed = this.storage.delete(id);
    if (removed) {
      this.emit("removed", { id });
    }
    return removed;
  }

  cursor(): Cursor {
    return this;
  }

  async close(): Promise<void> {
    this.removeAllListeners();
  }
}

export default MemoryStore;
