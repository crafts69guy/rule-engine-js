/**
 * TypeScript compatibility test for typed rule helpers gist
 * Run: npx tsc --noEmit tests/types/typed-helpers-compatibility.ts
 */

import type {
  ComparisonOptions,
  OperatorNames,
  RuleExpression,
  RuleHelpers,
  StateOperatorNames,
  StringOptions,
} from '../../types/index';

import type { Path, PathValue } from 'dot-path-value';

// =============================================================================
// GIST TYPES (copied from https://gist.github.com/hyusetiawan/0f79794086cb12baf101323e3b44ca8d)
// =============================================================================

type CoercibleTo<Value> = Value extends string
  ? string | number | boolean | Date | null | undefined
  : Value | null | undefined;

type SchemaPathsOfType<Shape, Value> = Extract<
  {
    [P in Path<Shape>]: PathValue<Shape, P> extends CoercibleTo<Value>
      ? P
      : never;
  }[Path<Shape>],
  string
>;

type RulePath<Facts extends object, Value> = SchemaPathsOfType<Facts, Value>;

type RulePathOrString<Facts extends object, Value> = [
  RulePath<Facts, Value>,
] extends [never]
  ? string
  : RulePath<Facts, Value>;

type RuleHelperPath<Facts extends object, Value> = RulePathOrString<
  Facts,
  Value
>;

type TypedFieldHelpers<Facts extends object> = {
  equals: <Value>(
    left: RuleHelperPath<Facts, Value>,
    right: RuleHelperPath<Facts, Value>,
    options?: ComparisonOptions,
  ) => RuleExpression;
  greaterThan: (
    left: RuleHelperPath<Facts, number>,
    right: RuleHelperPath<Facts, number>,
    options?: ComparisonOptions,
  ) => RuleExpression;
  greaterThanOrEqual: (
    left: RuleHelperPath<Facts, number>,
    right: RuleHelperPath<Facts, number>,
    options?: ComparisonOptions,
  ) => RuleExpression;
  lessThan: (
    left: RuleHelperPath<Facts, number>,
    right: RuleHelperPath<Facts, number>,
    options?: ComparisonOptions,
  ) => RuleExpression;
  lessThanOrEqual: (
    left: RuleHelperPath<Facts, number>,
    right: RuleHelperPath<Facts, number>,
    options?: ComparisonOptions,
  ) => RuleExpression;
};

type TypedValidationHelpers<Facts extends object> = {
  email: (path: RuleHelperPath<Facts, string>) => RuleExpression;
  required: (path: RuleHelperPath<Facts, unknown>) => RuleExpression;
  minAge: (
    path: RuleHelperPath<Facts, number>,
    minAge: number,
  ) => RuleExpression;
  maxAge: (
    path: RuleHelperPath<Facts, number>,
    maxAge: number,
  ) => RuleExpression;
  ageRange: (
    path: RuleHelperPath<Facts, number>,
    minAge: number,
    maxAge: number,
  ) => RuleExpression;
  oneOf: <Value>(
    path: RuleHelperPath<Facts, Value>,
    values:
      | ReadonlyArray<Value>
      | RuleHelperPath<Facts, ReadonlyArray<Value> | Value[]>,
  ) => RuleExpression;
  minLength: (
    path: RuleHelperPath<Facts, string>,
    minLength: number,
  ) => RuleExpression;
  maxLength: (
    path: RuleHelperPath<Facts, string>,
    maxLength: number,
  ) => RuleExpression;
  lengthRange: (
    path: RuleHelperPath<Facts, string>,
    minLength: number,
    maxLength: number,
  ) => RuleExpression;
  exactLength: (
    path: RuleHelperPath<Facts, string>,
    length: number,
  ) => RuleExpression;
};

type TypedRuleHelpersDefinition<Facts extends object> = {
  ops: OperatorNames;
  and: (...items: RuleExpression[]) => RuleExpression;
  or: (...items: RuleExpression[]) => RuleExpression;
  not: (expr: RuleExpression) => RuleExpression;
  eq: <Value>(
    path: RuleHelperPath<Facts, Value>,
    value: Value,
    options?: ComparisonOptions,
  ) => RuleExpression;
  neq: <Value>(
    path: RuleHelperPath<Facts, Value>,
    value: Value,
    options?: ComparisonOptions,
  ) => RuleExpression;
  gt: (
    path: RuleHelperPath<Facts, number>,
    value: number,
    options?: ComparisonOptions,
  ) => RuleExpression;
  gte: (
    path: RuleHelperPath<Facts, number>,
    value: number,
    options?: ComparisonOptions,
  ) => RuleExpression;
  lt: (
    path: RuleHelperPath<Facts, number>,
    value: number,
    options?: ComparisonOptions,
  ) => RuleExpression;
  lte: (
    path: RuleHelperPath<Facts, number>,
    value: number,
    options?: ComparisonOptions,
  ) => RuleExpression;
  contains: (
    path: RuleHelperPath<Facts, string>,
    value: string,
    options?: StringOptions,
  ) => RuleExpression;
  startsWith: (
    path: RuleHelperPath<Facts, string>,
    value: string,
    options?: StringOptions,
  ) => RuleExpression;
  endsWith: (
    path: RuleHelperPath<Facts, string>,
    value: string,
    options?: StringOptions,
  ) => RuleExpression;
  regex: (
    path: RuleHelperPath<Facts, string>,
    pattern: string,
    options?: StringOptions,
  ) => RuleExpression;
  in: <Value>(
    path: RuleHelperPath<Facts, Value>,
    values:
      | ReadonlyArray<Value>
      | RuleHelperPath<Facts, ReadonlyArray<Value> | Value[]>,
    options?: ComparisonOptions,
  ) => RuleExpression;
  notIn: <Value>(
    path: RuleHelperPath<Facts, Value>,
    values:
      | ReadonlyArray<Value>
      | RuleHelperPath<Facts, ReadonlyArray<Value> | Value[]>,
    options?: ComparisonOptions,
  ) => RuleExpression;
  between: (
    path: RuleHelperPath<Facts, number>,
    range: [number, number],
    options?: ComparisonOptions,
  ) => RuleExpression;
  isNull: (path: RuleHelperPath<Facts, unknown>) => RuleExpression;
  isNotNull: (path: RuleHelperPath<Facts, unknown>) => RuleExpression;
  isTrue: (path: RuleHelperPath<Facts, boolean>) => RuleExpression;
  isFalse: (path: RuleHelperPath<Facts, boolean>) => RuleExpression;
  isEmpty: (path: RuleHelperPath<Facts, string>) => RuleExpression;
  isNotEmpty: (path: RuleHelperPath<Facts, string>) => RuleExpression;
  exists: (path: RuleHelperPath<Facts, unknown>) => RuleExpression;
  field: TypedFieldHelpers<Facts>;
  validation: TypedValidationHelpers<Facts>;
};

export type TypedRuleHelpers<Facts extends object> = TypedRuleHelpersDefinition<Facts>;

// =============================================================================
// EXHAUSTIVENESS CHECKS
// =============================================================================

type ExpectTrue<T extends true> = T;

type OperatorNameKeys =
  | 'EQ'
  | 'NEQ'
  | 'GT'
  | 'GTE'
  | 'LT'
  | 'LTE'
  | 'IN'
  | 'NOT_IN'
  | 'AND'
  | 'OR'
  | 'NOT'
  | 'CONTAINS'
  | 'STARTS_WITH'
  | 'ENDS_WITH'
  | 'REGEX'
  | 'BETWEEN'
  | 'IS_NULL'
  | 'IS_NOT_NULL';

type StateOperatorNameKeys =
  | 'CHANGED'
  | 'CHANGED_BY'
  | 'CHANGED_FROM'
  | 'CHANGED_TO'
  | 'INCREASED'
  | 'DECREASED';

type RuleHelperKeys = Exclude<
  keyof RuleHelpers,
  '_initializeFieldHelpers' | '_initializeValidationHelpers'
>;

type TypedRuleHelperKeys = keyof TypedRuleHelpersDefinition<
  Record<string, unknown>
>;

// These checks will fail at compile-time if the package changes operators
type _OperatorNamesExhaustive = ExpectTrue<
  Exclude<keyof OperatorNames, OperatorNameKeys> extends never ? true : false
>;

type _OperatorNamesExhaustiveInverse = ExpectTrue<
  Exclude<OperatorNameKeys, keyof OperatorNames> extends never ? true : false
>;

type _StateOperatorNamesExhaustive = ExpectTrue<
  Exclude<keyof StateOperatorNames, StateOperatorNameKeys> extends never
    ? true
    : false
>;

type _StateOperatorNamesExhaustiveInverse = ExpectTrue<
  Exclude<StateOperatorNameKeys, keyof StateOperatorNames> extends never
    ? true
    : false
>;

type _RuleHelpersExhaustive = ExpectTrue<
  Exclude<RuleHelperKeys, TypedRuleHelperKeys> extends never ? true : false
>;

type _RuleHelpersExhaustiveInverse = ExpectTrue<
  Exclude<TypedRuleHelperKeys, RuleHelperKeys> extends never ? true : false
>;

// =============================================================================
// USAGE TEST
// =============================================================================

// Example facts type
interface UserFacts {
  user: {
    name: string;
    age: number;
    email: string;
    role: 'admin' | 'user' | 'guest';
    isActive: boolean;
    tags: string[];
  };
  order: {
    total: number;
    items: { id: string; price: number }[];
  };
}

// Create typed helpers (simulated - in real usage this would come from createRuleHelpers<UserFacts>())
declare const helpers: TypedRuleHelpers<UserFacts>;

// Test type-safe path inference
const rule1 = helpers.eq('user.name', 'John'); // ✅ 'user.name' is string
const rule2 = helpers.gte('user.age', 18); // ✅ 'user.age' is number
const rule3 = helpers.isTrue('user.isActive'); // ✅ 'user.isActive' is boolean
const rule4 = helpers.in('user.role', ['admin', 'user']); // ✅ 'user.role' matches array

// Combine rules
const combinedRule = helpers.and(
  helpers.gte('user.age', 18),
  helpers.eq('user.role', 'admin'),
  helpers.isTrue('user.isActive'),
);

// These would cause compile-time errors (uncomment to test):
// const badRule1 = helpers.gte('user.name', 18); // ❌ 'user.name' is string, not number
// const badRule2 = helpers.isTrue('user.age'); // ❌ 'user.age' is number, not boolean
// const badRule3 = helpers.eq('user.invalid', 'x'); // ❌ 'user.invalid' doesn't exist

console.log('TypeScript compatibility test passed!');
