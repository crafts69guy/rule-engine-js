/**
 * TypeScript type tests for TypedRuleHelpers
 * This file verifies that Path<T> and TypedRuleHelpers work correctly
 * Run with: npx tsc --noEmit tests/types/typed-helpers.test.ts
 */

import {
  createRuleHelpers,
  Path,
  PathValue,
  NumericPath,
  StringPath,
  BooleanPath,
  RuleHelpers,
} from '../../src';

// =============================================================================
// Test Context Types
// =============================================================================

interface User {
  name: string;
  age: number;
  email: string;
  isActive: boolean;
  address: {
    city: string;
    zipCode: number;
    country: string;
  };
  tags: string[];
}

interface Order {
  id: string;
  total: number;
  status: 'pending' | 'completed' | 'cancelled';
  items: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
}

interface MyContext {
  user: User;
  order: Order;
  metadata: {
    createdAt: string;
    version: number;
  };
}

// =============================================================================
// Path<T> Type Tests
// =============================================================================

// Test: Path should generate all valid dot-notation paths
type UserPaths = Path<User>;
// Expected: "name" | "age" | "email" | "isActive" | "address" | "address.city" | "address.zipCode" | "address.country" | "tags" | ...

type ContextPaths = Path<MyContext>;
// Expected: "user" | "user.name" | "user.age" | "order" | "order.id" | "order.total" | "metadata" | ...

// Type assertion tests (compile-time only)
const validPath1: Path<User> = 'name';
const validPath2: Path<User> = 'address.city';
const validPath3: Path<MyContext> = 'user.address.zipCode';
const validPath4: Path<MyContext> = 'order.total';

// =============================================================================
// PathValue<T, P> Type Tests
// =============================================================================

// Test: PathValue should correctly resolve the type at a path
type UserNameType = PathValue<User, 'name'>; // string
type UserAgeType = PathValue<User, 'age'>; // number
type UserCityType = PathValue<User, 'address.city'>; // string
type UserZipType = PathValue<User, 'address.zipCode'>; // number
type OrderTotalType = PathValue<MyContext, 'order.total'>; // number

// Type assertion tests
const nameValue: PathValue<User, 'name'> = 'John';
const ageValue: PathValue<User, 'age'> = 25;
const cityValue: PathValue<User, 'address.city'> = 'New York';

// =============================================================================
// NumericPath<T>, StringPath<T>, BooleanPath<T> Tests
// =============================================================================

type UserNumericPaths = NumericPath<User>; // "age" | "address.zipCode"
type UserStringPaths = StringPath<User>; // "name" | "email" | "address.city" | "address.country"
type UserBooleanPaths = BooleanPath<User>; // "isActive"

const numericPath: NumericPath<User> = 'age';
const stringPath: StringPath<User> = 'email';
const booleanPath: BooleanPath<User> = 'isActive';

// =============================================================================
// TypedRuleHelpers Tests
// =============================================================================

// Create typed helpers
const helpers = createRuleHelpers<MyContext>();

// Test: Comparison operators with path autocomplete
const eqRule = helpers.eq('user.name', 'John'); // ✓ path autocomplete + type-safe value
const neqRule = helpers.neq('order.status', 'cancelled');
const gtRule = helpers.gt('user.age', 18); // ✓ only numeric paths allowed
const gteRule = helpers.gte('order.total', 100);
const ltRule = helpers.lt('metadata.version', 5);
const lteRule = helpers.lte('user.address.zipCode', 99999);

// Test: String operators with path autocomplete
const containsRule = helpers.contains('user.email', '@gmail.com');
const startsWithRule = helpers.startsWith('user.name', 'J');
const endsWithRule = helpers.endsWith('user.email', '.com');
const regexRule = helpers.regex('user.email', '^[a-z]+@');

// Test: Logical operators
const andRule = helpers.and(
  helpers.gte('user.age', 18),
  helpers.eq('user.isActive', true),
  helpers.contains('user.email', '@')
);

const orRule = helpers.or(
  helpers.eq('order.status', 'completed'),
  helpers.gt('order.total', 1000)
);

const notRule = helpers.not(helpers.eq('user.isActive', false));

// Test: Array operators
const inRule = helpers.in('order.status', ['pending', 'completed']);
const notInRule = helpers.notIn('order.status', ['cancelled']);

// Test: Special operators
const betweenRule = helpers.between('user.age', [18, 65]);
const isNullRule = helpers.isNull('user.email');
const isNotNullRule = helpers.isNotNull('order.id');

// Test: Convenience methods
const isTrueRule = helpers.isTrue('user.isActive');
const isFalseRule = helpers.isFalse('user.isActive');
const isEmptyRule = helpers.isEmpty('user.name');
const isNotEmptyRule = helpers.isNotEmpty('user.email');
const existsRule = helpers.exists('order.total');

// Test: Field helpers
const fieldEqRule = helpers.field.equals('user.name', 'order.id');
const fieldGtRule = helpers.field.greaterThan('order.total', 'metadata.version');

// Test: Validation helpers
const emailRule = helpers.validation.email('user.email');
const requiredRule = helpers.validation.required('user.name');
const minAgeRule = helpers.validation.minAge('user.age', 18);
const maxAgeRule = helpers.validation.maxAge('user.age', 100);
const ageRangeRule = helpers.validation.ageRange('user.age', 18, 65);

// =============================================================================
// Untyped Helpers (backward compatibility)
// =============================================================================

const untypedHelpers = createRuleHelpers();

// These should work with any string path (no type checking)
const untypedRule = untypedHelpers.eq('any.path.here', 'value');
const untypedGt = untypedHelpers.gt('some.number', 100);

console.log('All type tests passed!');
