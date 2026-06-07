Partner login code account lookup fix 3

Fixes the inactive/test account fallback bug.

The previous fix still set resolvedUser to the first inactive-account match before the primary active account fallback ran. That caused the same skipped notification:

  Partner user matched, but no matching user is attached to an active or pending partner account. First matched account status: inactive.

This patch leaves resolvedUser null when all matched users are attached to inactive/suspended accounts, so the active partner account primary-email fallback can run.

SQL migration needed: No
Vercel ENV needed: No
