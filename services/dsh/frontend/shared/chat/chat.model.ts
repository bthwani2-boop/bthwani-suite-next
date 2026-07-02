import React from 'react';
import type { CompactOrderChatMessage } from '../delivery';

export function useCaptainChatModel() {
  const [activeOrderDraft, setActiveOrderDraft] = React.useState('');
  const [activeOrderMessages, setActiveOrderMessages] = React.useState<CompactOrderChatMessage[]>([]);

  const sendQuickMessage = React.useCallback(() => {
    const text = activeOrderDraft.trim();
    if (!text) return;
    setActiveOrderMessages((cur) => [
      ...cur,
      { id: `msg-${cur.length + 1}`, sender: 'الكابتن', text, time: 'الآن', side: 'end' },
    ]);
    setActiveOrderDraft('');
  }, [activeOrderDraft]);

  return {
    activeOrderDraft,
    setActiveOrderDraft,
    activeOrderMessages,
    setActiveOrderMessages,
    sendQuickMessage,
  };
}
