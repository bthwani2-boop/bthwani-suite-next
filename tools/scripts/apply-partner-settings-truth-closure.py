from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def write(relative: str, content: str) -> None:
    (ROOT / relative).write_text(content, encoding="utf-8")


def replace_once(relative: str, old: str, new: str, *, allow_new: bool = True) -> None:
    text = read(relative)
    if old in text:
        write(relative, text.replace(old, new, 1))
        return
    if allow_new and new in text:
        return
    raise RuntimeError(f"missing anchor in {relative}: {old[:140]!r}")


def close_notification_repository() -> None:
    relative = "services/dsh/backend/internal/notifications/notifications.go"
    text = read(relative)
    if "func ListNotificationPreferences(" in text:
        return
    anchor = "func ListPlatformNotificationConfigs(db *sql.DB) ([]PlatformNotificationConfig, error) {\n"
    if anchor not in text:
        raise RuntimeError("notification repository insertion anchor missing")
    block = '''func ListNotificationPreferences(db *sql.DB, actorID, actorType string) ([]NotificationPreference, error) {
	if strings.TrimSpace(actorID) == "" || strings.TrimSpace(actorType) == "" {
		return nil, ErrInvalid
	}
	rows, err := db.Query(`
		SELECT actor_id, actor_type, topic, enabled, updated_at
		FROM dsh_notification_preferences
		WHERE actor_id = $1 AND actor_type = $2
		ORDER BY topic`, actorID, actorType)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	preferences := []NotificationPreference{}
	for rows.Next() {
		var preference NotificationPreference
		if err := rows.Scan(
			&preference.ActorID,
			&preference.ActorType,
			&preference.Topic,
			&preference.Enabled,
			&preference.UpdatedAt,
		); err != nil {
			return nil, err
		}
		preferences = append(preferences, preference)
	}
	return preferences, rows.Err()
}

'''
    write(relative, text.replace(anchor, block + anchor, 1))


def close_notification_http() -> None:
    relative = "services/dsh/backend/internal/http/notifications.go"
    text = read(relative)
    if "func (s *protectedStoreServer) handleListNotificationPreferences" not in text:
        anchor = "// PUT /dsh/notifications/preferences\n"
        if anchor not in text:
            raise RuntimeError("notification HTTP insertion anchor missing")
        block = '''// GET /dsh/notifications/preferences
func (s *protectedStoreServer) handleListNotificationPreferences(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client", "partner", "captain", "field", "operator")
	if !ok {
		return
	}
	preferences, err := notifications.ListNotificationPreferences(s.db, actor.ID, actor.Role)
	if errors.Is(err, notifications.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "actor identity is required")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list notification preferences")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"preferences": preferences})
}

'''
        text = text.replace(anchor, block + anchor, 1)
    write(relative, text)


def close_notification_route_and_contract() -> None:
    relative = "services/dsh/backend/internal/http/server.go"
    replace_once(
        relative,
        '\tmux.HandleFunc("PUT /dsh/notifications/preferences", protected.handleUpdateNotificationPreferences)\n',
        '\tmux.HandleFunc("GET /dsh/notifications/preferences", protected.handleListNotificationPreferences)\n'
        '\tmux.HandleFunc("PUT /dsh/notifications/preferences", protected.handleUpdateNotificationPreferences)\n',
    )

    relative = "services/dsh/contracts/dsh.openapi.yaml"
    text = read(relative)
    if "operationId: listDshNotificationPreferences" not in text:
        anchor = "  /dsh/notifications/preferences:\n    put:\n"
        if anchor not in text:
            raise RuntimeError("notification OpenAPI path anchor missing")
        get_operation = '''  /dsh/notifications/preferences:
    get:
      operationId: listDshNotificationPreferences
      tags: [Notifications]
      security: [{ bearerAuth: [] }]
      responses:
        "200":
          description: Authenticated actor notification preferences.
          content:
            application/json:
              schema:
                type: object
                required: [preferences]
                properties:
                  preferences:
                    type: array
                    items:
                      type: object
                      required: [actorId, actorType, topic, enabled, updatedAt]
                      properties:
                        actorId: { type: string }
                        actorType: { type: string }
                        topic: { type: string }
                        enabled: { type: boolean }
                        updatedAt: { type: string, format: date-time }
    put:
'''
        text = text.replace(anchor, get_operation, 1)
    write(relative, text)

    relative = "services/dsh/capability-map.ts"
    replace_once(
        relative,
        '      "markAllDshNotificationsRead",\n      "updateDshNotificationPreferences",\n',
        '      "markAllDshNotificationsRead",\n      "listDshNotificationPreferences",\n      "updateDshNotificationPreferences",\n',
    )


def close_notification_frontend_api() -> None:
    relative = "services/dsh/frontend/shared/notifications/notifications.api.ts"
    text = read(relative)
    if "export async function fetchNotificationPreferences" not in text:
        anchor = "export async function updateNotificationPreferences(\n"
        if anchor not in text:
            raise RuntimeError("notification frontend API anchor missing")
        block = '''export async function fetchNotificationPreferences(): Promise<{ preferences: DshNotificationPreference[] }> {
  return request("/dsh/notifications/preferences");
}

'''
        text = text.replace(anchor, block + anchor, 1)
    write(relative, text)


def close_partner_hub_notification_truth() -> None:
    relative = "services/dsh/frontend/app-partner/account/PartnerHubScreen.tsx"
    text = read(relative)
    text = text.replace(
        "  useDirection,\n",
        "  useBThwaniAppearance,\n  useDirection,\n",
        1,
    )
    notification_import = '''import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from "../../shared/notifications/notifications.api";
'''
    if notification_import not in text:
        anchor = 'import { usePartnerSelfController } from "../../shared/partner/use-partner-self-controller";\n'
        if anchor not in text:
            raise RuntimeError("partner hub notification import anchor missing")
        text = text.replace(anchor, anchor + notification_import, 1)
    text = text.replace("  BThwaniAppearanceMode,\n", "", 1)

    appearance_hook_start = text.find("function useAppPartnerAppearance() {")
    if appearance_hook_start >= 0:
        appearance_hook_end = text.find("}\n\n", appearance_hook_start)
        if appearance_hook_end < 0:
            raise RuntimeError("partner appearance hook end missing")
        text = text[:appearance_hook_start] + text[appearance_hook_end + 3 :]

    ids_block = '''const notificationPreferenceIds = [
  "orders",
  "operations",
  "inventory",
  "finance",
  "marketing",
  "system",
  "sound",
  "dailyDigest",
  "priorityOnly",
] as const satisfies readonly NotificationPreferenceId[];

function isNotificationPreferenceId(value: string): value is NotificationPreferenceId {
  return (notificationPreferenceIds as readonly string[]).includes(value);
}

'''
    if "const notificationPreferenceIds = [" not in text:
        anchor = "const failClosedNotificationPreferences: NotificationPreferenceState = {\n"
        if anchor not in text:
            raise RuntimeError("notification preference state anchor missing")
        text = text.replace(anchor, ids_block + anchor, 1)

    old_appearance = '''  const {
    hydrated: appearanceHydrated,
    mode: appearanceMode,
    setMode: setAppearanceMode,
  } = useAppPartnerAppearance();
'''
    text = text.replace(old_appearance, '  const { mode: appearanceMode } = useBThwaniAppearance();\n', 1)

    state_anchor = '''  const [notificationError, setNotificationError] = React.useState<string | null>(
    null,
  );
'''
    loaded_state = state_anchor + '''  const [notificationPreferencesLoaded, setNotificationPreferencesLoaded] =
    React.useState(false);
'''
    if "notificationPreferencesLoaded" not in text:
        if state_anchor not in text:
            raise RuntimeError("notification loaded-state anchor missing")
        text = text.replace(state_anchor, loaded_state, 1)

    effect_anchor = '''  React.useEffect(() => {
    void loadStoreRuntime();
  }, [loadStoreRuntime]);

'''
    load_block = effect_anchor + '''  const loadNotificationPreferences = React.useCallback(async () => {
    if (identity.state.kind !== "authenticated") {
      setNotificationPreferences(failClosedNotificationPreferences);
      setNotificationPreferencesLoaded(false);
      return;
    }
    setNotificationError(null);
    setNotificationPreferencesLoaded(false);
    try {
      const response = await fetchNotificationPreferences();
      const next: NotificationPreferenceState = { ...failClosedNotificationPreferences };
      for (const preference of response.preferences) {
        if (isNotificationPreferenceId(preference.topic)) {
          next[preference.topic] = preference.enabled;
        }
      }
      setNotificationPreferences(next);
      setNotificationPreferencesLoaded(true);
    } catch (error) {
      setNotificationPreferences(failClosedNotificationPreferences);
      setNotificationError(
        error instanceof Error
          ? error.message
          : "تعذر تحميل تفضيلات الإشعارات من DSH.",
      );
    }
  }, [identity.state.kind]);

  React.useEffect(() => {
    void loadNotificationPreferences();
  }, [loadNotificationPreferences]);

'''
    if "const loadNotificationPreferences = React.useCallback" not in text:
        if effect_anchor not in text:
            raise RuntimeError("notification load effect anchor missing")
        text = text.replace(effect_anchor, load_block, 1)

    callback_start = text.find("  const updateNotificationPreference = React.useCallback(")
    callback_end_marker = "  const openOrderAlerts = React.useCallback"
    callback_end = text.find(callback_end_marker, callback_start)
    if callback_start < 0 or callback_end < 0:
        raise RuntimeError("notification update callback bounds missing")
    callback = '''  const updateNotificationPreference = React.useCallback(
    (preferenceId: NotificationPreferenceId, nextValue: boolean) => {
      setNotificationError(null);
      void updateNotificationPreferences(preferenceId, nextValue)
        .then(({ preference }) => {
          if (preference.topic !== preferenceId) {
            throw new Error("أعاد DSH موضوع تفضيل مختلفًا عن الطلب.");
          }
          setNotificationPreferences((current) => ({
            ...current,
            [preferenceId]: preference.enabled,
          }));
        })
        .catch((error: unknown) => {
          setNotificationError(
            error instanceof Error
              ? error.message
              : "تعذر حفظ تفضيل الإشعار.",
          );
        });
    },
    [],
  );

'''
    text = text[:callback_start] + callback + text[callback_end:]

    text = text.replace("            appearanceHydrated={appearanceHydrated}\n", "", 1)
    text = text.replace("            setAppearanceMode={setAppearanceMode}\n", "", 1)

    old_settings = '''          {notificationError ? (
            <StateView
              tone="danger"
              title="تعذر حفظ تفضيل الإشعار"
              description={notificationError}
            />
          ) : null}
          <PartnerHubSettingsPanel
'''
    new_settings = '''          {notificationError ? (
            <StateView
              tone="danger"
              title="تعذر تحميل أو حفظ تفضيلات الإشعارات"
              description={notificationError}
              actionLabel="إعادة تحميل التفضيلات"
              onActionPress={() => void loadNotificationPreferences()}
            />
          ) : !notificationPreferencesLoaded ? (
            <StateView loading title="جاري تحميل تفضيلات الإشعارات من DSH…" />
          ) : null}
          {notificationPreferencesLoaded ? (
          <PartnerHubSettingsPanel
'''
    if old_settings in text:
        text = text.replace(old_settings, new_settings, 1)
        panel_end = '''            openOperationsDirectory={openOperationsDirectory}
          />
'''
        panel_end_replacement = panel_end + "          ) : null}\n"
        if panel_end not in text:
            raise RuntimeError("partner settings panel end anchor missing")
        text = text.replace(panel_end, panel_end_replacement, 1)
    elif "notificationPreferencesLoaded ? (" not in text:
        raise RuntimeError("partner settings rendering anchor missing")

    empty_fallback = '''    const copy = sectionCopy[activeSection as Exclude<PartnerHubSection, "hub">];
    return (
      <HubSectionShell
        title={copy.title}
        description={copy.description}
        icon={copy.icon}
        onBack={() => updateSection("hub")}
      />
    );
'''
    fail_closed_fallback = '''    return (
      <HubSectionShell
        title="قسم شريك غير معروف"
        description="تم رفض فتح قسم غير مسجل بدلاً من عرض مساحة فارغة."
        icon="alert-circle-outline"
        onBack={() => updateSection("hub")}
      >
        <StateView
          tone="danger"
          title="القسم غير مربوط"
          description={`لا يملك القسم ${activeSection} شاشة تشغيلية مسجلة.`}
        />
      </HubSectionShell>
    );
'''
    text = text.replace(empty_fallback, fail_closed_fallback, 1)
    write(relative, text)


def close_partner_settings_panel() -> None:
    relative = "services/dsh/frontend/app-partner/account/PartnerHubSettingsPanel.tsx"
    text = read(relative)
    text = text.replace(
        "import { Box, Chip, Divider, Icon, radius, Text, spacing, typography, useDirection } from '@bthwani/ui-kit';",
        "import { Box, Chip, Divider, Icon, Text, spacing, useDirection, type BThwaniAppearanceMode } from '@bthwani/ui-kit';",
        1,
    )
    text = text.replace(
        "import type { BThwaniAppearanceMode, NotificationPreferenceId, NotificationPreferenceState } from '../../shared/partner/partner-hub.types';",
        "import type { NotificationPreferenceId, NotificationPreferenceState } from '../../shared/partner/partner-hub.types';",
        1,
    )
    text = text.replace("  setAppearanceMode,\n", "", 1)
    text = text.replace("  setAppearanceMode: (mode: BThwaniAppearanceMode) => void;\n", "", 1)

    appearance_start = text.find("      {/* Appearance Section */}")
    divider_after_appearance = text.find("      <Divider />", appearance_start)
    if appearance_start < 0 or divider_after_appearance < 0:
        raise RuntimeError("appearance section bounds missing")
    appearance = '''      {/* Appearance truth is owned by the application provider; this panel is read-only. */}
      <Box padding={4} gap={2} style={{ backgroundColor: theme.surface }}>
        <Box layoutDirection="row" style={{ alignItems: 'center', gap: spacing[3] }}>
          <Icon name="color-palette-outline" size={18} tone="muted" />
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text role="bodyStrong" align="start">المظهر الفعلي للتطبيق</Text>
            <Text role="bodySm" tone="muted" align="start">
              يُدار من مزود المظهر العام ولا يُحفظ محليًا داخل شاشة الشريك.
            </Text>
          </Box>
          <Chip label={appearanceMode === 'darkGlass' ? 'داكن زجاجي' : 'فاتح'} />
        </Box>
      </Box>

'''
    text = text[:appearance_start] + appearance + text[divider_after_appearance:]

    branch_object = '''          {
            id: 'branch-scope',
            title: 'اختيار الفرع',
            icon: 'git-branch-outline' as const,
            onPress: onOpenStoreScope,
          },
'''
    branch_conditional = '''          ...(onOpenStoreScope ? [{
            id: 'branch-scope',
            title: 'اختيار الفرع',
            icon: 'git-branch-outline' as const,
            onPress: onOpenStoreScope,
          }] : []),
'''
    text = text.replace(branch_object, branch_conditional, 1)
    write(relative, text)

    relative = "services/dsh/frontend/shared/partner/partner-hub.types.ts"
    text = read(relative)
    text = text.replace("export type BThwaniAppearanceMode = 'lightPremium' | 'darkGlass';\n\n", "", 1)
    write(relative, text)


def close_notification_tests() -> None:
    relative = "services/dsh/backend/internal/notifications/notifications_test.go"
    text = read(relative)
    if "TestListNotificationPreferencesRequiresActor" not in text:
        anchor = "func TestUpsertNotificationPreferencesRequiresActorAndTopic(t *testing.T) {\n"
        if anchor not in text:
            raise RuntimeError("notification test insertion anchor missing")
        block = '''func TestListNotificationPreferencesRequiresActor(t *testing.T) {
	cases := []struct {
		actorID   string
		actorType string
	}{
		{"", "partner"},
		{"partner-1", ""},
	}
	for _, testCase := range cases {
		_, err := ListNotificationPreferences(nil, testCase.actorID, testCase.actorType)
		if err != ErrInvalid {
			t.Fatalf("expected ErrInvalid for %+v, got %v", testCase, err)
		}
	}
}

'''
        text = text.replace(anchor, block + anchor, 1)
    write(relative, text)


def remove_self() -> None:
    path = ROOT / "tools/scripts/apply-partner-settings-truth-closure.py"
    if path.exists():
        path.unlink()


close_notification_repository()
close_notification_http()
close_notification_route_and_contract()
close_notification_frontend_api()
close_partner_hub_notification_truth()
close_partner_settings_panel()
close_notification_tests()
remove_self()
