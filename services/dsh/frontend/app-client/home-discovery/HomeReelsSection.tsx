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
import type { HomePublicReel } from "../../shared/home-discovery";

type Props = {
  readonly reels: readonly HomePublicReel[];
  readonly openRequest?: number | undefined;
  readonly onReelPress?: ((reel: HomePublicReel) => void) | undefined;
};

function isPlayableVideoUrl(value: string): boolean {
  return /^https:\/\/[^\s]+$/i.test(value.trim());
}

function reelTitle(reel: HomePublicReel): string {
  return reel.titleAr.trim() || reel.titleEn.trim() || "فيديو مختار";
}

function targetCopy(reel: HomePublicReel): { readonly label: string; readonly description: string } {
  switch (reel.targetType) {
    case "store":
      return { label: "فتح المتجر", description: "يمكن الانتقال إلى المتجر المرتبط بهذا الفيديو." };
    case "master_product":
      return { label: "منتج مرتبط", description: "مشاهدة فقط حتى يتوفر مسار منتج سيادي في تطبيق العميل." };
    case "offer":
      return { label: "عرض مرتبط", description: "مشاهدة فقط حتى يتوفر مسار عرض سيادي في تطبيق العميل." };
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
  return (
    <View style={[styles.slide, { height }]}>
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
        <Text style={styles.targetDescription}>{target.description}</Text>
        {onOpenStore ? (
          <Button label={target.label} tone="primary" onPress={onOpenStore} />
        ) : (
          <StateView
            tone="neutral"
            title={target.label}
            description={target.description}
          />
        )}
      </View>
    </View>
  );
}

function VerticalReelsModal({
  reels,
  initialIndex,
  onClose,
  onReelPress,
}: {
  readonly reels: readonly HomePublicReel[];
  readonly initialIndex: number;
  readonly onClose: () => void;
  readonly onReelPress?: ((reel: HomePublicReel) => void) | undefined;
}) {
  const { height } = useWindowDimensions();
  const safeInitialIndex = Math.max(0, Math.min(initialIndex, reels.length - 1));
  const [activeIndex, setActiveIndex] = React.useState(safeInitialIndex);
  const listRef = React.useRef<FlatList<HomePublicReel>>(null);
  const viewabilityConfig = React.useMemo(
    () => ({ itemVisiblePercentThreshold: 80, minimumViewTime: 120 }),
    [],
  );
  const handleViewableItemsChanged = React.useRef((info: {
    readonly viewableItems: readonly ViewToken[];
  }) => {
    const nextIndex = info.viewableItems.find((item) => item.isViewable)?.index;
    if (typeof nextIndex === "number") setActiveIndex(nextIndex);
  }).current;

  React.useEffect(() => {
    setActiveIndex(safeInitialIndex);
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="إغلاق الفيديوهات"
          hitSlop={10}
          style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
          onPress={onClose}
        >
          <Text style={styles.closeGlyph}>×</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

export function HomeReelsSection({ reels, openRequest = 0, onReelPress }: Props) {
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);
  const lastHandledOpenRequest = React.useRef(0);
  const playableReels = React.useMemo(
    () => reels.filter((reel) => isPlayableVideoUrl(reel.videoUrl)),
    [reels],
  );

  React.useEffect(() => {
    if (selectedIndex !== null && selectedIndex >= playableReels.length) {
      setSelectedIndex(null);
    }
  }, [playableReels.length, selectedIndex]);

  React.useEffect(() => {
    if (
      openRequest <= 0
      || openRequest === lastHandledOpenRequest.current
      || playableReels.length === 0
    ) {
      return;
    }
    lastHandledOpenRequest.current = openRequest;
    setSelectedIndex(0);
  }, [openRequest, playableReels.length]);

  if (playableReels.length === 0) return null;

  return (
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
            onPress={() => setSelectedIndex(index)}
            accessibilityRole="button"
            accessibilityLabel={`تشغيل ${reelTitle(item)}`}
          >
            <View style={styles.videoPlane}>
              <View style={styles.playButton}>
                <Text style={styles.playIcon}>▶</Text>
              </View>
              <View style={styles.videoBadge}>
                <Text style={styles.videoBadgeText}>فيديو</Text>
              </View>
            </View>
            <View style={styles.copyWrap}>
              <Text style={styles.cardTitle} numberOfLines={1}>{reelTitle(item)}</Text>
              <Text style={styles.cardSubtitle} numberOfLines={1}>اضغط ثم اسحب للتنقل</Text>
            </View>
          </Pressable>
        )}
      />

      {selectedIndex !== null ? (
        <VerticalReelsModal
          reels={playableReels}
          initialIndex={selectedIndex}
          onClose={() => setSelectedIndex(null)}
          onReelPress={onReelPress}
        />
      ) : null}
    </View>
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
  slide: {
    width: "100%",
    backgroundColor: colorRoles.shadowBase,
    justifyContent: "flex-end",
  },
  slideScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: alpha(colorRoles.shadowBase, 0.34),
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
  },
  slideBody: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
    gap: spacing[3],
  },
  slideTitle: {
    color: neutralScale[0],
    fontSize: 22,
    fontWeight: "900",
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
