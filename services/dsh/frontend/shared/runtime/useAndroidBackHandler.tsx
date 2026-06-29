import React from 'react';
import { BackHandler, Platform } from 'react-native';

export function useAndroidBackHandler(onBackPress: () => boolean) {
  React.useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [onBackPress]);
}
