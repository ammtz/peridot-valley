# Access: OAuth + MFA research note

Task P23, sprint S4. This note picks the identity provider and says where its check sits on every way into the instance.

Decisions already made by the owner, taken as given: access is by OAuth and MFA only. One person, one folder, one instance on one VPS. The laptop joins over Tailscale. No open ports. Names match the sibling notes: the folder is `/srv/mero/`, the ledger is `data/ledger.db`.

## Functions in this layer

The access layer must do these jobs.

1. Prove who is calling the API, and refuse everyone else.
2. Make sure that proof includes a second factor (MFA), set at the identity provider or checked as a claim.
3. Protect the valley's live data. The valley's code is public. Its data is not.
4. Protect SSH to the VPS with no open port.
5. Protect the admin console of the network layer, and the git remote that backs up `/srv/mero/`.
6. Be swappable. No provider's name appears in the API's business code.

Today (from the P14 inventory): `mero serve` binds `127.0.0.1` with no auth and a CORS allow-list. Vercel previews sit behind Vercel sign-in. The public valley has its live feed off. The inventory found no OAuth or MFA at either commit.

Out of scope: building any of it (P33), the VPS provider (P15), the API framework (P16), creating any account.

## Options

Facts per option: how MFA is enforced and how the API verifies it; monthly USD cost at one person's use; covers the API; covers the valley in the browser; covers SSH to the VPS. Every cell was checked on the page named in it.

| Option | MFA enforced, and how the API verifies it | Cost per month, USD, one user | Covers the API | Covers the valley in the browser | Covers SSH to the VPS |
|---|---|---|---|---|---|
| A. Tailscale login via an IdP, API re-checks the tailnet identity | MFA is set at the identity provider (Google, GitHub, Apple, Microsoft, Okta, OneLogin or custom OIDC; list at https://tailscale.com/kb/1013/sso-providers, read 2026-10-04) and Tailscale uses it at login. Docs: https://tailscale.com/kb/1075/multifactor-auth, read 2026-10-04. The API sits behind `tailscale serve`, which adds a `Tailscale-User-Login` header for tailnet traffic only. The API accepts one allowed login and refuses a request with no header. Docs: https://tailscale.com/kb/1312/serve, read 2026-10-04. The API sees who, not which factor. | 0. Personal plan is $0, up to 6 users. https://tailscale.com/pricing, read 2026-10-04. | Yes | Yes, for a browser on the tailnet. A browser off the tailnet cannot reach the API. | Yes. Tailscale SSH uses tailnet identity, needs no open port, and is on all plans. https://tailscale.com/kb/1193/tailscale-ssh, read 2026-10-04. |
| B. Cloudflare Tunnel + Access, API verifies the Access JWT | A Require rule on "Authentication Method" checks the MFA method, if the IdP supports it. The check is at login only. Docs: https://developers.cloudflare.com/cloudflare-one/policies/access/, read 2026-10-04. The API verifies the `Cf-Access-Jwt-Assertion` header: signature from the team's certs endpoint, `iss`, and the application `aud` tag. Docs: https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/, read 2026-10-04. | 0. Free plan is "$0 forever", for teams under 50 users. https://www.cloudflare.com/sase/products/access/, read 2026-10-04. | Yes | Yes, from any browser, with no tailnet needed. Needs a public hostname on Cloudflare, and `cloudflared` makes an outbound-only connection (https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/, read 2026-10-04). | No. Not evaluated here. SSH would stay on Tailscale, so this adds a second system. |
| C. Direct OIDC in the API (Google ID token, or oauth2-proxy in front) | Google can put an `amr` claim in the ID token, with values such as `mfa`. It appears only when requested and enabled in settings, so the API cannot rely on it. Without it, MFA is an account setting. Docs: https://developers.google.com/identity/openid-connect/openid-connect, read 2026-10-04. The API checks signature (JWKS), `iss`, `aud` and `exp` on each token. Same page. oauth2-proxy supports Google and GitHub as providers: https://oauth2-proxy.github.io/oauth2-proxy/, read 2026-10-04. | 0. Google's OpenID Connect page states no price. oauth2-proxy is open source and runs on the VPS. https://oauth2-proxy.github.io/oauth2-proxy/, read 2026-10-04. | Yes | Yes, from any browser, if the API is reachable from the internet. That breaks "no open ports" unless it sits behind a tunnel. | No |

The five criteria, one row per option:

| Option | Solo maintainer | Low ops | Cheap to run | Swappable parts | Fits Python backend + JS frontend |
|---|---|---|---|---|---|
| A. Tailscale + IdP | Yes. One owner account and one IdP login. | Low. One daemon on the VPS and one `tailscale serve` setting. No port to open. | $0 on the Personal plan. | Yes. The API reads one login string. The IdP behind Tailscale can change in the admin console. | Yes. One header read in Python. No auth code in the JS. |
| B. Cloudflare Tunnel + Access | Yes, but adds a second system beside Tailscale, which SSH still needs. | Medium. `cloudflared`, a hostname, a policy and JWT checks, besides Tailscale. | $0 on the Free plan. | Partly. The JWT check sits in the API and ties it to Cloudflare. | Yes. JWT check in Python. The browser follows Cloudflare's login redirect. |
| C. Direct OIDC | Yes, but the owner's code holds the sign-in flow. | High. Token checks, sessions, key refresh and an internet-facing API or a tunnel. | $0 in fees, but costs build and upkeep time. | Yes in principle. Any OIDC provider fits, but the code is the owner's to keep. | Yes. Python verifies tokens. JS needs a login flow. |

## Pick

**Option A: Tailscale, signed in through an identity provider with MFA, and the API re-checks the tailnet identity.**

One system covers the API, the SSH and the admin console. It costs $0. It adds no port to the VPS. The API keeps its own check, so the tailnet is not the only wall.

Config shape. The API listens on loopback only, as `mero serve` does today. `tailscale serve` publishes it to the tailnet over HTTPS:

```
tailscale serve --bg 8000
```

The port is an example. `--bg` keeps Serve running after a reboot or a `tailscale down` and `up`. `tailscale serve` shares with the tailnet only. Do not use `tailscale funnel`: Funnel is public and carries no identity headers (https://tailscale.com/kb/1312/serve, read 2026-10-04).

Every way in:

| Way in | Check | OAuth + MFA, and how |
|---|---|---|
| API | Request must arrive over the tailnet. The API then checks `Tailscale-User-Login` against the one allowed login. A missing or different value gives 401. | The tailnet login is an OAuth sign-in at the IdP. MFA is the IdP's setting for that account. The API sees the login, not the factor. |
| Valley in the browser | The valley's code stays public on Vercel. Its live data comes from the API, so the browser must be on the tailnet to read it. | Same tailnet login and IdP MFA. The API's CORS allow-list stays as today. |
| SSH to the VPS | Tailscale SSH, on the tailnet only. No port 22 open to the internet. The tailnet policy's SSH rule must use `"action": "check"` with a check period. With plain `"accept"` the owner gets no fresh IdP sign-in at connect time. https://tailscale.com/kb/1193/tailscale-ssh, read 2026-10-04. | Check mode re-runs the IdP sign-in, so MFA is asked again. |
| Tailscale admin | The admin console signs in through the same IdP. | OAuth at the IdP, with the IdP's MFA. |
| Git remote | The GitHub account's own 2FA guards sign-in and account settings. Pushes use SSH keys, which 2FA does not change, or a personal access token over HTTPS. https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/accessing-github-using-two-factor-authentication, read 2026-10-04. | GitHub requires 2FA for code contributors (https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/about-two-factor-authentication, read 2026-10-04). The push credential itself is a key or token, so keep it passphrase-protected or short-lived. The VPS push (the timer job that pushes `results/`) uses the repo-scoped deploy key from P19. MFA does not cover it. Its limits: it opens one repo only, it is held only on the VPS, and it is rotated if the VPS is rebuilt. |
| Laptop worker to API | The worker reaches the API over the tailnet. Serve does not populate the identity headers for traffic from tagged devices (https://tailscale.com/kb/1312/serve, read 2026-10-04), so a tagged laptop would be refused. Option one: keep the laptop an untagged device signed in as the owner, so it gets the header. Option two: the API asks the local Tailscale daemon who the peer is. The LocalAPI can return which node made the request and which user or tags own it (https://tailscale.com/docs/concepts/tailscale-identity, read 2026-10-04). P33 to confirm which one, and test it. | The owner's IdP login on that device, with the IdP's MFA. |

What the browser can and cannot see without login. The static valley loads for anyone. On the deployed site the live feed is off, so a visitor sees only the simulated town. A browser off the tailnet cannot reach the API, so it gets no ledger data. A browser on the tailnet, signed in by the owner, sees live data.

## Rejected

**Option B, Cloudflare Tunnel + Access.** It is free, it checks MFA by policy, and any browser can reach it with no tailnet. That is a real gain for the valley. It loses because it covers no SSH, so Tailscale stays and there are two systems to run. It also puts a public hostname in front of the instance. The owner decided on Tailscale already. It stays the nearest swap, see below.

**Option C, direct OIDC in the API.** It has no extra vendor. It loses because the API cannot count on an MFA claim: Google's `amr` claim appears only when requested and enabled, so MFA would rest on an account setting the API cannot see. It also needs the API reachable from the internet, or a tunnel, which breaks "no open ports". It covers no SSH. It puts token code in the API, and P33 would build and maintain it.

## Why

- Solo maintainer, low ops: one system covers three of the five ways in, and the other two are the IdP's and GitHub's own sign-in.
- Cheap: $0 on the Personal plan, for one person.
- No open ports: Tailscale SSH and `tailscale serve` use the tailnet only.
- Swappable: the API reads one identity (a login string) from one place. It does not parse tokens, so the source of that string can change.
- Python backend, JS frontend: the check is one header read in the API, and the frontend needs no auth code.
- The honest gap: MFA is enforced at the IdP, not by the API. The API cannot prove a factor was used. The owner must turn MFA on at the IdP and keep it on. P33 should write this as a checklist item.

Header spoofing. Serve removes the identity headers if it finds them on an incoming request, to avoid spoofing. Its docs also say it is best practice to listen only on localhost, because anyone who can call the service directly could supply their own values (https://tailscale.com/kb/1312/serve, read 2026-10-04). Residual risk: any process on the VPS can call the loopback port with a forged header. So the VPS must run only trusted services.

## Swap-out path

1. The API reads identity through one function, `current_login(request)`, that returns a string or nothing. Nothing else in the API knows how.
2. To move to Option B: put the `Cf-Access-Jwt-Assertion` check inside that one function, run `cloudflared` for the API hostname, and keep Tailscale for SSH.
3. To move to Option C: verify an ID token inside that function (signature, `iss`, `aud`, `exp`).
4. The allowed-login setting and the CORS allow-list stay in config. They do not change.
5. Change the IdP behind Tailscale in the Tailscale admin console. No API change.

## Sources

All read 2026-10-04.

- https://tailscale.com/pricing
- https://tailscale.com/kb/1075/multifactor-auth
- https://tailscale.com/kb/1013/sso-providers
- https://tailscale.com/kb/1193/tailscale-ssh
- https://tailscale.com/kb/1312/serve
- https://tailscale.com/docs/concepts/tailscale-identity
- https://www.cloudflare.com/sase/products/access/
- https://developers.cloudflare.com/cloudflare-one/policies/access/
- https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/
- https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
- https://developers.google.com/identity/openid-connect/openid-connect
- https://oauth2-proxy.github.io/oauth2-proxy/
- https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/about-two-factor-authentication
- https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/accessing-github-using-two-factor-authentication
