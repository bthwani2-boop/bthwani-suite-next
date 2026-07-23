import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colorRoles } from '@bthwani/ui-kit';
import {
  isDshDeviceLoopbackBridgeEnabled,
  resolveDshApiBaseUrl,
  validateDshApiBaseUrl,
} from './dsh-api-base-url';

export function DshDevDiagnostic() {
  const [url, setUrl] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isNativeRuntime, setIsNativeRuntime] = useState(false);
  const [hasLoopbackBridge, setHasLoopbackBridge] = useState(false);

  useEffect(() => {
    const resolvedUrl = resolveDshApiBaseUrl();
    const nativeRuntime = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
    const loopbackBridge = isDshDeviceLoopbackBridgeEnabled();

    setUrl(resolvedUrl);
    setIsNativeRuntime(nativeRuntime);
    setHasLoopbackBridge(loopbackBridge);
    setIsValid(validateDshApiBaseUrl(resolvedUrl, nativeRuntime, loopbackBridge));
  }, []);

  if (!__DEV__) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>DSH Diagnostic Dev Info</Text>
      <Text style={styles.text}>Resolved API Base URL:</Text>
      <Text style={[styles.url, isValid ? styles.valid : styles.invalid]}>
        {url}
      </Text>
      <Text style={styles.text}>
        Runtime transport valid? {isValid ? "✅ YES" : "❌ NO"}
      </Text>
      {isNativeRuntime ? (
        <Text style={styles.text}>
          ADB reverse bridge: {hasLoopbackBridge ? "verified by launcher" : "not declared"}
        </Text>
      ) : null}
      <Text style={styles.note}>
        {!isValid && isNativeRuntime
          ? "Native loopback requires the governed launcher to establish and verify adb reverse mappings."
          : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: colorRoles.surfaceWarm,
    borderWidth: 1,
    borderColor: colorRoles.warning,
    borderRadius: 8,
    marginVertical: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: colorRoles.warning,
  },
  text: {
    fontSize: 14,
    color: colorRoles.textPrimary,
  },
  url: {
    fontSize: 16,
    fontWeight: '600',
    marginVertical: 4,
  },
  valid: {
    color: colorRoles.success,
  },
  invalid: {
    color: colorRoles.danger,
  },
  note: {
    fontSize: 12,
    color: colorRoles.danger,
    marginTop: 8,
    fontStyle: 'italic',
  },
});
