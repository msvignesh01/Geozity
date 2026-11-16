# Geozity documentation

Updated 16 November 2026 against the tested source on `main`. Hosting observations below are dated separately from local tests.

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

Historical root plans and evidence guides listed in `.gitignore` remain local-only. Their original contents are not modified or published by this correction. The README was already tracked before the last implementation commit; its previously published version is retained unchanged.

The initial globe source was merged into main in `90c3c42`; the guides followed in `ebb7c01`. H1–H3 work is maintained directly on `main`, without a separate publication branch. Both application generations remain in the repository. Publishing source does not update the separately hosted Cloudflare Worker. See [README](../README.md).
