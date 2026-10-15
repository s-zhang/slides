#!/usr/bin/python3
"""Mirror Obsidian vault files into deck directories so Slidev hot-reloads.

The deck's slides.md must be a REAL file: CI iterates every deck and a symlink
pointing into the vault resolves to nothing on a runner. So the vault stays the
authoring surface and this mirrors it on every save.

Usage: vault-sync.py SRC DST [SRC DST ...]

stdlib only, no inotify dependency. Polls mtime+size, which is enough here:
the writer is a human in Obsidian, not a build system.
"""

import os
import shutil
import sys
import time

INTERVAL = 0.5


def stamp(path):
    try:
        st = os.stat(path)
        return (st.st_mtime_ns, st.st_size)
    except OSError:
        return None


def publish(src, dst):
    """Copy via a temp file in the destination dir, then atomic rename.

    Vite watches dst; a partial read mid-copy shows up as a broken deck.
    """
    tmp = dst + ".tmp"
    shutil.copy2(src, tmp)
    os.replace(tmp, dst)


def main(argv):
    if len(argv) < 2 or len(argv) % 2:
        sys.exit("usage: vault-sync.py SRC DST [SRC DST ...]")
    pairs = list(zip(argv[0::2], argv[1::2]))
    for src, dst in pairs:
        if not os.path.exists(src):
            sys.exit(f"source missing: {src}")
    seen = {}
    for src, dst in pairs:
        seen[src] = stamp(src)
        # Reconcile once at startup: the vault may have moved while we were down.
        if seen[src] and stamp(src) != stamp(dst):
            publish(src, dst)
            print(f"sync (startup) {src} -> {dst}", flush=True)
    while True:
        time.sleep(INTERVAL)
        for src, dst in pairs:
            cur = stamp(src)
            if cur is None or cur == seen[src]:
                continue
            seen[src] = cur
            try:
                publish(src, dst)
                print(f"sync {src} -> {dst}", flush=True)
            except OSError as e:
                print(f"sync FAILED {src}: {e}", file=sys.stderr, flush=True)


if __name__ == "__main__":
    try:
        main(sys.argv[1:])
    except KeyboardInterrupt:
        pass
