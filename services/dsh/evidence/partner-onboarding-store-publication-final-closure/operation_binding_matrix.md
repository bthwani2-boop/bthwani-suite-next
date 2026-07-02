# operation_binding_matrix

resolved_commit_sha: 7ff5fc9b1bd1e9fa3ab46ed3cba7b990b1021dd3

Canonical copy lives in the code header of
`services/dsh/frontend/shared/partner/partner.api.ts` (kept next to the adapter so drift is caught in review).
Route registration proof: `services/dsh/backend/internal/http/server.go:148-179`.
Contract proof: `services/dsh/contracts/dsh.openapi.yaml` (operationIds verified by line):

| Adapter function | Method | Route | operationId | OpenAPI line |
|---|---|---|---|---|
| fetchPartners | GET | /dsh/operator/partners | listDshPartners | 2459 |
| createPartner | POST | /dsh/operator/partners | createDshPartner | 2486 |
| fetchPartner | GET | /dsh/operator/partners/{partnerId} | getDshPartner | 2508 |
| transitionPartner | POST | /dsh/operator/partners/{partnerId}/transition | transitionDshPartner | 2529 |
| fetchPartnerReadiness | GET | /dsh/operator/partners/{partnerId}/readiness | getDshPartnerReadiness | 2562 |
| fetchPartnerDocuments | GET | /dsh/operator/partners/{partnerId}/documents | listDshPartnerDocuments | 2583 |
| addPartnerDocument | POST | /dsh/operator/partners/{partnerId}/documents | addDshPartnerDocument | 2602 |
| reviewPartnerDocument | PATCH | /dsh/operator/partners/{partnerId}/documents/{docId}/review | reviewDshPartnerDocument | 2628 |
| fetchPartnerStores | GET | /dsh/operator/partners/{partnerId}/stores | listDshPartnerStores | 2659 |
| linkPartnerStore | POST | /dsh/operator/partners/{partnerId}/stores | linkDshPartnerStore | 2678 |
| fetchPartnerAuditEvents | GET | /dsh/operator/partners/{partnerId}/audit | listDshPartnerAuditEvents | 2705 |
| fetchListFieldVisits | GET | /dsh/operator/partners/{partnerId}/field-visits | listDshPartnerFieldVisits | 2726 |
| fetchPartnerSelfStatus | GET | /dsh/partner/activation/status | getDshPartnerActivationStatus | 2753 |
| fetchPartnerSelfReadiness | GET | /dsh/partner/activation/readiness | getDshPartnerSelfReadiness | 2769 |
| fieldListDrafts | GET | /dsh/field/partners | listFieldPartnerDrafts | 2785 |
| fieldCreateDraft | POST | /dsh/field/partners/drafts | createFieldPartnerDraft | 2811 |
| fieldGetPartner | GET | /dsh/field/partners/{partnerId} | getFieldPartnerDraft | 2833 |
| fieldUpdatePartner | PATCH | /dsh/field/partners/{partnerId} | updateFieldPartnerDraft | 2852 |
| fieldGetReadiness | GET | /dsh/field/partners/{partnerId}/readiness | getFieldPartnerReadiness | 2879 |
| fieldGetPartnerStore | GET | /dsh/field/partners/{partnerId}/store | getFieldPartnerStore | 2901 |
| fieldUpdatePartnerStore | PATCH | /dsh/field/partners/{partnerId}/store | updateFieldPartnerStore | 2926 |
| fieldUploadDocument | POST | /dsh/field/partners/{partnerId}/documents | uploadFieldPartnerDocument | 2984 |
| fieldListDocuments | GET | /dsh/field/partners/{partnerId}/documents | listFieldPartnerDocuments | 2959 |
| fieldCreateVisit | POST | /dsh/field/partners/{partnerId}/visits | createFieldPartnerVisit | 3063 |
| fieldListFieldVisits | GET | /dsh/field/partners/{partnerId}/field-visits | listFieldPartnerFieldVisits | 3089 |
| fieldSubmitPartner | POST | /dsh/field/partners/{partnerId}/submit | submitFieldPartnerDraft | 3116 |

verification_command: `rg -n "operationId: (listDshPartners|transitionDshPartner|getFieldPartnerStore|updateFieldPartnerStore|submitFieldPartnerDraft)" services/dsh/contracts/dsh.openapi.yaml`
