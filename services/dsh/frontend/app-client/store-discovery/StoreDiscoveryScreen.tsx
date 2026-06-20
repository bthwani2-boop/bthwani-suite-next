import React, { useCallback, useEffect, useState } from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import { Screen, Header, brandScale } from "@bthwani/ui-kit";
import { StoreDiscoveryList } from "./StoreDiscoveryList";
import {
  fetchStoreList,
  loadingState,
} from "../../shared/store-discovery/store-discovery.api";
import type { DshStoreListState } from "../../shared/store-discovery/store-discovery.states";

type Props = {
  onStorePress?: (storeId: string) => void;
};

export function StoreDiscoveryScreen({ onStorePress }: Props) {
  const [state, setState] = useState<DshStoreListState>(loadingState());

  const load = useCallback(async () => {
    setState(loadingState());
    const nextState = await fetchStoreList();
    setState(nextState);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleStorePress = useCallback(
    (storeId: string) => {
      onStorePress?.(storeId);
    },
    [onStorePress],
  );

  return (
    <SafeAreaView style={styles.root}>
      <Screen padded={false}>
        <Header title="Discover Stores" />
        <StoreDiscoveryList
          state={state}
          onStorePress={handleStorePress}
          onRetry={load}
        />
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: brandScale.surface[50] },
});
