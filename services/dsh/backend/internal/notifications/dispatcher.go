package notifications

import (
	"strings"
)

// EvaluatePreference determines if a notification should be delivered based on
// the template configuration and the user's specific preferences. Mandatory
// notifications (like security alerts or strict operational requirements) bypass
// user opt-outs.
func EvaluatePreference(config PlatformNotificationConfig, prefs NotificationPreference) bool {
	if config.IsMandatory {
		return true
	}
	// If it's not mandatory, we respect the user's explicit preference for this topic.
	return prefs.Enabled
}

// RenderTemplate performs variable interpolation on a given template string.
// Variables are provided as a map where the key is the variable name (e.g. "order_id")
// and the value is the string to replace it with. The template should use double curly
// braces for variables, e.g. "Your order {{order_id}} is ready".
func RenderTemplate(templateStr string, variables map[string]string) string {
	result := templateStr
	for key, value := range variables {
		placeholder := "{{" + key + "}}"
		result = strings.ReplaceAll(result, placeholder, value)
	}
	return result
}
