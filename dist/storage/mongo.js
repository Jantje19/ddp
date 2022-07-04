"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoStore = exports.MongoCursor = void 0;
const mongodb_1 = require("mongodb");
const subscription_1 = require("../subscription");
let db;
class MongoCursor extends subscription_1.Cursor {
    cursor;
    data;
    _name;
    get name() {
        return this._name;
    }
    constructor(name, data, cursor) {
        super();
        this.cursor = cursor;
        this._name = name;
        this.data = data;
        this.cursor.on("change", (change) => {
            switch (change.operationType) {
                case "insert":
                    const { _id, ...value } = change.fullDocument;
                    this.emit("added", {
                        id: _id.toString(),
                        value,
                    });
                    break;
                case "update":
                    const { updatedFields, removedFields } = change
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
    async getAll() {
        const result = await this.data;
        this.data = undefined;
        return new Map(result.map(({ _id, ...record }) => [_id.toString(), record]));
    }
    async close() {
        this.cursor.removeAllListeners();
        await this.cursor.close();
    }
}
exports.MongoCursor = MongoCursor;
class MongoStore {
    collection;
    get name() {
        return this.collection.collectionName;
    }
    constructor(name, options) {
        this.collection = db.collection(name, options);
    }
    async get(id) {
        const filter = { _id: id };
        const result = await this.collection.findOne(filter);
        return result ?? undefined;
    }
    async add(id, value) {
        const result = await this.collection.insertOne({ ...value, _id: id });
        return result.acknowledged;
    }
    async set(id, value) {
        const filter = { _id: id };
        const result = await this.collection.updateOne(filter, value);
        return result.acknowledged;
    }
    async remove(id) {
        const filter = { _id: id };
        const result = await this.collection.deleteOne(filter);
        return result.acknowledged;
    }
    cursor(filter, options) {
        return new MongoCursor(this.name, this.collection.find(filter, options).toArray(), this.collection.watch(filter === undefined ? undefined : [filter], options));
    }
}
exports.MongoStore = MongoStore;
exports.default = async (uri, dbName, options, dbOptions) => {
    const client = new mongodb_1.MongoClient(uri, options);
    await client.connect();
    db = client.db(dbName, dbOptions);
    return MongoStore;
};
