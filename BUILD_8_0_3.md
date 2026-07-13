# Build 8.0.3

Fixes Square OAuth redirects that could send a deployed Render user to localhost.

- Uses the actual request origin for all POS success and error redirects.
- Ignores a loopback SQUARE_REDIRECT_URI when the incoming request is deployed.
- Sends the same callback URI in Square authorization and token exchange.
- Adds a CI contract preventing localhost production redirects.
