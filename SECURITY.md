# Security Policy

This repository is being hardened under the XPeX Systems AI Evidence First model.

## Security principles

- least privilege;
- deny by default for privileged actions;
- no private credentials in source control;
- production/non-production separation;
- source-to-runtime provenance;
- explicit approval for high-risk actions;
- auditable material actions;
- rollback/containment for production-critical paths.

## Secrets

Never commit:
- Stripe secret or restricted keys;
- Stripe webhook signing secrets;
- Supabase service-role keys;
- database passwords;
- private keys;
- provider API secrets;
- OAuth client secrets.

Public client identifiers and publishable keys may be represented in an `.env.example`, but runtime values should be supplied through the deployment/provider secret store.

If a private secret is ever committed, deleting the file is not sufficient. Rotate/revoke the credential and review repository history and downstream logs.

## Reporting

Do not disclose active credentials or exploit details in a public issue. Use GitHub private vulnerability reporting when enabled or another private XPeX security channel.

## Assurance truth

A passing workflow proves only that the corresponding automated check passed. It is not an external certification.

This repository does not claim SOC 2, ISO/IEC 27001, ISO/IEC 42001, government/defense accreditation, or absolute security unless separately evidenced.
