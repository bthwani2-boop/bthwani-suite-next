# Frontend Partner Execution Plan

This document details the execution readiness plan for the partner surface (`app-partner`).

## Partner Surfaces Overview

### 1. OrdersInboxScreen
- **File**: [OrdersInboxScreen.tsx](file:///c:/bthwani-suite-next/services/dsh/frontend/app-partner/orders/OrdersInboxScreen.tsx)
- **Implementation Status**: `EXECUTION_READY`
- **Design & Logic**: Renders acceptance, preparing, ready, and handoff stages. Uses the shared `usePartnerOrdersRuntime` controller hook to perform state mutations (like accepting or marking ready).

### 2. DshPartnerOrderRejectionScreen
- **File**: [DshPartnerOrderRejectionScreen.tsx](file:///c:/bthwani-suite-next/services/dsh/frontend/app-partner/orders/DshPartnerOrderRejectionScreen.tsx)
- **Implementation Status**: `EXECUTION_READY`
- **Design & Logic**: Renders order rejection dialogs and triggers shared partner controller reject functions.

### 3. PartnerOrderAlertsPanel / PartnerOrderIssuePanel
- **Files**: [PartnerOrderAlertsPanel.tsx](file:///c:/bthwani-suite-next/services/dsh/frontend/app-partner/orders/PartnerOrderAlertsPanel.tsx), [PartnerOrderIssuePanel.tsx](file:///c:/bthwani-suite-next/services/dsh/frontend/app-partner/orders/PartnerOrderIssuePanel.tsx)
- **Implementation Status**: `EXECUTION_READY`
- **Design & Logic**: Renders SLA metrics and alerts, bound to shared handlers.

## Execution Rules
- Rejections must contain reasons checked against `hasRejectReason` helper.
- Partner delivery mode must suppress captain tracking interfaces.
