// Who issued a secret and where to rotate it. Matched on the variable name or the value's shape.
export interface Provider {
  id: string;
  name: string;
  rotate: string;
  /** env var names (regex, case-insensitive) */
  names?: RegExp;
  /** value shapes that are unambiguous on their own */
  value?: RegExp;
  /** shapes that are often deliberately public in client bundles (Firebase web keys) */
  publicInBundles?: boolean;
}

export const PROVIDERS: Provider[] = [
  { id: "anthropic", name: "Anthropic", rotate: "https://console.anthropic.com/settings/keys", names: /ANTHROPIC|CLAUDE/i, value: /sk-ant-(?:api|admin)\d{2}-[A-Za-z0-9_-]{60,}/ },
  { id: "openrouter", name: "OpenRouter", rotate: "https://openrouter.ai/settings/keys", names: /OPENROUTER/i, value: /sk-or-v1-[a-f0-9]{64}/ },
  { id: "openai", name: "OpenAI", rotate: "https://platform.openai.com/api-keys", names: /OPENAI/i, value: /sk-(?:proj|svcacct|admin)-[A-Za-z0-9_-]{40,}|sk-[A-Za-z0-9]{20}T3BlbkFJ[A-Za-z0-9]{20}/ },
  { id: "google", name: "Google Cloud / Gemini", rotate: "https://console.cloud.google.com/apis/credentials", names: /GOOGLE|GEMINI|GCP|FIREBASE_API|MAPS_API|YOUTUBE/i, value: /AIza[0-9A-Za-z_-]{35}/, publicInBundles: true },
  { id: "xai", name: "xAI", rotate: "https://console.x.ai", names: /XAI|GROK/i, value: /xai-[A-Za-z0-9]{70,}/ },
  { id: "groq", name: "Groq", rotate: "https://console.groq.com/keys", names: /GROQ/i, value: /gsk_[A-Za-z0-9]{48,}/ },
  { id: "huggingface", name: "Hugging Face", rotate: "https://huggingface.co/settings/tokens", names: /^(HF|HUGGING)/i, value: /hf_[A-Za-z0-9]{34,}/ },
  { id: "aws", name: "AWS", rotate: "https://console.aws.amazon.com/iam/home#/security_credentials", names: /^AWS_|_AWS_/i, value: /(?:AKIA|ASIA)[0-9A-Z]{16}/ },
  { id: "stripe", name: "Stripe", rotate: "https://dashboard.stripe.com/apikeys", names: /STRIPE/i, value: /(?:sk|rk)_live_[0-9a-zA-Z]{20,}/ },
  { id: "github", name: "GitHub", rotate: "https://github.com/settings/tokens", names: /GITHUB|^GH_/i, value: /gh[pousr]_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{60,}/ },
  { id: "slack", name: "Slack", rotate: "https://api.slack.com/apps", names: /SLACK/i, value: /xox[baprs]-[0-9A-Za-z-]{10,}/ },
  { id: "sendgrid", name: "SendGrid", rotate: "https://app.sendgrid.com/settings/api_keys", names: /SENDGRID/i, value: /SG\.[\w-]{22}\.[\w-]{43}/ },
  { id: "supabase", name: "Supabase", rotate: "https://supabase.com/dashboard/project/_/settings/api", names: /SUPABASE/i },
  { id: "cloudflare", name: "Cloudflare", rotate: "https://dash.cloudflare.com/profile/api-tokens", names: /CLOUDFLARE|^CF_/i },
  { id: "vercel", name: "Vercel", rotate: "https://vercel.com/account/tokens", names: /VERCEL/i },
  { id: "netlify", name: "Netlify", rotate: "https://app.netlify.com/user/applications", names: /NETLIFY/i },
  { id: "npm", name: "npm", rotate: "https://www.npmjs.com/settings/~/tokens", names: /NPM_TOKEN|NPM_AUTH/i, value: /npm_[A-Za-z0-9]{36}/ },
  { id: "resend", name: "Resend", rotate: "https://resend.com/api-keys", names: /RESEND/i },
  { id: "mapbox", name: "Mapbox", rotate: "https://account.mapbox.com/access-tokens/", names: /MAPBOX/i, value: /sk\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/ },
  { id: "database", name: "Database", rotate: "change the database user's password", names: /DATABASE_URL|DB_URL|POSTGRES|MYSQL|MONGO|REDIS_URL|DB_PASS/i, value: /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|rediss):\/\/[^\s:@/]+:(?![^\s@/]*(?:\$\{|\{\{|<|%s|\$[A-Z_]))[^\s@/'"`]+@/ },
];

/** A name that sounds like it holds a secret. */
export const SECRET_NAME = /(KEY|SECRET|TOKEN|PASSWORD|PASSWD|PASS$|PWD|PRIVATE|CREDENTIAL|AUTH|DSN|DATABASE_URL|DB_URL|CONNECTION|WEBHOOK|SALT|COOKIE|SESSION)/i;
/** Names that are almost always public config even though they contain KEY/AUTH (publishable keys, URLs). */
export const PUBLIC_NAME = /(PUBLISHABLE|PUBLIC_?KEY$|_PK$|^PK_|ANON_KEY|SITE_KEY|_URL$|_HOST$|_DOMAIN$|_REGION$|_ID$|AUTH_DOMAIN)/i;

export function providerFor(name: string, value: string): Provider | undefined {
  for (const p of PROVIDERS) if (p.value && p.value.test(value)) return p;
  for (const p of PROVIDERS) if (p.names && p.names.test(name)) return p;
  return undefined;
}

/** A short, value-free description: "AIza…(39 chars)". */
// Only prefixes that are part of a provider's public key *format* are ever shown; for anything
// else the shape is just the length, so not one character of an unknown secret is printed.
const PUBLIC_PREFIXES = [
  "sk-ant-api03-", "sk-ant-", "sk-or-v1-", "sk-proj-", "sk-svcacct-", "sk_live_", "sk_test_", "rk_live_", "rk_test_", "whsec_", "sk-",
  "AIza", "xai-", "gsk_", "hf_", "AKIA", "ASIA", "github_pat_", "ghp_", "gho_", "ghs_", "ghu_", "ghr_", "xoxb-", "xoxp-", "xoxa-", "xapp-",
  "SG.", "sbp_", "npm_", "re_", "pk.", "sk.", "nfp_", "eyJ", "glpat-",
  "postgresql://", "postgres://", "mysql://", "mongodb+srv://", "mongodb://", "rediss://", "redis://",
];
export function shapeOf(value: string): string {
  const v = value.trim();
  const head = PUBLIC_PREFIXES.find((p) => v.startsWith(p) && v.length > p.length + 8) ?? "";
  return `${head}…(${v.length} chars)`;
}

/** Values that are clearly placeholders. */
export function isPlaceholder(value: string): boolean {
  const v = value.trim().replace(/^['"]|['"]$/g, "");
  if (v.length === 0) return true;
  if (v.length < 4) return true;
  return /^(x+|\*+|\.+|-+|changeme|change_me|your[-_ ].*|<.*>|\$\{.*\}|placeholder|todo|example|dummy|none|null|undefined|false|true|test|replace[-_ ]?me|sk-\.\.\.|sk-x+|\.\.\.)$/i.test(v);
}
