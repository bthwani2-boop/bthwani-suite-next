import React from 'react';

export function useCaptainOrderModel() {
  const [activeOrderExpanded, setActiveOrderExpanded] = React.useState(false);
  const [assignmentClosureNotice, setAssignmentClosureNotice] = React.useState<string | null>(null);

  const toggleOrderExpanded = React.useCallback(() => {
    setActiveOrderExpanded((previous) => !previous);
  }, []);

  const clearActiveAssignment = React.useCallback((notice?: string) => {
    setActiveOrderExpanded(false);
    setAssignmentClosureNotice(notice?.trim() || null);
  }, []);

  return {
    activeOrderExpanded,
    setActiveOrderExpanded,
    toggleOrderExpanded,
    assignmentClosureNotice,
    setAssignmentClosureNotice,
    clearActiveAssignment,
  };
}
