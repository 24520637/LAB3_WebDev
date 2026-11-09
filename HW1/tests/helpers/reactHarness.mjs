import { JSDOM } from 'jsdom';

/** DOM and browser-API boundaries only; no React components or app modules mocked. */
export function installBrowserEnvironment() {
  const dom = new JSDOM('<!doctype html><html><body><main id="test-root"></main></body></html>', {
    url: 'http://localhost/',
  });
  const originals = new Map();
  const replace = (name, value) => {
    if (!originals.has(name)) originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  };
  for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'Node']) {
    replace(name, dom.window[name]);
  }
  replace('IS_REACT_ACT_ENVIRONMENT', true);
  return {
    dom, replace,
    restore() {
      dom.window.close();
      for (const [name, descriptor] of originals) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else delete globalThis[name];
      }
    },
  };
}

/** Deterministic Web Audio/fetch/RAF boundaries for React integration checks.
 * These tests do not verify real decoding, acoustics or browser audio policy.
 */
export function installAudioBoundary(environment, {
  missing = [], decodeFailure = false, failStart = false, failUnlock = false,
  noAudio = false, noAnalyser = false,
} = {}) {
  const contexts = [];
  const frames = new Map();
  let nextFrame = 0;
  class TestAudioContext {
    constructor() {
      this.state = 'suspended';
      this.destination = {};
      this.sources = [];
      this.closeCount = 0;
      this.resumeCount = 0;
      contexts.push(this);
    }
    createAnalyser() {
      this.analyser = {
        fftSize: 1024, amplitude: 0, disconnected: false,
        connect() {},
        disconnect() { this.disconnected = true; },
        getFloatTimeDomainData(target) { target.fill(this.amplitude); },
      };
      return this.analyser;
    }
    async decodeAudioData(bytes) {
      if (decodeFailure) throw new Error('Controlled decode failure');
      return { sound: new TextDecoder().decode(bytes) };
    }
    async resume() {
      this.resumeCount++;
      if (failUnlock) throw new Error('Controlled unlock failure');
      this.state = 'running';
    }
    createBufferSource() {
      const context = this;
      const source = {
        buffer: null, onended: null, started: false, stopped: false, disconnected: false,
        connect() {},
        disconnect() { this.disconnected = true; },
        start() {
          if (failStart) throw new Error('Controlled playback failure');
          this.started = true;
          if (context.analyser) context.analyser.amplitude = 0.5;
        },
        stop() { this.stopped = true; },
        finish() {
          if (context.analyser) context.analyser.amplitude = 0;
          this.onended?.();
        },
      };
      this.sources.push(source);
      return source;
    }
    async close() { this.closeCount++; this.state = 'closed'; }
  }
  if (noAnalyser) TestAudioContext.prototype.createAnalyser = undefined;
  environment.replace('AudioContext', noAudio ? undefined : TestAudioContext);
  environment.replace('webkitAudioContext', undefined);
  environment.replace('fetch', async (url) => {
    const sound = String(url).split('/').at(-1).replace('.wav', '');
    return {
      ok: !missing.includes(sound), status: missing.includes(sound) ? 404 : 200,
      arrayBuffer: async () => new TextEncoder().encode(sound).buffer,
    };
  });
  environment.replace('requestAnimationFrame', (callback) => {
    const id = ++nextFrame;
    frames.set(id, callback);
    return id;
  });
  environment.replace('cancelAnimationFrame', (id) => frames.delete(id));
  return {
    contexts, frames,
    get current() { return contexts.at(-1); },
    get startedSounds() {
      return contexts.flatMap((context) => context.sources
        .filter((source) => source.started).map((source) => source.buffer.sound));
    },
    advanceFrame(time) {
      const pending = [...frames.values()];
      frames.clear();
      for (const callback of pending) callback(time);
    },
  };
}

export function key(window, target, type, code, options = {}) {
  const event = new window.KeyboardEvent(type, {
    code, bubbles: true, cancelable: true, ...options,
  });
  target.dispatchEvent(event);
  return event;
}

export function pointer(window, target, type) {
  // jsdom has no native pointer default actions; dispatch click separately.
  const event = new window.Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, { isPrimary: { value: true }, button: { value: 0 } });
  target.dispatchEvent(event);
}
