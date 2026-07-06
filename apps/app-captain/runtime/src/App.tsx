import React from "react";
import { BthwaniUiProvider } from "@bthwani/ui-kit";
import { DshCaptainSurface } from "../../../../services/dsh/frontend/app-captain";

function App() {
  return (
    <BthwaniUiProvider>
      <DshCaptainSurface command={{ token: 0, target: "home" }} />
    </BthwaniUiProvider>
  );
}

export default App;
