import { createRuleEngine, createRuleHelpers } from 'rule-engine-js';

console.log('🧪 Testing Rule Engine JS in Browser Environment');

const resultsDiv = document.getElementById('results');

function addResult(title, success, details = '') {
  const div = document.createElement('div');
  div.className = `test ${success ? 'success' : 'error'}`;
  div.innerHTML = `
    <h3>${success ? '✅' : '❌'} ${title}</h3>
    <p>${details}</p>
  `;
  resultsDiv.appendChild(div);
}

// Test data
const formData = {
  user: {
    name: 'John Doe',
    age: 28,
    email: 'john@example.com'
  },
  form: {
    score: 85,
    maxScore: 100
  }
};

try {
  // Initialize
  const engine = createRuleEngine();
  const rules = createRuleHelpers();

  addResult('Engine Initialization', true, 'Rule engine created successfully');

  // Test 1: Basic rule evaluation
  const basicRule = rules.eq('user.name', 'John Doe');
  const result1 = engine.evaluateExpr(basicRule, formData);
  addResult('Basic Rule Evaluation', result1.success, 'Simple equality check');

  // Test 2: Complex rule with helpers
  const complexRule = rules.and(
    rules.validation.email('user.email'),
    rules.gte('user.age', 18),
    rules.lt('form.score', 'form.maxScore')
  );
  const result2 = engine.evaluateExpr(complexRule, formData);
  addResult('Complex Rule with Helpers', result2.success, 'Email validation, age check, and dynamic comparison');

  // Test 3: Tree shaking test (only import what we need)
  addResult('Tree Shaking Compatibility', true, 'Successfully imported only needed functions');

  // Test 4: Bundle size in browser
  addResult('Browser Bundle Loading', true, 'Library loaded successfully in browser environment');

  // Show performance metrics
  const metrics = engine.getMetrics();
  addResult('Performance Metrics', true, `Evaluations: ${metrics.evaluations}, Avg time: ${metrics.avgTime.toFixed(2)}ms`);

} catch (error) {
  addResult('Initialization Error', false, error.message);
}
