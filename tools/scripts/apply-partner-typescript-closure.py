from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def write(relative: str, text: str) -> None:
    (ROOT / relative).write_text(text, encoding="utf-8")


def replace_once(relative: str, old: str, new: str, *, allow_new: bool = True) -> None:
    text = read(relative)
    if old in text:
        write(relative, text.replace(old, new, 1))
        return
    if allow_new and new in text:
        return
    raise RuntimeError(f"missing anchor in {relative}: {old[:120]!r}")


def close_team_surface_types() -> None:
    relative = "services/dsh/frontend/app-partner/team/PartnerTeamManagementScreen.tsx"
    replace_once(
        relative,
        '''    case "audit-log": return "سجل التدقيق";
  }
}''',
        '''    case "audit-log": return "سجل التدقيق";
    default: return action;
  }
}''',
    )
    replace_once(relative, 'setMutation({ kind: "error", message: result.message });', 'setMutation({ kind: "error", message: result.error });')
    replace_once(relative, 'setMutation({ kind: "success", message: result.message || "تم إرسال الدعوة من DSH." });', 'setMutation({ kind: "success", message: "تم إرسال الدعوة من DSH." });')
    replace_once(relative, 'setMutation({ kind: "success", message: result.message || "تم تنفيذ الإجراء في DSH." });', 'setMutation({ kind: "success", message: "تم تنفيذ الإجراء في DSH." });')

    relative = "services/dsh/frontend/app-partner/DshPartnerRouteRenderer.tsx"
    replace_once(
        relative,
        '''      <PartnerTeamManagementScreen
        storeId={scopedStoreId}
        storeName={runtimePartnerProfile.storeName}
        branchLabel={runtimePartnerProfile.branchLabel}
        members={teamMembers}
        isLoading={isTeamLoading ?? false}
        error={teamError ?? null}
        onInviteMember={onInviteMember}
        onMemberAction={onMemberAction}
      />''',
        '''      <PartnerTeamManagementScreen
        storeId={scopedStoreId}
        members={teamMembers}
        pendingInvites={teamMembers.filter((member) => member.status === "invited").length}
        error={teamError ?? null}
        onInviteMember={onInviteMember}
        onMemberAction={(member, action) => onMemberAction(member.id, action)}
      />''',
    )

    relative = "services/dsh/frontend/app-partner/account/PartnerOperationsPanel.tsx"
    replace_once(
        relative,
        "import type { PartnerCoverageZone, PartnerCoverageZoneStatus, PartnerOperationalMode } from '../../shared/partner/partner-hub.types';\n",
        "import type { PartnerCoverageZone, PartnerCoverageZoneStatus, PartnerOperationalMode } from '../../shared/partner/partner-hub.types';\nimport type { PartnerTeamMember } from '../team/partner-team.types';\n",
    )
    replace_once(
        relative,
        "  teamMembers: readonly import('../team/PartnerTeamManagementScreen').PartnerTeamMember[];",
        "  teamMembers: readonly PartnerTeamMember[];",
    )


def close_hub_types() -> None:
    relative = "services/dsh/frontend/app-partner/account/PartnerHubScreen.tsx"
    replace_once(relative, "            appearanceHydrated={appearanceHydrated}\n", "")

    relative = "services/dsh/frontend/app-partner/account/PartnerHubStoreHero.tsx"
    replace_once(relative, "  serviceModes: PartnerOperationalMode[];", "  serviceModes: readonly PartnerOperationalMode[];")


def close_assortment_occ_types() -> None:
    relative = "services/dsh/frontend/app-partner/catalog/PartnerCatalogManagementScreen.tsx"
    replace_once(
        relative,
        '''          publicationStatus: current?.publicationStatus ?? "draft",
          expectedVersion: current?.version,
        },''',
        '''          publicationStatus: current?.publicationStatus ?? "draft",
          ...(current?.version !== undefined ? { expectedVersion: current.version } : {}),
        },''',
    )

    relative = "services/dsh/frontend/app-partner/catalog/ProductOverridesScreen.tsx"
    replace_once(
        relative,
        '''        publicationStatus: assortment?.publicationStatus ?? 'draft',
        expectedVersion: assortment?.version,
      });''',
        '''        publicationStatus: assortment?.publicationStatus ?? 'draft',
        ...(assortment?.version !== undefined ? { expectedVersion: assortment.version } : {}),
      });''',
    )

    relative = "services/dsh/frontend/shared/catalog/use-central-catalog-controller.tsx"
    replace_once(
        relative,
        '''        () => occApi.transitionProductProposalOCC(proposalId, { ...input, expectedVersion }),''',
        '''        () => occApi.transitionProductProposalOCC(proposalId, {
          expectedVersion,
          nextStatus: input.nextStatus,
          note: input.note,
          ...(input.adoptedMasterProductId !== undefined
            ? { adoptedMasterProductId: input.adoptedMasterProductId }
            : {}),
          ...(input.createMasterProduct !== undefined
            ? { createMasterProduct: input.createMasterProduct }
            : {}),
        }),''',
    )
    replace_once(
        relative,
        '''        () => occApi.upsertOperatorStoreAssortmentOCC(storeId, masterProductId, {
          ...input,
          expectedVersion: current?.version,
        }),''',
        '''        () => occApi.upsertOperatorStoreAssortmentOCC(storeId, masterProductId, {
          ...input,
          ...(current?.version !== undefined ? { expectedVersion: current.version } : {}),
        }),''',
    )


def close_partner_offer_payloads() -> None:
    relative = "services/dsh/frontend/shared/marketing/use-governed-partner-offers-controller.ts"
    replace_once(
        relative,
        '''        activeFromDate: offer.activeFromDate,
        activeToDate: offer.activeToDate,
        rejectionReason: offer.rejectionReason,
        marginRiskNote: offer.marginRiskNote,
        couponId: offer.couponId,
        expectedVersion: offer.version,''',
        '''        ...(offer.activeFromDate !== undefined ? { activeFromDate: offer.activeFromDate } : {}),
        ...(offer.activeToDate !== undefined ? { activeToDate: offer.activeToDate } : {}),
        ...(offer.rejectionReason !== undefined ? { rejectionReason: offer.rejectionReason } : {}),
        ...(offer.marginRiskNote !== undefined ? { marginRiskNote: offer.marginRiskNote } : {}),
        ...(offer.couponId !== undefined ? { couponId: offer.couponId } : {}),
        expectedVersion: offer.version,''',
    )
    replace_once(
        relative,
        '''        status: nextStatus,
        couponId: current.couponId,
        expectedVersion: current.version,''',
        '''        status: nextStatus,
        ...(current.couponId !== undefined ? { couponId: current.couponId } : {}),
        expectedVersion: current.version,''',
    )

    relative = "services/dsh/frontend/shared/marketing/use-marketing-controller.tsx"
    replace_once(
        relative,
        '''        eligibility: input.eligibility,
        rejectionReason: input.rejectionReason,
        marginRiskNote: input.marginRiskNote,
      });''',
        '''        eligibility: input.eligibility,
        ...(input.rejectionReason !== undefined ? { rejectionReason: input.rejectionReason } : {}),
        ...(input.marginRiskNote !== undefined ? { marginRiskNote: input.marginRiskNote } : {}),
      });''',
    )


def close_transitive_shared_types() -> None:
    relative = "services/dsh/frontend/shared/checkout/use-checkout-to-order-flow.tsx"
    replace_once(relative, "    input.deliveryAddress,", "    input.deliveryAddressId,")

    relative = "services/dsh/frontend/shared/delivery/captain-availability.model.ts"
    replace_once(
        relative,
        '''  return {
    captainAvailabilityStatus,
    availabilityMutationReady: false,
  } as const;''',
        '''  const unavailableMutation = () => {
    throw new Error("Captain availability mutation is not wired to DSH and remains fail-closed.");
  };

  return {
    captainAvailabilityStatus,
    availabilityMutationReady: false,
    toggleAvailability: unavailableMutation,
    setCaptainAvailabilityStatus: (_next: CaptainAvailabilityStatus) => unavailableMutation(),
  } as const;''',
    )


def remove_self() -> None:
    path = ROOT / "tools/scripts/apply-partner-typescript-closure.py"
    if path.exists():
        path.unlink()


close_team_surface_types()
close_hub_types()
close_assortment_occ_types()
close_partner_offer_payloads()
close_transitive_shared_types()
remove_self()
