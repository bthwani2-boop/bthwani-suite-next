import { useWltDshWalletSession } from '@bthwani/wlt';

export function useDshClientWltReadModel(clientId: string | undefined, bearerToken?: string) {
  return useWltDshWalletSession(clientId, bearerToken);
}
