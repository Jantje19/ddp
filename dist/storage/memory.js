"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const subscription_1 = require("../subscription");
class MemoryStore extends subscription_1.Cursor {
    storage;
    _name;
    get name() {
        return this._name;
    }
    constructor(name) {
        super();
        this._name = name;
        this.storage = new Map();
    }
    async getAll() {
        return structuredClone(this.storage);
    }
    async get(id) {
        return this.storage.get(id);
    }
    async add(id, value) {
        if (this.storage.has(id)) {
            return false;
        }
        this.storage.set(id, value);
        this.emit("added", { id, value });
        return true;
    }
    async set(id, value) {
        if (!this.storage.has(id)) {
            return false;
        }
        const prevValue = this.storage.get(id);
        this.storage.set(id, value);
        this.emit("changed", { id, value, prevValue });
        return true;
    }
    async remove(id) {
        const removed = this.storage.delete(id);
        if (removed) {
            this.emit("removed", { id });
        }
        return removed;
    }
    cursor() {
        return this;
    }
    async close() {
        this.removeAllListeners();
    }
}
exports.default = MemoryStore;
