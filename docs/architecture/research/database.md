# Database: where the ledger lives

Status: research note for sprint S4, Goal B. Date read for every price and capability claim: 2026-10-04.

The owner decided the frame. The event log is append-only SQLite. It lives in one folder on one VPS. One person, one folder, one instance. Notion stays until migration ends, then it is retired. Backups are git and SQLite backups. This note does not question that frame. It compares ways to enforce append-only, back up and restore the file, and move Notion's data into it.

## Functions in this layer

The database layer does five jobs.

1. Hold the ledger. Every thought, tool call, hop and dollar is one row in the `events` table, in order.
2. Refuse rewrites. Nothing is updated or deleted, and the file itself enforces that.
3. Allow one writer. A second writer is refused. Readers never block.
4. Feed the views. Costs, tasks, runs, moods and blueprints are folds over the rows (`mero/views.py`). Nothing else is stored.
5. Survive loss. The file must be backed up while the writer runs, and a restore must be provable.

Today's code (`mero/ledger.py`, commit 20b1ab3) does 1 to 4. It does not do 5.

How it enforces append-only today. The schema creates two triggers on `events`:

```
CREATE TRIGGER IF NOT EXISTS events_no_update BEFORE UPDATE ON events
    BEGIN SELECT RAISE(ABORT, 'the ledger is append-only: no updates'); END;
CREATE TRIGGER IF NOT EXISTS events_no_delete BEFORE DELETE ON events
    BEGIN SELECT RAISE(ABORT, 'the ledger is append-only: no deletes'); END;
```

The rule is a property of the file, not a promise of the code. The one write path is `Ledger.accept`, which validates a proposal and appends it. A refusal is itself appended as a `refused` event. The one writer holds an OS lock on `<db>.writer.lock`. The file runs in WAL mode with `synchronous=NORMAL`.

The valley (the Peridot Valley front end) keeps its own saved state in the browser. It reads the ledger over `mero serve`, which is read-only.

## Options

All four options are SQLite. The five criteria come from the sprint brief: solo maintainer, low ops, cheap to run, swappable parts, fits a Python backend plus a JS frontend.

| Option | Solo maintainer | Low ops | Cheap to run | Swappable parts | Fits Python backend and JS frontend |
|---|---|---|---|---|---|
| A. Keep `mero/ledger.py` as-is, file in the VPS folder, no backup tool | Yes. Nothing new to learn. | Lowest now. But loss of the disk loses the ledger, so the work moves to the owner's memory. | Yes. No added cost. | Yes. One file, standard SQLite format. | Yes. Python writes; the valley reads over `mero serve`. |
| B. As-is plus a timer that runs `VACUUM INTO` and ships the copy off the box | Yes. One timer, one script. | Low. One cron or systemd timer, no daemon. | Yes. Storage stays inside a free tier. | Yes. Copy tool and target are each replaceable. | Yes. Same as A. |
| C. As-is plus Litestream streaming the file to object storage | Yes. One config file and one service. | Low. One extra long-running process. | Yes. Storage stays inside a free tier. | Yes. Litestream only reads the file; remove it and the app is unchanged. | Yes. Same as A. Litestream is a separate process, so no code change. |
| D. As-is moved onto LiteFS | Partly. A FUSE file system and a lease to learn for one node. | No. Highest of the four. | Yes in dollars. High in attention. | Weak. The app's file now lives inside the LiteFS mount. | Yes, but it adds nothing for one node. |

What each option does on append-only, on backup, and on cost.

| Option | Append-only model carries over unchanged? | Backup without stopping the one writer | Monthly cost at one person's use, source, date read |
|---|---|---|---|
| A | Yes. No code or schema change; the two triggers and the writer lock stay as they are. | None built in. A plain file copy of `ledger.db` while the writer runs can miss the WAL and give a broken copy. The only safe manual copy is `sqlite3 ledger.db ".backup copy.db"` or `VACUUM INTO`, run by hand. | $0 added. The VPS is already inside the owner's $5 to $10 budget (priced in the hosting note). SQLite is public domain, so the software costs $0 (https://www.sqlite.org/copyright.html, read 2026-10-04). |
| B | Yes. `VACUUM INTO` writes a new file and leaves the original unchanged. The copy carries the triggers, because the schema is copied with the data. | `VACUUM INTO` is transactional, and the output is a consistent snapshot. Unlike plain `VACUUM`, it works with other connections holding locks. Source: https://www.sqlite.org/lang_vacuum.html, read 2026-10-04. Off-site copy goes to object storage. | $0 added while the copies stay under 10 GB, which Backblaze B2 stores free. Beyond that, B2 is $6.95 per TB per month. Source: https://www.backblaze.com/cloud-storage/pricing, read 2026-10-04. |
| C | Yes. Litestream copies WAL pages through the SQLite API and does not change the schema, so the triggers are replicated as part of the file. Source for how it works: https://litestream.io/how-it-works/, read 2026-10-04. | Litestream runs as a separate process. It holds a long-running read transaction and does the checkpoints itself, so the app keeps writing. Source: https://litestream.io/how-it-works/, read 2026-10-04. `ledger.py` already uses WAL mode, which Litestream needs. | $0 added for the software. The site says it costs "pennies per day" in object storage (https://litestream.io/, read 2026-10-04). Storage under 10 GB is free on B2, then $6.95 per TB per month (https://www.backblaze.com/cloud-storage/pricing, read 2026-10-04). |
| D | Yes. LiteFS is a pass-through file system that copies out the page set of each transaction, so the schema and triggers are not altered. Source: https://docs.fly.io/litefs/how-it-works, read 2026-10-04. | LiteFS replicates between nodes. Its own docs say to keep regular off-site backups, so it does not replace one. Source: https://docs.fly.io/litefs, read 2026-10-04. | $0 for the software, which is Apache-2.0 (https://github.com/superfly/litefs/blob/main/LICENSE, read 2026-10-04). The page says it is pre-1.0 and that the vendor cannot give support. Source: https://docs.fly.io/litefs, read 2026-10-04. Off-site backup is still needed, so the real cost is C's cost plus more work. |

The ledger size is small. It is text rows for one person. I did not measure it, so the "under 10 GB" claim is an estimate to check once the VPS holds real data.

## Pick

**Option C: keep `mero/ledger.py` unchanged, put the file in the VPS folder, and stream it with Litestream to object storage.**

Restore check, run on any machine with the replica credentials. `--db` comes before the subcommand, as in `mero/cli.py`:

```
litestream restore -o restored.db <replica-url>
python -m mero --db restored.db replay
```

`litestream restore -o PATH REPLICA_URL` is documented at https://litestream.io/reference/restore/ (read 2026-10-04). `python -m mero replay` checks that every event is valid, each `parent` is an earlier event, and the views folded one at a time equal the views folded at once. It does not check that nothing is missing from the end. For completeness, the restored file's `SELECT count(*) FROM events` and the views digest that replay prints must match the live ledger's at the restore point. It prints `REPLAY REPRODUCES THE LOG` and exits 0 on success, and exits 1 on any problem.

Commands that show an UPDATE or DELETE on the events table is refused. First a read-only check that lists the triggers. It must print `events_no_update` and `events_no_delete`:

```
sqlite3 -readonly restored.db "SELECT name FROM sqlite_master WHERE type='trigger'"
```

Then try the writes on a throwaway copy, never on the restored file:

```
cp restored.db probe.db
sqlite3 probe.db "UPDATE events SET kind='note' WHERE seq=1;"
sqlite3 probe.db "DELETE FROM events WHERE seq=1;"
rm probe.db
```

Expected output is an error from the triggers quoted above: `the ledger is append-only: no updates` and `the ledger is append-only: no deletes`. This proves the restored file still carries the triggers, and `restored.db` is never touched.

One limit to state plainly. The triggers stop a normal UPDATE or DELETE. They do not stop someone with write access to the file from running `DROP TRIGGER`. The trigger listing above would catch a missing trigger, and the probe statements would then succeed. Run it on every restore.

### Where the Notion data goes

The four Notion databases are Tasks, Sprints, Projects and the Knowledge Vault, confirmed from the relations on the Tasks database. Each is mapped below.

| Notion database today | Replacement after migration | Status in `mero/vocab.py` (20b1ab3) |
|---|---|---|
| Tasks | Events with a `task` id. The mapping of each property is in the next table. | Exists, plus one new kind (`task.meta`). |
| Sprints | New event kinds `sprint.open` and `sprint.close`, folded into a sprints view. Goal, carried over and retro live in the `body`. `run.start` already takes an optional `sprint` field. | New kinds needed. No code change in this note. |
| Knowledge Vault | New kinds `knowledge.write` and `knowledge.retire`, folded like blueprints are today (`blueprint.write`, `blueprint.retire`). Each row becomes one event; a revision is a new event, never an edit. | New kinds needed. |
| Projects (each project's Next action) | New kind `project.write` carrying the next action; the latest event per project is the current row. | New kind needed. |

Tasks, property by property. The ledger's task states are todo, doing, verify, done, failed, killed (`mero/vocab.py`, 20b1ab3). A new task starts as todo.

| Notion Tasks property | Ledger |
|---|---|
| Status = inbox | `task.new`, then `task.meta` with `stage: inbox`. |
| Status = todo | `task.new` only. The fold starts it as todo. |
| Status = doing | `task.new`, then `task.state` doing. |
| Status = blocked | `task.state` stays at todo or doing. A `task.meta` event with `blocked: <reason>` records the block. The ledger has no blocked state. |
| Status = done | `task.state` done. |
| Status = dropped | `task.state` killed, with `reason: dropped`. |
| Claimed by (for example `claude-code dispatch/sonnet 2026-10-04`) | `task.assign`, sent by `l2:migrate`, since only `jev` or `l2` may send it. Split the text at spaces. The first part, lower-cased, becomes the actor id `l1:claude-code`, which fits the `role` or `role:name` pattern in `vocab.py`. The middle part (`dispatch/sonnet`) goes into the optional `reason` field. The date becomes the event's `at`, set by the migration ingest, the one path allowed to supply `at`. A claim by the owner becomes `you`. |
| Waiting on (values: the owner, Agent, External, Nobody) | The owner: an `approval.ask` with its `what` field, sent by `l2:migrate`, because only `vic`, `jev`, `l2`, `l1` and `l0` may send it. Agent and Nobody: no event, since they follow from the task's state and assignee. External: a `task.meta` field `waiting: external`. `approval.give` is not migrated, because it needs the `seq` of an earlier `approval.ask`. |
| Type, Due, Where | A new kind `task.meta`. Its `body` holds `type`, `due` and `where`. `task.new` takes only `title`, `estimate_tokens` and `tier`, so these cannot go there. A later change is a new `task.meta` event. |
| Sprint, Project (relations) | The task's sprint and project ids in `task.meta`. |
| Comments | `note` events. |

Two points on this mapping. A "latest event wins" fold gives an editable-looking row on top of an append-only table. History stays whole. Nothing here adds a second table; the fold is in `views.py`.

### The valley's saved state, and one store or two

The valley's saved state stays in the browser for now. It is per-device and has no other reader. If it moves server-side later, it should go into the same ledger as a `valley.save` event kind, not into a second database. One file, one writer, one backup. The valley already reads the ledger over `mero serve`, so the read path exists.

## Rejected

**D. LiteFS.** LiteFS is a distributed file system that replicates SQLite across nodes. This setup has one person, one instance and one VPS, so there are no other nodes to replicate to. It would still need a FUSE mount and a primary lease to run. Its docs call it pre-1.0, say the vendor cannot give support or guidance, and tell users to take off-site backups anyway (https://docs.fly.io/litefs, read 2026-10-04). It adds the most operating work of the four and removes none of the backup work. A solo maintainer should not carry that.

**A. Keep `ledger.py` as-is with no backup tool.** The code is right and stays. The gap is the backup. The ledger holds every dollar spent and every decision. Losing the VPS disk would lose all of it, and a plain file copy of a WAL-mode file taken while the writer runs can be broken. This option fails the owner's rule that backups exist. Its code is not rejected: it is the base of B and C.

## Why

C is picked over B, the runner-up, for these reasons.

- Loss window. B loses everything since the last timer run. C streams WAL pages continuously, so the loss window is the sync interval. The ledger records spend against caps of $1 a day and $5 a week. An hour of lost spend would hide the cap.
- Point-in-time restore. `litestream restore` takes `-timestamp` and `-txid`, so a bad restore point can be stepped back (https://litestream.io/reference/restore/, read 2026-10-04). B gives one snapshot per run.
- Low ops. Both add one moving part. B is a timer; C is a service. C needs no script of the owner's own to maintain.
- Swappable. Litestream only reads the file and never touches `ledger.py`. If it is removed, nothing in the app breaks. That is the same property B has.
- Append-only carries over unchanged. No schema change, no new write path, same triggers, same writer lock.
- Cost. Both fit inside a free object-storage tier at this size.

B stays as the fallback if Litestream is ever unmaintained or unwanted. The two are not exclusive. A weekly `VACUUM INTO` copy kept next to C's stream costs nothing extra and gives a second restore path.

What this does not settle. The Litestream sync interval and retention are settings for the backup job (rows P37 and P38), not for this note. The hosting provider and the object storage vendor are also not decided here. B2 is used only as a priced example.

## Swap-out path

The export format is the SQLite database file itself. Any option above can produce it:

- A snapshot: `sqlite3 ledger.db ".backup export.db"` or `VACUUM INTO 'export.db'`.
- A restore: `litestream restore -o export.db <replica-url>`.

A SQLite file opens in every language and is a documented, stable format. To move to another database, dump the events in order as JSON Lines, one object per row, with `seq`, `at`, `run`, `actor`, `kind`, `task`, `parent`, `body` and `source`. The `body` column already holds JSON text. Load them into the new store in `seq` order, then run the replay check against it: the views digest must match the digest printed before the move. Notion data that moved in becomes ordinary events, so the same export carries it.

## Sources

All read 2026-10-04.

- SQLite, VACUUM INTO: https://www.sqlite.org/lang_vacuum.html
- SQLite, copyright and license: https://www.sqlite.org/copyright.html
- SQLite, online backup API: https://www.sqlite.org/backup.html
- Litestream overview: https://litestream.io/
- Litestream, how it works: https://litestream.io/how-it-works/
- Litestream, restore reference: https://litestream.io/reference/restore/
- LiteFS overview: https://docs.fly.io/litefs
- LiteFS, how it works: https://docs.fly.io/litefs/how-it-works
- LiteFS license (Apache-2.0): https://github.com/superfly/litefs/blob/main/LICENSE
- Backblaze B2 pricing: https://www.backblaze.com/cloud-storage/pricing
- Code read: the ledger (`mero/ledger.py`), views (`mero/views.py`), command line (`mero/cli.py`) and vocabulary (`mero/vocab.py`), MERO commit 20b1ab3.
- Inventory of the database rows: the P14 inventory, branch p14-inventory.
