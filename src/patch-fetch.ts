// Pre-emptive safety patch to prevent "Cannot set property fetch of #<Window> which has only a getter"
// this must be executed before ANY other modules are loaded (as first import)

try {
  // 1. Defuse formdata-polyfill and other packages to prevent them from attempting to patch global FormData
  if (typeof window !== 'undefined') {
    if (typeof (window as any).FormData === 'undefined') {
      (window as any).FormData = class DummyFormData {
        append() {}
        delete() {}
        get() { return null; }
        getAll() { return []; }
        has() { return false; }
        set() {}
        *keys() {}
        *values() {}
        *entries() {}
        [Symbol.iterator]() { return this.entries(); }
      };
    } else if (!(window as any).FormData.prototype.keys) {
      (window as any).FormData.prototype.keys = function* () {
        // Dummy generator to satisfy checks
      };
    }
  }

  // 2. Safely patch fetch on global targets
  let originalFetch: any = typeof window !== 'undefined' ? (window as any).fetch : undefined;
  if (typeof originalFetch !== 'function' && typeof window !== 'undefined') {
    try {
      const proto = Object.getPrototypeOf(window);
      if (proto && typeof proto.fetch === 'function') {
        originalFetch = proto.fetch.bind(proto);
      }
    } catch (e) {}
  }
  if (typeof originalFetch !== 'function' && typeof Window !== 'undefined' && Window.prototype) {
    try {
      const winDesc = Object.getOwnPropertyDescriptor(Window.prototype, 'fetch');
      if (winDesc && typeof winDesc.get === 'function') {
        originalFetch = winDesc.get.call(window);
      }
    } catch (e) {}
  }

  const targets = [
    typeof window !== 'undefined' ? window : null,
    typeof Window !== 'undefined' && Window.prototype ? Window.prototype : null,
    typeof globalThis !== 'undefined' ? globalThis : null,
    typeof self !== 'undefined' ? self : null,
  ].filter(Boolean);

  targets.forEach((target: any) => {
    try {
      const desc = Object.getOwnPropertyDescriptor(target, 'fetch');
      if (desc && !desc.configurable) {
        // If it's on this object specifically and not configurable, we can't redefine it directly
        return;
      }

      // We define both getter and setter on target directly.
      // Since it's an own property, any assignment like target.fetch = ... will use our setter
      // instead of checking prototypes and throwing.
      Object.defineProperty(target, 'fetch', {
        configurable: true,
        enumerable: true,
        get() {
          return (input: RequestInfo | URL, init: RequestInit = {}) => {
            const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
            const isApiRequest = typeof url === 'string' && (url.startsWith('/api/') || url.startsWith(`${window.location.origin}/api/`));
            if (!isApiRequest) return originalFetch(input, init);

            const token = window.localStorage?.getItem('gtms_auth_token');
            if (!token) return originalFetch(input, init);

            const headers = new Headers(init.headers || (typeof input !== 'string' && !(input instanceof URL) ? input.headers : undefined));
            if (!headers.has('Authorization')) {
              headers.set('Authorization', `Bearer ${token}`);
            }
            return originalFetch(input, { ...init, headers });
          };
        },
        set(val) {
          originalFetch = val;
        }
      });
    } catch (e) {
      // Suppress individual patch errors safely
    }
  });
} catch (err) {
  // Suppress top-level errors
}

export {};
