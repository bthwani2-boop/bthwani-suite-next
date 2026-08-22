import React from 'react';
import { useRouter, type Href } from 'expo-router';
import {
  dshFieldRouteToPath,
  type DshFieldNavigation,
  type DshFieldRouteState,
} from '@bthwani/dsh/app-field';
import App from '../App';
import {
  resolveFieldRouterBack,
  resolveFieldRouterNavigation,
} from './field-router-policy';

export { singleRouteParam } from './field-router-policy';

export function FieldRouteScreen({ route }: { readonly route: DshFieldRouteState }) {
  const router = useRouter();
  const navigation = React.useMemo<DshFieldNavigation>(() => ({
    navigate(nextRoute, mode = 'push') {
      const operation = resolveFieldRouterNavigation(dshFieldRouteToPath(nextRoute), mode);
      if (operation.method === 'replace') router.replace(operation.href as Href);
      else router.push(operation.href as Href);
    },
    back() {
      const operation = resolveFieldRouterBack(router.canGoBack());
      if (operation.method === 'back') router.back();
      else router.replace(operation.href as Href);
    },
  }), [router]);

  return <App route={route} navigation={navigation} />;
}
