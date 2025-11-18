/**
 * Secure path resolver with caching and prototype pollution protection
 */
export class PathResolver {
  constructor(options = {}) {
    this.allowPrototypeAccess = options.allowPrototypeAccess || false;
    this.enableCache = options.enableCache !== false;
    this.maxCacheSize = options.maxCacheSize || 1000;

    // Cache for resolved paths
    this.cache = this.enableCache ? new Map() : null;

    // Pre-create constants for performance
    this.NOT_FOUND = Symbol('PATH_NOT_FOUND');
    this.PROTOTYPE_PROPS = new Set(['__proto__', 'constructor', 'prototype']);
  }

  /**
   * Resolve a path in the given context
   * @param {Object} context - The context object to resolve paths in
   * @param {string} path - The dot-notation path (e.g., 'user.profile.name')
   * @param {any} defaultValue - Value to return if path is not found
   * @returns {any} The resolved value or defaultValue
   */
  resolve(context, path, defaultValue = undefined) {
    // Input validation
    if (!this._isValidContext(context) || !this._isValidPath(path)) {
      return defaultValue;
    }

    // Check cache first
    if (this.cache) {
      const cacheKey = this._createCacheKey(context, path);
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }
    }

    try {
      const result = this._resolvePath(context, path);
      const finalResult = result === this.NOT_FOUND ? defaultValue : result;

      // Cache the result
      this._cacheResult(context, path, finalResult);

      return finalResult;
    } catch (error) {
      console.error('error', error);
      // Return default value on any error
      return defaultValue;
    }
  }

  /**
   * Smart value resolver - handles both paths and literals
   * This is the core method for dynamic comparison support
   * @param {Object} context - The context object
   * @param {any} value - Either a path string or literal value
   * @param {any} defaultValue - Default value if path resolution fails (optional)
   * @returns {any} Resolved value, original value if not a path, or defaultValue if path fails
   */
  resolveValue(context, value, defaultValue = undefined) {
    // Non-string values are returned as-is (numbers, booleans, objects, arrays)
    if (typeof value !== 'string') {
      return value;
    }

    // Try path resolution first
    const resolved = this.resolve(context, value, this.NOT_FOUND);

    // If path resolution succeeds, return resolved value
    if (resolved !== this.NOT_FOUND) {
      return resolved;
    }

    // If defaultValue is provided and path resolution failed, use defaultValue
    // Otherwise, treat as literal string value
    return defaultValue !== undefined ? defaultValue : value;
  }

  /**
   * Resolve value with literal fallback behavior
   * If path resolution fails, treats the value as a literal string
   * This is ideal for dynamic field comparison where strings can be either paths or literals
   *
   * @param {Object} context - The context object
   * @param {any} value - Either a path string or literal value
   * @returns {any} Resolved path value or original value as literal
   *
   * @example
   * // Path exists
   * resolveValueOrLiteral(context, 'user.name') // Returns: resolved value
   *
   * // Path doesn't exist
   * resolveValueOrLiteral(context, 'hello') // Returns: 'hello' (as literal string)
   */
  resolveValueOrLiteral(context, value) {
    return this.resolveValue(context, value, value);
  }

  /**
   * Resolve value with explicit default behavior
   * If path resolution fails, returns the specified defaultValue
   * This is ideal when you want predictable fallback values
   *
   * @param {Object} context - The context object
   * @param {any} value - Either a path string or literal value
   * @param {any} defaultValue - Value to return if path resolution fails
   * @returns {any} Resolved path value or defaultValue
   *
   * @example
   * // Path exists
   * resolveValueOrDefault(context, 'user.age', 0) // Returns: resolved age value
   *
   * // Path doesn't exist
   * resolveValueOrDefault(context, 'user.missing', 0) // Returns: 0
   */
  resolveValueOrDefault(context, value, defaultValue) {
    return this.resolveValue(context, value, defaultValue);
  }

  /**
   * Clear the cache
   */
  clearCache() {
    if (this.cache) {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics for monitoring
   * @returns {Object|null} Cache stats or null if caching disabled
   */
  getCacheStats() {
    return this.cache
      ? {
          size: this.cache.size,
          maxSize: this.maxCacheSize,
          hitRate: this._calculateHitRate(),
        }
      : null;
  }

  // Private methods

  /**
   * Validate that context is a valid object
   * @private
   */
  _isValidContext(context) {
    return context !== null && typeof context === 'object' && !Array.isArray(context);
  }

  /**
   * Validate that path is a valid string
   * @private
   */
  _isValidPath(path) {
    return (
      typeof path === 'string' && path.length > 0 && !path.startsWith('.') && !path.endsWith('.')
    );
  }

  /**
   * Securely resolve a path through the context object
   * @private
   */
  _resolvePath(context, path) {
    const keys = path.split('.');
    let current = context;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return this.NOT_FOUND;
      }

      // Security: Prevent prototype pollution
      if (!this.allowPrototypeAccess && this.PROTOTYPE_PROPS.has(key)) {
        return this.NOT_FOUND;
      }

      // Security: Only access own properties (not inherited)
      if (typeof current === 'object' && !Object.prototype.hasOwnProperty.call(current, key)) {
        return this.NOT_FOUND;
      }

      // Additional security: prevent access to functions unless explicitly allowed
      if (typeof current[key] === 'function' && !this.allowPrototypeAccess) {
        return this.NOT_FOUND;
      }

      current = current[key];
    }

    return current;
  }

  /**
   * Create a cache key for the given context and path
   * @private
   */
  _createCacheKey(context, path) {
    // Use a simple but effective cache key strategy
    const contextId = this._getContextId(context);
    return `${contextId}:${path}`;
  }

  /**
   * Generate a unique identifier for the context object
   * @private
   */
  _getContextId(context) {
    // Try to find existing identifiers first
    if (context._id) {
      return String(context._id);
    }
    if (context.id) {
      return String(context.id);
    }

    // Generate a hash based on object structure AND values
    const keys = Object.keys(context).sort();
    const keyString = keys.join(',');
    const valueTypes = keys.map((key) => typeof context[key]).join(',');
    const baseId = `${keyString}:${valueTypes}:${keys.length}`;

    // Always include value hash to differentiate contexts with same structure
    const valueHash = this._hashStatefulContext(context);
    const contextId = `${baseId}:values:${valueHash}`;

    // Special handling for stateful contexts with _previous
    // This ensures different _previous contexts generate different cache keys
    if (context._previous) {
      const previousHash = this._hashStatefulContext(context._previous);
      return `${contextId}:prev:${previousHash}`;
    }

    // Special handling for contexts with _meta (used by stateful operators)
    // Include the hasChangeOperator flag in cache key for consistency
    if (context._meta && typeof context._meta.hasChangeOperator === 'boolean') {
      return `${contextId}:meta:${context._meta.hasChangeOperator}`;
    }

    return contextId;
  }

  /**
   * Create a lightweight hash for stateful context values
   * Specifically designed for _previous context caching
   * @private
   */
  _hashStatefulContext(context, depth = 0) {
    // Prevent infinite recursion
    if (depth > 3 || !context || typeof context !== 'object') {
      return String(context || 'null');
    }

    try {
      // For small objects, create a deterministic string representation
      const entries = Object.keys(context)
        .sort()
        .slice(0, 10) // Limit keys for performance
        .map((key) => {
          const value = context[key];
          if (value && typeof value === 'object') {
            // Recursively hash nested objects (limited depth)
            return `${key}:${this._hashStatefulContext(value, depth + 1)}`;
          } else {
            // Include primitive values directly
            return `${key}:${String(value)}`;
          }
        });

      return entries.join('|');
    } catch {
      // Fallback for circular references or other issues
      return `error:${Date.now()}:${Math.random()}`;
    }
  }

  /**
   * Cache a resolved result with LRU eviction
   * @private
   */
  _cacheResult(context, path, result) {
    if (!this.cache) {
      return;
    }

    // LRU eviction: remove oldest entry if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const cacheKey = this._createCacheKey(context, path);
    this.cache.set(cacheKey, result);
  }

  /**
   * Calculate cache hit rate for monitoring
   * @private
   */
  _calculateHitRate() {
    // This is a placeholder - in a real implementation you'd track hits/misses
    // For now, return 0 as we're not tracking detailed metrics yet
    return 0;
  }
}
