// Store con suscripción selectiva: cada componente se vuelve a renderizar solo cuando
// cambian los campos del store que efectivamente leyó (p. ej. `products`), no ante
// cualquier cambio en cualquier tabla. Las funciones (acciones) son estables.
import { useEffect, useMemo, useReducer, useRef } from 'react';

type Listener = (changedKeys: Set<string>) => void;

export interface TrackedStore<T extends object> {
  getSnapshot: () => T;
  subscribe: (fn: Listener) => () => void;
  /** Llamar después de cada render del provider con el valor nuevo */
  publish: (next: T) => void;
}

export function createTrackedStore<T extends object>(initial: T): TrackedStore<T> {
  let current = initial;
  const listeners = new Set<Listener>();
  return {
    getSnapshot: () => current,
    subscribe(fn) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    publish(next) {
      const prev = current;
      current = next;
      const changed = new Set<string>();
      for (const key of Object.keys(next)) {
        const a = (prev as any)[key], b = (next as any)[key];
        if (typeof b === 'function') continue; // las acciones se acceden siempre por referencia estable
        if (!Object.is(a, b)) changed.add(key);
      }
      if (changed.size) listeners.forEach(fn => fn(changed));
    },
  };
}

export function useTrackedStore<T extends object>(store: TrackedStore<T>): T {
  const [, forceRender] = useReducer((x: number) => x + 1, 0);
  // valor visto por este componente para cada campo que leyó
  const seen = useRef(new Map<string, unknown>());
  const actionCache = useRef(new Map<string, Function>());

  const proxy = useMemo(() => new Proxy({} as T, {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined;
      const value = (store.getSnapshot() as any)[prop];
      if (typeof value === 'function') {
        // función estable que siempre llama a la versión más reciente de la acción
        let fn = actionCache.current.get(prop);
        if (!fn) {
          fn = (...args: unknown[]) => (store.getSnapshot() as any)[prop](...args);
          actionCache.current.set(prop, fn);
        }
        return fn;
      }
      seen.current.set(prop, value);
      return value;
    },
    has(_t, prop) { return prop in (store.getSnapshot() as any); },
    ownKeys() { return Reflect.ownKeys(store.getSnapshot() as any); },
    getOwnPropertyDescriptor(_t, prop) {
      return { enumerable: true, configurable: true, value: (store.getSnapshot() as any)[prop] };
    },
  }), [store]);

  useEffect(() => {
    const isStale = (keys: Iterable<string>) => {
      const snap = store.getSnapshot() as any;
      for (const k of keys) {
        if (seen.current.has(k) && !Object.is(seen.current.get(k), snap[k])) return true;
      }
      return false;
    };
    const unsubscribe = store.subscribe(changed => { if (isStale(changed)) forceRender(); });
    // Cambios ocurridos entre el render y la suscripción
    if (isStale(seen.current.keys())) forceRender();
    return unsubscribe;
  }, [store]);

  return proxy;
}
