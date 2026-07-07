# Control Panel Operations Execution Plan

This document details the execution readiness plan for the control panel operations surface (`control-panel`).

## Operations Surfaces Overview

### 1. LiveOrdersScreen
- **File**: [LiveOrdersScreen.tsx](file:///c:/bthwani-suite-next/services/dsh/frontend/control-panel/operations/LiveOrdersScreen.tsx)
- **Implementation Status**: `EXECUTION_READY`
- **Design & Logic**: Renders live order monitoring grid, leveraging the shared operational controllers.

### 2. OrderRescueScreen / DispatchAssignmentScreen
- **Files**: [OrderRescueScreen.tsx](file:///c:/bthwani-suite-next/services/dsh/frontend/control-panel/operations/OrderRescueScreen.tsx), [DispatchAssignmentScreen.tsx](file:///c:/bthwani-suite-next/services/dsh/frontend/control-panel/operations/DispatchAssignmentScreen.tsx)
- **Implementation Status**: `EXECUTION_READY`
- **Design & Logic**: Triggers manual overrides and assignment matching via the shared operations runtime adapter.

### 3. CommandCenterScreen / CaptainOperationsScreen / ExceptionsEscalationsScreen
- **Files**: [CommandCenterScreen.tsx](file:///c:/bthwani-suite-next/services/dsh/frontend/control-panel/operations/CommandCenterScreen.tsx), [CaptainOperationsScreen.tsx](file:///c:/bthwani-suite-next/services/dsh/frontend/control-panel/operations/CaptainOperationsScreen.tsx), [ExceptionsEscalationsScreen.tsx](file:///c:/bthwani-suite-next/services/dsh/frontend/control-panel/operations/ExceptionsEscalationsScreen.tsx)
- **Implementation Status**: `EXECUTION_READY`
- **Design & Logic**: Renders active KPIs, exceptions, and live captain tracking.

## Execution Rules
- Any manual override must write an audit record using the platform audit state manager.
