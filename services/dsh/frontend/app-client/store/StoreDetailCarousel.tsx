import { StyleSheet, View } from 'react-native';
import { BannerCarousel } from '../shared/ui';

export type CarouselBannerItem = {
  readonly id: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly badge?: string;
  readonly image?: { uri: string } | number | null;
  readonly cta?: string;
  readonly onPress?: () => void;
};

type Props = Readonly<{
  bannerItems: readonly CarouselBannerItem[];
}>;

export function StoreDetailCarousel({ bannerItems }: Props) {
  if (bannerItems.length === 0) return null;

  return (
    <View style={styles.section}>
      <BannerCarousel banners={bannerItems} variant="secondary" />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 16,
    marginBottom: -4,
  },
});
