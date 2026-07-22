/**
 * This file was auto-generated from core/providers/contracts/providers.openapi.yaml.
 * Do not make direct changes without regenerating the contract client.
 */

export interface paths {
  "/providers/health": {
    parameters: { query?: never; header?: never; path?: never; cookie?: never };
    get: operations["getExternalProviderHealth"];
    put?: never; post?: never; delete?: never; options?: never; head?: never; patch?: never; trace?: never;
  };
  "/providers": {
    parameters: { query?: never; header?: never; path?: never; cookie?: never };
    get: operations["listProviders"];
    put?: never; post?: never; delete?: never; options?: never; head?: never; patch?: never; trace?: never;
  };
  "/providers/{providerId}": {
    parameters: {
      query?: never;
      header?: never;
      path: { providerId: string };
      cookie?: never;
    };
    get: operations["getProvider"];
    patch: operations["updateProvider"];
    put?: never; post?: never; delete?: never; options?: never; head?: never; trace?: never;
  };
  "/providers/maps/search": {
    parameters: { query?: never; header?: never; path?: never; cookie?: never };
    post: operations["searchMapLocations"];
    get?: never; put?: never; delete?: never; options?: never; head?: never; patch?: never; trace?: never;
  };
  "/providers/maps/reverse": {
    parameters: { query?: never; header?: never; path?: never; cookie?: never };
    post: operations["reverseMapLocation"];
    get?: never; put?: never; delete?: never; options?: never; head?: never; patch?: never; trace?: never;
  };
  "/providers/maps/route": {
    parameters: { query?: never; header?: never; path?: never; cookie?: never };
    post: operations["routeMapLocations"];
    get?: never; put?: never; delete?: never; options?: never; head?: never; patch?: never; trace?: never;
  };
}

export type webhooks = Record<string, never>;

export interface components {
  schemas: {
    ExternalProviderKind: "sms" | "maps" | "payment" | "push" | "email" | "storage" | "search" | "fraud";
    ExternalProviderStatus: "healthy" | "degraded" | "down" | "not_configured";
    ExternalProviderHealthItem: {
      kind: components["schemas"]["ExternalProviderKind"];
      status: components["schemas"]["ExternalProviderStatus"];
      checkedAt: string;
      message?: string;
    };
    ExternalProviderHealthResponse: {
      providers: components["schemas"]["ExternalProviderHealthItem"][];
    };
    ExternalProvider: {
      providerId: string;
      kind: components["schemas"]["ExternalProviderKind"];
      code: string;
      active: boolean;
      credentialConfigured: boolean;
      parameters?: Record<string, unknown>;
      updatedAt: string;
    };
    UpdateProviderRequest: {
      active?: boolean;
      credentials?: Record<string, unknown>;
      parameters?: Record<string, unknown>;
    };
    MapSearchRequest: {
      query: string;
      limit?: number;
      language?: string;
      countryCodes?: string[];
    };
    MapReverseRequest: {
      latitude: number;
      longitude: number;
      language?: string;
    };
    MapRouteRequest: {
      originLatitude: number;
      originLongitude: number;
      destinationLatitude: number;
      destinationLongitude: number;
    };
    MapLocation: {
      providerCode: string;
      providerPlaceId: string;
      displayName: string;
      latitude: number;
      longitude: number;
      countryCode?: string;
      administrativeArea?: string;
      locality?: string;
      postalCode?: string;
      confidence?: number;
    };
    MapSearchResponse: {
      locations: components["schemas"]["MapLocation"][];
    };
    MapReverseResponse: {
      location: components["schemas"]["MapLocation"];
    };
    MapRouteResponse: {
      providerCode: string;
      distanceMeters: number;
      durationSeconds: number;
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}

export type $defs = Record<string, never>;

type EmptyParameters = { query?: never; header?: never; path?: never; cookie?: never };
type EmptyRequest = { requestBody?: never };
type JsonResponse<T> = { headers: Record<string, unknown>; content: { "application/json": T } };
type EmptyResponse = { headers: Record<string, unknown>; content?: never };

export interface operations {
  getExternalProviderHealth: EmptyRequest & {
    parameters: EmptyParameters;
    responses: {
      200: JsonResponse<components["schemas"]["ExternalProviderHealthResponse"]>;
      500: EmptyResponse;
    };
  };
  listProviders: EmptyRequest & {
    parameters: EmptyParameters;
    responses: {
      200: JsonResponse<components["schemas"]["ExternalProvider"][]>;
      401: EmptyResponse;
      403: EmptyResponse;
    };
  };
  getProvider: EmptyRequest & {
    parameters: { query?: never; header?: never; path: { providerId: string }; cookie?: never };
    responses: {
      200: JsonResponse<components["schemas"]["ExternalProvider"]>;
      401: EmptyResponse;
      403: EmptyResponse;
      404: EmptyResponse;
    };
  };
  updateProvider: {
    parameters: { query?: never; header?: never; path: { providerId: string }; cookie?: never };
    requestBody: { content: { "application/json": components["schemas"]["UpdateProviderRequest"] } };
    responses: {
      200: JsonResponse<components["schemas"]["ExternalProvider"]>;
      400: EmptyResponse;
      401: EmptyResponse;
      403: EmptyResponse;
      404: EmptyResponse;
    };
  };
  searchMapLocations: {
    parameters: EmptyParameters;
    requestBody: { content: { "application/json": components["schemas"]["MapSearchRequest"] } };
    responses: {
      200: JsonResponse<components["schemas"]["MapSearchResponse"]>;
      400: EmptyResponse; 401: EmptyResponse; 403: EmptyResponse; 502: EmptyResponse; 503: EmptyResponse;
    };
  };
  reverseMapLocation: {
    parameters: EmptyParameters;
    requestBody: { content: { "application/json": components["schemas"]["MapReverseRequest"] } };
    responses: {
      200: JsonResponse<components["schemas"]["MapReverseResponse"]>;
      400: EmptyResponse; 401: EmptyResponse; 403: EmptyResponse; 502: EmptyResponse; 503: EmptyResponse;
    };
  };
  routeMapLocations: {
    parameters: EmptyParameters;
    requestBody: { content: { "application/json": components["schemas"]["MapRouteRequest"] } };
    responses: {
      200: JsonResponse<components["schemas"]["MapRouteResponse"]>;
      400: EmptyResponse; 401: EmptyResponse; 403: EmptyResponse; 502: EmptyResponse; 503: EmptyResponse;
    };
  };
}
