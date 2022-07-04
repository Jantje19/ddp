export declare type PrimitiveTypes = String | Number | BigInt | Boolean | Object | Symbol | undefined | null;
export declare type BasicTypes = PrimitiveTypes | [String] | [Number] | [BigInt] | [Boolean] | [Object] | [undefined] | [null];
export declare type AllTypes = BasicTypes | Record<string, BasicTypes> | [Record<string, BasicTypes>];
interface InfiniteTypes {
    [n: number | string]: AllTypes | InfiniteTypes;
}
export declare type Types = AllTypes | InfiniteTypes;
export declare const isObject: (value: any) => any;
declare const check: (value: any, type: Types) => void;
export default check;
