import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
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
  readonly onReelPress?: ((reel: HomePublicReel) => void) | undefined;
};

function isPlayableVideoUrl(value: string): boolean {
  return /^https:\/\//i.test(value.trim());
}

function reelTitle(reel: HomePublicReel): string {
  return reel.titleAr.trim() || reel.titleEn.trim() || "فيديو مختار";
}

function ReelPlayerModal({
  reel,
  onClose,
  onOpenTarget,
}: {
  readonly reel: HomePublicReel;
  readonly onClose: () => void;
  readonly onOpenTarget?: () => void;
}) {
  const player = useVideoPlayer(reel.videoUrl, (instance) => {
    instance.loop = true;
    instance.play();
  });

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <View style={styles.modalHeader}>
          <Button label="إغلاق" tone="ghost" size="sm" onPress={onClose} />
          <Text style={styles.modalTitle} numberOfLines={1}>{reelTitle(reel)}</Text>
        </View>
        <VideoView
          player={player}
          style={styles.video}
          nativeControls
          contentFit="contain"
          allowsFullscreen
          allowsPictureInPicture
        />
        <View style={styles.modalActions}>
          {onOpenTarget ? (
            <Button
              label={reel.targetType === "store" ? "فتح المتجر" : "فتح التفاصيل"}
              tone="primary"
              onPress={onOpenTarget}
            />
          ) : (
            <StateView
              tone="neutral"
              title="المشاهدة فقط"
              description="لا يملك هذا الفيديو هدفًا قابلًا للفتح في تطبيق العميل حاليًا."
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

export function HomeReelsSection({ reels, onReelPress }: Props) {
  const [selectedReel, setSelectedReel] = React.useState<HomePublicReel | null>(null);
  const playableReels = React.useMemo(
    () => reels.filter((reel) => isPlayableVideoUrl(reel.videoUrl)),
    [reels],
  );

  if (playableReels.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.kicker}>مختارات مرئية</Text>
        <Text style={styles.title}>شاهد قبل أن تطلب</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        {playableReels.map((reel) => (
          <Pressable
            key={reel.id}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => setSelectedReel(reel)}
            accessibilityRole="button"
            accessibilityLabel={`تشغيل ${reelTitle(reel)}`}
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
              <Text style={styles.cardTitle} numberOfLines={1}>
                {reelTitle(reel)}
              </Text>
              <Text style={styles.cardSubtitle} numberOfLines={1}>
                اضغط للمشاهدة
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {selectedReel ? (
        <ReelPlayerModal
          reel={selectedReel}
          onClose={() => setSelectedReel(null)}
          {...(onReelPress
            ? {
                onOpenTarget: () => {
                  const reel = selectedReel;
                  setSelectedReel(null);
                  onReelPress(reel);
                },
              }
            : {})}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[4],
  },
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
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
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
  copyWrap: {
    padding: spacing[2],
    alignItems: "flex-end",
  },
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
  modalRoot: {
    flex: 1,
    backgroundColor: colorRoles.shadowBase,
  },
  modalHeader: {
    minHeight: 64,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[3],
    backgroundColor: colorRoles.surfaceBase,
  },
  modalTitle: {
    flex: 1,
    color: colorRoles.textPrimary,
    fontWeight: "800",
    textAlign: "right",
  },
  video: {
    flex: 1,
    width: "100%",
    backgroundColor: colorRoles.shadowBase,
  },
  modalActions: {
    padding: spacing[4],
    backgroundColor: colorRoles.surfaceBase,
  },
});
