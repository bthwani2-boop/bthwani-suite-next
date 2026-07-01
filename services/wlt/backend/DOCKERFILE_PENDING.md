# WLT Dockerfile Pending

Do not create services/wlt/backend/Dockerfile until all are true:

- WLT backend entrypoint exists
- /health endpoint exists
- /ready endpoint exists
- WLT database migration exists
- WLT local seed exists
- financial smoke exists
- no financial mutation outside WLT
- runtime does not use donor container names, donor ports, or donor volumes

First allowed activation journey:

- First WLT/payment/finance journey, not Store Discovery Store Discovery
