// DOMException polyfill for Hermes engine
// This file is loaded by Metro BEFORE any other module (including React Native itself)
if (typeof globalThis.DOMException === 'undefined') {
  function DOMExceptionPolyfill(message, name) {
    this.message = message || '';
    this.name = name || 'Error';
    this.stack = new Error(this.message).stack;
  }
  DOMExceptionPolyfill.prototype = Object.create(Error.prototype);
  DOMExceptionPolyfill.prototype.constructor = DOMExceptionPolyfill;

  globalThis.DOMException = DOMExceptionPolyfill;
  if (typeof global !== 'undefined') {
    global.DOMException = DOMExceptionPolyfill;
  }
}

if (typeof globalThis.PerformanceEntry === 'undefined') {
  class PerformanceEntry {
    constructor({ name = '', entryType = '', startTime = 0, duration = 0 } = {}) {
      this.name = name;
      this.entryType = entryType;
      this.startTime = startTime;
      this.duration = duration;
    }

    toJSON() {
      return {
        name: this.name,
        entryType: this.entryType,
        startTime: this.startTime,
        duration: this.duration,
      };
    }
  }

  globalThis.PerformanceEntry = PerformanceEntry;
  if (typeof global !== 'undefined') {
    global.PerformanceEntry = PerformanceEntry;
  }
}

if (typeof globalThis.performance === 'undefined') {
  const perf = {
    now: () => Date.now(),
  };
  globalThis.performance = perf;
  if (typeof global !== 'undefined') {
    global.performance = perf;
  }
}
