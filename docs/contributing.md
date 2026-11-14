# Contributing guide

## Working agreement

This repository is deliberately small and documentation-driven. The code is treated as the source of truth for behavior, and documentation changes are expected whenever the application or deployment setup changes.

The project is not a large monorepo with many subsystems. The most important rule is simple: any document that describes product behavior must be checked against the current code before it is merged.

## Before you change docs

1. Read the relevant application code and confirm the actual behavior.
2. Check whether the documentation is stale or missing.
3. Update only the documentation files that are directly affected.
4. Keep the wording focused on what the product does and how to operate it.

## Scope of allowed changes

This repository’s scope is documentation-only in the current engagement. Do not edit product code, configuration, or deployment logic without a clear and separate change request.

Allowed changes:

- README and product docs
- architecture and runbook files
- configuration references and examples
- API documentation and setup guidance

Not allowed without explicit approval:

- deleting or replacing an existing teammate-authored guide without consent
- moving or renaming files that other docs may reference
- changing product behavior or runtime dependencies
- modifying CI, deployment manifests, or provider configuration outside the docs scope

## Documentation standards

- Write in clear, neutral project language.
- Do not invent features or workflows.
- Do not claim commands work unless they are present in the project scripts or config.
- Do not include real secrets or customer data.
- Keep product text aligned with the actual UI labels and API responses in the code.

## Documentation format

The project documentation lives in the `docs/` directory and the root `README.md`. Keep headers consistent and ensure that:

- every document is linked from the documentation index
- every cross-reference points to an existing file
- every page describes a real part of the project
- no document contains placeholder content such as `TBD`, `coming soon`, or empty sections

## Required reviews before publishing

When updating documentation:

- confirm the code still matches the documented behavior
- check the file path and links
- verify the commands in the setup guidance correspond to the repo scripts and manifests
- review the write-up for accuracy rather than style alone

## Branch and publishing language

The repository includes a shared line of work and deployment config, but the docs in this session are not a replacement for a team release process. The operating assumption is that all docs are published to the current branch or shared working line after review by the project owner.

## Local validation guidance

The project already includes automated checks for Python and frontend behavior. The documentation changes themselves do not require a product-code change, but they should be reviewed against the actual repo contents and any code or setup changes that happened since the last update.

## Practical maintenance rule

If the application behavior changes, update the docs in the same change set. Documentation drift is treated as a product defect in the same way as stale instructions or a missing setup guide.
