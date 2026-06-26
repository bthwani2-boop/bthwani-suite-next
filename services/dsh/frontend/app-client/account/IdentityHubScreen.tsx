// Authority: services/dsh/frontend/app-client — identity sub-screen.
// Sovereign shared: services/dsh/frontend/shared
// No backend wiring — profile save/delete are surfaced as callback props for the host to bind.

import React from 'react';
import { View } from 'react-native';
import {
  Box,
  Button,
  Icon,
  MobileScrollView,
  Text,
  TextField,
  TopBar,
  colorPalette,
  safeArea,
  spacing,
  useTheme,
} from '@bthwani/ui-kit';

export type IdentityHubScreenProps = {
  onBack?: () => void;
  onSaveProfile?: (data: { displayName: string; phone: string; email: string }) => void;
  onDeleteAccount?: () => void;
};

export function IdentityHubScreen({ onBack, onSaveProfile, onDeleteAccount }: IdentityHubScreenProps) {
  const { theme } = useTheme();

  const [displayName, setDisplayName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');

  const [isChangingPassword, setIsChangingPassword] = React.useState(false);
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [passwordMsg, setPasswordMsg] = React.useState('');
  const [passwordTone, setPasswordTone] = React.useState<'success' | 'danger'>('success');

  const [isDeletingAccount, setIsDeletingAccount] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState('');

  const handleSavePassword = () => {
    if (!password || !confirmPassword) {
      setPasswordMsg('يرجى ملء جميع الحقول المطلوبة');
      setPasswordTone('danger');
      return;
    }
    if (password !== confirmPassword) {
      setPasswordMsg('كلمتا المرور غير متطابقتين');
      setPasswordTone('danger');
      return;
    }
    setPasswordMsg('تم تحديث كلمة المرور بنجاح');
    setPasswordTone('success');
    setTimeout(() => {
      setIsChangingPassword(false);
      setPassword('');
      setConfirmPassword('');
      setPasswordMsg('');
    }, 2000);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface }}>
      <TopBar
        variant="surface"
        title="الملف الشخصي"
        actions={
          onBack
            ? [{ id: 'back', icon: <Icon name="chevron-back" mirrored size={18} />, accessibilityLabel: 'العودة', onPress: onBack }]
            : []
        }
      />

      <MobileScrollView
        fill
        padding={4}
        gap={4}
        contentContainerStyle={{ paddingBottom: safeArea.comfortable + spacing[12] }}
      >
        <View style={{ gap: spacing[3] }}>
          {/* Header row */}
          <Box align="center" gap={2} style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
            <Text role="bodyStrong" style={{ textAlign: 'right', color: theme.text }}>بيانات الحساب الشخصي</Text>
            <Box align="center" gap={1} style={{ flexDirection: 'row-reverse' }}>
              <Icon name="checkmark-circle" size={16} color={colorPalette.success} />
              <Text role="bodySm" weight="bold" style={{ color: colorPalette.success }}>نشط وآمن</Text>
            </Box>
          </Box>

          {/* Fields */}
          <Box gap={3} style={{ marginTop: spacing[2] }}>
            <Box gap={1}>
              <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>الاسم الظاهر</Text>
              <TextField
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="الاسم الظاهر"
                style={{ textAlign: 'right', color: theme.text }}
              />
            </Box>

            <Box gap={1}>
              <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>رقم الجوال</Text>
              <TextField
                value={phone}
                onChangeText={setPhone}
                placeholder="رقم الجوال"
                keyboardType="phone-pad"
                style={{ textAlign: 'right', color: theme.text }}
              />
            </Box>

            <Box gap={1}>
              <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>البريد الإلكتروني</Text>
              <TextField
                value={email}
                onChangeText={setEmail}
                placeholder="البريد الإلكتروني"
                keyboardType="email-address"
                autoCapitalize="none"
                style={{ textAlign: 'right', color: theme.text }}
              />
            </Box>

            <Button
              label="حفظ البيانات"
              tone="brand"
              onPress={() => onSaveProfile?.({ displayName, phone, email })}
              style={{ width: '100%' }}
            />

            {/* Password section */}
            <Box style={{ borderTopWidth: 1, borderColor: theme.line, paddingTop: spacing[3], marginTop: spacing[1] }}>
              {!isChangingPassword ? (
                <Button
                  label="تغيير كلمة المرور"
                  tone="secondary"
                  onPress={() => setIsChangingPassword(true)}
                  style={{ width: '100%' }}
                />
              ) : (
                <Box gap={3}>
                  <Text role="bodyStrong" style={{ textAlign: 'right', color: theme.text }}>تحديث كلمة المرور</Text>

                  <Box gap={1}>
                    <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>كلمة المرور الجديدة</Text>
                    <TextField
                      value={password}
                      onChangeText={setPassword}
                      placeholder="أدخل كلمة المرور الجديدة"
                      secureTextEntry
                      style={{ textAlign: 'right', color: theme.text }}
                    />
                  </Box>

                  <Box gap={1}>
                    <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>تأكيد كلمة المرور</Text>
                    <TextField
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="أعد كتابة كلمة المرور"
                      secureTextEntry
                      style={{ textAlign: 'right', color: theme.text }}
                    />
                  </Box>

                  {passwordMsg ? (
                    <Text
                      role="bodySm"
                      style={{ textAlign: 'right', color: passwordTone === 'success' ? colorPalette.success : colorPalette.danger }}
                    >
                      {passwordMsg}
                    </Text>
                  ) : null}

                  <Box gap={2} style={{ flexDirection: 'row-reverse' }}>
                    <Button label="حفظ كلمة المرور" tone="brand" onPress={handleSavePassword} style={{ flex: 1 }} />
                    <Button label="إلغاء" tone="ghost" onPress={() => { setIsChangingPassword(false); setPassword(''); setConfirmPassword(''); setPasswordMsg(''); }} />
                  </Box>
                </Box>
              )}
            </Box>

            {/* Danger zone */}
            <Box style={{ borderTopWidth: 1, borderColor: theme.line, paddingTop: spacing[3], marginTop: spacing[2] }}>
              {!isDeletingAccount ? (
                <Button
                  label="حذف الحساب"
                  tone="danger"
                  onPress={() => setIsDeletingAccount(true)}
                  style={{ width: '100%' }}
                />
              ) : (
                <Box gap={2} padding={3} style={{ backgroundColor: colorPalette.dangerSoft, borderRadius: 15, borderWidth: 1, borderColor: colorPalette.dangerSoft }}>
                  <Text role="bodyStrong" style={{ textAlign: 'right', color: colorPalette.dangerStrong }}>تنبيه أمان حساس!</Text>
                  <Text role="bodySm" style={{ textAlign: 'right', color: colorPalette.dangerStrong }}>
                    حذف الحساب سيؤدي إلى مسح كافة البيانات والطلبات بشكل نهائي لا يمكن استرجاعه.
                  </Text>
                  <Text role="bodySm" style={{ textAlign: 'right', color: colorPalette.dangerStrong, marginTop: spacing[1] }}>
                    اكتب "حذف" في الحقل أدناه للتأكيد:
                  </Text>

                  <TextField
                    value={deleteConfirm}
                    onChangeText={setDeleteConfirm}
                    placeholder='اكتب "حذف" للتأكيد'
                    style={{ textAlign: 'right', color: colorPalette.dangerStrong }}
                  />

                  <Box gap={2} style={{ marginTop: spacing[2], flexDirection: 'row-reverse' }}>
                    <Button
                      label="حذف الحساب نهائياً"
                      disabled={deleteConfirm !== 'حذف'}
                      tone="danger"
                      onPress={() => { onDeleteAccount?.(); setIsDeletingAccount(false); setDeleteConfirm(''); }}
                      style={{ flex: 1 }}
                    />
                    <Button label="تراجع" tone="ghost" onPress={() => { setIsDeletingAccount(false); setDeleteConfirm(''); }} />
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </View>
      </MobileScrollView>
    </View>
  );
}

export default IdentityHubScreen;
