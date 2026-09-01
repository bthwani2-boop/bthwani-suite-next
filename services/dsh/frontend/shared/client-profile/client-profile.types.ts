export type ClientProfileLocale = "ar" | "en";
export type ClientProfileCurrency = "YER";

export type ClientProfile = {
  readonly clientId: string;
  readonly locale: ClientProfileLocale;
  readonly currencyPreference: ClientProfileCurrency;
  readonly marketingConsentEmail: boolean;
  readonly marketingConsentSms: boolean;
  readonly marketingConsentPush: boolean;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type ClientProfilePreferencesInput = {
  readonly locale: ClientProfileLocale;
  readonly currencyPreference: ClientProfileCurrency;
  readonly expectedVersion?: number;
};

export type ClientProfileConsentsInput = {
  readonly marketingConsentEmail: boolean;
  readonly marketingConsentSms: boolean;
  readonly marketingConsentPush: boolean;
  readonly expectedVersion?: number;
};
