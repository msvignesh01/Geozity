# Geozity documentation

Updated 16 November 2026 against the tested `h1-h2-h3` source branch. Hosting observations below are dated separately from local tests.

The deployed checkpoint is Version 1 for the hackathon. This branch implements H1 fixes, H2 outing drafts and H3 voice/motion controls. It is not a production release or a claim that all live/human acceptance gates have passed. H4–H6 remain outside this work. Screenshot V1/V2 labels describe interface stages, not two completed releases.

- [User guide](user-guide.md): search, location, voice and limitations.
- [Developer setup](developer-setup.md): current globe app and earlier app startup.
- [Architecture](architecture.md): Vercel, Cloudflare, Supabase and providers.
- [Project structure](project-structure.md): current and earlier application folders.
- [Configuration](configuration.md): server settings, credentials and recorded models.
- [API reference](api-reference.md): current endpoint contracts and earlier API distinction.
- [Operations runbook](operations-runbook.md): the two Vercel projects and recovery steps.
- [Contributing](contributing.md): scope, consent and validation.
- [Screenshot progression](../PRODUCT_PROGRESSION.md).
- [Verification record](verification.md): dated evidence and pending live/human/device checks.
- [Project survey and historical context](../PROJECT_MAP.md).
- [Browser checks](../BROWSER_CHECKS.md).
- [Historical verification](../VERIFICATION.md).
- [Corrected Option B plan](../option_b_master_build_plan.md) and [retained product intent](../playful-globe-master-build-plan.md): read the current stack/status notes before their historical bodies.
- [Earlier Option A plan](../option_a_build_plan.md).

The initial globe source was merged into main in `90c3c42`; the guides followed in `ebb7c01`. New H1–H3 work is published on `h1-h2-h3`, without a `codex/` prefix. Both application generations remain in the repository. Publication of this branch does not update the Cloudflare Worker. See [README](../README.md).
