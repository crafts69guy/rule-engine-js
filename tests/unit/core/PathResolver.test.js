const { PathResolver, createRuleEngine } = require('../../../src/index.js');

describe('PathResolver boundaries', () => {
  afterEach(() => jest.restoreAllMocks());

  it('resolves factory values and distinguishes literal and explicit defaults', () => {
    const engine = createRuleEngine();
    const resolver = new PathResolver();
    expect(engine.resolveValue({ value: 7 }, 'value')).toBe(7);
    expect(resolver.resolveValue({}, 'missing')).toBe('missing');
    resolver.clearCache();
    expect(resolver.resolveValue({}, 'missing', 0)).toBe(0);
    expect(resolver.getCacheStats()).toMatchObject({ size: 1, hitRate: 0 });
  });

  it('blocks prototype keys, functions, inherited properties and null intermediates', () => {
    const resolver = new PathResolver({ enableCache: false });
    const context = Object.assign(Object.create({ inherited: 1 }), {
      nullable: null,
      absent: undefined,
      callable: () => 1,
      own: 2,
    });
    for (const path of [
      'constructor',
      '__proto__',
      'prototype',
      'inherited',
      'callable',
      'nullable.x',
      'absent.x',
    ]) {
      expect(resolver.resolve(context, path, 'blocked')).toBe('blocked');
    }
    expect(resolver.resolve(context, 'own')).toBe(2);
    resolver.clearCache();
    expect(resolver.getCacheStats()).toBeNull();
  });

  it('allows own prototype-named properties and functions only with explicit access', () => {
    const resolver = new PathResolver({ allowPrototypeAccess: true, enableCache: false });
    const callable = () => 1;
    expect(resolver.resolve({ constructor: 'own' }, 'constructor')).toBe('own');
    expect(resolver.resolve({ callable }, 'callable')).toBe(callable);
  });

  it('returns the default when a getter throws during traversal', () => {
    const resolver = new PathResolver({ enableCache: false });
    const context = {
      get value() {
        throw new Error('unavailable');
      },
    };
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(resolver.resolve(context, 'value', 'fallback')).toBe('fallback');
    expect(log).toHaveBeenCalled();
  });

  it('keeps distinct cached values for contexts with explicit identifiers', () => {
    const resolver = new PathResolver();
    expect(resolver.resolve({ _id: 'a', value: 1 }, 'value')).toBe(1);
    expect(resolver.resolve({ _id: 'b', value: 2 }, 'value')).toBe(2);
    expect(resolver.resolve({ id: 'c', value: 3 }, 'value')).toBe(3);
    expect(resolver.getCacheStats().size).toBe(3);
  });

  it('handles throwing getters while hashing and caches an unrelated own property', () => {
    const resolver = new PathResolver();
    const context = {
      value: 3,
      nested: {
        get broken() {
          throw new Error('unavailable');
        },
      },
    };
    expect(resolver.resolve(context, 'value')).toBe(3);
  });
});
