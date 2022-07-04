import { ServerOptions, WebSocket } from "ws";
import { Cursor } from "./subscription";
export declare type Method<T extends Array<any> = any[], K = any> = (...args: T) => Promise<K> | K;
export declare type Publication<T extends Array<any> = any[]> = (...args: T) => Cursor[] | Cursor;
export declare enum Version {
    V1 = "1",
    PRE2 = "pre2",
    PRE1 = "pre1"
}
export declare type ExtendedWebSocket = WebSocket & {
    hasConnected?: boolean;
    unacknowledgedPings?: string[];
};
export declare type MessageBase = {
    msg: keyof typeof messages;
};
export declare type ConnectMessage = MessageBase & {
    session?: string;
    version: Version;
    support: Version[];
};
export declare type PingMessage = MessageBase & {
    id?: string;
};
export declare type PongMessage = MessageBase & {
    id?: string;
};
export declare type MethodMessage = MessageBase & {
    method: string;
    params?: Record<string, unknown>[];
    id: string;
    randomSeed?: string;
};
export declare type SubMessage = MessageBase & {
    id: string;
    name: string;
    params?: Record<string, unknown>[];
};
export declare type UnsubMessage = MessageBase & {
    id: string;
};
export declare type Session = {};
declare const messages: {
    connect: (message: Partial<ConnectMessage>, ws: ExtendedWebSocket) => void;
    ping: (message: Partial<PingMessage>, ws: WebSocket) => void;
    pong: (message: Partial<PongMessage>, ws: ExtendedWebSocket) => void;
    method: (message: Partial<MethodMessage>, ws: WebSocket) => void;
    sub: (message: Partial<SubMessage>, ws: WebSocket) => void;
    unsub: (message: Partial<UnsubMessage>, ws: WebSocket) => void;
};
declare const _default: (port: number, options?: ServerOptions) => {
    close(): void;
    method(name: string, method: Method): void;
    methods(_methods: Record<string, Method>): void;
    publish(name: string, publication: Publication): void;
    publications(_publications: Record<string, Publication>): void;
};
export default _default;
