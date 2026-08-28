import assert from "node:assert/strict";
import test from "node:test";

test("browser connectivity owner reports state changes and detaches cleanly", async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  let online = true;
  const listeners = new Map();
  const browserWindow = {
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type, listener) => {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: browserWindow });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { get onLine() { return online; } },
  });

  try {
    const {
      bthwaniBrowserConnectivityAdapter,
      configureBthwaniConnectivityAdapter,
      subscribeBthwaniConnectivity,
    } = await import("../src/connectivity-adapter.ts");
    configureBthwaniConnectivityAdapter(bthwaniBrowserConnectivityAdapter);

    const seen = [];
    const unsubscribe = subscribeBthwaniConnectivity((state) => seen.push(state));
    assert.deepEqual(seen, [{ isConnected: true, isInternetReachable: true }]);

    online = false;
    listeners.get("offline")?.();
    assert.deepEqual(seen.at(-1), { isConnected: false, isInternetReachable: false });

    unsubscribe();
    online = true;
    listeners.get("online")?.();
    assert.equal(seen.length, 2);
    assert.equal(listeners.size, 0);
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else delete globalThis.window;
    if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
    else delete globalThis.navigator;
  }
});
