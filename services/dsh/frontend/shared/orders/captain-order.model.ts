import React from 'react';

export function useCaptainOrderModel() {
  const [assignmentClosureNotice, setAssignmentClosureNotice] = React.useState<string | null>(null);

  const clearActiveAssignment = React.useCallback((notice?: string) => {
    setAssignmentClosureNotice(notice?.trim() || null);
  }, []);

  return {
    assignmentClosureNotice,
    setAssignmentClosureNotice,
    clearActiveAssignment,
  };
}
