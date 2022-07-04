"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cursor = void 0;
const ejson_1 = require("@bluelibs/ejson");
const events_1 = require("events");
class Cursor extends events_1.EventEmitter {
}
exports.Cursor = Cursor;
class Subscription {
    cursors;
    _id;
    get id() {
        return this._id;
    }
    constructor(id, cursors, send) {
        this._id = id;
        this.cursors = cursors;
        this.cursors.forEach((cursor) => {
            cursor
                .getAll()
                .then((data) => {
                data?.forEach((value, key) => {
                    send(ejson_1.EJSON.stringify({
                        msg: "added",
                        collection: cursor.name,
                        id: key,
                        fields: value,
                    }));
                });
            })
                .catch((err) => {
                console.error(err);
                send(JSON.stringify({
                    msg: "error",
                    reason: "Unable to get initial cursor data",
                }));
            })
                .finally(() => {
                send(JSON.stringify({ msg: "ready", subs: [id] }));
            });
            cursor.on("added", (evt) => {
                send(ejson_1.EJSON.stringify({
                    msg: "added",
                    collection: cursor.name,
                    id: evt.id,
                    fields: evt.value,
                }));
            });
            cursor.on("changed", (evt) => {
                const [fields, cleared] = (() => {
                    if ("updated" in evt) {
                        return [evt.updated, evt.removed];
                    }
                    const currentKeys = Object.keys(evt.value);
                    return [
                        evt.value,
                        Object.keys(evt.prevValue).filter((key) => !currentKeys.includes(key)),
                    ];
                })();
                send(ejson_1.EJSON.stringify({
                    msg: "changed",
                    collection: cursor.name,
                    id: evt.id,
                    cleared,
                    fields,
                }));
            });
            cursor.on("removed", (evt) => {
                send(ejson_1.EJSON.stringify({
                    msg: "removed",
                    collection: cursor.name,
                    id: evt.id,
                }));
            });
        });
    }
    close() {
        this.cursors.forEach((cursor) => {
            cursor.removeAllListeners();
            cursor.close();
        });
    }
}
exports.default = Subscription;
