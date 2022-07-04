export interface IStorage {
    get(id: string): Promise<Record<string, unknown> | undefined>;
    add(id: string, value: Record<string, unknown>): Promise<boolean>;
    set(id: string, value: Record<string, unknown>): Promise<boolean>;
    remove(id: string): Promise<boolean>;
}
