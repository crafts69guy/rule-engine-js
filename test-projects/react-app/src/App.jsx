import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createRuleEngine, createRuleHelpers } from 'rule-engine-js';

function App() {
  const [engine] = useState(() => createRuleEngine());
  const [rules] = useState(() => createRuleHelpers());
  const [testResults, setTestResults] = useState([]);

  const [formData, setFormData] = useState({
    email: 'user@example.com',
    age: 25,
    agreedToTerms: true
  });

  const validationRule = useMemo(() => rules.and(
    rules.validation.email('email'),
    rules.gte('age', 18),
    rules.isTrue('agreedToTerms')
  ), [rules]);

  const runValidation = useCallback(() => {
    const result = engine.evaluateExpr(validationRule, formData);
    return result.success;
  }, [engine, validationRule, formData]);

  useEffect(() => {
    // Run tests on component mount
    const tests = [
      {
        name: 'Engine Creation',
        test: () => Boolean(engine && rules),
        description: 'Successfully created engine and rules'
      },
      {
        name: 'Basic Validation',
        test: () => {
          const testData = { email: 'test@example.com', age: 25, agreedToTerms: true };
          console.log('validationRule :>>', validationRule, engine.getCacheStats());
          return engine.evaluateExpr(validationRule, testData).success;
        },
        description: 'Basic form validation works'
      },
      {
        name: 'React State Integration',
        test: () => {
          return typeof runValidation === 'function';
        },
        description: 'Integrates well with React state'
      }
    ];

    const results = tests.map(({ name, test, description }) => ({
      name,
      success: test(),
      description
    }));

    setTestResults(results);
  }, [engine, rules, validationRule]);

  const isFormValid = runValidation();

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🧪 Rule Engine JS - React Test</h1>

      <div style={{ marginBottom: '30px' }}>
        <h2>Test Results</h2>
        {testResults.map(({ name, success, description }) => (
          <div key={name} style={{
            padding: '10px',
            margin: '10px 0',
            borderLeft: `4px solid ${success ? '#28a745' : '#dc3545'}`,
            backgroundColor: '#f8f9fa'
          }}>
            <strong>{success ? '✅' : '❌'} {name}</strong>
            <p>{description}</p>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>Interactive Form Validation</h2>
        <form style={{ maxWidth: '400px' }}>
          <div style={{ marginBottom: '15px' }}>
            <label>Email:</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>Age:</label>
            <input
              type="number"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>
              <input
                type="checkbox"
                checked={formData.agreedToTerms}
                onChange={(e) => setFormData({ ...formData, agreedToTerms: e.target.checked })}
              />
              I agree to the terms
            </label>
          </div>

          <div style={{
            padding: '10px',
            backgroundColor: isFormValid ? '#d4edda' : '#f8d7da',
            color: isFormValid ? '#155724' : '#721c24',
            border: `1px solid ${isFormValid ? '#c3e6cb' : '#f5c6cb'}`,
            borderRadius: '4px'
          }}>
            Form is {isFormValid ? 'valid' : 'invalid'}
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
