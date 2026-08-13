# U005 — profile-availability-service-mode

This unit isolates a confirmed blocker that was previously buried inside fleet eligibility. The current Captain availability model initializes to unavailable and deliberately throws on every mutation because no authenticated DSH availability mutation/readback is wired. Yet the Captain surface exposes availability controls and the home ticker can ask the user to toggle availability. That means the visible primary workflow cannot establish the operational state required to receive assignments.

The same area contains service type and application mode state. The profile model derives bthwani-captain versus store-courier mode from roles but maintains the active mode locally. Derived presentation currently makes PoD not required in store-courier mode, and delivery actions suppress an exception path for that mode. A local toggle must never be able to relax server-owned proof, custody, authorization or exception requirements. The selected mode can only influence presentation when a canonical assignment/service policy independently authorizes the behavior.

Profile, documents, rating/tier and absence/availability account sections are also reachable Captain surfaces. Their displayed values must come from their real owner, not static demonstration values. This unit wires operational availability/readback, proves profile/doc/rating isolation and makes service-mode behavior subordinate to server assignment policy before eligibility and delivery units proceed.

## Closure boundary

DSH/Workforce own operational availability, absence/accreditation and assignment requirements; local Captain UI state is presentation/input only. The unit remains open until all required checks are executed on the exact candidate, all known fixable Captain defects in this concern are removed, cleanup is complete, and later units have not invalidated its evidence.
