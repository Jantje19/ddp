import { describe, it, expect } from "vitest";

import check from "./check";

it("simple types", () => {
  expect(() => check("", String)).not.toThrowError();
  expect(() => check(0, Number)).not.toThrowError();
  expect(() => check(false, Boolean)).not.toThrowError();
  expect(() => check(undefined, undefined)).not.toThrowError();
  expect(() => check(null, null)).not.toThrowError();
  expect(() => check(1n, BigInt)).not.toThrowError();
  expect(() => check(Symbol(), Symbol)).not.toThrowError();
  expect(() => check({}, Object)).not.toThrowError();
});

it("array types", () => {
  expect(() => check([""], [String])).not.toThrowError();
  expect(() => check([0], [Number])).not.toThrowError();
  expect(() => check([false], [Boolean])).not.toThrowError();
  expect(() => check([undefined], [undefined])).not.toThrowError();
  expect(() => check([null], [null])).not.toThrowError();
  expect(() => check([1n], [BigInt])).not.toThrowError();
  expect(() => check([Symbol()], [Symbol])).not.toThrowError();
  expect(() => check([{}], [Object])).not.toThrowError();
});

it("invalid values", () => {
  expect(() => check(0, String)).toThrowError();
  expect(() => check(false, Number)).toThrowError();
  expect(() => check(undefined, Boolean)).toThrowError();
  expect(() => check(null, undefined)).toThrowError();
  expect(() => check(1n, null)).toThrowError();
  expect(() => check(Symbol(), BigInt)).toThrowError();
  expect(() => check({}, Symbol)).toThrowError();
  expect(() => check("", Object)).toThrowError();
});

it("invalid array type values", () => {
  expect(() => check([0], [String])).toThrowError();
  expect(() => check([false], [Number])).toThrowError();
  expect(() => check([undefined], [Boolean])).toThrowError();
  expect(() => check([null], [undefined])).toThrowError();
  expect(() => check([1n], [null])).toThrowError();
  expect(() => check([Symbol()], [BigInt])).toThrowError();
  expect(() => check([{}], [Symbol])).toThrowError();
  expect(() => check([""], [Object])).toThrowError();
});

describe("Objects", () => {
  it("simple", () => {
    expect(() => check({ hello: 1 }, { hello: Number })).not.toThrowError();
    expect(() => check({ hello: 1 }, { hello: String })).toThrowError();
    expect(() =>
      check({ hello: { test: 1 } }, { hello: { test: 1 } })
    ).toThrowError();
  });
});
