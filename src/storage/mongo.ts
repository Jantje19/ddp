import {
  ChangeStream,
  ChangeStreamDocument,
  ChangeStreamOptions,
  Collection,
  CollectionOptions,
  Db,
  DbOptions,
  Document,
  Filter,
  MongoClient,
  MongoClientOptions,
  OptionalUnlessRequiredId,
  WithId,
} from "mongodb";

import { Cursor, Doc } from "../subscription";
import { IStorage } from "../storage";

let db: Db;

export class MongoCursor<T extends Document = Document> extends Cursor {
  private cursor: ChangeStream<T, ChangeStreamDocument<T>>;
  private data: Promise<WithId<T>[]> | undefined;
  private _name: string;

  get name(): string {
    return this._name;
  }

  constructor(
    name: string,
    data: Promise<WithId<T>[]>,
    cursor: ChangeStream<T, ChangeStreamDocument<T>>
  ) {
    super();

    this.cursor = cursor;
    this._name = name;
    this.data = data;

    this.cursor.on("change", (change) => {
      switch (change.operationType) {
        case "insert":
          const { _id, ...value } = (change as any).fullDocument;
          this.emit("added", {
            id: _id.toString(),
            value,
          });
          break;
        case "update":
          const { updatedFields, removedFields } = (change as any)
            .updateDescription;
          this.emit("changed", {
            id: change.documentKey._id.toString(),
            updated: updatedFields,
            removed: removedFields,
          });
          break;
        case "delete":
          this.emit("removed", {
            id: change.documentKey._id.toString(),
          });
          break;
        default:
          console.log("Unhandled change event", change);
          break;
      }
    });
  }

  async getAll(): Promise<Doc | undefined> {
    const result = await this.data!;
    this.data = undefined;
    return new Map(
      result.map(({ _id, ...record }) => [_id.toString(), record])
    );
  }

  async close(): Promise<void> {
    this.cursor.removeAllListeners();
    await this.cursor.close();
  }
}

export class MongoStore<T extends Document = Document> implements IStorage {
  private collection: Collection<T>;

  get name(): string {
    return this.collection.collectionName;
  }

  constructor(name: string, options?: CollectionOptions) {
    this.collection = db.collection(name, options);
  }

  async get(id: string): Promise<Record<string, unknown> | undefined> {
    const filter = { _id: id } as unknown as Filter<T>;
    const result = await this.collection.findOne(filter);
    return result ?? undefined;
  }

  async add(id: string, value: OptionalUnlessRequiredId<T>): Promise<boolean> {
    const result = await this.collection.insertOne({ ...value, _id: id });
    return result.acknowledged;
  }

  async set(id: string, value: Record<string, unknown>): Promise<boolean> {
    const filter = { _id: id } as unknown as Filter<T>;
    const result = await this.collection.updateOne(filter, value);
    return result.acknowledged;
  }

  async remove(id: string): Promise<boolean> {
    const filter = { _id: id } as unknown as Filter<T>;
    const result = await this.collection.deleteOne(filter);
    return result.acknowledged;
  }

  cursor(filter?: Document, options?: ChangeStreamOptions) {
    return new MongoCursor(
      this.name,
      this.collection.find(filter as Filter<T>, options).toArray(),
      this.collection.watch(
        filter === undefined ? undefined : [filter],
        options
      )
    );
  }
}

export default async (
  uri: string,
  dbName: string,
  options?: MongoClientOptions,
  dbOptions?: DbOptions
): Promise<typeof MongoStore> => {
  const client = new MongoClient(uri, {
    readPreference: "primary",
    directConnection: true,
    replicaSet: "rs",
    appName: "ddp",
    ...options,
  });

  await client.connect();
  db = client.db(dbName, dbOptions);

  return MongoStore;
};
