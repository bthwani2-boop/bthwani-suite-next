'use client';

import React from 'react';
import { ScrollScreen, Header } from '@bthwani/ui-kit';
import { ProviderActivationWorkspace } from '../shared';

export type CaptainOperationsScreenProps = { hubHref: string; subGroup?: string; };

export function CaptainOperationsScreen({ hubHref: _hubHref, subGroup: _subGroup }: CaptainOperationsScreenProps) {
  return (
    <ScrollScreen>
      <Header
        title="تفعيل حسابات الكباتن والتشغيل"
        subtitle="اختر الكابتن ثم أصدر كوده أو أوقفه أو أعد تفعيله — إضافة مقدمي الخدمة تتم من قسم الموارد البشرية."
      />
      <ProviderActivationWorkspace
        providerKind="captain"
        entrySource="operations"
      />
    </ScrollScreen>
  );
}

export default CaptainOperationsScreen;
