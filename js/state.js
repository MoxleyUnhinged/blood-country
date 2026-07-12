function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createStore(initialState) {
  let state = clone(initialState);
  const listeners = new Set();

  function notify() {
    listeners.forEach((listener) => listener(clone(state)));
  }

  return {
    getState() {
      return clone(state);
    },
    setState(nextState) {
      state = clone(nextState);
      notify();
    },
    update(mutator) {
      const draft = clone(state);
      mutator(draft);
      state = draft;
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
