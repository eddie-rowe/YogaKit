# Parked for v0.2

This module (the three-stage `propose → constrain → validate` AI pipeline) is not part
of the v0.1 critical path. v0.1 is fully deterministic — see `docs/krama-v0.1-spec.md`
and constitution Principle III. This code is kept on disk, tested, and compiling because
it's the intended foundation for the v0.2 "Suggest" button, where AI may propose content
but the deterministic friction engine (`src/lib/friction/`) and validator-lite
(`src/lib/validator/`) stay downstream and authoritative.

Routes `/dimensions`, `/sequence`, `/sequences`, and `/api/generate` (which consume this
module) are unlinked from nav but not deleted, for the same reason.
