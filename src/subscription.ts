import TypedEmitter from "typed-emitter";
import { EJSON } from "@bluelibs/ejson";
import { EventEmitter } from "events";

export type Doc = Map<string, Record<string, unknown>>;

export type AddedEvent = {
  value: Record<string, unknown>;
  id: string;
};
export type ChangedEvent = { id: string } & (
  | { value: Record<string, unknown>; prevValue: Record<string, unknown> }
  | { updated: Record<string, unknown>; removed: string[] }
);
export type RemovedEvent = {
  id: string;
};
export type CursorEvents = {
  added: (event: AddedEvent) => void;
  changed: (event: ChangedEvent) => void;
  removed: (event: RemovedEvent) => void;
};

export abstract class Cursor extends (EventEmitter as new () => TypedEmitter<CursorEvents>) {
  abstract get name(): string;

  abstract getAll(): Promise<Doc | undefined>;
  abstract close(): Promise<void>;
}

class Subscription {
  private cursors: Cursor[];
  private _id: string;

  get id(): string {
    return this._id;
  }

  constructor(id: string, cursors: Cursor[], send: (data: any) => void) {
    this._id = id;
    this.cursors = cursors;

    this.cursors.forEach((cursor) => {
      cursor
        .getAll()
        .then((data) => {
          data?.forEach((value, key) => {
            send(
              EJSON.stringify({
                msg: "added",
                collection: cursor.name,
                id: key,
                fields: value,
              })
            );
          });
        })
        .catch((err) => {
          console.error(err);
          send(
            JSON.stringify({
              msg: "error",
              reason: "Unable to get initial cursor data",
            })
          );
        })
        .finally(() => {
          send(JSON.stringify({ msg: "ready", subs: [id] }));
        });

      cursor.on("added", (evt) => {
        send(
          EJSON.stringify({
            msg: "added",
            collection: cursor.name,
            id: evt.id,
            fields: evt.value,
          })
        );
      });
      cursor.on("changed", (evt) => {
        const [fields, cleared] = (() => {
          if ("updated" in evt) {
            return [evt.updated, evt.removed];
          }

          const currentKeys = Object.keys(evt.value);

          return [
            evt.value,
            Object.keys(evt.prevValue).filter(
              (key) => !currentKeys.includes(key)
            ),
          ];
        })();

        send(
          EJSON.stringify({
            msg: "changed",
            collection: cursor.name,
            id: evt.id,
            cleared,
            fields,
          })
        );
      });
      cursor.on("removed", (evt) => {
        send(
          EJSON.stringify({
            msg: "removed",
            collection: cursor.name,
            id: evt.id,
          })
        );
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

export default Subscription;
