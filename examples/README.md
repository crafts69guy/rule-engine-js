# Real-World Examples

Practical examples showing how to use Rule Engine JS in real applications.

## 📁 Example Categories

- **[User Management](#user-management)** - Authentication, authorization, and user validation
- **[E-commerce](#e-commerce)** - Pricing, discounts, and order validation
- **[Form Validation](#form-validation)** - Complex form validation scenarios
- **[Content Management](#content-management)** - Content filtering and access control
- **[API Gateway](#api-gateway)** - Request validation and rate limiting
- **[Business Workflows](#business-workflows)** - Approval processes and business logic

## 👤 User Management

### User Registration Validation

```javascript
import { createRuleEngine, createRuleHelpers } from 'rule-engine-js';

const engine = createRuleEngine();
const rules = createRuleHelpers();

// Complex user registration validation
function createUserRegistrationValidator() {
  return rules.and(
    // Basic required fields
    rules.validation.required('firstName'),
    rules.validation.required('lastName'),
    rules.validation.required('email'),
    rules.validation.required('password'),

    // Format validation
    rules.validation.email('email'),
    rules.regex('firstName', '^[a-zA-Z\\s]{2,50}$'), // Letters only, 2-50 chars
    rules.regex('lastName', '^[a-zA-Z\\s]{2,50}$'),

    // Password strength requirements
    rules.and(
      rules.gte('password.length', 8),
      rules.lte('password.length', 128),
      rules.regex('password', '(?=.*[a-z])'), // Lowercase letter
      rules.regex('password', '(?=.*[A-Z])'), // Uppercase letter
      rules.regex('password', '(?=.*\\d)'), // Number
      rules.regex('password', '(?=.*[@$!%*?&])'), // Special character
      rules.not(rules.contains('password', 'password')), // No common words
      rules.not(rules.contains('password', '123456')) // No sequential numbers
    ),

    // Password confirmation
    rules.field.equals('password', 'confirmPassword'),

    // Age verification
    rules.validation.ageRange('age', 13, 120),

    // Terms acceptance
    rules.isTrue('agreedToTerms'),
    rules.isTrue('agreedToPrivacy'),

    // Optional fields validation (only if provided)
    rules.or(rules.isNull('phone'), rules.regex('phone', '^\\+?[1-9]\\d{1,14}$')),

    rules.or(
      rules.isNull('website'),
      rules.regex(
        'website',
        '^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b'
      )
    )
  );
}

// Usage example
const registrationData = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  password: 'SecurePass123!',
  confirmPassword: 'SecurePass123!',
  age: 28,
  phone: '+1234567890',
  website: 'https://johndoe.com',
  agreedToTerms: true,
  agreedToPrivacy: true,
};

const validator = createUserRegistrationValidator();
const result = engine.evaluateExpr(validator, registrationData);

if (result.success) {
  console.log('✅ Registration data is valid');
} else {
  console.log('❌ Validation failed:', result.error);
}
```

### Role-Based Access Control

```javascript
// Advanced RBAC system with hierarchical permissions
function createRBACValidator() {
  const roleHierarchy = {
    superadmin: ['admin', 'moderator', 'user', 'guest'],
    admin: ['moderator', 'user', 'guest'],
    moderator: ['user', 'guest'],
    user: ['guest'],
    guest: [],
  };

  return function (requiredRole, requiredPermissions = []) {
    return rules.and(
      // User must be active
      rules.isTrue('user.isActive'),
      rules.neq('user.status', 'banned'),
      rules.neq('user.status', 'suspended'),

      // Role check with hierarchy
      rules.or(
        rules.eq('user.role', requiredRole),
        rules.in('user.role', roleHierarchy[requiredRole] || [])
      ),

      // Permission check
      requiredPermissions.length > 0
        ? rules.and(
            ...requiredPermissions.map((permission) => rules.in(permission, 'user.permissions'))
          )
        : rules.eq(true, true), // Always true if no permissions required

      // Account verification for sensitive operations
      rules.or(
        rules.eq(requiredRole, 'guest'), // Guests don't need verification
        rules.isTrue('user.emailVerified')
      ),

      // Rate limiting check
      rules.or(
        rules.isNull('user.lastAction'),
        rules.gte('currentTime', 'user.lastAction + user.rateLimitInterval')
      )
    );
  };
}

// Usage
const rbacValidator = createRBACValidator();

const userContext = {
  user: {
    role: 'admin',
    isActive: true,
    status: 'active',
    permissions: ['read', 'write', 'delete', 'admin'],
    emailVerified: true,
    lastAction: Date.now() - 1000,
    rateLimitInterval: 1000,
  },
  currentTime: Date.now(),
};

const adminRule = rbacValidator('admin', ['admin']);
const result = engine.evaluateExpr(adminRule, userContext);
console.log('Admin access:', result.success ? 'GRANTED' : 'DENIED');
```

## 🛒 E-commerce

### Dynamic Pricing Engine

```javascript
// Sophisticated e-commerce pricing and discount system
function createPricingEngine() {
  const baseValidation = rules.and(
    rules.validation.required('customer.id'),
    rules.validation.required('order.items'),
    rules.gte('order.items.length', 1),
    rules.gt('order.subtotal', 0)
  );

  const discountRules = {
    // VIP customer discounts
    vipDiscount: rules.and(
      rules.eq('customer.tier', 'vip'),
      rules.or(rules.gte('order.subtotal', 100), rules.gte('customer.lifetimeValue', 5000))
    ),

    // Bulk order discounts
    bulkDiscount: rules.and(
      rules.gte('order.totalQuantity', 10),
      rules.in('order.primaryCategory', ['electronics', 'books', 'clothing'])
    ),

    // Loyalty program discounts
    loyaltyDiscount: rules.and(
      rules.gte('customer.loyaltyPoints', 500),
      rules.isTrue('customer.loyaltyMember')
    ),

    // First-time customer discount
    firstTimeDiscount: rules.and(
      rules.isTrue('customer.isFirstTime'),
      rules.gte('order.subtotal', 50),
      rules.lte('order.subtotal', 500) // Cap for first-time discount
    ),

    // Seasonal promotions
    seasonalDiscount: rules.and(
      rules.between('currentDate', 'promotion.validPeriod'),
      rules.in('order.primaryCategory', 'promotion.categories'),
      rules.gte('order.subtotal', 'promotion.minimumPurchase')
    ),
  };

  const restrictionRules = rules.and(
    // Customer eligibility
    rules.eq('customer.status', 'active'),
    rules.notIn('customer.country', 'restrictions.blockedCountries'),

    // Order restrictions
    rules.lte('order.subtotal', 'customer.creditLimit'),
    rules.gte('inventory.availability', 'order.totalQuantity'),

    // Payment method validation
    rules.or(
      rules.eq('payment.method', 'credit_card'),
      rules.eq('payment.method', 'paypal'),
      rules.eq('payment.method', 'bank_transfer')
    ),

    // Shipping restrictions
    rules.in('shipping.method', 'shipping.availableMethods'),
    rules.lte('order.weight', 'shipping.maxWeight')
  );

  return {
    baseValidation,
    discountRules,
    restrictionRules,

    // Combined validation
    fullValidation: rules.and(baseValidation, restrictionRules),

    // Discount eligibility (any discount)
    anyDiscount: rules.or(...Object.values(discountRules)),

    // Premium discount eligibility (multiple discounts)
    premiumDiscount: rules.and(
      discountRules.vipDiscount,
      rules.or(discountRules.loyaltyDiscount, discountRules.bulkDiscount)
    ),
  };
}

// Usage example with real data
const pricingEngine = createPricingEngine();

const orderContext = {
  customer: {
    id: 'CUST-12345',
    tier: 'vip',
    status: 'active',
    country: 'US',
    lifetimeValue: 7500,
    loyaltyPoints: 1200,
    loyaltyMember: true,
    isFirstTime: false,
    creditLimit: 10000,
  },
  order: {
    subtotal: 450,
    totalQuantity: 15,
    primaryCategory: 'electronics',
    weight: 5.2,
    items: [
      { id: 'ITEM-1', category: 'electronics', price: 200, quantity: 2 },
      { id: 'ITEM-2', category: 'electronics', price: 50, quantity: 13 },
    ],
  },
  payment: { method: 'credit_card' },
  shipping: {
    method: 'standard',
    availableMethods: ['standard', 'express', 'overnight'],
    maxWeight: 50,
  },
  inventory: { availability: 20 },
  promotion: {
    validPeriod: [Date.now() - 86400000, Date.now() + 86400000],
    categories: ['electronics', 'books'],
    minimumPurchase: 100,
  },
  restrictions: { blockedCountries: ['RESTRICTED-COUNTRY'] },
  currentDate: Date.now(),
};

// Test different discount scenarios
const discountTests = [
  { name: 'VIP Discount', rule: pricingEngine.discountRules.vipDiscount },
  { name: 'Bulk Discount', rule: pricingEngine.discountRules.bulkDiscount },
  { name: 'Loyalty Discount', rule: pricingEngine.discountRules.loyaltyDiscount },
  { name: 'Any Discount', rule: pricingEngine.anyDiscount },
];

console.log('🛒 E-commerce Pricing Engine Results:');
discountTests.forEach((test) => {
  const result = engine.evaluateExpr(test.rule, orderContext);
  console.log(`${test.name}: ${result.success ? '✅ Eligible' : '❌ Not Eligible'}`);
});
```

## 📝 Form Validation

### Multi-Step Form Validation

```javascript
// Complex multi-step form with conditional validation
function createMultiStepFormValidator() {
  const stepValidators = {
    // Step 1: Personal Information
    personalInfo: rules.and(
      rules.validation.required('personal.firstName'),
      rules.validation.required('personal.lastName'),
      rules.validation.email('personal.email'),
      rules.validation.ageRange('personal.age', 18, 120),
      rules.validation.oneOf('personal.gender', ['male', 'female', 'other', 'prefer-not-to-say']),

      // Phone validation (optional but if provided must be valid)
      rules.or(
        rules.isEmpty('personal.phone'),
        rules.regex('personal.phone', '^\\+?[1-9]\\d{1,14}$')
      )
    ),

    // Step 2: Address Information
    addressInfo: rules.and(
      rules.validation.required('address.street'),
      rules.validation.required('address.city'),
      rules.validation.required('address.country'),

      // Conditional postal code validation based on country
      rules.or(
        rules.neq('address.country', 'US'),
        rules.regex('address.postalCode', '^\\d{5}(-\\d{4})?$') // US ZIP code
      ),

      rules.or(
        rules.neq('address.country', 'CA'),
        rules.regex('address.postalCode', '^[A-Za-z]\\d[A-Za-z][ -]?\\d[A-Za-z]\\d$') // Canadian postal
      )
    ),

    // Step 3: Employment Information (conditional)
    employmentInfo: rules.or(
      rules.eq('application.type', 'student'), // Students skip employment
      rules.and(
        rules.validation.required('employment.company'),
        rules.validation.required('employment.position'),
        rules.validation.required('employment.startDate'),
        rules.gte('employment.annualIncome', 0),
        rules.gte('employment.monthsEmployed', 3),

        // Employment type specific validation
        rules.or(
          rules.neq('employment.type', 'self_employed'),
          rules.and(
            rules.validation.required('employment.businessName'),
            rules.gte('employment.yearsInBusiness', 1)
          )
        )
      )
    ),

    // Step 4: Final Agreements
    agreements: rules.and(
      rules.isTrue('agreements.termsAndConditions'),
      rules.isTrue('agreements.privacyPolicy'),
      rules.isTrue('agreements.dataProcessing'),

      // Conditional credit check consent (for financial applications)
      rules.or(rules.neq('application.type', 'loan'), rules.isTrue('agreements.creditCheckConsent'))
    ),
  };

  return {
    ...stepValidators,

    // Validate specific step
    validateStep: (stepName) => stepValidators[stepName],

    // Full form validation
    validateAll: rules.and(...Object.values(stepValidators)),
  };
}

// Example form data
const formData = {
  personal: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    age: 32,
    gender: 'male',
    phone: '+1234567890',
  },
  address: {
    street: '123 Main St',
    city: 'New York',
    country: 'US',
    postalCode: '10001',
  },
  employment: {
    company: 'Tech Corp',
    position: 'Software Engineer',
    startDate: '2020-01-15',
    monthsEmployed: 48,
    annualIncome: 75000,
    type: 'full_time',
  },
  agreements: {
    termsAndConditions: true,
    privacyPolicy: true,
    dataProcessing: true,
    creditCheckConsent: true,
  },
  application: {
    type: 'loan',
  },
};

const formValidator = createMultiStepFormValidator();

// Test individual steps
const stepTests = ['personalInfo', 'addressInfo', 'employmentInfo', 'agreements'];

console.log('📝 Multi-Step Form Validation Results:');
stepTests.forEach((step) => {
  const result = engine.evaluateExpr(formValidator[step], formData);
  console.log(`Step ${step}: ${result.success ? '✅ Valid' : '❌ Invalid'}`);
});

// Test full form
const fullFormResult = engine.evaluateExpr(formValidator.validateAll, formData);
console.log(`Full Form: ${fullFormResult.success ? '✅ Valid' : '❌ Invalid'}`);
```

## 📄 Content Management

### Content Publishing Workflow

```javascript
// Advanced content management and publishing system
function createContentWorkflow() {
  const contentValidation = rules.and(
    // Basic content requirements
    rules.validation.required('content.title'),
    rules.validation.required('content.body'),
    rules.validation.required('content.author'),
    rules.validation.required('content.category'),

    // Content quality checks
    rules.gte('content.title.length', 10),
    rules.lte('content.title.length', 200),
    rules.gte('content.body.length', 100),
    rules.lte('content.body.length', 50000),

    // Metadata validation
    rules.validation.oneOf('content.category', [
      'technology',
      'business',
      'health',
      'education',
      'entertainment',
      'sports',
      'politics',
      'science',
    ]),

    rules.validation.oneOf('content.status', [
      'draft',
      'review',
      'approved',
      'published',
      'archived',
    ]),

    // SEO requirements
    rules.validation.required('content.meta.description'),
    rules.between('content.meta.description.length', [120, 160]),
    rules.validation.required('content.meta.keywords'),
    rules.gte('content.meta.keywords.length', 3)
  );

  const publishingRules = {
    // Author permissions
    authorCanEdit: rules.or(
      rules.field.equals('content.author', 'user.id'),
      rules.in('user.role', ['editor', 'admin'])
    ),

    // Editorial review
    needsReview: rules.or(
      rules.eq('user.role', 'contributor'),
      rules.and(rules.eq('user.role', 'author'), rules.lt('user.publishedArticles', 10))
    ),

    // Auto-approval rules
    autoApprove: rules.and(
      rules.in('user.role', ['editor', 'admin']),
      rules.or(
        rules.eq('content.category', 'technology'),
        rules.eq('content.category', 'business')
      ),
      rules.lt('content.body.length', 5000),
      rules.isFalse('content.containsSensitiveInfo')
    ),

    // SEO compliance
    seoCompliant: rules.and(
      rules.between('content.title.length', [30, 60]),
      rules.between('content.meta.description.length', [120, 160]),
      rules.gte('content.meta.keywords.length', 3),
      rules.lte('content.meta.keywords.length', 10)
    ),
  };

  return {
    contentValidation,
    publishingRules,

    // Workflow states
    canEdit: rules.and(
      publishingRules.authorCanEdit,
      rules.in('content.status', ['draft', 'review'])
    ),

    canSubmitForReview: rules.and(
      contentValidation,
      rules.eq('content.status', 'draft'),
      publishingRules.authorCanEdit
    ),

    canApprove: rules.and(
      rules.in('user.role', ['editor', 'admin']),
      rules.eq('content.status', 'review'),
      publishingRules.autoApprove
    ),

    canPublish: rules.and(
      rules.eq('content.status', 'approved'),
      publishingRules.seoCompliant,
      rules.or(rules.isNull('content.publishDate'), rules.lte('content.publishDate', Date.now()))
    ),
  };
}

// Example content and user context
const contentContext = {
  content: {
    id: 'CONTENT-123',
    title: 'The Future of JavaScript: Trends for 2024',
    body: 'A comprehensive overview of emerging JavaScript trends...' + 'a'.repeat(1500),
    author: 'USER-456',
    category: 'technology',
    status: 'review',
    publishDate: Date.now() + 86400000, // Tomorrow
    containsSensitiveInfo: false,
    meta: {
      description:
        'Explore the latest JavaScript trends and technologies that will shape development in 2024 and beyond.',
      keywords: ['javascript', 'trends', '2024', 'development', 'technology'],
    },
  },
  user: {
    id: 'USER-789',
    role: 'editor',
    publishedArticles: 25,
  },
};

const contentWorkflow = createContentWorkflow();

// Test workflow permissions
const workflowTests = [
  { name: 'Can Edit', rule: contentWorkflow.canEdit },
  { name: 'Can Submit for Review', rule: contentWorkflow.canSubmitForReview },
  { name: 'Can Approve', rule: contentWorkflow.canApprove },
  { name: 'Can Publish', rule: contentWorkflow.canPublish },
];

console.log('📄 Content Management Workflow Results:');
workflowTests.forEach((test) => {
  const result = engine.evaluateExpr(test.rule, contentContext);
  console.log(`${test.name}: ${result.success ? '✅ Allowed' : '❌ Denied'}`);
});
```

## 🌐 API Gateway

### Request Validation and Rate Limiting

```javascript
// Comprehensive API gateway validation system
function createAPIGatewayRules() {
  const authenticationRules = rules.and(
    // API key validation
    rules.or(
      rules.validation.required('request.headers.apiKey'),
      rules.validation.required('request.headers.authorization')
    ),

    // API key format validation
    rules.or(
      rules.isNull('request.headers.apiKey'),
      rules.regex('request.headers.apiKey', '^[a-zA-Z0-9]{32,64}$')
    ),

    // Bearer token validation
    rules.or(
      rules.isNull('request.headers.authorization'),
      rules.regex(
        'request.headers.authorization',
        '^Bearer [A-Za-z0-9\\-_]+\\.[A-Za-z0-9\\-_]+\\.[A-Za-z0-9\\-_]+$'
      )
    )
  );

  const rateLimitingRules = {
    // Tier-based rate limiting
    tierLimits: rules.or(
      // Free tier
      rules.and(
        rules.eq('client.tier', 'free'),
        rules.lte('client.requestsPerMinute', 10),
        rules.lte('client.requestsPerDay', 1000)
      ),

      // Basic tier
      rules.and(
        rules.eq('client.tier', 'basic'),
        rules.lte('client.requestsPerMinute', 60),
        rules.lte('client.requestsPerDay', 10000)
      ),

      // Premium tier
      rules.and(
        rules.eq('client.tier', 'premium'),
        rules.lte('client.requestsPerMinute', 300),
        rules.lte('client.requestsPerDay', 100000)
      ),

      // Enterprise tier (unlimited)
      rules.eq('client.tier', 'enterprise')
    ),

    // Endpoint-specific limits
    endpointLimits: rules.or(
      // Public endpoints (more restrictive)
      rules.and(
        rules.startsWith('request.path', '/api/public/'),
        rules.lte('client.publicEndpointRequests', 100)
      ),

      // Private endpoints (less restrictive for authenticated users)
      rules.and(
        rules.startsWith('request.path', '/api/private/'),
        rules.validation.required('client.authenticated'),
        rules.lte('client.privateEndpointRequests', 1000)
      )
    ),
  };

  const requestValidationRules = {
    // HTTP method validation
    validMethod: rules.in('request.method', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),

    // Content type validation for POST/PUT requests
    validContentType: rules.or(
      rules.in('request.method', ['GET', 'DELETE']),
      rules.in('request.headers.contentType', [
        'application/json',
        'application/x-www-form-urlencoded',
        'multipart/form-data',
      ])
    ),

    // Request size limits
    validSize: rules.and(
      rules.lte('request.bodySize', 'limits.maxBodySize'),
      rules.lte('request.headerSize', 'limits.maxHeaderSize')
    ),

    // Path validation
    validPath: rules.and(
      rules.startsWith('request.path', '/api/'),
      rules.regex('request.path', '^/api/v[1-9]/[a-zA-Z0-9\\-_/]+$'),
      rules.not(rules.contains('request.path', '..')) // Prevent path traversal
    ),
  };

  const securityRules = rules.and(
    // IP whitelist/blacklist
    rules.notIn('client.ip', 'security.blacklistedIPs'),

    // Geographic restrictions
    rules.or(
      rules.eq('security.geoRestrictionsEnabled', false),
      rules.in('client.country', 'security.allowedCountries')
    ),

    // User agent validation
    rules.and(
      rules.validation.required('request.headers.userAgent'),
      rules.not(rules.contains('request.headers.userAgent', 'bot')),
      rules.not(rules.contains('request.headers.userAgent', 'crawler'))
    )
  );

  return {
    authenticationRules,
    rateLimitingRules,
    requestValidationRules,
    securityRules,

    // Combined validations
    fullValidation: rules.and(
      authenticationRules,
      rateLimitingRules.tierLimits,
      rateLimitingRules.endpointLimits,
      requestValidationRules.validMethod,
      requestValidationRules.validContentType,
      requestValidationRules.validSize,
      requestValidationRules.validPath,
      securityRules
    ),
  };
}

// Example API request context
const apiContext = {
  request: {
    method: 'POST',
    path: '/api/v1/users',
    bodySize: 1024,
    headerSize: 512,
    headers: {
      apiKey: 'abc123def456ghi789jkl012mno345pqr678stu901',
      authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      contentType: 'application/json',
      userAgent: 'MyApp/1.0.0',
    },
  },
  client: {
    id: 'CLIENT-123',
    ip: '192.168.1.100',
    country: 'US',
    tier: 'premium',
    authenticated: true,
    requestsPerMinute: 45,
    requestsPerDay: 8500,
    publicEndpointRequests: 50,
    privateEndpointRequests: 200,
  },
  limits: {
    maxBodySize: 10485760, // 10MB
    maxHeaderSize: 8192, // 8KB
  },
  security: {
    blacklistedIPs: ['192.168.1.999'],
    geoRestrictionsEnabled: false,
    allowedCountries: ['US', 'CA', 'UK'],
  },
};

const apiGateway = createAPIGatewayRules();

// Test API gateway rules
const gatewayTests = [
  { name: 'Authentication', rule: apiGateway.authenticationRules },
  { name: 'Rate Limiting - Tier', rule: apiGateway.rateLimitingRules.tierLimits },
  { name: 'Rate Limiting - Endpoint', rule: apiGateway.rateLimitingRules.endpointLimits },
  { name: 'Request Validation', rule: apiGateway.requestValidationRules.validMethod },
  { name: 'Security Rules', rule: apiGateway.securityRules },
  { name: 'Full Validation', rule: apiGateway.fullValidation },
];

console.log('🌐 API Gateway Validation Results:');
gatewayTests.forEach((test) => {
  const result = engine.evaluateExpr(test.rule, apiContext);
  console.log(`${test.name}: ${result.success ? '✅ Valid' : '❌ Invalid'}`);
});
```

## 🏢 Business Workflows

### Loan Approval Process

```javascript
// Comprehensive loan approval workflow system
function createLoanApprovalWorkflow() {
  const applicantValidation = rules.and(
    // Basic applicant information
    rules.validation.required('applicant.ssn'),
    rules.validation.required('applicant.firstName'),
    rules.validation.required('applicant.lastName'),
    rules.validation.email('applicant.email'),
    rules.validation.ageRange('applicant.age', 18, 75),

    // Employment verification
    rules.validation.oneOf('applicant.employment.status', [
      'employed',
      'self_employed',
      'retired',
      'student',
    ]),

    // Employment duration requirements
    rules.or(
      rules.eq('applicant.employment.status', 'retired'),
      rules.gte('applicant.employment.monthsAtCurrentJob', 6)
    )
  );

  const creditAssessment = rules.and(
    // Credit score requirements
    rules.gte('applicant.creditScore', 'loan.minimumCreditScore'),

    // Credit history
    rules.gte('applicant.creditHistoryMonths', 12),
    rules.lte('applicant.recentCreditInquiries', 3),
    rules.lte('applicant.creditUtilization', 0.3), // Max 30%

    // Payment history
    rules.lte('applicant.latePaymentsLast12Months', 2),
    rules.eq('applicant.hasBankruptcy', false),
    rules.eq('applicant.hasForeclosure', false)
  );

  const incomeVerification = rules.and(
    // Annual income requirements
    rules.gte('applicant.annualIncome', 'loan.minimumIncome'),

    // Income stability
    rules.or(
      rules.neq('applicant.employment.status', 'self_employed'),
      rules.and(
        rules.gte('applicant.employment.yearsInBusiness', 2),
        rules.isTrue('applicant.hasBusinessTaxReturns')
      )
    ),

    // Debt-to-income ratio
    rules.lte('applicant.monthlyDebtPayments', 'applicant.monthlyIncome * 0.43'), // Max 43% DTI

    // Documentation
    rules.isTrue('applicant.hasIncomeDocumentation'),

    // Employment verification
    rules.or(
      rules.eq('applicant.employment.status', 'retired'),
      rules.isTrue('applicant.employment.verified')
    )
  );

  const loanTermsValidation = rules.and(
    // Loan amount limits
    rules.gte('loan.amount', 'loan.minimumAmount'),
    rules.lte('loan.amount', 'loan.maximumAmount'),
    rules.lte('loan.amount', 'applicant.annualIncome * loan.maxIncomeMultiplier'),

    // Loan term limits
    rules.between('loan.termMonths', [12, 360]), // 1-30 years

    // Down payment requirements
    rules.or(
      rules.eq('loan.type', 'unsecured'),
      rules.gte('loan.downPaymentPercent', 'loan.minimumDownPayment')
    ),

    // Purpose validation
    rules.validation.oneOf('loan.purpose', [
      'home_purchase',
      'home_refinance',
      'home_improvement',
      'auto_purchase',
      'debt_consolidation',
      'business',
      'education',
      'personal',
    ])
  );

  const riskAssessment = rules.and(
    // Overall risk score
    rules.lte('risk.totalScore', 'risk.maximumAcceptableScore'),

    // Individual risk factors
    rules.lte('risk.creditRisk', 7), // Scale 1-10
    rules.lte('risk.incomeRisk', 6), // Scale 1-10
    rules.lte('risk.collateralRisk', 5), // Scale 1-10

    // Fraud indicators
    rules.eq('applicant.fraudScore', 0),
    rules.isFalse('applicant.hasIdentityFlags'),

    // Regulatory compliance
    rules.isFalse('applicant.onWatchlist')
  );

  const autoApprovalRules = rules.and(
    // Excellent credit profile
    rules.gte('applicant.creditScore', 750),
    rules.lte('applicant.debtToIncomeRatio', 0.25),

    // Strong income
    rules.gte('applicant.annualIncome', 75000),
    rules.eq('applicant.employment.status', 'employed'),
    rules.gte('applicant.employment.monthsAtCurrentJob', 24),

    // Conservative loan terms
    rules.lte('loan.amount', 'applicant.annualIncome * 3'),
    rules.lte('loan.termMonths', 240), // Max 20 years

    // Low risk
    rules.lte('risk.totalScore', 3)
  );

  const manualReviewRequired = rules.or(
    // High loan amounts
    rules.gte('loan.amount', 500000),

    // Marginal credit
    rules.between('applicant.creditScore', [650, 699]),

    // Self-employed applicants
    rules.eq('applicant.employment.status', 'self_employed'),

    // Recent financial events
    rules.gte('applicant.recentCreditInquiries', 2)
  );

  return {
    applicantValidation,
    creditAssessment,
    incomeVerification,
    loanTermsValidation,
    riskAssessment,
    autoApprovalRules,
    manualReviewRequired,

    // Workflow decision points
    canAutoApprove: rules.and(
      applicantValidation,
      creditAssessment,
      incomeVerification,
      loanTermsValidation,
      riskAssessment,
      autoApprovalRules,
      rules.not(manualReviewRequired)
    ),

    shouldReject: rules.or(
      rules.not(applicantValidation),
      rules.not(creditAssessment),
      rules.not(incomeVerification),
      rules.not(loanTermsValidation),
      rules.not(riskAssessment)
    ),

    requiresManualReview: rules.and(
      applicantValidation,
      creditAssessment,
      incomeVerification,
      loanTermsValidation,
      riskAssessment,
      rules.or(manualReviewRequired, rules.not(autoApprovalRules))
    ),
  };
}

// Example loan application context
const loanContext = {
  applicant: {
    ssn: '123-45-6789',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@email.com',
    age: 35,
    employment: {
      status: 'employed',
      monthsAtCurrentJob: 36,
      yearsInBusiness: null,
      verified: true,
    },
    annualIncome: 120000,
    monthlyIncome: 10000,
    monthlyDebtPayments: 2500,
    debtToIncomeRatio: 0.25,
    creditScore: 780,
    creditHistoryMonths: 120,
    creditUtilization: 0.15,
    recentCreditInquiries: 1,
    latePaymentsLast12Months: 0,
    hasBankruptcy: false,
    hasForeclosure: false,
    hasIncomeDocumentation: true,
    fraudScore: 0,
    hasIdentityFlags: false,
    onWatchlist: false,
    hasBusinessTaxReturns: false,
  },
  loan: {
    amount: 350000,
    termMonths: 360,
    type: 'secured',
    purpose: 'home_purchase',
    downPaymentPercent: 20,
    minimumAmount: 50000,
    maximumAmount: 2000000,
    minimumIncome: 50000,
    minimumCreditScore: 620,
    minimumDownPayment: 10,
    maxIncomeMultiplier: 5,
  },
  risk: {
    totalScore: 2,
    creditRisk: 1,
    incomeRisk: 2,
    collateralRisk: 1,
    maximumAcceptableScore: 8,
  },
};

const loanWorkflow = createLoanApprovalWorkflow();

// Test loan approval workflow
const workflowTests = [
  { name: 'Applicant Validation', rule: loanWorkflow.applicantValidation },
  { name: 'Credit Assessment', rule: loanWorkflow.creditAssessment },
  { name: 'Income Verification', rule: loanWorkflow.incomeVerification },
  { name: 'Loan Terms Validation', rule: loanWorkflow.loanTermsValidation },
  { name: 'Risk Assessment', rule: loanWorkflow.riskAssessment },
];

console.log('🏢 Loan Approval Workflow Results:');
workflowTests.forEach((test) => {
  const result = engine.evaluateExpr(test.rule, loanContext);
  console.log(`${test.name}: ${result.success ? '✅ Pass' : '❌ Fail'}`);
});

// Test workflow decisions
const decisionTests = [
  { name: 'Can Auto Approve', rule: loanWorkflow.canAutoApprove },
  { name: 'Should Reject', rule: loanWorkflow.shouldReject },
  { name: 'Requires Manual Review', rule: loanWorkflow.requiresManualReview },
];

console.log('\nWorkflow Decisions:');
decisionTests.forEach((test) => {
  const result = engine.evaluateExpr(test.rule, loanContext);
  console.log(`${test.name}: ${result.success ? '✅ Yes' : '❌ No'}`);
});
```

### Employee Performance Review System

```javascript
// Advanced employee performance review and promotion system
function createPerformanceReviewSystem() {
  const performanceMetrics = rules.and(
    // Core performance indicators
    rules.gte('performance.overallRating', 3.0), // Scale 1-5
    rules.gte('performance.goalAchievement', 0.8), // 80%
    rules.gte('performance.qualityScore', 7), // Scale 1-10
    rules.lte('performance.errorRate', 0.05), // Max 5%

    // Productivity metrics
    rules.gte('performance.productivity.currentQuarter', 'performance.productivity.target'),
    rules.gte(
      'performance.productivity.yearToDate',
      'performance.productivity.annualTarget * 0.75'
    ),

    // Collaboration and teamwork
    rules.gte('performance.teamworkRating', 3.5),
    rules.gte('performance.communicationRating', 3.5),
    rules.lte('performance.conflictIncidents', 2),

    // Professional development
    rules.gte('performance.trainingHoursCompleted', 'performance.requiredTrainingHours')
  );

  const attendanceMetrics = rules.and(
    // Attendance requirements
    rules.gte('attendance.rate', 0.95), // 95% attendance
    rules.lte('attendance.unexcusedAbsences', 3),
    rules.lte('attendance.tardiness', 5),

    // Schedule compliance
    rules.gte('attendance.scheduleAdherence', 0.9)
  );

  const behavioralAssessment = rules.and(
    // Code of conduct
    rules.eq('behavior.conductViolations', 0),
    rules.eq('behavior.harassmentComplaints', 0),
    rules.eq('behavior.ethicsViolations', 0),

    // Cultural fit
    rules.gte('behavior.cultureAlignment', 4.0),
    rules.gte('behavior.valuesAdherence', 4.0),

    // Innovation and initiative
    rules.or(rules.gte('behavior.innovationScore', 3.0), rules.gte('behavior.initiativesTaken', 2))
  );

  const promotionEligibility = rules.and(
    // Performance excellence
    rules.gte('performance.overallRating', 4.0), // Exceeds expectations
    rules.gte('performance.goalAchievement', 0.9),
    rules.gte('performance.consistency', 0.85), // Consistent performer

    // Readiness for next level
    rules.gte('skills.nextLevelReadiness', 0.8),
    rules.isTrue('employee.hasSuccessionPlan'),

    // Business need
    rules.isTrue('organization.hasOpenPosition'),
    rules.eq('budget.hasPromotionBudget', true),

    // No performance issues
    rules.eq('performance.performanceImprovement', false),
    rules.eq('performance.disciplinaryActions', 0)
  );

  const improvementPlan = rules.or(
    // Performance below expectations
    rules.lt('performance.overallRating', 3.0),
    rules.lt('performance.goalAchievement', 0.7),

    // Behavioral concerns
    rules.gt('behavior.conductViolations', 0),
    rules.lt('behavior.cultureAlignment', 3.0),

    // Attendance issues
    rules.lt('attendance.rate', 0.9),
    rules.gt('attendance.unexcusedAbsences', 5)
  );

  return {
    performanceMetrics,
    attendanceMetrics,
    behavioralAssessment,
    promotionEligibility,
    improvementPlan,

    // Overall assessment categories
    excellentPerformer: rules.and(
      performanceMetrics,
      attendanceMetrics,
      behavioralAssessment,
      rules.gte('performance.overallRating', 4.5),
      rules.not(improvementPlan)
    ),

    satisfactoryPerformer: rules.and(
      performanceMetrics,
      attendanceMetrics,
      behavioralAssessment,
      rules.between('performance.overallRating', [3.0, 4.4]),
      rules.not(improvementPlan)
    ),

    needsImprovement: rules.or(
      improvementPlan,
      rules.not(performanceMetrics),
      rules.not(attendanceMetrics),
      rules.not(behavioralAssessment)
    ),

    // Action recommendations
    recommendPromotion: rules.and(promotionEligibility, rules.not(improvementPlan)),
  };
}

// Example employee review context
const reviewContext = {
  employee: {
    hasSuccessionPlan: true,
  },
  performance: {
    overallRating: 4.2,
    goalAchievement: 0.92,
    qualityScore: 8.5,
    errorRate: 0.02,
    productivity: {
      currentQuarter: 105,
      target: 100,
      yearToDate: 380,
      annualTarget: 400,
    },
    teamworkRating: 4.0,
    communicationRating: 4.1,
    conflictIncidents: 0,
    trainingHoursCompleted: 45,
    requiredTrainingHours: 40,
    consistency: 0.88,
    performanceImprovement: false,
    disciplinaryActions: 0,
  },
  attendance: {
    rate: 0.97,
    unexcusedAbsences: 1,
    tardiness: 2,
    scheduleAdherence: 0.95,
  },
  behavior: {
    conductViolations: 0,
    harassmentComplaints: 0,
    ethicsViolations: 0,
    cultureAlignment: 4.2,
    valuesAdherence: 4.0,
    innovationScore: 3.5,
    initiativesTaken: 3,
  },
  skills: {
    nextLevelReadiness: 0.85,
  },
  organization: {
    hasOpenPosition: true,
  },
  budget: {
    hasPromotionBudget: true,
  },
};

const performanceSystem = createPerformanceReviewSystem();

// Test performance review system
const reviewTests = [
  { name: 'Performance Metrics', rule: performanceSystem.performanceMetrics },
  { name: 'Attendance Metrics', rule: performanceSystem.attendanceMetrics },
  { name: 'Behavioral Assessment', rule: performanceSystem.behavioralAssessment },
  { name: 'Promotion Eligibility', rule: performanceSystem.promotionEligibility },
  { name: 'Needs Improvement Plan', rule: performanceSystem.improvementPlan },
];

console.log('👥 Employee Performance Review Results:');
reviewTests.forEach((test) => {
  const result = engine.evaluateExpr(test.rule, reviewContext);
  console.log(`${test.name}: ${result.success ? '✅ Pass' : '❌ Fail'}`);
});

// Test performance categories
const categoryTests = [
  { name: 'Excellent Performer', rule: performanceSystem.excellentPerformer },
  { name: 'Satisfactory Performer', rule: performanceSystem.satisfactoryPerformer },
  { name: 'Needs Improvement', rule: performanceSystem.needsImprovement },
];

console.log('\nPerformance Categories:');
categoryTests.forEach((test) => {
  const result = engine.evaluateExpr(test.rule, reviewContext);
  console.log(`${test.name}: ${result.success ? '✅ Yes' : '❌ No'}`);
});

// Test recommendations
const recommendationTests = [
  { name: 'Recommend Promotion', rule: performanceSystem.recommendPromotion },
];

console.log('\nRecommendations:');
recommendationTests.forEach((test) => {
  const result = engine.evaluateExpr(test.rule, reviewContext);
  console.log(`${test.name}: ${result.success ? '✅ Yes' : '❌ No'}`);
});
```

## 🎯 Best Practices from Examples

### 1. Rule Organization

```javascript
// ✅ Good: Modular rule organization
const ruleSystem = {
  validation: createValidationRules(),
  business: createBusinessRules(),
  security: createSecurityRules(),
  workflow: createWorkflowRules(),
};

// ❌ Avoid: Monolithic rule definitions
const megaRule = rules.and(/* 50+ conditions mixed together */);
```

### 2. Context Structure

```javascript
// ✅ Good: Well-structured, hierarchical context
const context = {
  user: {
    /* user-specific data */
  },
  request: {
    /* request information */
  },
  system: {
    /* system state */
  },
  config: {
    /* configuration settings */
  },
};

// ❌ Avoid: Flat context structure
const context = {
  userName,
  userAge,
  userRole,
  requestMethod,
  requestPath /* ... */,
};
```

### 3. Error Handling

```javascript
// ✅ Good: Graceful error handling
function evaluateRulesSafely(rules, context) {
  try {
    const result = engine.evaluateExpr(rules, context);
    return {
      success: result.success,
      error: result.error,
      details: result.details,
    };
  } catch (error) {
    console.error('Rule evaluation failed:', error);
    return {
      success: false,
      error: 'Evaluation failed',
      details: { originalError: error.message },
    };
  }
}
```

### 4. Testing Strategy

```javascript
// ✅ Good: Comprehensive test cases
const testCases = [
  { name: 'Valid case', context: validContext, expected: true },
  { name: 'Invalid case', context: invalidContext, expected: false },
  { name: 'Edge case', context: edgeContext, expected: false },
  { name: 'Boundary case', context: boundaryContext, expected: true },
];

testCases.forEach((test) => {
  const result = engine.evaluateExpr(rule, test.context);
  console.log(`${test.name}: ${result.success === test.expected ? 'PASS' : 'FAIL'}`);
});
```

### 5. Performance Optimization

```javascript
// ✅ Good: Ordered by performance (fastest first)
const optimizedRule = rules.and(
  rules.eq('user.active', true), // Fast boolean check
  rules.gte('user.age', 18), // Fast numeric comparison
  rules.in('user.role', ['admin', 'user']), // Medium array check
  rules.validation.email('user.email') // Slower regex validation
);

// ❌ Avoid: Expensive operations first
const slowRule = rules.and(
  rules.validation.email('user.email'), // Slow regex first
  rules.eq('user.active', true) // Fast check last
);
```

## 📁 Additional Examples

For more specialized examples, check out these individual files:

- **[healthcare.js](./healthcare.js)** - Medical eligibility and compliance rules
- **[financial-services.js](./financial-services.js)** - Risk assessment and lending
- **[insurance.js](./insurance.js)** - Policy eligibility and claims processing
- **[education.js](./education.js)** - Student enrollment and academic validation
- **[logistics.js](./logistics.js)** - Shipping and inventory management
- **[gaming.js](./gaming.js)** - Player progression and reward systems

Each example includes:

- ✅ Complete rule definitions with real-world complexity
- ✅ Realistic data contexts and test scenarios
- ✅ Performance optimizations and best practices
- ✅ Error handling patterns and edge case management
- ✅ Documentation and usage instructions

## 🚀 Getting Started with Examples

1. **Choose a relevant example** that matches your use case
2. **Copy the basic structure** and adapt to your needs
3. **Test with your actual data** using the provided test patterns
4. **Gradually add complexity** as your requirements grow
5. **Monitor performance** using the optimization patterns shown

## 💡 Key Takeaways

These examples demonstrate that Rule Engine JS can handle:

- **Complex business logic** with nested conditions and dynamic comparisons
- **Real-time decision making** with performance-optimized rule evaluation
- **Scalable architectures** using modular rule organization
- **Enterprise-grade requirements** with comprehensive validation and security
- **Maintainable codebases** through clear separation of rules and business logic

**Ready to build powerful rule-based applications?** Start with these examples and customize them for your specific needs! 🎯
