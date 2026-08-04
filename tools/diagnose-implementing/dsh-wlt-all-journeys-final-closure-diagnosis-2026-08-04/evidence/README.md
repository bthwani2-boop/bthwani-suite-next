# Evidence archive

The files `diagnostic-ledgers-and-task-details.tar.xz.base64.part-00` through `part-14` are deterministic textual chunks of a derived diagnostic archive. They are support evidence only. No runtime, build, test, CI, governance gate, or source-of-truth path may depend on them.

## Reconstruct and inspect

```bash
cat evidence/diagnostic-ledgers-and-task-details.tar.xz.base64.part-* \
  | base64 --decode \
  > evidence/diagnostic-ledgers-and-task-details.tar.xz

tar -tJf evidence/diagnostic-ledgers-and-task-details.tar.xz
```

The reconstructed archive contains detailed ledgers and task records used to support this package, including the tracked-file inventory, journey-slice ledger, and `TASK-0002` through `TASK-0018`. Permanent outcomes must be moved to their authoritative owners during later execution.
