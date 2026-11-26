# Community submissions and strict metadata checks

NeuralBank remains a small learning tool. Contributors can propose edits to an existing architecture and report scores from their own benchmark runs. The user explicitly chose format and evaluation-condition checking for this version.

Keep the current personal dashboard and Apple-inspired interface. Add a contribution workspace and contextual editing/reporting entry points. Show self-reported submissions with separate format, review, and reproduction statuses; never merge them automatically into the curated paper results.

## Approach

Use one dependency-free validator in the browser, server and CLI, plus a versioned JSON Schema. This provides fast field-level feedback and mandatory server-side revalidation. A browser-only checker cannot protect the stored data; automatic execution of contributed code is outside this version's scope. Contributions enter an immutable pending queue and are incorporated through maintainer review of source changes.

Benchmark reports identify the exact model/code revision, numeric metric, dataset version and split, evaluation recipe, training/configuration, environment, command, configuration link and log link. A checkpoint URL and checksum are an optional pair. Model edits allow only documented teaching-content fields and require sources and rationale. Reject unknown fields and client-written verification/approval states. A successful check establishes structural completeness, not scientific validity or reproduction.

## Delivery and access

Hosted writes use the existing Sites identity. Local preview stores explicitly local guest submissions separately from production data. No arbitrary code runs, commands or URLs are fetched during validation. Preserve personal learning data and existing migrations. Keep the existing hosting project ID; its connector currently reports NOT_FOUND. Prepare an MIT-licensed public source repository and pull-request checks without publishing personal runtime data or credentials. The public repository and hosted website are separate delivery outcomes.
