// Minimal event bus shared by the Phaser scenes and the DOM UI.
const handlers = new Map();

export const bus = {
  on(event, fn) {
    if (!handlers.has(event)) handlers.set(event, new Set());
    handlers.get(event).add(fn);
    return () => handlers.get(event).delete(fn);
  },
  emit(event, ...args) {
    handlers.get(event)?.forEach(fn => fn(...args));
  },
};
