package orders

// StatusStoreHandoffConfirmed records the exact custody boundary where the
// owning partner released the package and the assigned captain has not yet
// confirmed pickup. It is visible to every order-reading surface.
const StatusStoreHandoffConfirmed OrderStatus = "store_handoff_confirmed"
