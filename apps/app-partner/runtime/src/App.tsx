import React from "react";
import { PartnerStoreScreen } from "../../../../services/dsh/frontend/app-partner/store";
import { PartnerCatalogManagementScreen } from "../../../../services/dsh/frontend/app-partner/catalog";

function App() {
  return (
    <>
      <PartnerStoreScreen />
      <PartnerCatalogManagementScreen />
    </>
  );
}

export default App;
