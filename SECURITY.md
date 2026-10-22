# Security

cut runs media the user chose in the user's own browser. Its attack surface is
the file a model wrote and the assets it references.

Please report vulnerabilities privately through GitHub's security advisories
("Report a vulnerability" on the repository's Security tab) rather than in a
public issue. Include the file or asset that triggers the problem and the
package and commit you tested. You will get an acknowledgement within a week.

Things that count: a cut file that executes code outside the player's sandbox
expectations, an asset that crashes or escapes the decoder path, a source edit
(fold or bake) that rewrites parts of the file it was not asked to touch.

Things that do not: resource exhaustion from very large compositions, and
behaviour of third-party decoders that mediabunny or the browser already
document.
