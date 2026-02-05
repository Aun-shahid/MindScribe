type Callback = (payload?: any) => void;

class EventBus {
  private handlers: Map<string, Set<Callback>> = new Map();

  subscribe(event: string, cb: Callback) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(cb);
    return () => this.unsubscribe(event, cb);
  }

  unsubscribe(event: string, cb: Callback) {
    const set = this.handlers.get(event);
    if (set) {
      set.delete(cb);
      if (set.size === 0) this.handlers.delete(event);
    }
  }

  emit(event: string, payload?: any) {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const cb of Array.from(set)) {
      try {
        cb(payload);
      } catch (e) {
        // swallow handler errors to avoid breaking emit
        console.error('[EventBus] handler error', e);
      }
    }
  }
}

export default new EventBus();
