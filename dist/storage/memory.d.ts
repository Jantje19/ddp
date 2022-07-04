import { Cursor, Doc } from "../subscription";
import { IStorage } from "../storage";
declare class MemoryStore extends Cursor implements IStorage {
    private storage;
    private _name;
    get name(): string;
    constructor(name: string);
    getAll(): Promise<Doc | undefined>;
    get(id: string): Promise<Record<string, unknown> | undefined>;
    add(id: string, value: Record<string, unknown>): Promise<boolean>;
    set(id: string, value: Record<string, unknown>): Promise<boolean>;
    remove(id: string): Promise<boolean>;
    cursor(): Cursor;
    close(): Promise<void>;
}
export default MemoryStore;
