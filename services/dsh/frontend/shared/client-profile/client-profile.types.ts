import type { operations } from "../../../clients/generated/dsh-api";

type ClientProfileReadResponse =
  operations["get_dsh_client_me_profile"]["responses"][200]["content"]["application/json"];

export type ClientProfile = ClientProfileReadResponse["profile"];
export type ClientProfileLocale = ClientProfile["locale"];

export type ClientProfilePreferencesInput =
  operations["patch_dsh_client_me_profile_preferences"]["requestBody"]["content"]["application/json"];

export type ClientProfileConsentsInput =
  operations["patch_dsh_client_me_profile_consents"]["requestBody"]["content"]["application/json"];
