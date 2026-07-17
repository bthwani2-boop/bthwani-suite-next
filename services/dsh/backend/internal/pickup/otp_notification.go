package pickup

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
)

const pickupOtpNotificationTopic = "pickup_otp"

// DeliverOtpNotification delivers a newly issued pickup OTP through DSH's
// authenticated, actor-scoped notification channel. The plaintext is never
// logged, returned to the partner surface, or written to the operational
//