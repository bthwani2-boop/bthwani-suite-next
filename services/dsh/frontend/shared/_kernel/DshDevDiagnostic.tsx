import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colorRoles } from '@bthwani/ui-kit';
import { resolveDshApiBaseUrl, validateDshApiBaseUrl } from './dsh-api-base-url';

export function DshDevDiagnostic() {
  const [url, setUrl] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isDevice, setIsDevice] = useState(false);

  useEffect(() => {
    const resolvedUrl = resolveDshApiBaseUrl();
    setUrl(resolvedUrl);

    // Naive check if we are on a physical device. We assume if we aren't in a web environment, we could be on a device.
    const _isDevice = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
    setIsDevice(_isDevice);
    setIsValid(validateDshApiBaseUrl(resolvedUrl, _isDevice));
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
        Valid for Device? {isValid ? "✅ YES" : "❌ NO"}
      </Text>
      <Text style={styles.note}>
        {!isValid && isDevice && "FATAL: Cannot use localhost on physical device. Must use EXPO_PUBLIC_DSH_API_BASE_URL."}
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
  }
});
