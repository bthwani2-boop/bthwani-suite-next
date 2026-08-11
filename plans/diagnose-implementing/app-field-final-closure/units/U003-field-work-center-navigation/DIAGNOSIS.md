# U003 — field-work-center-navigation

## Current-BB diagnosis

Historical U003 is internally invalid as closure evidence because its result combines PASS with NOT_RUN and contains no meaningful current-candidate checks. Current source is materially better: field work UI distinguishes current from stale/revoked items and current navigation has explicit route ownership. This unit therefore proves convergence instead of inventing another work center. Verify home/work queue derives only from current authorized assignments, deep links cannot bypass scope, stale/revoked items remain non-actionable or explicitly historical, refresh does not resurrect removed work, and all entry points converge on one canonical route/state owner. If parallel route logic or client-side authority is reproduced, remove/converge it at the root and add regression tests. Do not import Captain dispatch semantics or create a second local work queue.
