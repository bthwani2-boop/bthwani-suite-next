import React from "react";
import { PartnerStoreScreen } from "../../../../services/dsh/frontend/app-partner/store";

// EXPO_PUBLIC_DEV_STORE_ID provides a concrete storeId for dev/testing.
// When unset, the screen falls back to the first store from the API (dev-only fallback).
const DEV_STORE_ID = process.env.EXPO_PUBLIC_DEV_STORE_ID;

function App() {
  return (
    <PartnerStoreScreen
      {...(DEV_STORE_ID !== undefined ? { storeId: DEV_STORE_ID } : {})}
    />
  );
}

export default App;
