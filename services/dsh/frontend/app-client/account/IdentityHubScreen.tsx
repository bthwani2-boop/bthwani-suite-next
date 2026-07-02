// Authority: services/dsh/frontend/app-client — identity sub-screen.
// Sovereign shared: services/dsh/frontend/shared
// No backend wiring — profile save/delete are surfaced as callback props for the host to bind.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  Header,
  ScrollScreen,
  Text,
  TextField,
  spacing,
  colorRoles,
} from '@bthwani/ui-kit';

export type IdentityHubScreenProps = {
  onBack?: () => void;
  onSaveProfile?: (data: { displayName: string; phone: string; email: string }) => void;
  onDeleteAccount?: () => void;
};

export function IdentityHubScreen({ onBack, onSaveProfile, onDeleteAccount }: IdentityHubScreenProps) {
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
    <ScrollScreen>
      <Header title="الملف الشخصي" subtitle="بيانات الحساب الشخصي" />

      <View style={styles.container}>
        {/* Profile Fields */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text role="titleMd" style={styles.sectionTitle}>بيانات الحساب</Text>
            <Text tone="success" style={styles.statusText}>● نشط وآمن</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text role="caption" tone="muted" style={styles.fieldLabel}>الاسم الظاهر</Text>
            <TextField
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="الاسم الظاهر"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text role="caption" tone="muted" style={styles.fieldLabel}>رقم الجوال</Text>
            <TextField
              value={phone}
              onChangeText={setPhone}
              placeholder="رقم الجوال"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text role="caption" tone="muted" style={styles.fieldLabel}>البريد الإلكتروني</Text>
            <TextField
              value={email}
              onChangeText={setEmail}
              placeholder="البريد الإلكتروني"
            />
          </View>

          <Button
            label="حفظ البيانات"
            tone="primary"
            onPress={() => onSaveProfile?.({ displayName, phone, email })}
          />
        </Card>

        {/* Password Section */}
        <Card style={styles.card}>
          <Text role="titleMd" style={styles.sectionTitle}>كلمة المرور</Text>

          {!isChangingPassword ? (
            <Button
              label="تغيير كلمة المرور"
              tone="secondary"
              onPress={() => setIsChangingPassword(true)}
            />
          ) : (
            <View style={styles.fieldGroup}>
              <View style={styles.fieldGroup}>
                <Text role="caption" tone="muted" style={styles.fieldLabel}>كلمة المرور الجديدة</Text>
                <TextField
                  value={password}
                  onChangeText={setPassword}
                  placeholder="أدخل كلمة المرور الجديدة"
                  secureTextEntry
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text role="caption" tone="muted" style={styles.fieldLabel}>تأكيد كلمة المرور</Text>
                <TextField
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="أعد كتابة كلمة المرور"
                  secureTextEntry
                />
              </View>

              {passwordMsg ? (
                <Text
                  role="caption"
                  style={[styles.fieldLabel, { color: passwordTone === 'success' ? colorRoles.brandStructure : colorRoles.brandAction }]}
                >
                  {passwordMsg}
                </Text>
              ) : null}

              <View style={styles.actionRow}>
                <Button label="حفظ كلمة المرور" tone="primary" onPress={handleSavePassword} />
                <Button
                  label="إلغاء"
                  tone="ghost"
                  onPress={() => {
                    setIsChangingPassword(false);
                    setPassword('');
                    setConfirmPassword('');
                    setPasswordMsg('');
                  }}
                />
              </View>
            </View>
          )}
        </Card>

        {/* Danger Zone */}
        <Card style={[styles.card, styles.dangerCard]}>
          <Text role="titleMd" style={styles.dangerTitle}>منطقة الخطر</Text>

          {!isDeletingAccount ? (
            <Button
              label="حذف الحساب"
              tone="danger"
              onPress={() => setIsDeletingAccount(true)}
            />
          ) : (
            <View style={styles.fieldGroup}>
              <Text role="body" style={styles.dangerText}>
                حذف الحساب سيؤدي إلى مسح كافة البيانات والطلبات بشكل نهائي لا يمكن استرجاعه.
              </Text>
              <Text role="caption" style={styles.dangerText}>اكتب "حذف" في الحقل أدناه للتأكيد:</Text>

              <TextField
                value={deleteConfirm}
                onChangeText={setDeleteConfirm}
                placeholder='اكتب "حذف" للتأكيد'
              />

              <View style={styles.actionRow}>
                <Button
                  label="حذف الحساب نهائياً"
                  disabled={deleteConfirm !== 'حذف'}
                  tone="danger"
                  onPress={() => {
                    onDeleteAccount?.();
                    setIsDeletingAccount(false);
                    setDeleteConfirm('');
                  }}
                />
                <Button
                  label="تراجع"
                  tone="ghost"
                  onPress={() => {
                    setIsDeletingAccount(false);
                    setDeleteConfirm('');
                  }}
                />
              </View>
            </View>
          )}
        </Card>
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing[4],
    gap: spacing[3],
  },
  card: {
    padding: spacing[4],
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colorRoles.surfaceBase,
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  dangerCard: {
    borderColor: colorRoles.surfaceBase,
    backgroundColor: colorRoles.surfaceBase,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: colorRoles.brandStructure,
    textAlign: 'right',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  fieldGroup: {
    gap: spacing[2],
  },
  fieldLabel: {
    textAlign: 'right',
    color: colorRoles.brandStructure,
  },
  actionRow: {
    flexDirection: 'row-reverse',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  dangerTitle: {
    fontWeight: 'bold',
    color: colorRoles.brandAction,
    textAlign: 'right',
  },
  dangerText: {
    textAlign: 'right',
    color: colorRoles.brandAction,
    lineHeight: 20,
  },
});

export default IdentityHubScreen;
