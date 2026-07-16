// Thin surface re-export. The controller lives in the DSH shared brain
// (services/dsh/frontend/shared/partner/use-partner-team-controller.ts) so
// this surface module never imports the API adapter directly.
export {
  usePartnerTeamController as usePartnerTeamModel,
  type PartnerTeamMutationResult,
  type PartnerTeamModelStatus,
} from '../../shared/partner/use-partner-team-controller';
