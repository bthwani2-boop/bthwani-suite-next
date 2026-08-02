with open('services/dsh/backend/internal/http/media_upload_test.go', 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: restore the first switch case back from field-owner-token to operator-token
content = content.replace(
    'case "Bearer field-owner-token":\n\t\t\tidentity = auth.Identity{Subject: "op-1", OperatorContextID: "OperatorContext-a", Roles: []string{"operator"}, AuthState: "authenticated"}',
    'case "Bearer operator-token":\n\t\t\tidentity = auth.Identity{Subject: "op-1", OperatorContextID: "OperatorContext-a", Roles: []string{"operator"}, AuthState: "authenticated"}',
    1  # only first occurrence
)

# Also handle CRLF variant
content = content.replace(
    'case "Bearer field-owner-token":\r\n\t\t\tidentity = auth.Identity{Subject: "op-1", OperatorContextID: "OperatorContext-a", Roles: []string{"operator"}, AuthState: "authenticated"}',
    'case "Bearer operator-token":\r\n\t\t\tidentity = auth.Identity{Subject: "op-1", OperatorContextID: "OperatorContext-a", Roles: []string{"operator"}, AuthState: "authenticated"}',
    1
)

# Step 2: change the test request to use field-owner-token instead of operator-token
# This must be the test req line not the switch case
content = content.replace(
    'req.Header.Set("Authorization", "Bearer operator-token")',
    'req.Header.Set("Authorization", "Bearer field-owner-token")',
    1  # only first occurrence (line 281)
)

with open('services/dsh/backend/internal/http/media_upload_test.go', 'w', encoding='utf-8') as f:
    f.write(content)

print("done")
