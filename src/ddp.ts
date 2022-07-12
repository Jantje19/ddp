// https://github.com/meteor/meteor/blob/devel/packages/ddp/DDP.md

import { ServerOptions, WebSocket, WebSocketServer } from "ws";
import { EJSON } from "@bluelibs/ejson";
import { randomUUID } from "crypto";

import Subscription, { Cursor } from "./subscription";

export type Method<T extends Array<any> = any[], K = any> = (
  ...args: T
) => Promise<K> | K;
export type Publication<T extends Array<any> = any[]> = (
  ...args: T
) => Cursor[] | Cursor;

export enum Version {
  V1 = "1",
  PRE2 = "pre2",
  PRE1 = "pre1",
}
export type ExtendedWebSocket = WebSocket & {
  hasConnected?: boolean;
  unacknowledgedPings?: string[];
};
export type MessageBase = { msg: keyof typeof messages };
export type ConnectMessage = MessageBase & {
  session?: string;
  version: Version;
  support: Version[];
};
export type PingMessage = MessageBase & { id?: string };
export type PongMessage = MessageBase & { id?: string };
export type MethodMessage = MessageBase & {
  method: string;
  params?: Record<string, unknown>[];
  id: string;
  randomSeed?: string;
};
export type SubMessage = MessageBase & {
  id: string;
  name: string;
  params?: Record<string, unknown>[];
};
export type UnsubMessage = MessageBase & { id: string };

export type Session = {};

const generateSessionId = () => randomUUID();

const publications: Record<string, Publication> = {};
const methods: Record<string, Method> = {};

const subscriptions: Subscription[] = [];
const messages = {
  connect: (message: Partial<ConnectMessage>, ws: ExtendedWebSocket) => {
    ws.unacknowledgedPings = [];
    ws.hasConnected = true;

    if (message.session) {
      console.warn(
        "Client requests session, but that's not supported (yet).",
        message.session
      );
    }

    if (message.version !== Version.V1) {
      ws.send(JSON.stringify({ msg: "failed", version: Version.V1 }));
      ws.close();
    }

    ws.send(JSON.stringify({ msg: "connected", session: generateSessionId() }));
  },
  ping: (message: Partial<PingMessage>, ws: WebSocket) => {
    ws.send(JSON.stringify({ ...message, msg: "pong" }));
  },
  pong: (message: Partial<PongMessage>, ws: ExtendedWebSocket) => {
    const index = ws.unacknowledgedPings!.indexOf(message.id ?? "");
    if (index >= 0) {
      ws.unacknowledgedPings!.splice(index, 1);
    }
  },
  method: (message: Partial<MethodMessage>, ws: WebSocket) => {
    if (!message.id) {
      throw new Error("ID is not specified");
    }
    if (!message.method) {
      throw new Error("Method is not specified");
    }

    const formatError = (err: any) => {
      if (!(err instanceof Error)) {
        err = new Error(err);
      }

      return { error: err.toString(), message: err.message };
    };

    const method = methods[message.method];

    if (!method) {
      ws.send(
        JSON.stringify({
          msg: "result",
          id: message.id,
          error: formatError(
            new Error(`Method not found ('${message.method}')`)
          ),
        })
      );
      ws.send(JSON.stringify({ msg: "updated", methods: [message.id] }));
    }

    const returnValue = (() => {
      try {
        return method!(...(message.params ?? []));
      } catch (err) {
        return err;
      }
    })();

    if (returnValue instanceof Error) {
      ws.send(
        JSON.stringify({
          msg: "result",
          id: message.id,
          error: formatError(returnValue),
        })
      );
      ws.send(JSON.stringify({ msg: "updated", methods: [message.id] }));
      return;
    }
    if (returnValue instanceof Promise) {
      returnValue
        .then((res) => {
          ws.send(
            EJSON.stringify({ msg: "result", id: message.id, result: res })
          );
        })
        .catch((err) => {
          ws.send(
            JSON.stringify({
              msg: "result",
              id: message.id,
              error: formatError(err),
            })
          );
        });
      ws.send(JSON.stringify({ msg: "updated", methods: [message.id] }));
      return;
    }

    ws.send(
      EJSON.stringify({ msg: "result", id: message.id, result: returnValue })
    );
    ws.send(JSON.stringify({ msg: "updated", methods: [message.id] }));
  },
  sub: (message: Partial<SubMessage>, ws: WebSocket) => {
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

    const subscription = new Subscription(
      message.id,
      Array.isArray(cursors) ? cursors : [cursors],
      ws.send.bind(ws)
    );

    subscriptions.push(subscription);
    ws.once("close", () => {
      const index = subscriptions.indexOf(subscription);
      if (index >= 0) {
        subscription.close();
        subscriptions.splice(index, 1);
      }
    });
  },
  unsub: (message: Partial<UnsubMessage>, ws: WebSocket) => {
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

export default (
  ...args: [port: number, options?: ServerOptions] | [options: ServerOptions]
) => {
  const options = (() => {
    if (args.length === 2 || typeof args[0] === "number") {
      return { ...args[1], port: args[0] } as ServerOptions;
    }

    return args[0];
  })();

  const wss = new WebSocketServer(options);

  wss.on("connection", (ws: ExtendedWebSocket) => {
    ws.on("message", (data) => {
      const json = (() => {
        try {
          return EJSON.parse(data.toString()) as Record<string, unknown> &
            Partial<MessageBase>;
        } catch {
          return undefined;
        }
      })();

      if (!json) {
        console.error("Invalid json", data.toString());
        ws.send(
          JSON.stringify({ msg: "error", reason: "Invalid message format" })
        );
        return;
      }

      if (!json.msg) {
        console.error(`${data} not correct!`);
        ws.send(
          JSON.stringify({
            msg: "error",
            reason: "Invalid JSON object",
            offendingMessage: json,
          })
        );
        return;
      }

      const handler = messages[json.msg];

      if (!handler) {
        console.error(`Unable to handle message '${json.msg}'`);
        ws.send(
          JSON.stringify({
            msg: "error",
            reason: "Unknown msg type",
            offendingMessage: json,
          })
        );
        return;
      }

      if (json.msg !== "connect" && !ws.hasConnected) {
        console.error("Did not send 'connect' as the first message");
        ws.send(
          JSON.stringify({
            msg: "error",
            reason: "Did not send 'connect' as the first message",
            offendingMessage: json,
          })
        );
        return;
      }

      if (json.msg === "connect" && ws.hasConnected) {
        console.error(
          "Sent 'connect' when a connection has already been established"
        );
        ws.send(
          JSON.stringify({
            msg: "error",
            reason:
              "Sent 'connect' when a connection has already been established",
            offendingMessage: json,
          })
        );
        return;
      }

      try {
        handler(json, ws);
      } catch (err: any) {
        ws.send(
          JSON.stringify({
            msg: "error",
            reason: `[${json.msg}]: ${err.message}`,
            offendingMessage: json,
          })
        );
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
          ws.send(
            JSON.stringify({
              msg: "ping",
              id,
            })
          );
        } catch {
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
    method(name: string, method: Method) {
      if (methods[name]) {
        throw new Error(
          `'${name}' is already a method. Overriding is not supported!`
        );
      }
      methods[name] = method;
    },
    methods(_methods: Record<string, Method>) {
      Object.entries(_methods).forEach(([key, value]) =>
        this.method(key, value)
      );
    },
    publish(name: string, publication: Publication) {
      if (publications[name]) {
        throw new Error(
          `'${name}' is already a publication. Overriding is not supported!`
        );
      }
      publications[name] = publication;
    },
    publications(_publications: Record<string, Publication>) {
      Object.entries(_publications).forEach(([key, value]) =>
        this.publish(key, value)
      );
    },
  };
};
