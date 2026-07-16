// Thin surface re-export. Canonical types live in the DSH shared brain
// (services/dsh/frontend/shared/partner/partner-team.types.ts) so this
// surface module never owns domain types independently of shared.
export {
  toPartnerTeamMember,
  type PartnerTeamRole,
  type PartnerTeamStatus,
  type PartnerTeamMember,
} from '../../shared/partner/partner-team.types';
