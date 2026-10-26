export type HostId = "cf-pages" | "cf-workers" | "vercel" | "netlify" | "firebase" | "github-pages" | "gh-pages" | "surge" | "aws-s3";

/** A file in the tree, path is posix and relative to the tree root. */
export interface Entry {
  path: string;
  size: number;
}

/** What the scanner needs from a filesystem (Node or the browser's dropped folder). */
export interface Tree {
  /** Every regular file, posix paths relative to the root, no leading "./". */
  files: Entry[];
  /** Read a file as UTF-8 text (or undefined when missing / unreadable). Implementations may cap size. */
  readText(path: string, maxBytes?: number): Promise<string | undefined>;
  /** Read the first bytes of a file (magic numbers). */
  readHead?(path: string, n: number): Promise<Uint8Array | undefined>;
  /** Display name of the root ("my-site", "/home/me/my-site"). */
  name: string;
}

export type Severity = "LEAK" | "RISK" | "INFO";

/** Where a file ends up on a given host. */
export type Fate =
  | "public" // served at a URL anyone can fetch
  | "uploaded" // leaves your machine (build input on the host) but is not necessarily served
  | "home"; // the host skips it: stays in the basket

export interface SecretRef {
  /** Variable name (env files) or pattern name (inline keys). Never the value. */
  name: string;
  provider: string;
  /** First 8 hex chars of sha256(value) so you can match it without printing it. */
  fingerprint: string;
  rotate?: string;
  /** e.g. "AIza…(39 chars)" — shape only, never the secret. */
  shape: string;
}

export interface Finding {
  rule: string;
  severity: Severity;
  /** posix path relative to the deploy directory (or URL in probe mode) */
  path: string;
  /** bytes */
  size: number;
  title: string;
  detail: string;
  secrets: SecretRef[];
  fix: string;
}

export interface Deployment {
  host: HostId;
  /** deploy directory, posix, relative to the scanned root ("." = root) */
  dir: string;
  /** how we learned about it: "wrangler.toml pages_build_output_dir", "--host", "matrix" … */
  source: string;
  /** host-specific knobs resolved from config */
  opts: HostOpts;
}

export interface HostOpts {
  /** firebase.json hosting.ignore, if present (undefined = key absent → firebase-tools uses only its built-ins) */
  firebaseIgnore?: string[];
  /** gh-pages --dotfiles / dotfiles: true */
  ghPagesDotfiles?: boolean;
  /** actions/upload-pages-artifact include-hidden-files: true */
  includeHiddenFiles?: boolean;
  /** Vercel: does the host serve the uploaded files as-is (no build step / no output directory)? */
  vercelStatic?: boolean;
  /** Netlify: deploy dir == site base → node_modules skipped */
  netlifyAtRoot?: boolean;
  /** aws s3 sync / cp --recursive: --exclude / --include filters, in command-line order */
  s3Filters?: S3Filter[];
}

export interface S3Filter {
  type: "exclude" | "include";
  pattern: string;
}

export interface FileFate {
  path: string;
  size: number;
  fate: Fate;
  /** which upstream rule kept it home, e.g. "**\/.git (wrangler IGNORE_LIST)" */
  why?: string;
}

export interface DeploymentReport {
  deployment: Deployment;
  hostName: string;
  /** files under the deploy dir with their fate on this host */
  fates: FileFate[];
  findings: Finding[];
  /** risky files the host would have skipped anyway (shown so you know you were lucky) */
  savedByHost: { path: string; why: string; rule: string }[];
  totals: { files: number; bytes: number; public: number; uploaded: number; home: number };
  /** one way to keep every LEAK/RISK home on this host */
  remedy?: Remedy;
}

export interface Remedy {
  say: string;
  /** ignore file to add lines to (relative to the scanned root), if the host has one */
  file?: string;
  lines?: string[];
  /** things an ignore file cannot fix (keys compiled into served code) */
  notes?: string[];
}

export interface ScanReport {
  tool: "airing";
  version: string;
  root: string;
  matrix: boolean;
  deployments: DeploymentReport[];
  worst: Severity | "CLEAN";
}
