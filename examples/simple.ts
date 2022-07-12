import DDP, { MemoryStore, check } from "../src";

const memStore = new MemoryStore("test");

const ddp = DDP(8080);

ddp.methods({
  add(id: string, value: Record<string, unknown>) {
    check(value, { message: String });
    check(id, String);

    return memStore.add(id, value);
  },
  set(id: string, value: Record<string, unknown>) {
    check(value, { message: String });
    check(id, String);

    return memStore.set(id, value);
  },
  remove(id: string) {
    check(id, String);

    return memStore.remove(id);
  },
});

console.log("Running!");

ddp.publish(memStore.name, () => {
  return memStore.cursor();
});
