# Tools: how MERO's tools run as MCP servers

Status: research note for sprint S4, Goal B (task P22). Date read for every price and spec claim: 2026-10-04.

The owner decided the frame. Tools are MCP servers. A spec names the tools a team gets. The folder and the API live on one VPS. The laptop is a worker over Tailscale and opens no ports. This note does not question that frame. It compares ways to run the tool servers inside it.

The five criteria come from the sprint brief: solo maintainer, low ops, cheap to run, swappable parts, fits a Python backend plus a JS frontend.

## Functions in this layer

The tools layer does five jobs.

1. Offer a fixed list of tools to a worker. A worker can use only what its spec grants.
2. Run each tool call in the worker's own worktree.
3. Pass every call through the policy first (`mero/policy.py`). Reads run, writes and network calls ask, destructive and unknown calls are denied.
4. Log every call. Each call lands as a `tool.call` event and a `tool.result` event. Each ruling lands as `policy.rule`, and each side effect as `policy.effect`.
5. Keep a blueprint's tools a subset of the supervisor's tools (MERO v2.1).

Today's code (MERO at 20b1ab3) does this in-process. The names below are the real ones.

- `mero/policy.py` holds the `TOOLS` table: `read`, `list`, `grep`, `glob`, `stat` (class read); `write`, `edit`, `mkdir` (class write); `fetch`, `http` (class network); `delete`, `rmtree`, `move` (class destructive). Any other name is unknown and denied.
- Shell commands go in as the tool `run`, with `cmd` as a list of strings, never a shell string. `run` is classed by its program (`git` by subcommand, plus the `DESTRUCTIVE_CMDS`, `NETWORK_CMDS` and `READ_CMDS` sets). Interpreters and shells are unknown, so denied.
- `mero/worker.py` edits with SEARCH/REPLACE blocks and writes the result as a `write` action. It runs the task's verify commands as `run`. Both go through `ctx.guard(action, fn)`.
- `mero/supervisor.py` is the only actor that rules (L2). It also saves the patch (`write`) and merges (`run` of `git merge`).
- `mero/vocab.py` fixes the event shapes: `tool.call` is `{tool: str, args: dict}` and `tool.result` is `{exit: int}` plus optional `digest` and `pointer`.
- `mero/blueprints.py` lets a blueprint carry an optional `tools` key. Nothing enforces it yet.

One gap in today's code. I found one `tool.call` emit site in `mero/worker.py`, and it is for `run`. A `write` is ruled and logged as `policy.rule` and `policy.effect`, but I found no `tool.call` for it.

Out of scope: the spec format (P21), access and identity (P23), and any code change.

## Options

All four options keep the policy as the single gate. They differ in how a call gets from the worker to the code that does the work.

| Option | Solo maintainer | Low ops | Cheap to run | Swappable parts | Fits Python backend and JS frontend |
|---|---|---|---|---|---|
| A. Today's in-process tools behind `policy.py` | Yes. Nothing new to learn. | Lowest. No extra process. | Yes. $0. | No. Tools are Python functions inside the worker, so no other client can use them. | Yes for Python. The JS valley never calls tools. |
| B. Stdio MCP servers, spawned by the worker | Yes. Small servers, one SDK. | Low. No port, no daemon. The worker starts and stops them. | Yes. $0. | Yes. Any MCP server replaces any one of them. The same server code also runs over HTTP. | Yes. Python SDK for the servers. A JS client can spawn the same servers. |
| C. One Streamable-HTTP MCP server on the VPS, reached over the tailnet | Partly. One more long-running service and its auth to look after. | Medium. A service, a unit file, auth. | Yes. $0. | Yes. Any MCP client can reach it. | Yes. Python server, any client. |
| D. A gateway that fronts several MCP servers | Partly. A third layer to learn. | Medium to high. Gateway plus each server behind it. | Yes. $0. | Yes for servers behind it. The gateway itself becomes the part that is hard to swap. | Yes. Python library. |

Transport, place, dependencies, price and the policy answer, one row each.

| Option | Transport | Runs on | Added dependencies | Monthly cost at one person's use, source, date read | Every call still passes `mero/policy.py` and lands as `tool.call` and `tool.result`? |
|---|---|---|---|---|---|
| A | Python function call, no wire | Where the worker runs: VPS or laptop | None | $0. Python is under the PSF license, which is royalty-free. Source: https://docs.python.org/3/license.html, read 2026-10-04. | Yes. The worker already calls `ctx.guard`, which rules first and runs second. Today `tool.call` exists for `run` only (see Functions), so `write` needs the same emit added. |
| B | stdio. The worker launches each server as a subprocess and talks over stdin and stdout. | Where the worker runs: a VPS worker spawns VPS servers, a laptop worker spawns laptop servers. | The `mcp` package, which needs Python 3.10 or newer. | $0. The Python SDK is MIT licensed. Source: https://github.com/modelcontextprotocol/python-sdk, read 2026-10-04. | Yes. The worker is the MCP client, so it holds the wire. A thin wrapper in the worker calls `guard` before it sends `tools/call`, then emits `tool.call` before and `tool.result` after. The server has no other caller and no ledger link, so it cannot skip the gate. |
| C | Streamable HTTP to one endpoint, reached over Tailscale. The server binds `127.0.0.1` and `tailscale serve` exposes it to the tailnet only. | The tool server on the VPS. Laptop and VPS workers are clients. | `mcp`, plus Tailscale on both ends, plus a service unit and some auth. | $0. Tailscale Personal is "$0 Free forever" with unlimited user devices. Source: https://tailscale.com/pricing, read 2026-10-04. | No, not by itself. Any tailnet device that can reach the endpoint can call a tool with no ruling. It becomes yes only if every worker also goes through the wrapper from B and the endpoint demands auth (P23). |
| D | stdio or Streamable HTTP in front, any transport behind. | The gateway on the VPS. Servers behind it on the VPS or laptop. | `fastmcp` plus `mcp`, plus the C pieces if any server sits across the tailnet. | $0. FastMCP is Apache-2.0. Source: https://github.com/jlowin/fastmcp, read 2026-10-04. | No, not by itself. A gateway namespaces tools and merges servers. It knows nothing of MERO's rulings or ledger. The gate would have to be written inside it, in a process that does not hold the L2 writer. |

The spec says what each transport asks of its operator.

- stdio: "The client launches the MCP server as a subprocess." and "Clients SHOULD support stdio whenever possible." (https://modelcontextprotocol.io/specification/2025-06-18/basic/transports, read 2026-10-04).
- Streamable HTTP: servers "MUST validate the Origin header on all incoming connections", "SHOULD bind only to localhost (127.0.0.1)" and "SHOULD implement proper authentication for all connections" (same page).
- The latest spec revision, 2026-07-28, still defines exactly these two standard transports. It drops the connection-scoped session handshake for per-request metadata (https://modelcontextprotocol.io/specification/2026-07-28/basic/transports, read 2026-10-04). A server written now should target the latest revision and keep the older one only for old clients.

### Every tool today mapped to a server

Three servers carry everything. The names are proposals. None exists yet. Each runs on the same machine as the worker that spawned it.

| Tool or action class today | Class and verdict in `policy.py` | MCP server | Where it runs |
|---|---|---|---|
| `read` | read, allow | `mero-fs` | Worker's machine (VPS or laptop) |
| `list` | read, allow | `mero-fs` | Worker's machine |
| `grep` | read, allow | `mero-fs` | Worker's machine |
| `glob` | read, allow | `mero-fs` | Worker's machine |
| `stat` | read, allow | `mero-fs` | Worker's machine |
| `write` (worker's SEARCH/REPLACE result, supervisor's patch save) | write, ask with the diff | `mero-fs` | Worker's machine, inside its worktree |
| `edit` | write, ask with the diff | `mero-fs` | Worker's machine, inside its worktree |
| `mkdir` | write, ask with the diff | `mero-fs` | Worker's machine, inside its worktree |
| `delete` | destructive, deny | `mero-fs` | Worker's machine. Registered so the call is ruled and logged. A deny means the server code never runs. |
| `rmtree` | destructive, deny | `mero-fs` | Same as `delete` |
| `move` | destructive, deny | `mero-fs` | Same as `delete` |
| `fetch` | network, ask | `mero-net` | Worker's machine |
| `http` | network, ask | `mero-net` | Worker's machine |
| `run` with `cmd` a list (worker's verify commands, supervisor's `git merge`, git, `rg`, `ls`, the rest of the program sets) | by program: read allow, write ask, network ask, destructive deny, unknown deny (shells and interpreters) | `mero-run` | Worker's machine, inside its worktree. Started from a list, with no shell. |
| Any name not in the rows above (unknown) | unknown, deny | None, on purpose | Never reaches a server. The gate denies it and logs `policy.rule`. |

14 tools mapped, 0 unmapped. Count: `mero-fs` 11, `mero-net` 2, `mero-run` 1. The last row is the rule for names that do not exist, not a tool.

How a spec grants a tool to a team. The spec lists tool names. The host connects only the servers that carry those names, and it lists only those tools to the model. That list must be a subset of the supervisor's tools. The gate still rules each call by name, so a model that asks for a tool outside its list gets a denial in the ledger, not a silent failure. Names only. The spec format is P21. For illustration:

```
tools = ["read", "grep", "edit", "run"]
```

## Pick

**Option B: stdio MCP servers, spawned by the worker.**

The worker becomes the MCP client. It spawns `mero-fs`, `mero-net` and `mero-run` as subprocesses, only the ones its spec names. A wrapper in the worker does this for every call:

1. `gate(...)` on the tool and its args (`mero/policy.py`). This writes `policy.rule` and, for an ask, `approval.ask`.
2. Emit `tool.call`.
3. If cleared, send `tools/call` to the server. If not, send nothing.
4. Emit `tool.result` and the `policy.effect` with the exit code.

The servers hold no ledger and no policy. They do their one job and exit when the worker closes stdin. Each server still checks its own inputs. `mero-run` starts programs from a list with no shell. `mero-fs` refuses any path outside `--root`, the worker's worktree.

Spawn each server from a list, never a shell string. A proposed shape, illustrative only:

```
command = ["uv", "run", "mero-tools-fs", "--root", "<worktree>"]
```

Install: `uv add "mcp[cli]"` (from the SDK page, read 2026-10-04).

Cost: $0 a month. Nothing new runs when the worker is idle.

## Rejected

**Option C: one Streamable-HTTP server on the VPS over the tailnet.** It is the shape the owner's frame points at, so it was the closest call. It fails today on three counts. First, it opens a port inside the tailnet, and the spec asks the operator to check `Origin`, bind to `127.0.0.1` and add authentication. That auth is the task of P23, which is not decided. Second, any tailnet device that can reach the endpoint can call a tool with no ruling, which breaks the rule that every call passes `policy.py`. Third, the laptop worker edits a worktree on the laptop, and a server on the VPS cannot reach that disk, so it would serve only VPS-side work. C stays open as the path for any tool that must sit next to the folder (see Swap-out path).

**Option D: a gateway that fronts several servers.** A gateway solves a problem MERO does not have yet. It earns its place when many clients need one endpoint to many servers. Here there is one client (the worker) and three small servers. It adds a third process to run and a third thing to secure. It also does not know MERO's rulings, so the gate would have to be written inside it, away from the L2 writer that holds the ledger. FastMCP's proxy can be added later, in front of any HTTP servers that exist by then.

Option A (today's in-process tools) is the baseline, not a rejected option. It works and costs nothing. It is not picked because the owner decided tools are MCP servers, and in-process functions cannot be handed to a spec as swappable parts.

## Why

- Solo maintainer. B adds three small servers and one wrapper. C and D add services and auth that the owner must keep patched.
- Low ops. A stdio server has no port, no unit file and no daemon. The worker starts it and ends it. Nothing is left running when a job ends.
- Cheap to run. Every option costs $0 at one person's use. B also adds no always-on process.
- Swappable parts. The MCP SDK runs one server over either transport. The SDK page gives `uv run mcp run server.py --transport streamable-http` for HTTP. So B's servers move to C unchanged, and any of them can be replaced by a third-party MCP server that speaks stdio.
- Python backend plus JS frontend. The servers and the wrapper are Python, as the rest of MERO is. The valley reads the ledger over `mero serve` and never calls a tool.
- The policy stays the single gate. In B the worker holds the wire to the server, so no call reaches a server without a ruling. In C and D that is a property to build, not one we get for free.
- It closes the gap above. Every call gets a `tool.call` and a `tool.result`, not only `run`.
- The laptop opens no port. A laptop worker spawns its own servers, so nothing listens on the tailnet.

Weak point to watch: a stdio server runs with all the OS rights of its worker. The gate is only as good as the wrapper that forwards cleared calls and nothing else. The wrapper is small enough to test with the same deny cases as `policy.py`.

## Swap-out path

Move one server at a time. Nothing else changes.

1. Pick the server that must sit beside the VPS folder. Run it over HTTP: `uv run mcp run server.py --transport streamable-http`. The SDK page says this listens on `http://localhost:8000/mcp`.
2. Keep it on loopback. Put it on the tailnet only with `tailscale serve --bg localhost:8000`. Do not run `tailscale funnel`, which is the public form. Check the flags against the Tailscale serve page before use (https://tailscale.com/kb/1242/tailscale-serve, read 2026-10-04).
3. Point the wrapper at the URL for that server instead of spawning it. The wrapper still gates every call, so the policy answer stays yes. Add auth first (P23) and make the server check `Origin`.
4. If many clients ever need one endpoint, put FastMCP's proxy in front (`create_proxy` over a config of servers, per https://gofastmcp.com/servers/proxy, read 2026-10-04). This is the D step, taken later, with a reason.
5. To go back to A, call the same function in-process behind `guard`. The wrapper is the only seam.

## Sources

All read 2026-10-04.

- MCP specification, transports, revision 2025-06-18: https://modelcontextprotocol.io/specification/2025-06-18/basic/transports
- MCP specification, transports, revision 2026-07-28 (latest): https://modelcontextprotocol.io/specification/2026-07-28/basic/transports
- MCP Python SDK (package `mcp`, MIT, Python 3.10+, install and run commands): https://github.com/modelcontextprotocol/python-sdk
- FastMCP (Apache-2.0): https://github.com/jlowin/fastmcp
- FastMCP proxy and multi-server mounting: https://gofastmcp.com/servers/proxy
- Tailscale pricing, Personal plan: https://tailscale.com/pricing
- Tailscale serve: https://tailscale.com/kb/1242/tailscale-serve
- Python license (cost of option A): https://docs.python.org/3/license.html
- Code read at MERO 20b1ab3: `mero/policy.py`, `mero/worker.py`, `mero/supervisor.py`, `mero/vocab.py`, `mero/blueprints.py`.
- Today's tool list and layers: the P14 inventory, `docs/architecture/inventory.md` on peridot-valley main.
