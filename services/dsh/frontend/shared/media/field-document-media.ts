// Canonical location: dsh/frontend/shared/media/field-document-media.ts
// Authority: dsh/frontend/shared/media — local UI draft media key utilities.
// Keys produced here are LOCAL DRAFT PLACEHOLDERS only.
// They MUST NOT be used as backend entity identifiers or runtime media keys.

let _draftKeyCounter = 0;

export function resolveFieldDocumentDraftMediaKey(kind: string): string {
  _draftKeyCounter += 1;
  return `field.doc.${kind}.local-draft-${_draftKeyCounter}`;
}
