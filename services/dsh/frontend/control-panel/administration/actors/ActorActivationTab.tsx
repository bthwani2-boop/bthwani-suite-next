"use client";

import React from "react";
import { ActorActivationCard } from "../../shared/ActorActivationCard";

type Props = {
  readonly actorId: string;
  readonly role: string;
};

export function ActorActivationTab({ actorId, role }: Props) {
  // Map internal identity roles to expected surfaces
  let expectedSurface = "app-admin";
  let expectedActorType = role.toLowerCase();

  if (role === "FIELD") {
    expectedSurface = "app-field";
    expectedActorType = "field";
  } else if (role === "CAPTAIN") {
    expectedSurface = "app-captain";
    expectedActorType = "captain";
  } else if (role === "PARTNER") {
    expectedSurface = "app-partner";
    expectedActorType = "partner";
  } else if (role === "CUSTOMER") {
    expectedSurface = "app-customer";
    expectedActorType = "customer";
  }

  return (
    <ActorActivationCard
      actorId={actorId}
      expectedActorType={expectedActorType}
      expectedSurface={expectedSurface}
      issuedByActorId="admin-user" // Usually from auth context
    />
  );
}
