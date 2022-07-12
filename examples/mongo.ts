import DDP, { mongo, check } from "../src";

(async () => {
  const MongoStore = await mongo("mongodb://127.0.0.1:27017", "ddp_test");
  const store = new MongoStore("test");

  const ddp = DDP(8080);

  ddp.methods({
    add(id: string, value: Record<string, unknown>) {
      check(value, { message: String });
      check(id, String);

      return store.add(id, value);
    },
    set(id: string, value: Record<string, unknown>) {
      check(value, { message: String });
      check(id, String);

      return store.set(id, { $set: value });
    },
    remove(id: string) {
      check(id, String);

      return store.remove(id);
    },
  });

  console.log("Running!");

  ddp.publish(store.name, () => {
    return store.cursor();
  });
})().catch(console.error);
