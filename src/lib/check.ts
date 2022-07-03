export type PrimitiveTypes =
  | String
  | Number
  | BigInt
  | Boolean
  | Object
  | Symbol
  | undefined
  | null;

export type BasicTypes =
  | PrimitiveTypes
  | [String]
  | [Number]
  | [BigInt]
  | [Boolean]
  | [Object]
  | [undefined]
  | [null];

export type AllTypes =
  | BasicTypes
  | Record<string, BasicTypes>
  | [Record<string, BasicTypes>];

interface InfiniteTypes {
  [n: number | string]: AllTypes | InfiniteTypes;
}

export type Types = AllTypes | InfiniteTypes;

export const isObject = (value: any) => value && typeof value === "object";

const toError = (value: any, typeString: string) =>
  new Error(`Match failed for '${value}', expected ${typeString}`);

const check = (value: any, type: Types) => {
  if (Array.isArray(type)) {
    if (!Array.isArray(value)) {
      throw toError(value, "array");
    }
    value.forEach((v) => check(v, type[0]));
    return;
  }

  if (type && isObject(type)) {
    if (!value || !isObject(value)) {
      throw toError(value, "object");
    }
    Object.keys(type).forEach((key) => {
      if (!(key in value)) {
        throw toError(value, `object including '${key}'`);
      }
      check(value[key], (type as Record<string, BasicTypes>)[key]);
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

  const typeString = (type as { name: string }).name.toLowerCase();
  if (typeof value !== typeString) {
    throw toError(value, typeString);
  }
};

export default check;
