import React from 'react';

export function useCaptainOrderModel() {
  const [activeAssignmentId, setActiveAssignmentId] = React.useState('');
  const [activeOrderId, setActiveOrderId] = React.useState('');
  const [activeOrderExpanded, setActiveOrderExpanded] = React.useState(false);
  const [assignmentClosureNotice, setAssignmentClosureNotice] = React.useState<string | null>(null);

  const toggleOrderExpanded = React.useCallback(() => {
    setActiveOrderExpanded((previous) => !previous);
  }, []);

  const clearActiveAssignment = React.useCallback((notice?: string) => {
    setActiveAssignmentId('');
    setActiveOrderId('');
    setActiveOrderExpanded(false);
    setAssignmentClosureNotice(notice?.trim() || null);
  }, []);

  return {
    activeAssignmentId,
    setActiveAssignmentId,
    activeOrderId,
    setActiveOrderId,
    activeOrderExpanded,
    setActiveOrderExpanded,
    toggleOrderExpanded,
    assignmentClosureNotice,
    setAssignmentClosureNotice,
    clearActiveAssignment,
  };
}
