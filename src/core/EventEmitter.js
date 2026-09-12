/**
 * Simple event emitter
 */
export class EventEmitter {
  constructor() {
    this._events = new Map();
  }
  
  on(event, listener) {
    if (!this._events.has(event)) {
      this._events.set(event, new Set());
    }
    this._events.get(event).add(listener);
    return () => this.off(event, listener);
  }
  
  off(event, listener) {
    this._events.get(event)?.delete(listener);
  }

  once(event, listener) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      listener.apply(this, args);
    };
    return this.on(event, wrapper);
  }
  
  emit(event, ...args) {
    const listeners = this._events.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener.apply(this, args);
        } catch (e) {
          console.error(`RackViz: Error in "${event}" handler:`, e);
        }
      }
    }
  }
  
  removeAllListeners(event) {
    if (event) {
      this._events.delete(event);
    } else {
      this._events.clear();
    }
  }
}