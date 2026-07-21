// Thin surface re-export. The controller lives in the DSH shared brain
// and returns success only after canonical team readback completes.
export {
  usePartnerTeamController as usePartnerTeamModel,
  type PartnerTeamMutationResult,
  type PartnerTeamModelStatus,
} from '../../shared/partner/use-partner-team-governed-controller';
