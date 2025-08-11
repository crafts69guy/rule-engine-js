const { createRuleEngine, createRuleHelpers } = require('../../dist/index.cjs.js');

describe('Real-World Integration Tests', () => {
  let engine;
  let h;

  beforeEach(() => {
    engine = createRuleEngine();
    h = createRuleHelpers();
  });

  describe('User Access Control', () => {
    it('should handle complex user permission rules', () => {
      const context = {
        user: {
          id: 123,
          name: 'John Doe',
          email: 'john@company.com',
          age: 28,
          role: 'admin',
          permissions: ['read', 'write', 'delete'],
          department: 'engineering',
          isActive: true,
          lastLogin: '2023-12-01'
        },
        resource: {
          type: 'document',
          owner: 123,
          department: 'engineering',
          confidential: false
        }
      };

      const accessRule = h.and(
        // User must be active
        h.isTrue('user.isActive'),

        // User must be authenticated (has ID)
        h.isNotNull('user.id'),

        // Either admin OR (department match AND has write permission)
        h.or(
          h.eq('user.role', 'admin'),
          h.and(
            h.field.equals('user.department', 'resource.department'),
            h.in('write', 'user.permissions')
          )
        ),

        // If document is confidential, must be admin
        h.or(
          h.isFalse('resource.confidential'),
          h.eq('user.role', 'admin')
        )
      );

      expectRuleToPass(engine, accessRule, context);
    });

    it('should deny access for inactive users', () => {
      const context = {
        user: { isActive: false, role: 'admin', id: 123 },
        resource: { confidential: false }
      };

      const accessRule = h.and(
        h.isTrue('user.isActive'),
        h.eq('user.role', 'admin')
      );

      expectRuleToFail(engine, accessRule, context);
    });
  });

  describe('E-commerce Business Rules', () => {
    it('should handle discount eligibility rules', () => {
      const context = {
        customer: {
          type: 'premium',
          memberSince: '2020-01-01',
          totalPurchases: 15000,
          currentOrder: {
            total: 500,
            items: [
              { category: 'electronics', price: 300 },
              { category: 'books', price: 200 }
            ]
          }
        },
        promotion: {
          minOrderAmount: 100,
          validCategories: ['electronics', 'clothing'],
          membershipRequired: ['premium', 'gold']
        }
      };

      const discountRule = h.and(
        // Customer must be premium or gold
        h.in('customer.type', 'promotion.membershipRequired'),

        // Order must meet minimum amount
        h.gte('customer.currentOrder.total', 'promotion.minOrderAmount'),

        // Customer must have history of purchases
        h.gte('customer.totalPurchases', 1000),

        // At least one item must be in valid category
        h.or(
          h.in('electronics', 'promotion.validCategories'),
          h.in('clothing', 'promotion.validCategories')
        )
      );

      expectRuleToPass(engine, discountRule, context);
    });
  });

  describe('Form Validation', () => {
    it('should handle complex form validation with dependencies', () => {
      const context = {
        form: {
          personalInfo: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            age: 28
          },
          preferences: {
            newsletter: true,
            marketing: false,
            theme: 'dark'
          },
          account: {
            username: 'johndoe',
            password: 'SecurePass123!',
            confirmPassword: 'SecurePass123!',
            agreedToTerms: true
          }
        }
      };

      const validationRule = h.and(
        // Personal info validation
        h.validation.required('form.personalInfo.firstName'),
        h.validation.required('form.personalInfo.lastName'),
        h.validation.email('form.personalInfo.email'),
        h.validation.minAge('form.personalInfo.age', 18),

        // Account validation
        h.validation.required('form.account.username'),
        h.validation.required('form.account.password'),
        h.field.equals('form.account.password', 'form.account.confirmPassword'),
        h.isTrue('form.account.agreedToTerms'),

        // Username length check
        h.regex('form.account.username', '^.{3,}$'), // At least 3 characters

        // Password strength check
        h.regex('form.account.password', '^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[!@#$%^&*]).{8,}$')
      );

      expectRuleToPass(engine, validationRule, context);
    });

    it('should fail validation for weak password', () => {
      const context = {
        form: {
          personalInfo: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            age: 28
          },
          account: {
            username: 'johndoe',
            password: 'weak',
            confirmPassword: 'weak',
            agreedToTerms: true
          }
        }
      };

      const passwordRule = h.regex(
        'form.account.password',
        '^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[!@#$%^&*]).{8,}$'
      );

      expectRuleToFail(engine, passwordRule, context);
    });
  });

  describe('Dynamic Scoring System', () => {
    it('should calculate dynamic scores with field comparisons', () => {
      const context = {
        exam: {
          maxScore: 100,
          passingScore: 70,
          studentScore: 85,
          bonusPoints: 5,
          penalties: 2
        },
        student: {
          attendance: 0.95,
          previousGrade: 'A',
          extraCredit: 3
        }
      };

      const passingRule = h.and(
        // Basic passing requirement
        h.gte('exam.studentScore', 'exam.passingScore'),

        // Score is within valid range
        h.between('exam.studentScore', [0, 'exam.maxScore']),

        // Good attendance (95% or higher)
        h.gte('student.attendance', 0.9),

        // Calculate final score: studentScore + bonusPoints + extraCredit - penalties
        h.or(
          // Either base score is high enough
          h.gte('exam.studentScore', 'exam.passingScore'),

          // Or with adjustments, student passes
          h.gte('exam.studentScore', 65) // Allowing for 5 bonus + 3 extra - 2 penalty = 6 point boost
        )
      );

      expectRuleToPass(engine, passingRule, context);
    });
  });

  describe('Real-Time Decision Making', () => {
    it('should handle loan approval logic', () => {
      const context = {
        applicant: {
          creditScore: 750,
          annualIncome: 75000,
          employmentYears: 3,
          existingDebt: 15000,
          age: 32
        },
        loan: {
          amount: 250000,
          purpose: 'home',
          termYears: 30
        },
        criteria: {
          minCreditScore: 650,
          maxDebtToIncomeRatio: 0.4,
          minEmploymentYears: 2,
          maxLoanToIncomeRatio: 4
        }
      };

      const approvalRule = h.and(
        // Credit score requirement
        h.gte('applicant.creditScore', 'criteria.minCreditScore'),

        // Employment stability
        h.gte('applicant.employmentYears', 'criteria.minEmploymentYears'),

        // Debt-to-income ratio check (existing debt < 40% of income)
        h.lt('applicant.existingDebt', 30000), // 75000 * 0.4 = 30000

        // Loan-to-income ratio (loan amount < 4x annual income)
        h.lt('loan.amount', 300000), // 75000 * 4 = 300000

        // Age requirement (18-70)
        h.between('applicant.age', [18, 70]),

        // Loan purpose is valid
        h.in('loan.purpose', ['home', 'car', 'education', 'business'])
      );

      expectRuleToPass(engine, approvalRule, context);
    });
  });

  describe('Performance with Real-World Complexity', () => {
    it('should handle enterprise-level rule complexity', () => {
      const context = {
        transaction: {
          amount: 1500,
          currency: 'USD',
          type: 'purchase',
          merchant: {
            category: 'electronics',
            country: 'US',
            riskScore: 0.2
          }
        },
        user: {
          accountType: 'premium',
          riskProfile: 'low',
          dailyLimit: 5000,
          monthlySpent: 12000,
          monthlyLimit: 20000,
          verificationLevel: 'full'
        },
        security: {
          deviceTrusted: true,
          locationMatch: true,
          timeOfDay: 14, // 2 PM
          fraudScore: 0.1
        }
      };

      const transactionRule = h.and(
        // Amount validations
        h.gt('transaction.amount', 0),
        h.lte('transaction.amount', 'user.dailyLimit'),

        // Monthly limit check
        h.lte('user.monthlySpent', 'user.monthlyLimit'),

        // Security checks
        h.isTrue('security.deviceTrusted'),
        h.isTrue('security.locationMatch'),
        h.lt('security.fraudScore', 0.5),

        // Risk-based rules
        h.or(
          // Low risk: simple approval
          h.and(
            h.eq('user.riskProfile', 'low'),
            h.lt('transaction.amount', 1000)
          ),

          // Medium risk: additional checks
          h.and(
            h.in('user.riskProfile', ['low', 'medium']),
            h.lt('security.fraudScore', 0.3),
            h.eq('user.verificationLevel', 'full')
          ),

          // High-value transactions: stricter rules
          h.and(
            h.gte('transaction.amount', 1000),
            h.eq('user.accountType', 'premium'),
            h.between('security.timeOfDay', [8, 22]), // Business hours
            h.lt('transaction.merchant.riskScore', 0.3)
          )
        )
      );

      expectRuleToPass(engine, transactionRule, context);
    });
  });
});
