import React from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ViewToken,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import {
  Button,
  StateView,
  alpha,
  colorRoles,
  elevation,
  neutralScale,
  radius,
  spacing,
  statusScale,
} from "@bthwani/ui-kit";
import { ClientRemoteImage } from "../../../../../apps/app-client/runtime/src/media/ClientRemoteImage";
import type { HomePublicReel } from "../../shared/home-discovery";

export type HomeReelsLoadState = "idle" | "loading" | "ready" | "empty" | "error";

type Props = {
  readonly reels: readonly HomePublicReel[];
  readonly loadState: HomeReelsLoadState;
  readonly openRequest?: number | undefined;
  readonly onRetry?: (() => void) | undefined;
  readonly onReelPress?: ((reel: HomePublicReel) => void) | undefined;
  readonly onItemImpression?: ((reel: HomePublicReel) => void) | undefined;
};

function isPrivateDevelopmentHost(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") return true;
  if (/^10\./.test(hostname) || /^192\.168\./.test(hostname)) return true;
  const match = /^172\.(\d+)\./.exec(hostname);
  if (!match) return false;
  const secondOctet = Number.parseInt(match[1] ?? "0", 10);
  return secondOctet >= 16 && secondOctet <= 31;
}

function isPlayableVideoUrl(value: string): boolean {
  const normalized = value.trim();
  try {
    const url = new URL(normalized);
    if (url.protocol === "https:") return true;
    return url.protocol === "http:" && isPrivateDevelopmentHost(url.hostname);
  } catch {
    return false;
  }
}

function reelTitle(reel: HomePublicReel): string {
  return reel.titleAr || reel.titleEn || "فيديو مختار";
}

function reelSubtitle(reel: HomePublicReel): string {
  return reel.subtitleAr || reel.subtitleEn;
}

function reelHighlight(reel: HomePublicReel): string {
  return reel.highlightAr || reel.highlightEn;
}

function targetCopy(reel: HomePublicReel): { readonly label: string; readonly description: string } {
  switch (reel.targetType) {
    case "store":
      return {
        label: reel.ctaLabelAr || reel.ctaLabelEn || "فتح المتجر",
        description: "يمكن الانتقال إلى المتجر المرتبط بهذا الفيديو.",
      };
    case "master_product":
      return {
        label: reel.ctaLabelAr || reel.ctaLabelEn || "منتج مرتبط",
        description: "مشاهدة فقط حتى يتوفر مسار منتج سيادي في تطبيق العميل.",
      };
    case "offer":
      return {
        label: reel.ctaLabelAr || reel.ctaLabelEn || "عرض مرتبط",
        description: "مشاهدة فقط حتى يتوفر مسار عرض سيادي في تطبيق العميل.",
      };
  }
}

function ReelSlide({
  reel,
  active,
  height,
  onOpenStore,
}: {
  readonly reel: HomePublicReel;
  readonly active: boolean;
  readonly height: number;
  readonly onOpenStore?: (() => void) | undefined;
}) {
  const player = useVideoPlayer({ uri: reel.videoUrl, useCaching: true }, (instance) => {
    instance.loop = true;
  });

  React.useEffect(() => {
    if (active) player.play();
    else player.pause();
    return () => player.pause();
  }, [active, player]);

  const target = targetCopy(reel);
  const subtitle = reelSubtitle(reel);
  const highlight = reelHighlight(reel);
  return (
    <View style={[styles.slideShell, { height }]}>
      <View style={styles.slideCard}>
        {reel.posterUrl ? (
          <ClientRemoteImage
            uri={reel.posterUrl}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            accessibilityLabel={`غلاف ${reelTitle(reel)}`}
          />
        ) : null}
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          nativeControls={false}
          contentFit="cover"
          surfaceType="textureView"
          fullscreenOptions={{ enable: true }}
          allowsPictureInPicture
        />
        <View pointerEvents="none" style={styles.slideScrim} />
        <View style={styles.slideHeader}>
          <View style={styles.approvedBadge}>
            <Text style={styles.approvedBadgeText}>فيديو معتمد</Text>
          </View>
          <Text style={styles.swipeHint}>اسحب للأعلى أو للأسفل</Text>
        </View>
        <View style={styles.slideBody}>
          <Text style={styles.slideTitle} numberOfLines={2}>{reelTitle(reel)}</Text>
          {subtitle ? <Text style={styles.slideSubtitle} numberOfLines={3}>{subtitle}</Text> : null}
          {highlight ? <Text style={styles.slideHighlight} numberOfLines={2}>{highlight}</Text> : null}
          {!subtitle && !highlight ? <Text style={styles.targetDescription}>{target.description}</Text> : null}
          {onOpenStore ? (
            <Button label={target.label} tone="primary" onPress={onOpenStore} />
          ) : null}
        </View>
      </View>
    </View>
  );
}

function ReelsStateModal({
  loadState,
  onClose,
  onRetry,
}: {
  readonly loadState: HomeReelsLoadState;
  readonly onClose: () => void;
  readonly onRetry?: (() => void) | undefined;
}) {
  const loading = loadState === "idle" || loadState === "loading";
  const error = loadState === "error";
  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar hidden />
      <View style={styles.modalRoot}>
        <View style={styles.stateCard}>
          <StateView
            tone={error ? "danger" : "neutral"}
            title={loading ? "جاري تحميل الفيديوهات..." : error ? "تعذر تحميل الفيديوهات" : "لا توجد فيديوهات معتمدة بعد"}
            description={
              loading
                ? "يتم الآن جلب الفيديوهات المعتمدة من DSH."
                : error
                  ? "تحقق من الاتصال ثم أعد المحاولة."
                  : "تظهر هنا الفيديوهات التي يرفعها الشركاء وتعتمدها إدارة التسويق."
            }
            {...(!loading && onRetry ? { actionLabel: "إعادة المحاولة", onActionPress: onRetry } : {})}
          />
        </View>
        <CloseButton onPress={onClose} />
      </View>
    </Modal>
  );
}

function VerticalReelsModal({
  reels,
  initialIndex,
  onClose,
  onReelPress,
  onItemImpression,
}: {
  readonly reels: readonly HomePublicReel[];
  readonly initialIndex: number;
  readonly onClose: () => void;
  readonly onReelPress?: ((reel: HomePublicReel) => void) | undefined;
  readonly onItemImpression?: ((reel: HomePublicReel) => void) | undefined;
}) {
  const { height } = useWindowDimensions();
  const safeInitialIndex = Math.max(0, Math.min(initialIndex, reels.length - 1));
  const [activeIndex, setActiveIndex] = React.useState(safeInitialIndex);
  const listRef = React.useRef<FlatList<HomePublicReel>>(null);
  const impressedIds = React.useRef(new Set<string>());
  const onItemImpressionRef = React.useRef(onItemImpression);
  const viewabilityConfig = React.useMemo(
    () => ({ itemVisiblePercentThreshold: 80, minimumViewTime: 120 }),
    [],
  );

  React.useEffect(() => {
    onItemImpressionRef.current = onItemImpression;
  }, [onItemImpression]);

  const handleViewableItemsChanged = React.useRef((info: {
    readonly viewableItems: readonly ViewToken[];
  }) => {
    const firstVisible = info.viewableItems.find((item) => item.isViewable);
    if (typeof firstVisible?.index === "number") setActiveIndex(firstVisible.index);
    const reel = firstVisible?.item as HomePublicReel | undefined;
    if (!reel || impressedIds.current.has(reel.id)) return;
    impressedIds.current.add(reel.id);
    onItemImpressionRef.current?.(reel);
  }).current;

  React.useEffect(() => {
    setActiveIndex(safeInitialIndex);
    impressedIds.current.clear();
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: safeInitialIndex, animated: false });
    });
  }, [safeInitialIndex]);

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar hidden />
      <View style={styles.modalRoot}>
        <FlatList
          ref={listRef}
          data={reels}
          keyExtractor={(item) => item.id}
          pagingEnabled
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          initialScrollIndex={safeInitialIndex}
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={handleViewableItemsChanged}
          renderItem={({ item, index }) => (
            <ReelSlide
              reel={item}
              active={index === activeIndex}
              height={height}
              {...(onReelPress && item.targetType === "store"
                ? {
                    onOpenStore: () => {
                      onClose();
                      onReelPress(item);
                    },
                  }
                : {})}
            />
          )}
        />
        <CloseButton onPress={onClose} />
      </View>
    </Modal>
  );
}

function CloseButton({ onPress }: { readonly onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="إغلاق الفيديوهات"
      hitSlop={10}
      style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
      onPress={onPress}
    >
      <Text style={styles.closeGlyph}>×</Text>
    </Pressable>
  );
}

export function HomeReelsSection({
  reels,
  loadState,
  openRequest = 0,
  onRetry,
  onReelPress,
  onItemImpression,
}: Props) {
  const [viewerVisible, setViewerVisible] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const lastHandledOpenRequest = React.useRef(0);
  const playableReels = React.useMemo(
    () => reels.filter((reel) => isPlayableVideoUrl(reel.videoUrl)),
    [reels],
  );

  React.useEffect(() => {
    if (selectedIndex >= playableReels.length && playableReels.length > 0) {
      setSelectedIndex(0);
    }
  }, [playableReels.length, selectedIndex]);

  React.useEffect(() => {
    if (openRequest <= 0 || openRequest === lastHandledOpenRequest.current) return;
    lastHandledOpenRequest.current = openRequest;
    setSelectedIndex(0);
    setViewerVisible(true);
  }, [openRequest]);

  const closeViewer = () => setViewerVisible(false);

  return (
    <>
      {playableReels.length > 0 ? (
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <Text style={styles.kicker}>مختارات مرئية</Text>
            <Text style={styles.title}>شاهد قبل أن تطلب</Text>
          </View>
          <FlatList
            horizontal
            data={playableReels}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rail}
            renderItem={({ item, index }) => (
              <Pressable
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => {
                  setSelectedIndex(index);
                  setViewerVisible(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={`تشغيل ${reelTitle(item)}`}
              >
                <View style={styles.videoPlane}>
                  {item.posterUrl ? (
                    <ClientRemoteImage
                      uri={item.posterUrl}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                      accessibilityLabel={`غلاف ${reelTitle(item)}`}
                    />
                  ) : null}
                  {item.posterUrl ? <View pointerEvents="none" style={styles.cardPosterScrim} /> : null}
                  <View style={styles.playButton}>
                    <Text style={styles.playIcon}>▶</Text>
                  </View>
                  <View style={styles.videoBadge}>
                    <Text style={styles.videoBadgeText}>فيديو</Text>
                  </View>
                </View>
                <View style={styles.copyWrap}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{reelTitle(item)}</Text>
                  <Text style={styles.cardSubtitle} numberOfLines={1}>
                    {reelSubtitle(item) || "اضغط ثم اسحب للتنقل"}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        </View>
      ) : null}

      {viewerVisible && playableReels.length > 0 ? (
        <VerticalReelsModal
          reels={playableReels}
          initialIndex={selectedIndex}
          onClose={closeViewer}
          onReelPress={onReelPress}
          onItemImpression={onItemImpression}
        />
      ) : null}
      {viewerVisible && playableReels.length === 0 ? (
        <ReelsStateModal loadState={loadState} onClose={closeViewer} onRetry={onRetry} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing[4] },
  headerRow: {
    paddingHorizontal: spacing[4],
    marginBottom: spacing[2],
    alignItems: "flex-end",
  },
  kicker: {
    fontSize: 11,
    fontWeight: "800",
    color: statusScale.danger,
    textAlign: "right",
  },
  title: {
    fontSize: 15,
    fontWeight: "900",
    color: colorRoles.textPrimary,
    textAlign: "right",
  },
  rail: {
    paddingHorizontal: spacing[4],
    gap: spacing[3],
    flexDirection: "row-reverse",
  },
  card: {
    width: 132,
    borderRadius: radius.lg,
    backgroundColor: colorRoles.surfaceBase,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    overflow: "hidden",
    ...elevation.overlay,
  },
  cardPressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  videoPlane: {
    height: 164,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colorRoles.brandStructure,
    overflow: "hidden",
  },
  cardPosterScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: alpha(colorRoles.shadowBase, 0.25),
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: radius.round,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: alpha(neutralScale[0], 0.9),
  },
  playIcon: {
    paddingLeft: 2,
    fontSize: 19,
    fontWeight: "900",
    color: statusScale.danger,
  },
  videoBadge: {
    position: "absolute",
    top: spacing[2],
    right: spacing[2],
    borderRadius: radius.round,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    backgroundColor: alpha(statusScale.danger, 0.92),
  },
  videoBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: neutralScale[0],
  },
  copyWrap: { padding: spacing[2], alignItems: "flex-end" },
  cardTitle: {
    width: "100%",
    fontSize: 12,
    fontWeight: "900",
    color: colorRoles.textPrimary,
    textAlign: "right",
  },
  cardSubtitle: {
    width: "100%",
    marginTop: 1,
    fontSize: 10,
    fontWeight: "700",
    color: colorRoles.textSecondary,
    textAlign: "right",
  },
  modalRoot: { flex: 1, backgroundColor: colorRoles.shadowBase },
  stateCard: {
    flex: 1,
    margin: spacing[3],
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing[5],
    backgroundColor: colorRoles.surfaceBase,
    overflow: "hidden",
  },
  slideShell: {
    width: "100%",
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  slideCard: {
    flex: 1,
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: colorRoles.shadowBase,
    borderWidth: 1,
    borderColor: alpha(neutralScale[0], 0.12),
  },
  slideScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: alpha(colorRoles.shadowBase, 0.38),
  },
  slideHeader: {
    position: "absolute",
    top: spacing[4],
    left: spacing[4],
    right: spacing[4],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[3],
  },
  approvedBadge: {
    borderRadius: radius.round,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: alpha(colorRoles.shadowBase, 0.58),
    borderWidth: 1,
    borderColor: alpha(neutralScale[0], 0.14),
  },
  approvedBadgeText: { color: neutralScale[0], fontSize: 11, fontWeight: "900" },
  swipeHint: {
    color: alpha(neutralScale[0], 0.88),
    fontSize: 11,
    fontWeight: "800",
    textAlign: "right",
    backgroundColor: alpha(colorRoles.shadowBase, 0.42),
    borderRadius: radius.round,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  slideBody: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing[4],
    gap: spacing[3],
  },
  slideTitle: {
    color: neutralScale[0],
    fontSize: 22,
    fontWeight: "900",
    textAlign: "right",
  },
  slideSubtitle: {
    color: alpha(neutralScale[0], 0.92),
    fontSize: 14,
    lineHeight: 21,
    textAlign: "right",
  },
  slideHighlight: {
    color: alpha(neutralScale[0], 0.88),
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 20,
    textAlign: "right",
  },
  targetDescription: {
    color: alpha(neutralScale[0], 0.9),
    fontSize: 13,
    lineHeight: 20,
    textAlign: "right",
  },
  closeButton: {
    position: "absolute",
    top: spacing[4],
    right: spacing[4],
    width: 44,
    height: 44,
    borderRadius: radius.round,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: alpha(colorRoles.shadowBase, 0.68),
    borderWidth: 1,
    borderColor: alpha(neutralScale[0], 0.18),
    zIndex: 20,
  },
  closeButtonPressed: { opacity: 0.78 },
  closeGlyph: {
    color: neutralScale[0],
    fontSize: 30,
    lineHeight: 32,
    fontWeight: "500",
  },
});
