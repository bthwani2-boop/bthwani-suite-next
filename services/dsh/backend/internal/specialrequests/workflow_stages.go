package specialrequests

// initWorkflowStages completes the canonical special-request workflow model in
// the owning package. The additional stages mirror the database constraint and
// the control-panel workbench while correcting the default readback stage for
// customer approval and active delivery.
func initWorkflowStages() {
	sheinStageRules["out_for_delivery"] = stageRule{status: StatusInProgress, order: 9}
	sheinStageRules["proof_of_delivery"] = stageRule{status: StatusInProgress, order: 10}
	sheinStageRules["delivered"] = stageRule{status: StatusCompleted, order: 11}
	sheinStageRules["cancelled"] = stageRule{status: StatusCancelled, order: 12}
	sheinStageRules["rejected"] = stageRule{status: StatusRejected, order: 12}

	awnakStageRules["customer_approval"] = stageRule{status: StatusNeedsCustomerInput, order: 2}
	awnakStageRules["dispatch_pending"] = stageRule{status: StatusApproved, order: 3}
	awnakStageRules["assigned"] = stageRule{status: StatusAssigned, order: 4}
	awnakStageRules["captain_enroute_to_pickup"] = stageRule{status: StatusInProgress, order: 5}
	awnakStageRules["arrived_at_pickup"] = stageRule{status: StatusInProgress, order: 6}
	awnakStageRules["item_received"] = stageRule{status: StatusInProgress, order: 7}
	awnakStageRules["in_progress"] = stageRule{status: StatusInProgress, order: 8}
	awnakStageRules["arrived_at_dropoff"] = stageRule{status: StatusInProgress, order: 9}
	awnakStageRules["proof_review"] = stageRule{status: StatusInProgress, order: 10}
	awnakStageRules["completed"] = stageRule{status: StatusCompleted, order: 11}
	awnakStageRules["cancelled"] = stageRule{status: StatusCancelled, order: 12}

	// Status transitions without an explicit workflowStage must still land on
	// the canonical stage presented to clients and operators.
	sheinDefaultStage[StatusInProgress] = "out_for_delivery"
	awnakDefaultStage[StatusNeedsCustomerInput] = "customer_approval"
}

func init() {
	initWorkflowStages()
}
