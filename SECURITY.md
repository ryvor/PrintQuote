# Security policy

PrintQuote is currently designed for trusted, self-hosted environments. The authentication implementation is not yet hardened for direct public internet exposure.

**Do not report exploitable security vulnerabilities in public GitHub issues.** Contact the maintainer privately using GitHub's private vulnerability reporting feature, if enabled, or another private contact channel listed by the repository owner.

Until stronger session management and first-run provisioning are implemented, change the default administrator credentials immediately, restrict access to trusted networks, use HTTPS when accessed remotely, and back up SQLite before upgrades.

Only the latest release receives routine security fixes. No formal security response SLA is offered.
