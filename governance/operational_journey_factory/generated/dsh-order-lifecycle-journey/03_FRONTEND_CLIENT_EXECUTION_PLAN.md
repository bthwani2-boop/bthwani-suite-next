# Frontend Client Execution Plan

This document details the execution readiness plan for the customer client surface (`app-client`).

## Client Surfaces Overview

### 1. CheckoutScreen
- **File**: [CheckoutScreen.tsx](services/dsh/frontend/app-client/checkout/CheckoutScreen.tsx)
- **Role**: Renders checkout checkout intents, transitions to order creation.
- **Implementation Status**: `EXECUTION_READY`
- **Design & Logic**: Renders pure UI based on the `useCheckoutToOrderFlow` shared hook. Contains no direct API requests or local business logic.

### 2. OrdersListScreen
- **File**: [OrdersListScreen.tsx](services/dsh/frontend/app-client/orders/OrdersListScreen.tsx)
- **Role**: Lists order history and current active orders.
- **Implementation Status**: `EXECUTION_READY`
- **Design & Logic**: Renders order cards based on states supplied by the shared `useClientOrdersController` hook.

## Execution Rules
- Surfaces must remain UI-only, relying on shared controllers for data fetching.
- Custom rendering of currency/date formats must follow ar-YE locales.
