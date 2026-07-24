function currentState() {
  const connected =
    typeof navigator === "undefined" || typeof navigator.onLine !== "boolean"
      ? null
      : navigator.onLine;
  return {
    type: connected === false ? "none" : "unknown",
    isConnected: connected,
    isInternetReachable: connected,
    isWifiEnabled: null,
    details: null,
  };
}

function addEventListener(listener) {
  if (typeof listener !== "function") return () => {};

  listener(currentState());
  if (typeof window === "undefined") return () => {};

  const publish = () => listener(currentState());
  window.addEventListener("online", publish);
  window.addEventListener("offline", publish);
  return () => {
    window.removeEventListener("online", publish);
    window.removeEventListener("offline", publish);
  };
}

async function fetchState() {
  return currentState();
}

async function refresh() {
  return currentState();
}

const NetInfo = {
  addEventListener,
  fetch: fetchState,
  refresh,
  configure: () => undefined,
};

export { addEventListener, fetchState as fetch, refresh };
export default NetInfo;
