import TypedEmitter from "typed-emitter";
export declare type Doc = Map<string, Record<string, unknown>>;
export declare type AddedEvent = {
    value: Record<string, unknown>;
    id: string;
};
export declare type ChangedEvent = {
    id: string;
} & ({
    value: Record<string, unknown>;
    prevValue: Record<string, unknown>;
} | {
    updated: Record<string, unknown>;
    removed: string[];
});
export declare type RemovedEvent = {
    id: string;
};
export declare type CursorEvents = {
    added: (event: AddedEvent) => void;
    changed: (event: ChangedEvent) => void;
    removed: (event: RemovedEvent) => void;
};
declare const Cursor_base: new () => TypedEmitter<CursorEvents>;
export declare abstract class Cursor extends Cursor_base {
    abstract get name(): string;
    abstract getAll(): Promise<Doc | undefined>;
    abstract close(): Promise<void>;
}
declare class Subscription {
    private cursors;
    private _id;
    get id(): string;
    constructor(id: string, cursors: Cursor[], send: (data: any) => void);
    close(): void;
}
export default Subscription;
