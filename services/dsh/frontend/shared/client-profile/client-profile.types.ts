export type ClientProfile = {
  readonly clientId: string;
  readonly locale: string;
  readonly currencyPreference: string;
  readonly marketingConsentEmail: boolean;
  readonly marketingConsentSms: boolean;
  readonly marketingConsentPush: boolean;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type ClientProfilePreferencesInput = {
  readonly locale: string;
  readonly currencyPreference: string;
  readonly expectedVersion?: number;
};

export type ClientProfileConsentsInput = {
  readonly marketingConsentEmail: boolean;
  readonly marketingConsentSms: boolean;
  readonly marketingConsentPush: boolean;
  readonly expectedVersion?: number;
};
