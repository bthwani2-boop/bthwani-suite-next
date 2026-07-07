# Frontend Captain Execution Plan

This document details the execution readiness plan for the captain surface (`app-captain`).

## Captain Surfaces Overview

### 1. TaskInboxScreen
- **File**: [TaskInboxScreen.tsx](services/dsh/frontend/app-captain/tasks/TaskInboxScreen.tsx)
- **Role**: Renders dispatcher offered assignments, allows accept/decline.
- **Implementation Status**: `EXECUTION_READY`
- **Design & Logic**: Renders task cards, triggering accept/decline transitions through `useCaptainOrderRuntime`.

### 2. ActiveTaskScreen
- **File**: [ActiveTaskScreen.tsx](services/dsh/frontend/app-captain/tasks/ActiveTaskScreen.tsx)
- **Role**: Active delivery tracking, pickup confirm, photo POD, and status en-route.
- **Implementation Status**: `EXECUTION_READY`
- **Design & Logic**: Leverages `useCaptainActiveLocationPush` hook for location tracking (safeguarded by capabilities flags).

## Capability Safeguards
- Captain location push is disabled explicitly when `DSH_CAPTAIN_CONTRACT_CAPABILITIES.locationPush` is false.
- Failed delivery and return confirmation are similarly safeguarded.
