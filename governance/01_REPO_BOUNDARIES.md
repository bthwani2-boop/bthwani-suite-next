# Repo Boundaries

GitHub donor:
bthwani2-boop/bthwani-suite

Donor branch:
realtest

Local donor:
C:\bthwani-suite

Role:
DONOR / REFERENCE / EVIDENCE ONLY

New local target:
C:\bthwani-suite-next

Role:
CANONICAL IMPLEMENTATION TARGET

Rules:
1. GitHub realtest is read-only unless explicit write is requested.
2. C:\bthwani-suite is not modified during foundation setup.
3. C:\bthwani-suite-next must not import from C:\bthwani-suite.
4. No blind copy from realtest.
5. Any extracted file requires ledger entry.
6. Any copied logic requires source path, target path, reason, conflict check, and verification gate.
