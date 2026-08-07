import { getPasswordToken, getProvider, requestJson, authorization, WORKFORCE_API_BASE } from './local-workforce-provisioning.mjs';
import { LOCAL_ACTORS } from './local-actors.mjs';
import { randomUUID } from 'node:crypto';

async function issueCode() {
  try {
    const operatorToken = await getPasswordToken(LOCAL_ACTORS.operator.username);
    const actorId = 'field-KkPaz4kkIu4p';
    const detail = await getProvider(operatorToken, 'field', actorId);
    const attempt = randomUUID();
    const issued = await requestJson(
      `workforce:field:issue-activation`,
      `${WORKFORCE_API_BASE}/workforce/field-agents/${encodeURIComponent(actorId)}/activation-codes`,
      {
        method: 'POST',
        headers: {
          ...authorization(operatorToken),
          'Content-Type': 'application/json',
          'Idempotency-Key': `mobile-dev-field-activation-${attempt}`,
          'X-Correlation-ID': `mobile-dev-field-activation-${attempt}`,
        },
        body: JSON.stringify({ expectedVersion: detail.version }),
      },
    );
    console.log("NEW_ACTIVATION_CODE:", issued.code);
  } catch (error) {
    console.error("Error generating code:", error);
  }
}
issueCode();
