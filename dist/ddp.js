"use strict";
// https://github.com/meteor/meteor/blob/devel/packages/ddp/DDP.md
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Version = void 0;
const ws_1 = require("ws");
const ejson_1 = require("@bluelibs/ejson");
const crypto_1 = require("crypto");
const subscription_1 = __importDefault(require("./subscription"));
var Version;
(function (Version) {
    Version["V1"] = "1";
    Version["PRE2"] = "pre2";
    Version["PRE1"] = "pre1";
})(Version = exports.Version || (exports.Version = {}));
const generateSessionId = () => (0, crypto_1.randomUUID)();
const publications = {};
const methods = {};
const subscriptions = [];
const messages = {
    connect: (message, ws) => {
        ws.unacknowledgedPings = [];
        ws.hasConnected = true;
        if (message.session) {
            console.warn("Client requests session, but that's not supported (yet).", message.session);
        }
        if (message.version !== Version.V1) {
            ws.send(JSON.stringify({ msg: "failed", version: Version.V1 }));
            ws.close();
        }
        ws.send(JSON.stringify({ msg: "connected", session: generateSessionId() }));
    },
    ping: (message, ws) => {
        ws.send(JSON.stringify({ ...message, msg: "pong" }));
    },
    pong: (message, ws) => {
        const index = ws.unacknowledgedPings.indexOf(message.id ?? "");
        if (index >= 0) {
            ws.unacknowledgedPings.splice(index, 1);
        }
    },
    method: (message, ws) => {
        if (!message.id) {
            throw new Error("ID is not specified");
        }
        if (!message.method) {
            throw new Error("Method is not specified");
        }
        const formatError = (err) => {
            if (!(err instanceof Error)) {
                err = new Error(err);
            }
            return { error: err.toString(), message: err.message };
        };
        const method = methods[message.method];
        if (!method) {
            ws.send(JSON.stringify({
                msg: "result",
                id: message.id,
                error: formatError(new Error(`Method not found ('${message.method}')`)),
            }));
            ws.send(JSON.stringify({ msg: "updated", methods: [message.id] }));
        }
        const returnValue = (() => {
            try {
                return method(...(message.params ?? []));
            }
            catch (err) {
                return err;
            }
        })();
        if (returnValue instanceof Error) {
            ws.send(JSON.stringify({
                msg: "result",
                id: message.id,
                error: formatError(returnValue),
            }));
            ws.send(JSON.stringify({ msg: "updated", methods: [message.id] }));
            return;
        }
        if (returnValue instanceof Promise) {
            returnValue
                .then((res) => {
                ws.send(ejson_1.EJSON.stringify({ msg: "result", id: message.id, result: res }));
            })
                .catch((err) => {
                ws.send(JSON.stringify({
                    msg: "result",
                    id: message.id,
                    error: formatError(err),
                }));
            });
            ws.send(JSON.stringify({ msg: "updated", methods: [message.id] }));
            return;
        }
        ws.send(ejson_1.EJSON.stringify({ msg: "result", id: message.id, result: returnValue }));
        ws.send(JSON.stringify({ msg: "updated", methods: [message.id] }));
    },
    sub: (message, ws) => {
        if (!message.id) {
            throw new Error("ID is not specified");
        }
        if (!message.name) {
            throw new Error("Name is not specified");
        }
        if (message.params && !Array.isArray(message.params)) {
            throw new Error("Invalid 'params' parameter");
        }
        const publication = publications[message.name];
        if (!publication) {
            throw new Error(`No subscription found with the name '${name}'`);
        }
        const cursors = publication(...(message.params ?? []));
        const subscription = new subscription_1.default(message.id, Array.isArray(cursors) ? cursors : [cursors], ws.send.bind(ws));
        subscriptions.push(subscription);
        ws.once("close", () => {
            const index = subscriptions.indexOf(subscription);
            if (index >= 0) {
                subscription.close();
                subscriptions.splice(index, 1);
            }
        });
    },
    unsub: (message, ws) => {
        if (!message.id) {
            throw new Error("ID is not specified");
        }
        const index = subscriptions.findIndex((s) => s.id === message.id);
        if (index >= 0) {
            subscriptions[index].close();
            subscriptions.splice(index, 1);
        }
    },
};
exports.default = (port, options = {}) => {
    const wss = new ws_1.WebSocketServer({
        ...options,
        port,
    });
    wss.on("connection", (ws) => {
        ws.on("message", (data) => {
            const json = (() => {
                try {
                    return ejson_1.EJSON.parse(data.toString());
                }
                catch {
                    return undefined;
                }
            })();
            if (!json) {
                console.error("Invalid json", data.toString());
                ws.send(JSON.stringify({ msg: "error", reason: "Invalid message format" }));
                return;
            }
            if (!json.msg) {
                console.error(`${data} not correct!`);
                ws.send(JSON.stringify({
                    msg: "error",
                    reason: "Invalid JSON object",
                    offendingMessage: json,
                }));
                return;
            }
            const handler = messages[json.msg];
            if (!handler) {
                console.error(`Unable to handle message '${json.msg}'`);
                ws.send(JSON.stringify({
                    msg: "error",
                    reason: "Unknown msg type",
                    offendingMessage: json,
                }));
                return;
            }
            if (json.msg !== "connect" && !ws.hasConnected) {
                console.error("Did not send 'connect' as the first message");
                ws.send(JSON.stringify({
                    msg: "error",
                    reason: "Did not send 'connect' as the first message",
                    offendingMessage: json,
                }));
                return;
            }
            if (json.msg === "connect" && ws.hasConnected) {
                console.error("Sent 'connect' when a connection has already been established");
                ws.send(JSON.stringify({
                    msg: "error",
                    reason: "Sent 'connect' when a connection has already been established",
                    offendingMessage: json,
                }));
                return;
            }
            try {
                handler(json, ws);
            }
            catch (err) {
                ws.send(JSON.stringify({
                    msg: "error",
                    reason: `[${json.msg}]: ${err.message}`,
                    offendingMessage: json,
                }));
            }
        });
        (() => {
            const int = setInterval(() => {
                if (!ws.unacknowledgedPings) {
                    return;
                }
                if (ws.unacknowledgedPings.length >= 5) {
                    ws.close();
                    return;
                }
                const id = generateSessionId();
                ws.unacknowledgedPings.push(id);
                try {
                    ws.send(JSON.stringify({
                        msg: "ping",
                        id,
                    }));
                }
                catch {
                    clearInterval(int);
                }
            }, 10_000);
            ws.on("close", () => {
                clearInterval(int);
            });
        })();
    });
    return {
        close() {
            wss.removeAllListeners();
            wss.close();
        },
        method(name, method) {
            if (methods[name]) {
                throw new Error(`'${name}' is already a method. Overriding is not supported!`);
            }
            methods[name] = method;
        },
        methods(_methods) {
            Object.entries(_methods).forEach(([key, value]) => this.method(key, value));
        },
        publish(name, publication) {
            if (publications[name]) {
                throw new Error(`'${name}' is already a publication. Overriding is not supported!`);
            }
            publications[name] = publication;
        },
        publications(_publications) {
            Object.entries(_publications).forEach(([key, value]) => this.publish(key, value));
        },
    };
};
