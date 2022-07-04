"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isObject = void 0;
const isObject = (value) => value && typeof value === "object";
exports.isObject = isObject;
const toError = (value, typeString) => new Error(`Match failed for '${value}', expected ${typeString}`);
const check = (value, type) => {
    if (Array.isArray(type)) {
        if (!Array.isArray(value)) {
            throw toError(value, "array");
        }
        value.forEach((v) => check(v, type[0]));
        return;
    }
    if (type && (0, exports.isObject)(type)) {
        if (!value || !(0, exports.isObject)(value)) {
            throw toError(value, "object");
        }
        Object.keys(type).forEach((key) => {
            if (!(key in value)) {
                throw toError(value, `object including '${key}'`);
            }
            check(value[key], type[key]);
        });
        return;
    }
    if (type === undefined) {
        if (value !== undefined) {
            throw toError(value, "undefined");
        }
        return;
    }
    if (type === null) {
        if (value !== null) {
            throw toError(value, "null");
        }
        return;
    }
    const typeString = type.name.toLowerCase();
    if (typeof value !== typeString) {
        throw toError(value, typeString);
    }
};
exports.default = check;
