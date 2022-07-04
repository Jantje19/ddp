import { ChangeStream, ChangeStreamDocument, ChangeStreamOptions, CollectionOptions, DbOptions, Document, MongoClientOptions, OptionalUnlessRequiredId, WithId } from "mongodb";
import { Cursor, Doc } from "../subscription";
import { IStorage } from "../storage";
export declare class MongoCursor<T extends Document = Document> extends Cursor {
    private cursor;
    private data;
    private _name;
    get name(): string;
    constructor(name: string, data: Promise<WithId<T>[]>, cursor: ChangeStream<T, ChangeStreamDocument<T>>);
    getAll(): Promise<Doc | undefined>;
    close(): Promise<void>;
}
export declare class MongoStore<T extends Document = Document> implements IStorage {
    private collection;
    get name(): string;
    constructor(name: string, options?: CollectionOptions);
    get(id: string): Promise<Record<string, unknown> | undefined>;
    add(id: string, value: OptionalUnlessRequiredId<T>): Promise<boolean>;
    set(id: string, value: Record<string, unknown>): Promise<boolean>;
    remove(id: string): Promise<boolean>;
    cursor(filter?: Document, options?: ChangeStreamOptions): MongoCursor<T>;
}
declare const _default: (uri: string, dbName: string, options?: MongoClientOptions, dbOptions?: DbOptions) => Promise<typeof MongoStore>;
export default _default;
