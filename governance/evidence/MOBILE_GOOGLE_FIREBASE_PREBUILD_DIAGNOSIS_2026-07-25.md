# Mobile Google/Firebase prebuild diagnosis — 2026-07-25

## Decision

The current Android development line must treat native maps as required for:

- `app-client` — address pin selection, current-location capture, and DSH service-area/zone verification;
- `app-captain` — active assignment location, route context, and trusted live-location workflow;
- `app-field` — partner/store location capture and field visit context.

The control panel requires a web map for operations and service-area governance. `app-partner` keeps foreground location only for the current phase; native map rendering is deferred until a proven partner-owned map workflow exists.

## Confirmed cloud baseline

- Central Google Cloud project: `bthwani-platform`.
- Billing is linked and enabled.
- API Keys API is enabled.
- Maps SDK for Android is enabled.
- Firebase has not yet been proven enabled on `bthwani-platform`.

## Repository findings

### App client

The address workflow already captures foreground GPS, calls governed backend search/reverse resolution, requires verified coordinates, and binds addresses to a DSH service-area code. It currently renders search results and coordinates but not a native `MapView`.

Current gaps before the final development build:

- add the central `maps` capability to `app-client`;
- install and lock `react-native-maps` in the client runtime;
- render a real map with a selected/draggable pin;
- retain DSH as the only authority that resolves a coordinate to a service-area code;
- provide a fail-closed textual fallback when the native map is unavailable.

### App captain

The captain runtime already owns `maps`, `backgroundLocation`, and `react-native-maps`. The current captain map screen checks whether the native key is configured and publishes trusted GPS samples, but it does not render a real `MapView` or route polyline.

Current gaps before the final development build:

- render the assignment map and destination marker;
- show route/ETA only from the governed providers backend;
- retain foreground/background location permission separation;
- verify Android foreground-service behavior on a physical device;
- never expose client coordinates before the permitted delivery state.

### App field

The field runtime already owns `maps` and `react-native-maps`. The current onboarding location section uses a hand-built grid with hardcoded Sana'a landmarks and converts press coordinates into synthetic latitude/longitude values. This is a development truth violation and must not ship in the remote development artifact.

Current gaps before the final development build:

- replace the synthetic grid and hardcoded landmarks with a real `MapView`;
- use actual GPS or a user-selected map point only;
- resolve address/service-area through the governed backend rather than a local nearest-landmark calculation;
- reject mocked or invalid coordinates where operational truth is created;
- support store/partner pins in field visit and onboarding flows.

### Control panel

The service-area section currently edits polygons as JSON text and the dispatch tracking panel shows freshness alerts without a map. The control-panel runtime has no Maps JavaScript dependency or loader.

Required web work:

- enable Maps JavaScript API;
- use a separate browser-restricted key, never an Android key;
- implement an operations map with active captain/store/order/destination markers and freshness state;
- add an authorized operator projection endpoint for map coordinates; the current alerts endpoint does not return map-ready coordinates;
- add a visual polygon editor for service areas while preserving versioning, idempotency, topology validation, audit reason, and DSH ownership;
- restrict the browser key to approved localhost/development and deployed control-panel origins.

## Required before any final EAS development build

### Native Firebase and notifications

1. Enable Firebase on the existing `bthwani-platform` Google Cloud project.
2. Register four Firebase Android apps with exact packages:
   - `com.bthwani.client.next`
   - `com.bthwani.partner.next`
   - `com.bthwani.captain.next`
   - `com.bthwani.field.next`
3. Download and strictly validate one `google-services.json` per package.
4. Upload each file only to the matching EAS project as `GOOGLE_SERVICES_JSON`.
5. Create a least-privilege FCM V1 service account credential and upload it to the Android credentials of every matching EAS project.
6. Build and prove push token registration and one real notification delivery on a physical device.

### Native maps

Create separate Android-restricted Maps SDK keys for:

- `com.bthwani.client.next`
- `com.bthwani.captain.next`
- `com.bthwani.field.next`

Each key must be restricted to its package name, the EAS development signing SHA-1, and Maps SDK for Android only. Production/Play signing keys must be handled separately later.

The keys must be present in EAS before the build because native map credentials are embedded in the Android artifact. A later control-panel edit cannot retrofit a key into an already-built APK.

### Other native-build gates

- prove Android foreground location for client and field;
- prove foreground and background location plus foreground-service behavior for captain;
- verify notification icon/channel and Android notification permission behavior;
- decide and configure Sentry before the final multi-app build if native crash/source-map diagnostics are required; enabling its native plugin later requires another build;
- run all mobile configuration guards, Expo config validation, prebuild copy verification, and EAS preflight before submitting builds;
- build and install one app first, then submit all four only after the first artifact is verified.

## Google services to enable now or later

### Enable now

- Firebase project integration on `bthwani-platform`;
- Firebase Cloud Messaging/API prerequisites created by Firebase setup;
- Maps SDK for Android (already enabled);
- Maps JavaScript API for the control-panel web map;
- API Keys API (already enabled).

### Enable when the governed backend adapter is implemented

- Places API (New) for address/place autocomplete;
- Geocoding API for Google-backed address/coordinate resolution;
- Routes API for Google-backed distance, ETA, and route calculation.

Mobile and web clients must not call Google Places, Geocoding, or Routes web services directly. The existing providers boundary must own server credentials, normalization, timeout, auditing, cost controls, and provider fallback. Development may continue with the existing governed Nominatim/OSRM adapters until a Google adapter is implemented and verified.

### Do not enable for the current development build

- Firebase Authentication: BThwani owns identity and activation flows;
- Firestore or Realtime Database: DSH uses governed Go/PostgreSQL services;
- Firebase Storage: media has its own runtime and storage boundary;
- Firebase Crashlytics: Sentry is already the selected mobile observability path;
- Firebase Remote Config: platform-control owns governed configuration;
- Firebase Dynamic Links: no current governed dependency;
- App Check enforcement / Play Integrity enforcement: register and observe later, but do not enforce before debug/EAS sideload paths and Play identities are proven;
- Google Sign-In: no current product requirement;
- partner native maps: no proven current workflow.

## Key model

Use separate credentials by trust boundary:

1. Android key — app-client development.
2. Android key — app-captain development.
3. Android key — app-field development.
4. Browser key — control panel development/web origins.
5. Server key — future Places/Geocoding/Routes adapter, stored only in the providers backend secret store.

Do not use one unrestricted key across mobile, web, and server workloads.

## Build-blocking code gaps

The final remote development build must be postponed until these code gaps are closed:

1. client native map capability/dependency and real map UI;
2. captain real map/route UI;
3. field synthetic map removal and governed real map integration;
4. Firebase project/app/config/FCM V1 completion;
5. EAS environment isolation and preflight success;
6. physical-device proof for notifications and location.

The control-panel web map and server-side Google Places/Routes adapters do not technically require an Android rebuild, but they are required for an operationally complete map platform and should be developed in the same readiness phase.