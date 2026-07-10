import React from "react";
import { DshCaptainSurface } from "../../../../services/dsh/frontend/app-captain";

export default function App() {
  return <DshCaptainSurface command={{ token: 0, target: "home" }} />;
}
