// Tree over the real filesystem.
import { closeSync, lstatSync, openSync, readdirSync, readSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import type { Entry, Tree } from "./types.js";

export const MAX_FILES = 250_000;

export function nodeTree(root: string): Tree & { truncated: boolean; abs: string } {
  const abs = resolve(root);
  const files: Entry[] = [];
  let truncated = false;
  const walk = (dir: string, rel: string) => {
    let names: string[];
    try {
      names = readdirSync(dir);
    } catch {
      return;
    }
    names.sort();
    for (const name of names) {
      if (files.length >= MAX_FILES) {
        truncated = true;
        return;
      }
      const p = join(dir, name);
      const r = rel ? `${rel}/${name}` : name;
      let st;
      try {
        st = lstatSync(p);
        if (st.isSymbolicLink()) {
          const t = statSync(p); // hosts follow file symlinks; we don't descend linked dirs (loops)
          if (t.isFile()) files.push({ path: r, size: t.size });
          continue;
        }
      } catch {
        continue;
      }
      if (st.isDirectory()) walk(p, r);
      else if (st.isFile()) files.push({ path: r, size: st.size });
    }
  };
  const st = statSync(abs);
  if (!st.isDirectory()) throw new Error(`${root} is not a directory`);
  walk(abs, "");
  const readBytes = (path: string, max: number): Buffer | undefined => {
    try {
      const fd = openSync(join(abs, path), "r");
      try {
        const size = statSync(join(abs, path)).size;
        const n = Math.min(size, max);
        const buf = Buffer.alloc(n);
        let off = 0;
        while (off < n) {
          const k = readSync(fd, buf, off, n - off, off);
          if (k <= 0) break;
          off += k;
        }
        return buf.subarray(0, off);
      } finally {
        closeSync(fd);
      }
    } catch {
      return undefined;
    }
  };
  return {
    name: root === "." ? basename(abs) : root,
    abs,
    files,
    truncated,
    async readText(path, maxBytes = 4 * 1024 * 1024) {
      const b = readBytes(path, maxBytes);
      if (!b) return undefined;
      // binary guard: NUL in the first 8KB
      if (b.subarray(0, 8192).includes(0) && !/\.(map|json|js)$/.test(path)) return "";
      return b.toString("utf8");
    },
    async readHead(path, n) {
      const b = readBytes(path, n);
      return b ? new Uint8Array(b) : undefined;
    },
  };
}
