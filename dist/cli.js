#!/usr/bin/env node
import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/ignore/index.js
var require_ignore = __commonJS({
  "node_modules/ignore/index.js"(exports, module) {
    function makeArray(subject) {
      return Array.isArray(subject) ? subject : [subject];
    }
    var UNDEFINED = void 0;
    var EMPTY = "";
    var SPACE = " ";
    var ESCAPE = "\\";
    var REGEX_LITERAL_SPECIAL = /[.*+?()[\]{}^$|\\/]/;
    var BOM = "\uFEFF";
    var REGEX_INVALID_TRAILING_BACKSLASH = /(?:[^\\]|^)\\$/;
    var REGEX_REPLACE_LEADING_EXCAPED_EXCLAMATION = /^\\!/;
    var REGEX_REPLACE_LEADING_EXCAPED_HASH = /^\\#/;
    var REGEX_SPLITALL_CRLF = /\r?\n/g;
    var DOUBLE_SLASH = "//";
    var SLASH_CODE = 47;
    var DOT_CODE = 46;
    var SLASH = "/";
    var TMP_KEY_IGNORE = "node-ignore";
    if (typeof Symbol !== "undefined") {
      TMP_KEY_IGNORE = Symbol.for("node-ignore");
    }
    var KEY_IGNORE = TMP_KEY_IGNORE;
    var define = (object, key, value) => {
      Object.defineProperty(object, key, { value });
      return value;
    };
    var RETURN_FALSE = () => false;
    var cleanRangeBackSlash = (slashes) => {
      const { length } = slashes;
      return slashes.slice(0, length - length % 2);
    };
    var POSIX_CLASSES = {
      alnum: "0-9A-Za-z",
      alpha: "A-Za-z",
      blank: " \\t",
      cntrl: "\\x00-\\x1f\\x7f",
      digit: "0-9",
      graph: "!-.0-~",
      lower: "a-z",
      print: " -.0-~",
      punct: "!-.:-@\\[-`{-~",
      // git's `sane-ctype.h` classifies \v and \f as control, not space,
      //   unlike C's `isspace`
      space: " \\t\\n\\r",
      upper: "A-Z",
      xdigit: "0-9A-Fa-f"
    };
    var CLASS_MEMBERS_TO_ESCAPE = "\\]^-[";
    var escapeMember = (char) => CLASS_MEMBERS_TO_ESCAPE.indexOf(char) < 0 ? char : ESCAPE + char;
    var NON_SLASH = "(?!\\/)";
    var classSource = (negated, body) => {
      if (negated) {
        return `[^\\/${body}]`;
      }
      const source = `[${body}]`;
      return new RegExp(source).test("/") ? NON_SLASH + source : source;
    };
    var scanBracket = (pattern, start) => {
      const { length } = pattern;
      let index = start + 1;
      let negated = EMPTY;
      const lead = pattern[index];
      if (lead === "!" || lead === "^") {
        negated = "^";
        index++;
      }
      let body = EMPTY;
      let prev = EMPTY;
      for (; ; ) {
        const char = pattern[index];
        if (char === UNDEFINED) {
          return null;
        }
        if (char === ESCAPE) {
          const escaped = pattern[index + 1];
          if (escaped === UNDEFINED) {
            return null;
          }
          body += escapeMember(escaped);
          prev = escaped;
          index++;
        } else if (char === "-" && prev && index + 1 < length && pattern[index + 1] !== "]") {
          index++;
          let to = pattern[index];
          if (to === ESCAPE) {
            to = pattern[index += 1];
          }
          if (prev <= to) {
            body += `-${escapeMember(to)}`;
          }
          prev = EMPTY;
        } else if (char === "[" && pattern[index + 1] === ":") {
          const nameStart = index + 2;
          let end = nameStart;
          while (end < length && pattern[end] !== "]") {
            end++;
          }
          if (end === length) {
            return null;
          }
          if (end > nameStart && pattern[end - 1] === ":") {
            const expanded = POSIX_CLASSES[pattern.slice(nameStart, end - 1)];
            if (expanded === UNDEFINED) {
              return null;
            }
            body += expanded;
            prev = EMPTY;
            index = end;
          } else {
            body += escapeMember("[");
            prev = "[";
            index = nameStart - 2;
          }
        } else {
          body += escapeMember(char);
          prev = char;
        }
        index++;
        if (pattern[index] === "]") {
          return {
            end: index,
            source: classSource(negated, body)
          };
        }
      }
    };
    var NEVER_MATCH = "[]";
    var PLACEHOLDER = "\0";
    var REGEX_RESTORE_PLACEHOLDER = new RegExp(
      `${PLACEHOLDER}(\\d+)${PLACEHOLDER}`,
      "g"
    );
    var TRAILING_WILDCARD = "\uE000";
    var TRAILING_DOUBLESTAR = "\uE001";
    var extractBrackets = (pattern) => {
      const sources = [];
      const hold = (source) => `${PLACEHOLDER}${sources.push(source) - 1}${PLACEHOLDER}`;
      const { length } = pattern;
      let out = EMPTY;
      let index = 0;
      while (index < length) {
        const char = pattern[index];
        if (char === ESCAPE) {
          const escaped = pattern[index + 1];
          if (escaped === UNDEFINED || escaped === SLASH && index + 2 === length) {
            out += hold(NEVER_MATCH);
          } else if (escaped === "*" || escaped === "[" || escaped === SPACE || escaped === ESCAPE) {
            out += pattern.slice(index, index + 2);
          } else {
            out += hold(
              REGEX_LITERAL_SPECIAL.test(escaped) ? ESCAPE + escaped : escaped
            );
          }
          index += 2;
        } else if (char === PLACEHOLDER) {
          out += hold(`[${PLACEHOLDER}]`);
          index++;
        } else if (char === "[") {
          const scanned = scanBracket(pattern, index);
          if (scanned === null) {
            out += hold(NEVER_MATCH);
            index = length;
          } else {
            out += hold(scanned.source);
            index = scanned.end + 1;
          }
        } else {
          out += char;
          index++;
        }
      }
      return {
        source: out,
        sources
      };
    };
    var DIRECT = null;
    var REGEX_INNER_SLASH = /\/(?!$)/;
    var REPLACERS = [
      // Replace (\ ) with ' '
      // Only a space: an escaped tab or other whitespace is already a literal by
      //   the time it reaches here, and a bare tab must be left as one, not turned
      //   into a space.
      // (\ ) -> ' '
      // (\\ ) -> '\\ '
      // (\\\ ) -> '\\ '
      [
        // A run of backslashes is taken whole, from its first one, so no match
        //   ever starts again inside it -- `(\\+?) ` did, which made a long run
        //   quadratic.
        /(\\+)( ?)/g,
        (_, run, space) => space ? run.slice(0, run.length - run.length % 2) + SPACE : run,
        ESCAPE + SPACE
      ],
      // Escape metacharacters
      // which is written down by users but means special for regular expressions.
      // > There are 12 characters with special meanings:
      // > - the backslash \,
      // > - the caret ^,
      // > - the dollar sign $,
      // > - the period or dot .,
      // > - the vertical bar or pipe symbol |,
      // > - the question mark ?,
      // > - the asterisk or star *,
      // > - the plus sign +,
      // > - the opening parenthesis (,
      // > - the closing parenthesis ),
      // > - and the opening square bracket [,
      // > - the opening curly brace {,
      // > These special characters are often called "metacharacters".
      [
        /[\\$.|*+(){^]/g,
        (match2) => `\\${match2}`
      ],
      [
        // > a question mark (?) matches a single character
        /(?!\\)\?/g,
        () => "[^/]",
        "?"
      ],
      // leading slash
      [
        // > A leading slash matches the beginning of the pathname.
        // > For example, "/*.c" matches "cat-file.c" but not "mozilla-sha1/sha1.c".
        // A leading slash matches the beginning of the pathname
        /^\//,
        () => "^",
        SLASH
      ],
      // replace special metacharacter slash after the leading slash
      [
        /\//g,
        () => "\\/",
        SLASH
      ],
      [
        // > A leading "**" followed by a slash means match in all directories.
        // > For example, "**/foo" matches file or directory "foo" anywhere,
        // > the same as pattern "foo".
        // > "**/foo/bar" matches file or directory "bar" anywhere that is directly
        // >   under directory "foo".
        // Notice that the '*'s have been replaced as '\\*'
        /^\^*(?:\\\*\\\*\\\/)+/,
        // '**/foo' <-> 'foo'
        () => "^(?:.*\\/)?",
        "*"
      ],
      // starting
      [
        // there will be no leading '/'
        //   (which has been replaced by section "leading slash")
        // If starts with '**', adding a '^' to the regular expression also works
        DIRECT,
        (source, pattern) => {
          if (!source || source[0] === "^") {
            return source;
          }
          const anchor = !REGEX_INNER_SLASH.test(pattern) ? "(?:^|\\/)" : "^";
          return anchor + source;
        }
      ],
      // two globstars
      [
        // Use lookahead assertions so that we could match more than one `'/**'`
        /\\\/\\\*\\\*(?=\\\/|$)/g,
        // Zero, one or several directories
        // should not use '*', or it will be replaced by the next replacer
        // Check if it is not the last `'/**'`
        (_, index, str) => index + 6 < str.length ? str.slice(index + 6) === "\\/" ? "(?:\\/[^\\/]+)+" : "(?:\\/[^\\/]+)*" : `\\/${TRAILING_DOUBLESTAR}`,
        "*"
      ],
      // normal intermediate wildcards
      [
        // Never replace escaped '*'
        // ignore rule '\*' will match the path '*'
        // 'abc.*/' -> go
        // 'abc.*'  -> skip this rule,
        //    coz trailing single wildcard will be handed by [trailing wildcard]
        /(^|[^\\]+)(\\\*)+(?=.+)/g,
        // '*.js' matches '.js'
        // '*.js' doesn't match 'abc'
        (_, p1, p2) => {
          const unescaped = p2.replace(/\\\*/g, "[^\\/]*");
          return p1 + unescaped;
        },
        "*"
      ],
      // trailing wildcard, held apart from a literal star
      [
        // The step above leaves a trailing `*` alone, so a single `\*` is all that
        //   can be left at the end here. Whether it is a wildcard or a literal
        //   turns on the backslashes the user put in front of it: the escaper has
        //   since doubled every one, so what stands here is those `2N` doubled
        //   backslashes and then the star's own escape. An even number of the
        //   original `N` leaves the star unescaped -- a wildcard -- and an odd
        //   number escapes it -- a literal. This runs while the two are still
        //   distinct, before the unescape steps below collapse the literal onto
        //   the very `\*` a wildcard leaves behind.
        /(^|[^\\])((?:\\\\)*)\\\*$/,
        (match2, p1, p2) => (
          // `p2` holds the doubled user backslashes; half of them is `N`.
          p2.length / 2 % 2 === 0 ? p1 + p2 + TRAILING_WILDCARD : match2
        ),
        "*"
      ],
      [
        // unescape, revert step 3 except for back slash
        // For example, if a user escape a '\\*',
        // after step 3, the result will be '\\\\\\*'
        /\\\\\\(?=[$.|*+(){^])/g,
        () => ESCAPE,
        ESCAPE + ESCAPE
      ],
      [
        // '\\\\' -> '\\'
        /\\\\/g,
        () => ESCAPE,
        ESCAPE + ESCAPE
      ],
      [
        // Every real bracket expression -- POSIX classes included -- has already
        //   been held aside by `extractBrackets`, so the only `[` left in the
        //   pattern is an escaped, literal one.
        // `\` is escaped by step 3
        /\\\[([^\]/]*?)(\\*)($|\])/g,
        // '\\[bar]' -> '\\\\[bar\\]'
        (match2, range2, endEscape, close) => `\\[${range2}${cleanRangeBackSlash(endEscape)}${close}`,
        "["
      ],
      // ending
      [
        // 'js' will not match 'js.'
        // 'ab' will not match 'abc'
        DIRECT,
        // WTF!
        // https://git-scm.com/docs/gitignore
        // changes in [2.22.1](https://git-scm.com/docs/gitignore/2.22.1)
        // which re-fixes #24, #38
        // > If there is a separator at the end of the pattern then the pattern
        // > will only match directories, otherwise the pattern can match both
        // > files and directories.
        // 'js*' will not match 'a.js'
        // 'js/' will not match 'a.js'
        // 'js' will match 'a.js' and 'a.js/'
        (source) => {
          const last = source[source.length - 1];
          if (!last || last === TRAILING_WILDCARD || last === TRAILING_DOUBLESTAR) {
            return source;
          }
          return last === SLASH ? `${source}$` : `${source}(?=$|\\/$)`;
        }
      ]
    ];
    var REGEX_REPLACE_TRAILING_WILDCARD = /(^|\\\/)?\uE000$/;
    var MODE_IGNORE = "regex";
    var MODE_CHECK_IGNORE = "checkRegex";
    var UNDERSCORE = "_";
    var replaceTrailingWildcard = (_, p1) => {
      const prefix = p1 ? `${p1}[^/]+` : "[^/]*";
      return `${prefix}(?=$|\\/$)`;
    };
    var REGEX_REPLACE_TRAILING_DOUBLESTAR = /\uE001$/;
    var replaceTrailingDoublestar = () => ".+(?=$|\\/$)";
    var WILDCARD = "[^\\/]*";
    var separatorAfter = (run, at) => {
      let separator = EMPTY;
      for (let index = at + 1; index < run.length && !run[index].wildcard; index++) {
        separator += run[index].single;
      }
      return separator;
    };
    var pinWildcards = (source) => {
      if (source.indexOf(WILDCARD) < 0) {
        return source;
      }
      const tokens = [];
      const { length } = source;
      let index = 0;
      while (index < length) {
        const char = source[index];
        if (source.startsWith(WILDCARD, index)) {
          tokens.push({ wildcard: true });
          index += WILDCARD.length;
        } else if (char === "[") {
          let end = index + 1;
          if (source[end] === "^") {
            end++;
          }
          if (source[end] === "]") {
            end++;
          }
          while (end < length && source[end] !== "]") {
            end += source[end] === ESCAPE ? 2 : 1;
          }
          end++;
          tokens.push({ single: source.slice(index, end) });
          index = end;
        } else if (char === ESCAPE) {
          tokens.push({ single: source.slice(index, index + 2) });
          index += 2;
        } else if (char === "(") {
          let depth = 0;
          let end = index;
          do {
            if (source[end] === ESCAPE) {
              end++;
            } else if (source[end] === "(") {
              depth++;
            } else if (source[end] === ")") {
              depth--;
            }
            end++;
          } while (end < length && depth > 0);
          if ("*+?".indexOf(source[end]) >= 0) {
            end++;
          }
          tokens.push({ boundary: source.slice(index, end) });
          index = end;
        } else if (char === "^" || char === "$") {
          tokens.push({ boundary: char });
          index++;
        } else {
          tokens.push({ single: char });
          index++;
        }
      }
      let out = EMPTY;
      let run = [];
      const flush = () => {
        let lastWildcard;
        run.forEach((token, at) => {
          if (token.wildcard) {
            lastWildcard = at;
          }
        });
        run.forEach((token, at) => {
          if (!token.wildcard) {
            out += token.single;
            return;
          }
          out += at === lastWildcard ? WILDCARD : `(?:(?!${separatorAfter(run, at)})[^\\/])*`;
        });
        run = [];
      };
      tokens.forEach((token) => {
        if (token.boundary === void 0) {
          run.push(token);
          return;
        }
        flush();
        out += token.boundary;
      });
      flush();
      return out;
    };
    var makeRegexPrefix = (pattern) => {
      const { source, sources } = extractBrackets(pattern);
      const replaced = REPLACERS.reduce(
        // A pass whose matcher finds nothing hands back the very string it was
        //   given, so asking first costs a search and saves a rewrite. Ten of the
        //   fifteen passes never fire for a typical .gitignore line, and between
        //   them they were 45% of this chain.
        (prev, [matcher, replacer, required]) => {
          if (matcher === DIRECT) {
            return replacer(prev, pattern);
          }
          if (required !== UNDEFINED && prev.indexOf(required) < 0) {
            return prev;
          }
          return matcher.test(prev) ? prev.replace(matcher, replacer.bind(pattern)) : prev;
        },
        source
      );
      return sources.length ? replaced.replace(
        REGEX_RESTORE_PLACEHOLDER,
        (match2, index) => sources[index]
      ) : replaced;
    };
    var checkSourceOf = (body, prefix) => {
      if (body[body.length - 1] === SLASH) {
        prefix = makeRegexPrefix(body.slice(0, -1));
      }
      const head = prefix.slice(0, -1);
      const last = prefix[prefix.length - 1];
      return last === TRAILING_WILDCARD ? `${head}$` : last === TRAILING_DOUBLESTAR ? `${head}.*$` : NEVER_MATCH;
    };
    var matchesBasename = (body) => {
      const index = body.indexOf(SLASH);
      return index < 0 || index === body.length - 1;
    };
    var basenameOf = (path2) => {
      const end = path2.length - 1;
      const index = path2.lastIndexOf(
        SLASH,
        path2[end] === SLASH ? end - 1 : end
      );
      return index < 0 ? path2 : path2.slice(index + 1);
    };
    var parentOf = (path2) => {
      if (path2.charCodeAt(0) === SLASH_CODE || path2.indexOf(DOUBLE_SLASH) >= 0) {
        const slices = path2.split(SLASH).filter(Boolean);
        slices.pop();
        return slices.length ? slices.join(SLASH) + SLASH : EMPTY;
      }
      const end = path2.length - 1;
      const cut = path2.lastIndexOf(
        SLASH,
        path2.charCodeAt(end) === SLASH_CODE ? end - 1 : end
      );
      return cut < 0 ? EMPTY : path2.slice(0, cut + 1);
    };
    var isString = (subject) => typeof subject === "string";
    var checkPattern = (pattern) => pattern && isString(pattern) && !REGEX_INVALID_TRAILING_BACKSLASH.test(pattern);
    var splitPattern = (pattern) => pattern.split(REGEX_SPLITALL_CRLF).filter(Boolean);
    var IgnoreRule = class {
      constructor(pattern, mark, body, ignoreCase, negative, prefix) {
        this.pattern = pattern;
        this.mark = mark;
        this.negative = negative;
        define(this, "body", body);
        define(this, "ignoreCase", ignoreCase);
        define(this, "regexPrefix", prefix);
      }
      // Worked out on first use and kept behind an own property, the way `regex`
      //   caches itself in `_regex`. Deciding it in the constructor instead would
      //   add a fourth `defineProperty` to every rule ever built, which cost 4% of
      //   every compile -- including the compiles of rules that are never matched
      //   against anything.
      get _basenameOnly() {
        return define(this, "_basenameOnly", matchesBasename(this.body));
      }
      get regex() {
        const key = UNDERSCORE + MODE_IGNORE;
        if (this[key]) {
          return this[key];
        }
        return this._make(MODE_IGNORE, key);
      }
      get checkRegex() {
        const key = UNDERSCORE + MODE_CHECK_IGNORE;
        if (this[key]) {
          return this[key];
        }
        return this._make(MODE_CHECK_IGNORE, key);
      }
      _make(mode, key) {
        const str = pinWildcards(
          mode === MODE_IGNORE ? this.regexPrefix.replace(REGEX_REPLACE_TRAILING_WILDCARD, replaceTrailingWildcard).replace(REGEX_REPLACE_TRAILING_DOUBLESTAR, replaceTrailingDoublestar) : checkSourceOf(this.body, this.regexPrefix)
        );
        const regex = this.ignoreCase ? new RegExp(str, "i") : new RegExp(str);
        return define(this, key, regex);
      }
    };
    var isLineEnd = (char) => char === "\r" || char === "\n";
    var trimEnd = (body) => {
      let end = body.length;
      while (end && isLineEnd(body[end - 1])) {
        end--;
      }
      const lineEnd = end;
      while (end && body[end - 1] === SPACE) {
        end--;
      }
      if (end === lineEnd) {
        return body.slice(0, end);
      }
      let backslashes = 0;
      while (backslashes < end && body[end - backslashes - 1] === ESCAPE) {
        backslashes++;
      }
      return backslashes % 2 ? body.slice(0, end - 1) + SPACE : body.slice(0, end);
    };
    var createRule = ({
      pattern,
      mark
    }, ignoreCase) => {
      let body = pattern[0] === BOM ? pattern.slice(1) : pattern;
      if (body[0] === "#") {
        return;
      }
      let negative = false;
      if (body[0] === "!") {
        negative = true;
        body = body.slice(1);
      }
      const last = body[body.length - 1];
      if (last === SPACE || last === "\r" || last === "\n") {
        body = trimEnd(body);
      }
      if (!body) {
        return;
      }
      body = body.replace(REGEX_REPLACE_LEADING_EXCAPED_EXCLAMATION, "!").replace(REGEX_REPLACE_LEADING_EXCAPED_HASH, "#");
      const regexPrefix = makeRegexPrefix(body);
      return new IgnoreRule(
        pattern,
        mark,
        body,
        ignoreCase,
        negative,
        regexPrefix
      );
    };
    var RuleManager = class {
      constructor(ignoreCase) {
        this._ignoreCase = ignoreCase;
        this._rules = [];
        this._basenameCount = 0;
      }
      _add(pattern) {
        if (pattern && pattern[KEY_IGNORE]) {
          this._rules = this._rules.concat(pattern._rules._rules);
          this._basenameCount += pattern._rules._basenameCount;
          this._added = true;
          return;
        }
        if (isString(pattern)) {
          pattern = {
            pattern
          };
        }
        const rule = checkPattern(pattern.pattern) && createRule(pattern, this._ignoreCase);
        if (rule) {
          this._added = true;
          this._rules.push(rule);
          if (matchesBasename(rule.body)) {
            this._basenameCount++;
          }
        }
      }
      // @param {Array<string> | string | Ignore} pattern
      add(pattern) {
        this._added = false;
        makeArray(
          isString(pattern) ? splitPattern(pattern) : pattern
        ).forEach(this._add, this);
        if (this._added) {
          this._literalRules = UNDEFINED;
        }
        return this._added;
      }
      // Match the literal 'abc/' for `checkIgnore`, last rule wins. Only a rule
      //   ending in a wildcard can match it (see `checkSourceOf`), so the rest
      //   are left out once, rather than tested or compiled for every path.
      testLiteral(path2) {
        const rules = this._literalRules || (this._literalRules = this._rules.filter(
          ({ body }) => body[body.length - (body[body.length - 1] === SLASH ? 2 : 1)] === "*"
        ));
        let ignored = false;
        let unignored = false;
        let matchedRule;
        for (let index = rules.length - 1; index >= 0; index--) {
          const rule = rules[index];
          if (rule.checkRegex.test(path2)) {
            ignored = !rule.negative;
            unignored = rule.negative;
            matchedRule = rule.negative ? UNDEFINED : rule;
            break;
          }
        }
        const ret = {
          ignored,
          unignored
        };
        if (matchedRule) {
          ret.rule = matchedRule;
        }
        return ret;
      }
      // Test one single path without recursively checking parent directories
      //
      // - checkUnignored `boolean` whether should check if the path is unignored,
      //   setting `checkUnignored` to `false` could reduce additional
      //   path matching.
      // - check `string` either `MODE_IGNORE` or `MODE_CHECK_IGNORE`
      // @returns {TestResult} true if a file is ignored
      test(path2, checkUnignored, mode) {
        let ignored = false;
        let unignored = false;
        let matchedRule;
        const rules = this._rules;
        const { length } = rules;
        const shortcut = this._basenameCount * 2 >= length;
        const basename2 = shortcut ? basenameOf(path2) : path2;
        for (let index = 0; index < length; index++) {
          const rule = rules[index];
          const { negative } = rule;
          const skip = unignored === negative && ignored !== unignored || negative && !ignored && !unignored && !checkUnignored;
          if (!skip && rule[mode].test(
            shortcut && rule._basenameOnly ? basename2 : path2
          )) {
            ignored = !negative;
            unignored = negative;
            matchedRule = negative ? UNDEFINED : rule;
          }
        }
        const ret = {
          ignored,
          unignored
        };
        if (matchedRule) {
          ret.rule = matchedRule;
        }
        return ret;
      }
    };
    var throwError = (message, Ctor) => {
      throw new Ctor(message);
    };
    var checkPath = (path2, originalPath, doThrow) => {
      if (!isString(path2)) {
        return doThrow(
          `path must be a string, but got \`${originalPath}\``,
          TypeError
        );
      }
      if (!path2) {
        return doThrow(`path must not be empty`, TypeError);
      }
      if (checkPath.isNotRelative(path2)) {
        const r = "`path.relative()`d";
        return doThrow(
          `path should be a ${r} string, but got "${originalPath}"`,
          RangeError
        );
      }
      return true;
    };
    var isNotRelative = (path2) => {
      const first = path2.charCodeAt(0);
      if (first === SLASH_CODE) {
        return true;
      }
      if (first !== DOT_CODE) {
        return false;
      }
      if (path2.length === 1) {
        return true;
      }
      const second = path2.charCodeAt(1);
      if (second === SLASH_CODE) {
        return true;
      }
      if (second !== DOT_CODE) {
        return false;
      }
      return path2.length === 2 || path2.charCodeAt(2) === SLASH_CODE;
    };
    checkPath.isNotRelative = isNotRelative;
    checkPath.convert = (p) => p;
    var Ignore = class {
      constructor({
        ignorecase = true,
        ignoreCase = ignorecase,
        allowRelativePaths = false
      } = {}) {
        define(this, KEY_IGNORE, true);
        this._rules = new RuleManager(ignoreCase);
        this._strictPathCheck = !allowRelativePaths;
        this._initCache();
      }
      _initCache() {
        this._ignoreCache = /* @__PURE__ */ Object.create(null);
        this._testCache = /* @__PURE__ */ Object.create(null);
      }
      add(pattern) {
        if (this._rules.add(pattern)) {
          this._initCache();
        }
        return this;
      }
      // legacy
      addPattern(pattern) {
        return this.add(pattern);
      }
      // @returns {TestResult}
      _test(originalPath, cache, checkUnignored) {
        const path2 = originalPath && checkPath.convert(originalPath);
        checkPath(
          path2,
          originalPath,
          this._strictPathCheck ? throwError : RETURN_FALSE
        );
        return this._t(path2, cache, checkUnignored);
      }
      checkIgnore(path2) {
        if (path2.charCodeAt(path2.length - 1) !== SLASH_CODE) {
          return this.test(path2);
        }
        const dir = this._t(path2, this._testCache, true);
        if (dir.ignored) {
          return dir;
        }
        const literal = this._rules.testLiteral(path2);
        return literal.ignored || literal.unignored ? literal : dir;
      }
      _t(path2, cache, checkUnignored) {
        if (path2 in cache) {
          return cache[path2];
        }
        const parentPath = parentOf(path2);
        const parent = parentPath ? this._t(parentPath, cache, checkUnignored) : UNDEFINED;
        return cache[path2] = parent && parent.ignored ? parent : this._rules.test(path2, checkUnignored, MODE_IGNORE);
      }
      ignores(path2) {
        return this._test(path2, this._ignoreCache, false).ignored;
      }
      createFilter() {
        return (path2) => !this.ignores(path2);
      }
      filter(paths) {
        return makeArray(paths).filter(this.createFilter());
      }
      // @returns {TestResult}
      test(path2) {
        return this._test(path2, this._testCache, true);
      }
    };
    var factory = (options) => new Ignore(options);
    var isPathValid = (path2) => checkPath(path2 && checkPath.convert(path2), path2, RETURN_FALSE);
    var setupWindows = () => {
      const makePosix = (str) => /^\\\\\?\\/.test(str) || /["<>|\u0000-\u001F]+/u.test(str) ? str : str.replace(/\\/g, "/");
      checkPath.convert = makePosix;
      const REGEX_TEST_WINDOWS_PATH_ABSOLUTE = /^[a-z]:\//i;
      checkPath.isNotRelative = (path2) => REGEX_TEST_WINDOWS_PATH_ABSOLUTE.test(path2) || isNotRelative(path2);
    };
    if (
      // Detect `process` so that it can run in browsers.
      typeof process !== "undefined" && process.platform === "win32"
    ) {
      setupWindows();
    }
    module.exports = factory;
    factory.default = factory;
    module.exports.isPathValid = isPathValid;
    define(module.exports, Symbol.for("setupWindows"), setupWindows);
  }
});

// src/cli.ts
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

// src/hosts.ts
var import_ignore = __toESM(require_ignore(), 1);

// node_modules/balanced-match/dist/esm/index.js
var balanced = (a, b, str) => {
  const ma = a instanceof RegExp ? maybeMatch(a, str) : a;
  const mb = b instanceof RegExp ? maybeMatch(b, str) : b;
  const r = ma !== null && mb != null && range(ma, mb, str);
  return r && {
    start: r[0],
    end: r[1],
    pre: str.slice(0, r[0]),
    body: str.slice(r[0] + ma.length, r[1]),
    post: str.slice(r[1] + mb.length)
  };
};
var maybeMatch = (reg, str) => {
  const m = str.match(reg);
  return m ? m[0] : null;
};
var range = (a, b, str) => {
  let begs, beg, left, right = void 0, result;
  let ai = str.indexOf(a);
  let bi = str.indexOf(b, ai + 1);
  let i = ai;
  if (ai >= 0 && bi > 0) {
    if (a === b) {
      return [ai, bi];
    }
    begs = [];
    left = str.length;
    while (i >= 0 && !result) {
      if (i === ai) {
        begs.push(i);
        ai = str.indexOf(a, i + 1);
      } else if (begs.length === 1) {
        const r = begs.pop();
        if (r !== void 0)
          result = [r, bi];
      } else {
        beg = begs.pop();
        if (beg !== void 0 && beg < left) {
          left = beg;
          right = bi;
        }
        bi = str.indexOf(b, i + 1);
      }
      i = ai < bi && ai >= 0 ? ai : bi;
    }
    if (begs.length && right !== void 0) {
      result = [left, right];
    }
  }
  return result;
};

// node_modules/brace-expansion/dist/esm/index.js
var escSlash = "\0SLASH" + Math.random() + "\0";
var escOpen = "\0OPEN" + Math.random() + "\0";
var escClose = "\0CLOSE" + Math.random() + "\0";
var escComma = "\0COMMA" + Math.random() + "\0";
var escPeriod = "\0PERIOD" + Math.random() + "\0";
var escSlashPattern = new RegExp(escSlash, "g");
var escOpenPattern = new RegExp(escOpen, "g");
var escClosePattern = new RegExp(escClose, "g");
var escCommaPattern = new RegExp(escComma, "g");
var escPeriodPattern = new RegExp(escPeriod, "g");
var slashPattern = /\\\\/g;
var openPattern = /\\{/g;
var closePattern = /\\}/g;
var commaPattern = /\\,/g;
var periodPattern = /\\\./g;
var EXPANSION_MAX = 1e5;
var EXPANSION_MAX_LENGTH = 4e6;
var EXPANSION_MAX_DEPTH = 1e3;
var EXPANSION_MAX_REWRITES = 1e3;
function numeric(str) {
  return !isNaN(str) ? parseInt(str, 10) : str.charCodeAt(0);
}
function escapeBraces(str) {
  return str.replace(slashPattern, escSlash).replace(openPattern, escOpen).replace(closePattern, escClose).replace(commaPattern, escComma).replace(periodPattern, escPeriod);
}
function unescapeBraces(str) {
  return str.replace(escSlashPattern, "\\").replace(escOpenPattern, "{").replace(escClosePattern, "}").replace(escCommaPattern, ",").replace(escPeriodPattern, ".");
}
function pushAll(target, items) {
  for (let i = 0; i < items.length; i++) {
    target.push(items[i]);
  }
}
function parseCommaParts(str) {
  const parts = [];
  let carry = "";
  for (; ; ) {
    const m = balanced("{", "}", str);
    if (!m) {
      const tail = str.split(",");
      tail[0] = carry + tail[0];
      pushAll(parts, tail);
      return parts;
    }
    const { pre, body, post } = m;
    const p = pre.split(",");
    p[0] = carry + p[0];
    p[p.length - 1] += "{" + body + "}";
    if (!post.length) {
      pushAll(parts, p);
      return parts;
    }
    carry = p.pop();
    pushAll(parts, p);
    str = post;
  }
}
function expand(str, options = {}) {
  if (!str) {
    return [];
  }
  const { max = EXPANSION_MAX, maxLength = EXPANSION_MAX_LENGTH, maxDepth = EXPANSION_MAX_DEPTH, maxRewrites = EXPANSION_MAX_REWRITES } = options;
  if (str.slice(0, 2) === "{}") {
    str = "\\{\\}" + str.slice(2);
  }
  return expand_(escapeBraces(str), max, maxLength, maxDepth, 0, maxRewrites, true).map(unescapeBraces);
}
function embrace(str) {
  return "{" + str + "}";
}
function isPadded(el) {
  return /^-?0\d/.test(el);
}
function lte(i, y) {
  return i <= y;
}
function gte(i, y) {
  return i >= y;
}
function combine(acc, pre, values, max, maxLength, dropEmpties) {
  const out = [];
  let length = 0;
  for (let a = 0; a < acc.length; a++) {
    for (let v = 0; v < values.length; v++) {
      if (out.length >= max)
        return out;
      const expansion = acc[a] + pre + values[v];
      if (dropEmpties && !expansion)
        continue;
      if (length + expansion.length > maxLength)
        return out;
      out.push(expansion);
      length += expansion.length;
    }
  }
  return out;
}
function expandSequence(body, isAlphaSequence, max, maxLength) {
  const n = body.split(/\.\./);
  const N = [];
  if (n[0] === void 0 || n[1] === void 0) {
    return N;
  }
  const x = numeric(n[0]);
  const y = numeric(n[1]);
  const width = Math.max(n[0].length, n[1].length);
  let incr = n.length === 3 && n[2] !== void 0 ? Math.max(Math.abs(numeric(n[2])), 1) : 1;
  let test = lte;
  const reverse = y < x;
  if (reverse) {
    incr *= -1;
    test = gte;
  }
  const pad2 = n.some(isPadded);
  let length = 0;
  for (let i = x; test(i, y) && N.length < max; i += incr) {
    let c;
    if (isAlphaSequence) {
      c = String.fromCharCode(i);
      if (c === "\\") {
        c = "";
      }
    } else {
      c = String(i);
      if (pad2) {
        const need = width - c.length;
        if (need > 0) {
          const z = new Array(need + 1).join("0");
          if (i < 0) {
            c = "-" + z + c.slice(1);
          } else {
            c = z + c;
          }
        }
      }
    }
    if (length + c.length > maxLength)
      break;
    N.push(c);
    length += c.length;
  }
  return N;
}
function expand_(str, max, maxLength, maxDepth, depth, maxRewrites, isTop) {
  if (depth > maxDepth) {
    return [str];
  }
  let acc = [""];
  let rewrites = 0;
  let dropEmpties = false;
  let firstGroup = true;
  for (; ; ) {
    const m = balanced("{", "}", str);
    if (!m) {
      return combine(acc, str, [""], max, maxLength, dropEmpties);
    }
    const pre = m.pre;
    if (/\$$/.test(pre)) {
      acc = combine(acc, pre + "{" + m.body + "}", [""], max, maxLength, dropEmpties && !m.post.length);
      firstGroup = false;
      if (!m.post.length)
        break;
      str = m.post;
      continue;
    }
    const isNumericSequence = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(m.body);
    const isAlphaSequence = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(m.body);
    const isSequence = isNumericSequence || isAlphaSequence;
    const isOptions = m.body.indexOf(",") >= 0;
    if (!isSequence && !isOptions) {
      if (rewrites < maxRewrites && m.post.match(/,(?!,).*\}/)) {
        rewrites++;
        str = m.pre + "{" + m.body + escClose + m.post;
        isTop = true;
        continue;
      }
      return combine(acc, pre + "{" + m.body + "}" + m.post, [""], max, maxLength, dropEmpties);
    }
    if (firstGroup) {
      dropEmpties = isTop && !isSequence;
      firstGroup = false;
    }
    let values;
    if (isSequence) {
      values = expandSequence(m.body, isAlphaSequence, max, maxLength);
    } else {
      let n = parseCommaParts(m.body);
      if (n.length === 1 && n[0] !== void 0) {
        n = expand_(n[0], max, maxLength, maxDepth, depth + 1, maxRewrites, false).map(embrace);
        if (n.length === 1) {
          acc = combine(acc, pre + n[0], [""], max, maxLength, dropEmpties && !m.post.length);
          if (!m.post.length)
            break;
          str = m.post;
          continue;
        }
      }
      let dropsEmpties = dropEmpties && !m.post.length && !pre;
      for (let d = 0; dropsEmpties && d < acc.length; d++) {
        if (acc[d]) {
          dropsEmpties = false;
        }
      }
      values = [];
      let valuesLength = 0;
      outer: for (let j = 0; j < n.length; j++) {
        const expanded = expand_(n[j], max, maxLength, maxDepth, depth + 1, maxRewrites, false);
        for (let k = 0; k < expanded.length; k++) {
          const v = expanded[k];
          if (dropsEmpties && !v)
            continue;
          if (values.length >= max || valuesLength + v.length > maxLength) {
            break outer;
          }
          values.push(v);
          valuesLength += v.length;
        }
      }
    }
    acc = combine(acc, pre, values, max, maxLength, dropEmpties && !m.post.length);
    if (!m.post.length)
      break;
    str = m.post;
  }
  return acc;
}

// node_modules/minimatch/dist/esm/assert-valid-pattern.js
var MAX_PATTERN_LENGTH = 1024 * 64;
var assertValidPattern = (pattern) => {
  if (typeof pattern !== "string") {
    throw new TypeError("invalid pattern");
  }
  if (pattern.length > MAX_PATTERN_LENGTH) {
    throw new TypeError("pattern is too long");
  }
};

// node_modules/minimatch/dist/esm/brace-expressions.js
var posixClasses = {
  "[:alnum:]": ["\\p{L}\\p{Nl}\\p{Nd}", true],
  "[:alpha:]": ["\\p{L}\\p{Nl}", true],
  "[:ascii:]": ["\\x00-\\x7f", false],
  "[:blank:]": ["\\p{Zs}\\t", true],
  "[:cntrl:]": ["\\p{Cc}", true],
  "[:digit:]": ["\\p{Nd}", true],
  "[:graph:]": ["\\p{Z}\\p{C}", true, true],
  "[:lower:]": ["\\p{Ll}", true],
  "[:print:]": ["\\p{C}", true],
  "[:punct:]": ["\\p{P}", true],
  "[:space:]": ["\\p{Z}\\t\\r\\n\\v\\f", true],
  "[:upper:]": ["\\p{Lu}", true],
  "[:word:]": ["\\p{L}\\p{Nl}\\p{Nd}\\p{Pc}", true],
  "[:xdigit:]": ["A-Fa-f0-9", false]
};
var braceEscape = (s) => s.replace(/[[\]\\-]/g, "\\$&");
var regexpEscape = (s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
var rangesToString = (ranges) => ranges.join("");
var parseClass = (glob, position) => {
  const pos = position;
  if (glob.charAt(pos) !== "[") {
    throw new Error("not in a brace expression");
  }
  const ranges = [];
  const negs = [];
  let i = pos + 1;
  let sawStart = false;
  let uflag = false;
  let escaping = false;
  let negate = false;
  let endPos = pos;
  let rangeStart = "";
  WHILE: while (i < glob.length) {
    const c = glob.charAt(i);
    if ((c === "!" || c === "^") && i === pos + 1) {
      negate = true;
      i++;
      continue;
    }
    if (c === "]" && sawStart && !escaping) {
      endPos = i + 1;
      break;
    }
    sawStart = true;
    if (c === "\\") {
      if (!escaping) {
        escaping = true;
        i++;
        continue;
      }
    }
    if (c === "[" && !escaping) {
      for (const [cls, [unip, u, neg]] of Object.entries(posixClasses)) {
        if (glob.startsWith(cls, i)) {
          if (rangeStart) {
            return ["$.", false, glob.length - pos, true];
          }
          i += cls.length;
          if (neg)
            negs.push(unip);
          else
            ranges.push(unip);
          uflag = uflag || u;
          continue WHILE;
        }
      }
    }
    escaping = false;
    if (rangeStart) {
      if (c > rangeStart) {
        ranges.push(braceEscape(rangeStart) + "-" + braceEscape(c));
      } else if (c === rangeStart) {
        ranges.push(braceEscape(c));
      }
      rangeStart = "";
      i++;
      continue;
    }
    if (glob.startsWith("-]", i + 1)) {
      ranges.push(braceEscape(c + "-"));
      i += 2;
      continue;
    }
    if (glob.startsWith("-", i + 1)) {
      rangeStart = c;
      i += 2;
      continue;
    }
    ranges.push(braceEscape(c));
    i++;
  }
  if (endPos < i) {
    return ["", false, 0, false];
  }
  if (!ranges.length && !negs.length) {
    return ["$.", false, glob.length - pos, true];
  }
  if (negs.length === 0 && ranges.length === 1 && /^\\?.$/.test(ranges[0]) && !negate) {
    const r = ranges[0].length === 2 ? ranges[0].slice(-1) : ranges[0];
    return [regexpEscape(r), false, endPos - pos, false];
  }
  const sranges = "[" + (negate ? "^" : "") + rangesToString(ranges) + "]";
  const snegs = "[" + (negate ? "" : "^") + rangesToString(negs) + "]";
  const comb = ranges.length && negs.length ? "(" + sranges + "|" + snegs + ")" : ranges.length ? sranges : snegs;
  return [comb, uflag, endPos - pos, true];
};

// node_modules/minimatch/dist/esm/unescape.js
var unescape = (s, { windowsPathsNoEscape = false, magicalBraces = true } = {}) => {
  if (magicalBraces) {
    return windowsPathsNoEscape ? s.replace(/\[([^/\\])\]/g, "$1") : s.replace(/((?!\\).|^)\[([^/\\])\]/g, "$1$2").replace(/\\([^/])/g, "$1");
  }
  return windowsPathsNoEscape ? s.replace(/\[([^/\\{}])\]/g, "$1") : s.replace(/((?!\\).|^)\[([^/\\{}])\]/g, "$1$2").replace(/\\([^/{}])/g, "$1");
};

// node_modules/minimatch/dist/esm/ast.js
var _a;
var types = /* @__PURE__ */ new Set(["!", "?", "+", "*", "@"]);
var isExtglobType = (c) => types.has(c);
var isExtglobAST = (c) => isExtglobType(c.type);
var adoptionMap = /* @__PURE__ */ new Map([
  ["!", ["@"]],
  ["?", ["?", "@"]],
  ["@", ["@"]],
  ["*", ["*", "+", "?", "@"]],
  ["+", ["+", "@"]]
]);
var adoptionWithSpaceMap = /* @__PURE__ */ new Map([
  ["!", ["?"]],
  ["@", ["?"]],
  ["+", ["?", "*"]]
]);
var adoptionAnyMap = /* @__PURE__ */ new Map([
  ["!", ["?", "@"]],
  ["?", ["?", "@"]],
  ["@", ["?", "@"]],
  ["*", ["*", "+", "?", "@"]],
  ["+", ["+", "@", "?", "*"]]
]);
var usurpMap = /* @__PURE__ */ new Map([
  ["!", /* @__PURE__ */ new Map([["!", "@"]])],
  [
    "?",
    /* @__PURE__ */ new Map([
      ["*", "*"],
      ["+", "*"]
    ])
  ],
  [
    "@",
    /* @__PURE__ */ new Map([
      ["!", "!"],
      ["?", "?"],
      ["@", "@"],
      ["*", "*"],
      ["+", "+"]
    ])
  ],
  [
    "+",
    /* @__PURE__ */ new Map([
      ["?", "*"],
      ["*", "*"]
    ])
  ]
]);
var startNoTraversal = "(?!(?:^|/)\\.\\.?(?:$|/))";
var startNoDot = "(?!\\.)";
var addPatternStart = /* @__PURE__ */ new Set(["[", "."]);
var justDots = /* @__PURE__ */ new Set(["..", "."]);
var reSpecials = new Set("().*{}+?[]^$\\!");
var regExpEscape = (s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
var qmark = "[^/]";
var star = qmark + "*?";
var starNoEmpty = qmark + "+?";
var ID = 0;
var AST = class {
  type;
  #root;
  #hasMagic;
  #uflag = false;
  #parts = [];
  #parent;
  #parentIndex;
  #negs;
  #filledNegs = false;
  #options;
  #toString;
  // set to true if it's an extglob with no children
  // (which really means one child of '')
  #emptyExt = false;
  id = ++ID;
  get depth() {
    return (this.#parent?.depth ?? -1) + 1;
  }
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return {
      "@@type": "AST",
      id: this.id,
      type: this.type,
      root: this.#root.id,
      parent: this.#parent?.id,
      depth: this.depth,
      partsLength: this.#parts.length,
      parts: this.#parts
    };
  }
  constructor(type, parent, options = {}) {
    this.type = type;
    if (type)
      this.#hasMagic = true;
    this.#parent = parent;
    this.#root = this.#parent ? this.#parent.#root : this;
    this.#options = this.#root === this ? options : this.#root.#options;
    this.#negs = this.#root === this ? [] : this.#root.#negs;
    if (type === "!" && !this.#root.#filledNegs)
      this.#negs.push(this);
    this.#parentIndex = this.#parent ? this.#parent.#parts.length : 0;
  }
  get hasMagic() {
    if (this.#hasMagic !== void 0)
      return this.#hasMagic;
    for (const p of this.#parts) {
      if (typeof p === "string")
        continue;
      if (p.type || p.hasMagic)
        return this.#hasMagic = true;
    }
    return this.#hasMagic;
  }
  // reconstructs the pattern
  toString() {
    return this.#toString !== void 0 ? this.#toString : !this.type ? this.#toString = this.#parts.map((p) => String(p)).join("") : this.#toString = this.type + "(" + this.#parts.map((p) => String(p)).join("|") + ")";
  }
  #fillNegs() {
    if (this !== this.#root)
      throw new Error("should only call on root");
    if (this.#filledNegs)
      return this;
    this.toString();
    this.#filledNegs = true;
    let n;
    while (n = this.#negs.pop()) {
      if (n.type !== "!")
        continue;
      let p = n;
      let pp = p.#parent;
      while (pp) {
        for (let i = p.#parentIndex + 1; !pp.type && i < pp.#parts.length; i++) {
          for (const part of n.#parts) {
            if (typeof part === "string") {
              throw new Error("string part in extglob AST??");
            }
            part.copyIn(pp.#parts[i]);
          }
        }
        p = pp;
        pp = p.#parent;
      }
    }
    return this;
  }
  push(...parts) {
    for (const p of parts) {
      if (p === "")
        continue;
      if (typeof p !== "string" && !(p instanceof _a && p.#parent === this)) {
        throw new Error("invalid part: " + p);
      }
      this.#parts.push(p);
    }
  }
  toJSON() {
    const ret = this.type === null ? this.#parts.slice().map((p) => typeof p === "string" ? p : p.toJSON()) : [this.type, ...this.#parts.map((p) => p.toJSON())];
    if (this.isStart() && !this.type)
      ret.unshift([]);
    if (this.isEnd() && (this === this.#root || this.#root.#filledNegs && this.#parent?.type === "!")) {
      ret.push({});
    }
    return ret;
  }
  isStart() {
    if (this.#root === this)
      return true;
    if (!this.#parent?.isStart())
      return false;
    if (this.#parentIndex === 0)
      return true;
    const p = this.#parent;
    for (let i = 0; i < this.#parentIndex; i++) {
      const pp = p.#parts[i];
      if (!(pp instanceof _a && pp.type === "!")) {
        return false;
      }
    }
    return true;
  }
  isEnd() {
    if (this.#root === this)
      return true;
    if (this.#parent?.type === "!")
      return true;
    if (!this.#parent?.isEnd())
      return false;
    if (!this.type)
      return this.#parent?.isEnd();
    const pl = this.#parent ? this.#parent.#parts.length : 0;
    return this.#parentIndex === pl - 1;
  }
  copyIn(part) {
    if (typeof part === "string")
      this.push(part);
    else
      this.push(part.clone(this));
  }
  clone(parent) {
    const c = new _a(this.type, parent);
    for (const p of this.#parts) {
      c.copyIn(p);
    }
    return c;
  }
  static #parseAST(str, ast, pos, opt, extDepth) {
    const maxDepth = opt.maxExtglobRecursion ?? 2;
    let escaping = false;
    let inBrace = false;
    let braceStart = -1;
    let braceNeg = false;
    if (ast.type === null) {
      let i2 = pos;
      let acc2 = "";
      while (i2 < str.length) {
        const c = str.charAt(i2++);
        if (escaping || c === "\\") {
          escaping = !escaping;
          acc2 += c;
          continue;
        }
        if (inBrace) {
          if (i2 === braceStart + 1) {
            if (c === "^" || c === "!") {
              braceNeg = true;
            }
          } else if (c === "]" && !(i2 === braceStart + 2 && braceNeg)) {
            inBrace = false;
          }
          acc2 += c;
          continue;
        } else if (c === "[") {
          inBrace = true;
          braceStart = i2;
          braceNeg = false;
          acc2 += c;
          continue;
        }
        const doRecurse = !opt.noext && isExtglobType(c) && str.charAt(i2) === "(" && extDepth <= maxDepth;
        if (doRecurse) {
          ast.push(acc2);
          acc2 = "";
          const ext3 = new _a(c, ast);
          i2 = _a.#parseAST(str, ext3, i2, opt, extDepth + 1);
          ast.push(ext3);
          continue;
        }
        acc2 += c;
      }
      ast.push(acc2);
      return i2;
    }
    let i = pos + 1;
    let part = new _a(null, ast);
    const parts = [];
    let acc = "";
    while (i < str.length) {
      const c = str.charAt(i++);
      if (escaping || c === "\\") {
        escaping = !escaping;
        acc += c;
        continue;
      }
      if (inBrace) {
        if (i === braceStart + 1) {
          if (c === "^" || c === "!") {
            braceNeg = true;
          }
        } else if (c === "]" && !(i === braceStart + 2 && braceNeg)) {
          inBrace = false;
        }
        acc += c;
        continue;
      } else if (c === "[") {
        inBrace = true;
        braceStart = i;
        braceNeg = false;
        acc += c;
        continue;
      }
      const doRecurse = !opt.noext && isExtglobType(c) && str.charAt(i) === "(" && /* c8 ignore start - the maxDepth is sufficient here */
      (extDepth <= maxDepth || ast && ast.#canAdoptType(c));
      if (doRecurse) {
        const depthAdd = ast && ast.#canAdoptType(c) ? 0 : 1;
        part.push(acc);
        acc = "";
        const ext3 = new _a(c, part);
        part.push(ext3);
        i = _a.#parseAST(str, ext3, i, opt, extDepth + depthAdd);
        continue;
      }
      if (c === "|") {
        part.push(acc);
        acc = "";
        parts.push(part);
        part = new _a(null, ast);
        continue;
      }
      if (c === ")") {
        if (acc === "" && ast.#parts.length === 0) {
          ast.#emptyExt = true;
        }
        part.push(acc);
        acc = "";
        ast.push(...parts, part);
        return i;
      }
      acc += c;
    }
    ast.type = null;
    ast.#hasMagic = void 0;
    ast.#parts = [str.substring(pos - 1)];
    return i;
  }
  #canAdoptWithSpace(child) {
    return this.#canAdopt(child, adoptionWithSpaceMap);
  }
  #canAdopt(child, map = adoptionMap) {
    if (!child || typeof child !== "object" || child.type !== null || child.#parts.length !== 1 || this.type === null) {
      return false;
    }
    const gc = child.#parts[0];
    if (!gc || typeof gc !== "object" || gc.type === null) {
      return false;
    }
    return this.#canAdoptType(gc.type, map);
  }
  #canAdoptType(c, map = adoptionAnyMap) {
    return !!map.get(this.type)?.includes(c);
  }
  #adoptWithSpace(child, index) {
    const gc = child.#parts[0];
    const blank = new _a(null, gc, this.options);
    blank.#parts.push("");
    gc.push(blank);
    this.#adopt(child, index);
  }
  #adopt(child, index) {
    const gc = child.#parts[0];
    this.#parts.splice(index, 1, ...gc.#parts);
    for (const p of gc.#parts) {
      if (typeof p === "object")
        p.#parent = this;
    }
    this.#toString = void 0;
  }
  #canUsurpType(c) {
    const m = usurpMap.get(this.type);
    return !!m?.has(c);
  }
  #canUsurp(child) {
    if (!child || typeof child !== "object" || child.type !== null || child.#parts.length !== 1 || this.type === null || this.#parts.length !== 1) {
      return false;
    }
    const gc = child.#parts[0];
    if (!gc || typeof gc !== "object" || gc.type === null) {
      return false;
    }
    return this.#canUsurpType(gc.type);
  }
  #usurp(child) {
    const m = usurpMap.get(this.type);
    const gc = child.#parts[0];
    const nt = m?.get(gc.type);
    if (!nt)
      return false;
    this.#parts = gc.#parts;
    for (const p of this.#parts) {
      if (typeof p === "object") {
        p.#parent = this;
      }
    }
    this.type = nt;
    this.#toString = void 0;
    this.#emptyExt = false;
  }
  static fromGlob(pattern, options = {}) {
    const ast = new _a(null, void 0, options);
    _a.#parseAST(pattern, ast, 0, options, 0);
    return ast;
  }
  // returns the regular expression if there's magic, or the unescaped
  // string if not.
  toMMPattern() {
    if (this !== this.#root)
      return this.#root.toMMPattern();
    const glob = this.toString();
    const [re, body, hasMagic, uflag] = this.toRegExpSource();
    const anyMagic = hasMagic || this.#hasMagic || this.#options.nocase && !this.#options.nocaseMagicOnly && glob.toUpperCase() !== glob.toLowerCase();
    if (!anyMagic) {
      return body;
    }
    const flags = (this.#options.nocase ? "i" : "") + (uflag ? "u" : "");
    return Object.assign(new RegExp(`^${re}$`, flags), {
      _src: re,
      _glob: glob
    });
  }
  get options() {
    return this.#options;
  }
  // returns the string match, the regexp source, whether there's magic
  // in the regexp (so a regular expression is required) and whether or
  // not the uflag is needed for the regular expression (for posix classes)
  // TODO: instead of injecting the start/end at this point, just return
  // the BODY of the regexp, along with the start/end portions suitable
  // for binding the start/end in either a joined full-path makeRe context
  // (where we bind to (^|/), or a standalone matchPart context (where
  // we bind to ^, and not /).  Otherwise slashes get duped!
  //
  // In part-matching mode, the start is:
  // - if not isStart: nothing
  // - if traversal possible, but not allowed: ^(?!\.\.?$)
  // - if dots allowed or not possible: ^
  // - if dots possible and not allowed: ^(?!\.)
  // end is:
  // - if not isEnd(): nothing
  // - else: $
  //
  // In full-path matching mode, we put the slash at the START of the
  // pattern, so start is:
  // - if first pattern: same as part-matching mode
  // - if not isStart(): nothing
  // - if traversal possible, but not allowed: /(?!\.\.?(?:$|/))
  // - if dots allowed or not possible: /
  // - if dots possible and not allowed: /(?!\.)
  // end is:
  // - if last pattern, same as part-matching mode
  // - else nothing
  //
  // Always put the (?:$|/) on negated tails, though, because that has to be
  // there to bind the end of the negated pattern portion, and it's easier to
  // just stick it in now rather than try to inject it later in the middle of
  // the pattern.
  //
  // We can just always return the same end, and leave it up to the caller
  // to know whether it's going to be used joined or in parts.
  // And, if the start is adjusted slightly, can do the same there:
  // - if not isStart: nothing
  // - if traversal possible, but not allowed: (?:/|^)(?!\.\.?$)
  // - if dots allowed or not possible: (?:/|^)
  // - if dots possible and not allowed: (?:/|^)(?!\.)
  //
  // But it's better to have a simpler binding without a conditional, for
  // performance, so probably better to return both start options.
  //
  // Then the caller just ignores the end if it's not the first pattern,
  // and the start always gets applied.
  //
  // But that's always going to be $ if it's the ending pattern, or nothing,
  // so the caller can just attach $ at the end of the pattern when building.
  //
  // So the todo is:
  // - better detect what kind of start is needed
  // - return both flavors of starting pattern
  // - attach $ at the end of the pattern when creating the actual RegExp
  //
  // Ah, but wait, no, that all only applies to the root when the first pattern
  // is not an extglob. If the first pattern IS an extglob, then we need all
  // that dot prevention biz to live in the extglob portions, because eg
  // +(*|.x*) can match .xy but not .yx.
  //
  // So, return the two flavors if it's #root and the first child is not an
  // AST, otherwise leave it to the child AST to handle it, and there,
  // use the (?:^|/) style of start binding.
  //
  // Even simplified further:
  // - Since the start for a join is eg /(?!\.) and the start for a part
  // is ^(?!\.), we can just prepend (?!\.) to the pattern (either root
  // or start or whatever) and prepend ^ or / at the Regexp construction.
  toRegExpSource(allowDot) {
    const dot = allowDot ?? !!this.#options.dot;
    if (this.#root === this) {
      this.#flatten();
      this.#fillNegs();
    }
    if (!isExtglobAST(this)) {
      const noEmpty = this.isStart() && this.isEnd() && !this.#parts.some((s) => typeof s !== "string");
      const src = this.#parts.map((p) => {
        const [re, _, hasMagic, uflag] = typeof p === "string" ? _a.#parseGlob(p, this.#hasMagic, noEmpty) : p.toRegExpSource(allowDot);
        this.#hasMagic = this.#hasMagic || hasMagic;
        this.#uflag = this.#uflag || uflag;
        return re;
      }).join("");
      let start2 = "";
      if (this.isStart()) {
        if (typeof this.#parts[0] === "string") {
          const dotTravAllowed = this.#parts.length === 1 && justDots.has(this.#parts[0]);
          if (!dotTravAllowed) {
            const aps = addPatternStart;
            const needNoTrav = (
              // dots are allowed, and the pattern starts with [ or .
              dot && aps.has(src.charAt(0)) || // the pattern starts with \., and then [ or .
              src.startsWith("\\.") && aps.has(src.charAt(2)) || // the pattern starts with \.\., and then [ or .
              src.startsWith("\\.\\.") && aps.has(src.charAt(4))
            );
            const needNoDot = !dot && !allowDot && aps.has(src.charAt(0));
            start2 = needNoTrav ? startNoTraversal : needNoDot ? startNoDot : "";
          }
        }
      }
      let end = "";
      if (this.isEnd() && this.#root.#filledNegs && this.#parent?.type === "!") {
        end = "(?:$|\\/)";
      }
      const final2 = start2 + src + end;
      return [
        final2,
        unescape(src),
        this.#hasMagic = !!this.#hasMagic,
        this.#uflag
      ];
    }
    const repeated = this.type === "*" || this.type === "+";
    const start = this.type === "!" ? "(?:(?!(?:" : "(?:";
    let body = this.#partsToRegExp(dot);
    if (this.isStart() && this.isEnd() && !body && this.type !== "!") {
      const s = this.toString();
      const me = this;
      me.#parts = [s];
      me.type = null;
      me.#hasMagic = void 0;
      return [s, unescape(this.toString()), false, false];
    }
    let bodyDotAllowed = !repeated || allowDot || dot || !startNoDot ? "" : this.#partsToRegExp(true);
    if (bodyDotAllowed === body) {
      bodyDotAllowed = "";
    }
    if (bodyDotAllowed) {
      body = `(?:${body})(?:${bodyDotAllowed})*?`;
    }
    let final = "";
    if (this.type === "!" && this.#emptyExt) {
      final = (this.isStart() && !dot ? startNoDot : "") + starNoEmpty;
    } else {
      const close = this.type === "!" ? (
        // !() must match something,but !(x) can match ''
        "))" + (this.isStart() && !dot && !allowDot ? startNoDot : "") + star + ")"
      ) : this.type === "@" ? ")" : this.type === "?" ? ")?" : this.type === "+" && bodyDotAllowed ? ")" : this.type === "*" && bodyDotAllowed ? `)?` : `)${this.type}`;
      final = start + body + close;
    }
    return [
      final,
      unescape(body),
      this.#hasMagic = !!this.#hasMagic,
      this.#uflag
    ];
  }
  #flatten() {
    if (!isExtglobAST(this)) {
      for (const p of this.#parts) {
        if (typeof p === "object") {
          p.#flatten();
        }
      }
    } else {
      let iterations = 0;
      let done = false;
      do {
        done = true;
        for (let i = 0; i < this.#parts.length; i++) {
          const c = this.#parts[i];
          if (typeof c === "object") {
            c.#flatten();
            if (this.#canAdopt(c)) {
              done = false;
              this.#adopt(c, i);
            } else if (this.#canAdoptWithSpace(c)) {
              done = false;
              this.#adoptWithSpace(c, i);
            } else if (this.#canUsurp(c)) {
              done = false;
              this.#usurp(c);
            }
          }
        }
      } while (!done && ++iterations < 10);
    }
    this.#toString = void 0;
  }
  #partsToRegExp(dot) {
    return this.#parts.map((p) => {
      if (typeof p === "string") {
        throw new Error("string type in extglob ast??");
      }
      const [re, _, _hasMagic, uflag] = p.toRegExpSource(dot);
      this.#uflag = this.#uflag || uflag;
      return re;
    }).filter((p) => !(this.isStart() && this.isEnd()) || !!p).join("|");
  }
  static #parseGlob(glob, hasMagic, noEmpty = false) {
    let escaping = false;
    let re = "";
    let uflag = false;
    let inStar = false;
    for (let i = 0; i < glob.length; i++) {
      const c = glob.charAt(i);
      if (escaping) {
        escaping = false;
        re += (reSpecials.has(c) ? "\\" : "") + c;
        continue;
      }
      if (c === "*") {
        if (inStar)
          continue;
        inStar = true;
        re += noEmpty && /^[*]+$/.test(glob) ? starNoEmpty : star;
        hasMagic = true;
        continue;
      } else {
        inStar = false;
      }
      if (c === "\\") {
        if (i === glob.length - 1) {
          re += "\\\\";
        } else {
          escaping = true;
        }
        continue;
      }
      if (c === "[") {
        const [src, needUflag, consumed, magic] = parseClass(glob, i);
        if (consumed) {
          re += src;
          uflag = uflag || needUflag;
          i += consumed - 1;
          hasMagic = hasMagic || magic;
          continue;
        }
      }
      if (c === "?") {
        re += qmark;
        hasMagic = true;
        continue;
      }
      re += regExpEscape(c);
    }
    return [re, unescape(glob), !!hasMagic, uflag];
  }
};
_a = AST;

// node_modules/minimatch/dist/esm/escape.js
var escape = (s, { windowsPathsNoEscape = false, magicalBraces = false } = {}) => {
  if (magicalBraces) {
    return windowsPathsNoEscape ? s.replace(/[?*()[\]{}]/g, "[$&]") : s.replace(/[?*()[\]\\{}]/g, "\\$&");
  }
  return windowsPathsNoEscape ? s.replace(/[?*()[\]]/g, "[$&]") : s.replace(/[?*()[\]\\]/g, "\\$&");
};

// node_modules/minimatch/dist/esm/index.js
var minimatch = (p, pattern, options = {}) => {
  assertValidPattern(pattern);
  if (!options.nocomment && pattern.charAt(0) === "#") {
    return false;
  }
  return new Minimatch(pattern, options).match(p);
};
var starDotExtRE = /^\*+([^+@!?*[(]*)$/;
var starDotExtTest = (ext3) => (f2) => !f2.startsWith(".") && f2.endsWith(ext3);
var starDotExtTestDot = (ext3) => (f2) => f2.endsWith(ext3);
var starDotExtTestNocase = (ext3) => {
  ext3 = ext3.toLowerCase();
  return (f2) => !f2.startsWith(".") && f2.toLowerCase().endsWith(ext3);
};
var starDotExtTestNocaseDot = (ext3) => {
  ext3 = ext3.toLowerCase();
  return (f2) => f2.toLowerCase().endsWith(ext3);
};
var starDotStarRE = /^\*+\.\*+$/;
var starDotStarTest = (f2) => !f2.startsWith(".") && f2.includes(".");
var starDotStarTestDot = (f2) => f2 !== "." && f2 !== ".." && f2.includes(".");
var dotStarRE = /^\.\*+$/;
var dotStarTest = (f2) => f2 !== "." && f2 !== ".." && f2.startsWith(".");
var starRE = /^\*+$/;
var starTest = (f2) => f2.length !== 0 && !f2.startsWith(".");
var starTestDot = (f2) => f2.length !== 0 && f2 !== "." && f2 !== "..";
var qmarksRE = /^\?+([^+@!?*[(]*)?$/;
var qmarksTestNocase = ([$0, ext3 = ""]) => {
  const noext = qmarksTestNoExt([$0]);
  if (!ext3)
    return noext;
  ext3 = ext3.toLowerCase();
  return (f2) => noext(f2) && f2.toLowerCase().endsWith(ext3);
};
var qmarksTestNocaseDot = ([$0, ext3 = ""]) => {
  const noext = qmarksTestNoExtDot([$0]);
  if (!ext3)
    return noext;
  ext3 = ext3.toLowerCase();
  return (f2) => noext(f2) && f2.toLowerCase().endsWith(ext3);
};
var qmarksTestDot = ([$0, ext3 = ""]) => {
  const noext = qmarksTestNoExtDot([$0]);
  return !ext3 ? noext : (f2) => noext(f2) && f2.endsWith(ext3);
};
var qmarksTest = ([$0, ext3 = ""]) => {
  const noext = qmarksTestNoExt([$0]);
  return !ext3 ? noext : (f2) => noext(f2) && f2.endsWith(ext3);
};
var qmarksTestNoExt = ([$0]) => {
  const len = $0.length;
  return (f2) => f2.length === len && !f2.startsWith(".");
};
var qmarksTestNoExtDot = ([$0]) => {
  const len = $0.length;
  return (f2) => f2.length === len && f2 !== "." && f2 !== "..";
};
var defaultPlatform = typeof process === "object" && process ? typeof process.env === "object" && process.env && process.env.__MINIMATCH_TESTING_PLATFORM__ || process.platform : "posix";
var path = {
  win32: { sep: "\\" },
  posix: { sep: "/" }
};
var sep = defaultPlatform === "win32" ? path.win32.sep : path.posix.sep;
minimatch.sep = sep;
var GLOBSTAR = Symbol("globstar **");
minimatch.GLOBSTAR = GLOBSTAR;
var qmark2 = "[^/]";
var star2 = qmark2 + "*?";
var twoStarDot = "(?:(?!(?:\\/|^)(?:\\.{1,2})($|\\/)).)*?";
var twoStarNoDot = "(?:(?!(?:\\/|^)\\.).)*?";
var filter = (pattern, options = {}) => (p) => minimatch(p, pattern, options);
minimatch.filter = filter;
var ext = (a, b = {}) => Object.assign({}, a, b);
var defaults = (def) => {
  if (!def || typeof def !== "object" || !Object.keys(def).length) {
    return minimatch;
  }
  const orig = minimatch;
  const m = (p, pattern, options = {}) => orig(p, pattern, ext(def, options));
  return Object.assign(m, {
    Minimatch: class Minimatch extends orig.Minimatch {
      constructor(pattern, options = {}) {
        super(pattern, ext(def, options));
      }
      static defaults(options) {
        return orig.defaults(ext(def, options)).Minimatch;
      }
    },
    AST: class AST extends orig.AST {
      /* c8 ignore start */
      constructor(type, parent, options = {}) {
        super(type, parent, ext(def, options));
      }
      /* c8 ignore stop */
      static fromGlob(pattern, options = {}) {
        return orig.AST.fromGlob(pattern, ext(def, options));
      }
    },
    unescape: (s, options = {}) => orig.unescape(s, ext(def, options)),
    escape: (s, options = {}) => orig.escape(s, ext(def, options)),
    filter: (pattern, options = {}) => orig.filter(pattern, ext(def, options)),
    defaults: (options) => orig.defaults(ext(def, options)),
    makeRe: (pattern, options = {}) => orig.makeRe(pattern, ext(def, options)),
    braceExpand: (pattern, options = {}) => orig.braceExpand(pattern, ext(def, options)),
    match: (list, pattern, options = {}) => orig.match(list, pattern, ext(def, options)),
    sep: orig.sep,
    GLOBSTAR
  });
};
minimatch.defaults = defaults;
var braceExpand = (pattern, options = {}) => {
  assertValidPattern(pattern);
  if (options.nobrace || !/\{(?:(?!\{).)*\}/.test(pattern)) {
    return [pattern];
  }
  return expand(pattern, { max: options.braceExpandMax });
};
minimatch.braceExpand = braceExpand;
var makeRe = (pattern, options = {}) => new Minimatch(pattern, options).makeRe();
minimatch.makeRe = makeRe;
var match = (list, pattern, options = {}) => {
  const mm = new Minimatch(pattern, options);
  list = list.filter((f2) => mm.match(f2));
  if (mm.options.nonull && !list.length) {
    list.push(pattern);
  }
  return list;
};
minimatch.match = match;
var globMagic = /[?*]|[+@!]\(.*?\)|\[|\]/;
var regExpEscape2 = (s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
var Minimatch = class {
  options;
  set;
  pattern;
  windowsPathsNoEscape;
  nonegate;
  negate;
  comment;
  empty;
  preserveMultipleSlashes;
  partial;
  globSet;
  globParts;
  nocase;
  isWindows;
  platform;
  windowsNoMagicRoot;
  maxGlobstarRecursion;
  regexp;
  constructor(pattern, options = {}) {
    assertValidPattern(pattern);
    options = options || {};
    this.options = options;
    this.maxGlobstarRecursion = options.maxGlobstarRecursion ?? 200;
    this.pattern = pattern;
    this.platform = options.platform || defaultPlatform;
    this.isWindows = this.platform === "win32";
    const awe = "allowWindowsEscape";
    this.windowsPathsNoEscape = !!options.windowsPathsNoEscape || options[awe] === false;
    if (this.windowsPathsNoEscape) {
      this.pattern = this.pattern.replace(/\\/g, "/");
    }
    this.preserveMultipleSlashes = !!options.preserveMultipleSlashes;
    this.regexp = null;
    this.negate = false;
    this.nonegate = !!options.nonegate;
    this.comment = false;
    this.empty = false;
    this.partial = !!options.partial;
    this.nocase = !!this.options.nocase;
    this.windowsNoMagicRoot = options.windowsNoMagicRoot !== void 0 ? options.windowsNoMagicRoot : !!(this.isWindows && this.nocase);
    this.globSet = [];
    this.globParts = [];
    this.set = [];
    this.make();
  }
  hasMagic() {
    if (this.options.magicalBraces && this.set.length > 1) {
      return true;
    }
    for (const pattern of this.set) {
      for (const part of pattern) {
        if (typeof part !== "string")
          return true;
      }
    }
    return false;
  }
  debug(..._) {
  }
  make() {
    const pattern = this.pattern;
    const options = this.options;
    if (!options.nocomment && pattern.charAt(0) === "#") {
      this.comment = true;
      return;
    }
    if (!pattern) {
      this.empty = true;
      return;
    }
    this.parseNegate();
    this.globSet = [...new Set(this.braceExpand())];
    if (options.debug) {
      this.debug = (...args) => console.error(...args);
    }
    this.debug(this.pattern, this.globSet);
    const rawGlobParts = this.globSet.map((s) => this.slashSplit(s));
    this.globParts = this.preprocess(rawGlobParts);
    this.debug(this.pattern, this.globParts);
    let set = this.globParts.map((s, _, __) => {
      if (this.isWindows && this.windowsNoMagicRoot) {
        const isUNC = s[0] === "" && s[1] === "" && (s[2] === "?" || !globMagic.test(s[2])) && !globMagic.test(s[3]);
        const isDrive = /^[a-z]:/i.test(s[0]);
        if (isUNC) {
          return [
            ...s.slice(0, 4),
            ...s.slice(4).map((ss) => this.parse(ss))
          ];
        } else if (isDrive) {
          return [s[0], ...s.slice(1).map((ss) => this.parse(ss))];
        }
      }
      return s.map((ss) => this.parse(ss));
    });
    this.debug(this.pattern, set);
    this.set = set.filter((s) => s.indexOf(false) === -1);
    if (this.isWindows) {
      for (let i = 0; i < this.set.length; i++) {
        const p = this.set[i];
        if (p[0] === "" && p[1] === "" && this.globParts[i][2] === "?" && typeof p[3] === "string" && /^[a-z]:$/i.test(p[3])) {
          p[2] = "?";
        }
      }
    }
    this.debug(this.pattern, this.set);
  }
  // various transforms to equivalent pattern sets that are
  // faster to process in a filesystem walk.  The goal is to
  // eliminate what we can, and push all ** patterns as far
  // to the right as possible, even if it increases the number
  // of patterns that we have to process.
  preprocess(globParts) {
    if (this.options.noglobstar) {
      for (const partset of globParts) {
        for (let j = 0; j < partset.length; j++) {
          if (partset[j] === "**") {
            partset[j] = "*";
          }
        }
      }
    }
    const { optimizationLevel = 1 } = this.options;
    if (optimizationLevel >= 2) {
      globParts = this.firstPhasePreProcess(globParts);
      globParts = this.secondPhasePreProcess(globParts);
    } else if (optimizationLevel >= 1) {
      globParts = this.levelOneOptimize(globParts);
    } else {
      globParts = this.adjascentGlobstarOptimize(globParts);
    }
    return globParts;
  }
  // just get rid of adjascent ** portions
  adjascentGlobstarOptimize(globParts) {
    return globParts.map((parts) => {
      let gs = -1;
      while (-1 !== (gs = parts.indexOf("**", gs + 1))) {
        let i = gs;
        while (parts[i + 1] === "**") {
          i++;
        }
        if (i !== gs) {
          parts.splice(gs, i - gs);
        }
      }
      return parts;
    });
  }
  // get rid of adjascent ** and resolve .. portions
  levelOneOptimize(globParts) {
    return globParts.map((parts) => {
      parts = parts.reduce((set, part) => {
        const prev = set[set.length - 1];
        if (part === "**" && prev === "**") {
          return set;
        }
        if (part === "..") {
          if (prev && prev !== ".." && prev !== "." && prev !== "**") {
            set.pop();
            return set;
          }
        }
        set.push(part);
        return set;
      }, []);
      return parts.length === 0 ? [""] : parts;
    });
  }
  levelTwoFileOptimize(parts) {
    if (!Array.isArray(parts)) {
      parts = this.slashSplit(parts);
    }
    let didSomething = false;
    do {
      didSomething = false;
      if (!this.preserveMultipleSlashes) {
        for (let i = 1; i < parts.length - 1; i++) {
          const p = parts[i];
          if (i === 1 && p === "" && parts[0] === "")
            continue;
          if (p === "." || p === "") {
            didSomething = true;
            parts.splice(i, 1);
            i--;
          }
        }
        if (parts[0] === "." && parts.length === 2 && (parts[1] === "." || parts[1] === "")) {
          didSomething = true;
          parts.pop();
        }
      }
      let dd = 0;
      while (-1 !== (dd = parts.indexOf("..", dd + 1))) {
        const p = parts[dd - 1];
        if (p && p !== "." && p !== ".." && p !== "**" && !(this.isWindows && /^[a-z]:$/i.test(p))) {
          didSomething = true;
          parts.splice(dd - 1, 2);
          dd -= 2;
        }
      }
    } while (didSomething);
    return parts.length === 0 ? [""] : parts;
  }
  // First phase: single-pattern processing
  // <pre> is 1 or more portions
  // <rest> is 1 or more portions
  // <p> is any portion other than ., .., '', or **
  // <e> is . or ''
  //
  // **/.. is *brutal* for filesystem walking performance, because
  // it effectively resets the recursive walk each time it occurs,
  // and ** cannot be reduced out by a .. pattern part like a regexp
  // or most strings (other than .., ., and '') can be.
  //
  // <pre>/**/../<p>/<p>/<rest> -> {<pre>/../<p>/<p>/<rest>,<pre>/**/<p>/<p>/<rest>}
  // <pre>/<e>/<rest> -> <pre>/<rest>
  // <pre>/<p>/../<rest> -> <pre>/<rest>
  // **/**/<rest> -> **/<rest>
  //
  // **/*/<rest> -> */**/<rest> <== not valid because ** doesn't follow
  // this WOULD be allowed if ** did follow symlinks, or * didn't
  firstPhasePreProcess(globParts) {
    let didSomething = false;
    do {
      didSomething = false;
      for (let parts of globParts) {
        let gs = -1;
        while (-1 !== (gs = parts.indexOf("**", gs + 1))) {
          let gss = gs;
          while (parts[gss + 1] === "**") {
            gss++;
          }
          if (gss > gs) {
            parts.splice(gs + 1, gss - gs);
          }
          let next = parts[gs + 1];
          const p = parts[gs + 2];
          const p2 = parts[gs + 3];
          if (next !== "..")
            continue;
          if (!p || p === "." || p === ".." || !p2 || p2 === "." || p2 === "..") {
            continue;
          }
          didSomething = true;
          parts.splice(gs, 1);
          const other = parts.slice(0);
          other[gs] = "**";
          globParts.push(other);
          gs--;
        }
        if (!this.preserveMultipleSlashes) {
          for (let i = 1; i < parts.length - 1; i++) {
            const p = parts[i];
            if (i === 1 && p === "" && parts[0] === "")
              continue;
            if (p === "." || p === "") {
              didSomething = true;
              parts.splice(i, 1);
              i--;
            }
          }
          if (parts[0] === "." && parts.length === 2 && (parts[1] === "." || parts[1] === "")) {
            didSomething = true;
            parts.pop();
          }
        }
        let dd = 0;
        while (-1 !== (dd = parts.indexOf("..", dd + 1))) {
          const p = parts[dd - 1];
          if (p && p !== "." && p !== ".." && p !== "**") {
            didSomething = true;
            const needDot = dd === 1 && parts[dd + 1] === "**";
            const splin = needDot ? ["."] : [];
            parts.splice(dd - 1, 2, ...splin);
            if (parts.length === 0)
              parts.push("");
            dd -= 2;
          }
        }
      }
    } while (didSomething);
    return globParts;
  }
  // second phase: multi-pattern dedupes
  // {<pre>/*/<rest>,<pre>/<p>/<rest>} -> <pre>/*/<rest>
  // {<pre>/<rest>,<pre>/<rest>} -> <pre>/<rest>
  // {<pre>/**/<rest>,<pre>/<rest>} -> <pre>/**/<rest>
  //
  // {<pre>/**/<rest>,<pre>/**/<p>/<rest>} -> <pre>/**/<rest>
  // ^-- not valid because ** doens't follow symlinks
  secondPhasePreProcess(globParts) {
    for (let i = 0; i < globParts.length - 1; i++) {
      for (let j = i + 1; j < globParts.length; j++) {
        const matched = this.partsMatch(globParts[i], globParts[j], !this.preserveMultipleSlashes);
        if (matched) {
          globParts[i] = [];
          globParts[j] = matched;
          break;
        }
      }
    }
    return globParts.filter((gs) => gs.length);
  }
  partsMatch(a, b, emptyGSMatch = false) {
    let ai = 0;
    let bi = 0;
    let result = [];
    let which = "";
    while (ai < a.length && bi < b.length) {
      if (a[ai] === b[bi]) {
        result.push(which === "b" ? b[bi] : a[ai]);
        ai++;
        bi++;
      } else if (emptyGSMatch && a[ai] === "**" && b[bi] === a[ai + 1]) {
        result.push(a[ai]);
        ai++;
      } else if (emptyGSMatch && b[bi] === "**" && a[ai] === b[bi + 1]) {
        result.push(b[bi]);
        bi++;
      } else if (a[ai] === "*" && b[bi] && (this.options.dot || !b[bi].startsWith(".")) && b[bi] !== "**") {
        if (which === "b")
          return false;
        which = "a";
        result.push(a[ai]);
        ai++;
        bi++;
      } else if (b[bi] === "*" && a[ai] && (this.options.dot || !a[ai].startsWith(".")) && a[ai] !== "**") {
        if (which === "a")
          return false;
        which = "b";
        result.push(b[bi]);
        ai++;
        bi++;
      } else {
        return false;
      }
    }
    return a.length === b.length && result;
  }
  parseNegate() {
    if (this.nonegate)
      return;
    const pattern = this.pattern;
    let negate = false;
    let negateOffset = 0;
    for (let i = 0; i < pattern.length && pattern.charAt(i) === "!"; i++) {
      negate = !negate;
      negateOffset++;
    }
    if (negateOffset)
      this.pattern = pattern.slice(negateOffset);
    this.negate = negate;
  }
  // set partial to true to test if, for example,
  // "/a/b" matches the start of "/*/b/*/d"
  // Partial means, if you run out of file before you run
  // out of pattern, then that's fine, as long as all
  // the parts match.
  matchOne(file, pattern, partial = false) {
    let fileStartIndex = 0;
    let patternStartIndex = 0;
    if (this.isWindows) {
      const fileDrive = typeof file[0] === "string" && /^[a-z]:$/i.test(file[0]);
      const fileUNC = !fileDrive && file[0] === "" && file[1] === "" && file[2] === "?" && /^[a-z]:$/i.test(file[3]);
      const patternDrive = typeof pattern[0] === "string" && /^[a-z]:$/i.test(pattern[0]);
      const patternUNC = !patternDrive && pattern[0] === "" && pattern[1] === "" && pattern[2] === "?" && typeof pattern[3] === "string" && /^[a-z]:$/i.test(pattern[3]);
      const fdi = fileUNC ? 3 : fileDrive ? 0 : void 0;
      const pdi = patternUNC ? 3 : patternDrive ? 0 : void 0;
      if (typeof fdi === "number" && typeof pdi === "number") {
        const [fd, pd] = [
          file[fdi],
          pattern[pdi]
        ];
        if (fd.toLowerCase() === pd.toLowerCase()) {
          pattern[pdi] = fd;
          patternStartIndex = pdi;
          fileStartIndex = fdi;
        }
      }
    }
    const { optimizationLevel = 1 } = this.options;
    if (optimizationLevel >= 2) {
      file = this.levelTwoFileOptimize(file);
    }
    if (pattern.includes(GLOBSTAR)) {
      return this.#matchGlobstar(file, pattern, partial, fileStartIndex, patternStartIndex);
    }
    return this.#matchOne(file, pattern, partial, fileStartIndex, patternStartIndex);
  }
  #matchGlobstar(file, pattern, partial, fileIndex, patternIndex) {
    const firstgs = pattern.indexOf(GLOBSTAR, patternIndex);
    const lastgs = pattern.lastIndexOf(GLOBSTAR);
    const [head, body, tail] = partial ? [
      pattern.slice(patternIndex, firstgs),
      pattern.slice(firstgs + 1),
      []
    ] : [
      pattern.slice(patternIndex, firstgs),
      pattern.slice(firstgs + 1, lastgs),
      pattern.slice(lastgs + 1)
    ];
    if (head.length) {
      const fileHead = file.slice(fileIndex, fileIndex + head.length);
      if (!this.#matchOne(fileHead, head, partial, 0, 0)) {
        return false;
      }
      fileIndex += head.length;
      patternIndex += head.length;
    }
    let fileTailMatch = 0;
    if (tail.length) {
      if (tail.length + fileIndex > file.length)
        return false;
      let tailStart = file.length - tail.length;
      if (this.#matchOne(file, tail, partial, tailStart, 0)) {
        fileTailMatch = tail.length;
      } else {
        if (file[file.length - 1] !== "" || fileIndex + tail.length === file.length) {
          return false;
        }
        tailStart--;
        if (!this.#matchOne(file, tail, partial, tailStart, 0)) {
          return false;
        }
        fileTailMatch = tail.length + 1;
      }
    }
    if (!body.length) {
      let sawSome = !!fileTailMatch;
      for (let i2 = fileIndex; i2 < file.length - fileTailMatch; i2++) {
        const f2 = String(file[i2]);
        sawSome = true;
        if (f2 === "." || f2 === ".." || !this.options.dot && f2.startsWith(".")) {
          return false;
        }
      }
      return partial || sawSome;
    }
    const bodySegments = [[[], 0]];
    let currentBody = bodySegments[0];
    let nonGsParts = 0;
    const nonGsPartsSums = [0];
    for (const b of body) {
      if (b === GLOBSTAR) {
        nonGsPartsSums.push(nonGsParts);
        currentBody = [[], 0];
        bodySegments.push(currentBody);
      } else {
        currentBody[0].push(b);
        nonGsParts++;
      }
    }
    let i = bodySegments.length - 1;
    const fileLength = file.length - fileTailMatch;
    for (const b of bodySegments) {
      b[1] = fileLength - (nonGsPartsSums[i--] + b[0].length);
    }
    return !!this.#matchGlobStarBodySections(file, bodySegments, fileIndex, 0, partial, 0, !!fileTailMatch);
  }
  // return false for "nope, not matching"
  // return null for "not matching, cannot keep trying"
  #matchGlobStarBodySections(file, bodySegments, fileIndex, bodyIndex, partial, globStarDepth, sawTail) {
    const bs = bodySegments[bodyIndex];
    if (!bs) {
      for (let i = fileIndex; i < file.length; i++) {
        sawTail = true;
        const f2 = file[i];
        if (f2 === "." || f2 === ".." || !this.options.dot && f2.startsWith(".")) {
          return false;
        }
      }
      return sawTail;
    }
    const [body, after] = bs;
    while (fileIndex <= after) {
      const m = this.#matchOne(file.slice(0, fileIndex + body.length), body, partial, fileIndex, 0);
      if (m && globStarDepth < this.maxGlobstarRecursion) {
        const sub = this.#matchGlobStarBodySections(file, bodySegments, fileIndex + body.length, bodyIndex + 1, partial, globStarDepth + 1, sawTail);
        if (sub !== false) {
          return sub;
        }
      }
      const f2 = file[fileIndex];
      if (f2 === "." || f2 === ".." || !this.options.dot && f2.startsWith(".")) {
        return false;
      }
      fileIndex++;
    }
    return partial || null;
  }
  #matchOne(file, pattern, partial, fileIndex, patternIndex) {
    let fi;
    let pi;
    let pl;
    let fl;
    for (fi = fileIndex, pi = patternIndex, fl = file.length, pl = pattern.length; fi < fl && pi < pl; fi++, pi++) {
      this.debug("matchOne loop");
      let p = pattern[pi];
      let f2 = file[fi];
      this.debug(pattern, p, f2);
      if (p === false || p === GLOBSTAR) {
        return false;
      }
      let hit;
      if (typeof p === "string") {
        hit = f2 === p;
        this.debug("string match", p, f2, hit);
      } else {
        hit = p.test(f2);
        this.debug("pattern match", p, f2, hit);
      }
      if (!hit)
        return false;
    }
    if (fi === fl && pi === pl) {
      return true;
    } else if (fi === fl) {
      return partial;
    } else if (pi === pl) {
      return fi === fl - 1 && file[fi] === "";
    } else {
      throw new Error("wtf?");
    }
  }
  braceExpand() {
    return braceExpand(this.pattern, this.options);
  }
  parse(pattern) {
    assertValidPattern(pattern);
    const options = this.options;
    if (pattern === "**")
      return GLOBSTAR;
    if (pattern === "")
      return "";
    let m;
    let fastTest = null;
    if (m = pattern.match(starRE)) {
      fastTest = options.dot ? starTestDot : starTest;
    } else if (m = pattern.match(starDotExtRE)) {
      fastTest = (options.nocase ? options.dot ? starDotExtTestNocaseDot : starDotExtTestNocase : options.dot ? starDotExtTestDot : starDotExtTest)(m[1]);
    } else if (m = pattern.match(qmarksRE)) {
      fastTest = (options.nocase ? options.dot ? qmarksTestNocaseDot : qmarksTestNocase : options.dot ? qmarksTestDot : qmarksTest)(m);
    } else if (m = pattern.match(starDotStarRE)) {
      fastTest = options.dot ? starDotStarTestDot : starDotStarTest;
    } else if (m = pattern.match(dotStarRE)) {
      fastTest = dotStarTest;
    }
    const re = AST.fromGlob(pattern, this.options).toMMPattern();
    if (fastTest && typeof re === "object") {
      Reflect.defineProperty(re, "test", { value: fastTest });
    }
    return re;
  }
  makeRe() {
    if (this.regexp || this.regexp === false)
      return this.regexp;
    const set = this.set;
    if (!set.length) {
      this.regexp = false;
      return this.regexp;
    }
    const options = this.options;
    const twoStar = options.noglobstar ? star2 : options.dot ? twoStarDot : twoStarNoDot;
    const flags = new Set(options.nocase ? ["i"] : []);
    let re = set.map((pattern) => {
      const pp = pattern.map((p) => {
        if (p instanceof RegExp) {
          for (const f2 of p.flags.split(""))
            flags.add(f2);
        }
        return typeof p === "string" ? regExpEscape2(p) : p === GLOBSTAR ? GLOBSTAR : p._src;
      });
      pp.forEach((p, i) => {
        const next = pp[i + 1];
        const prev = pp[i - 1];
        if (p !== GLOBSTAR || prev === GLOBSTAR) {
          return;
        }
        if (prev === void 0) {
          if (next !== void 0 && next !== GLOBSTAR) {
            pp[i + 1] = "(?:\\/|" + twoStar + "\\/)?" + next;
          } else {
            pp[i] = twoStar;
          }
        } else if (next === void 0) {
          pp[i - 1] = prev + "(?:\\/|\\/" + twoStar + ")?";
        } else if (next !== GLOBSTAR) {
          pp[i - 1] = prev + "(?:\\/|\\/" + twoStar + "\\/)" + next;
          pp[i + 1] = GLOBSTAR;
        }
      });
      const filtered = pp.filter((p) => p !== GLOBSTAR);
      if (this.partial && filtered.length >= 1) {
        const prefixes2 = [];
        for (let i = 1; i <= filtered.length; i++) {
          prefixes2.push(filtered.slice(0, i).join("/"));
        }
        return "(?:" + prefixes2.join("|") + ")";
      }
      return filtered.join("/");
    }).join("|");
    const [open, close] = set.length > 1 ? ["(?:", ")"] : ["", ""];
    re = "^" + open + re + close + "$";
    if (this.partial) {
      re = "^(?:\\/|" + open + re.slice(1, -1) + close + ")$";
    }
    if (this.negate)
      re = "^(?!" + re + ").+$";
    try {
      this.regexp = new RegExp(re, [...flags].join(""));
    } catch {
      this.regexp = false;
    }
    return this.regexp;
  }
  slashSplit(p) {
    if (this.preserveMultipleSlashes) {
      return p.split("/");
    } else if (this.isWindows && /^\/\/[^/]+/.test(p)) {
      return ["", ...p.split(/\/+/)];
    } else {
      return p.split(/\/+/);
    }
  }
  match(f2, partial = this.partial) {
    this.debug("match", f2, this.pattern);
    if (this.comment) {
      return false;
    }
    if (this.empty) {
      return f2 === "";
    }
    if (f2 === "/" && partial) {
      return true;
    }
    const options = this.options;
    if (this.isWindows) {
      f2 = f2.split("\\").join("/");
    }
    const ff = this.slashSplit(f2);
    this.debug(this.pattern, "split", ff);
    const set = this.set;
    this.debug(this.pattern, "set", set);
    let filename = ff[ff.length - 1];
    if (!filename) {
      for (let i = ff.length - 2; !filename && i >= 0; i--) {
        filename = ff[i];
      }
    }
    for (const pattern of set) {
      let file = ff;
      if (options.matchBase && pattern.length === 1) {
        file = [filename];
      }
      const hit = this.matchOne(file, pattern, partial);
      if (hit) {
        if (options.flipNegate) {
          return true;
        }
        return !this.negate;
      }
    }
    if (options.flipNegate) {
      return false;
    }
    return this.negate;
  }
  static defaults(def) {
    return minimatch.defaults(def).Minimatch;
  }
};
minimatch.AST = AST;
minimatch.Minimatch = Minimatch;
minimatch.escape = escape;
minimatch.unescape = unescape;

// src/hosts.ts
var HOSTS = {
  "cf-pages": {
    id: "cf-pages",
    name: "Cloudflare Pages",
    command: "wrangler pages deploy <dir>",
    skips: "only _worker.js, _redirects, _headers, _routes.json, functions/, .DS_Store, node_modules, .git, .wrangler \u2014 not .env, not .gitignore",
    source: "https://github.com/cloudflare/workers-sdk/blob/main/packages/wrangler/src/pages/validate.ts"
  },
  "cf-workers": {
    id: "cf-workers",
    name: "Cloudflare Workers assets",
    command: "wrangler deploy  ([assets] directory)",
    skips: "only .assetsignore, _redirects, _headers + whatever .assetsignore lists \u2014 even .git ships",
    source: "https://github.com/cloudflare/workers-sdk/blob/main/packages/workers-shared/utils/helpers.ts"
  },
  vercel: {
    id: "vercel",
    name: "Vercel",
    command: "vercel [deploy] [dir]",
    skips: ".git, node_modules, .env.local, .env.*.local, .vercel \u2026 + .vercelignore \u2014 not .env, not .env.production, not .gitignore",
    source: "https://github.com/vercel/vercel/blob/main/packages/client/src/utils/index.ts"
  },
  netlify: {
    id: "netlify",
    name: "Netlify",
    command: "netlify deploy --dir <dir>",
    skips: "every dotfile and dot-directory (except .well-known), __MACOSX, _redirects, _headers, node_modules at the site root",
    source: "https://github.com/netlify/cli/blob/main/src/commands/deploy/deploy.ts"
  },
  firebase: {
    id: "firebase",
    name: "Firebase Hosting",
    command: "firebase deploy --only hosting",
    skips: "only firebase-debug.log and .firebase/ + hosting.ignore in firebase.json \u2014 dotfiles included (dot: true)",
    source: "https://github.com/firebase/firebase-tools/blob/main/src/listFiles.ts"
  },
  "github-pages": {
    id: "github-pages",
    name: "GitHub Pages (Actions)",
    command: "actions/upload-pages-artifact",
    skips: ".git, .github, and every dotfile unless include-hidden-files: true",
    source: "https://github.com/actions/upload-pages-artifact/blob/main/action.yml"
  },
  "gh-pages": {
    id: "gh-pages",
    name: "gh-pages (npm)",
    command: "gh-pages -d <dir>",
    skips: "dotfiles unless --dotfiles; node_modules is NOT skipped",
    source: "https://github.com/tschaub/gh-pages/blob/main/lib/index.js"
  },
  surge: {
    id: "surge",
    name: "Surge",
    command: "surge <dir> <domain>",
    skips: ".git, every dotfile and dot-directory, *.*~, node_modules, bower_components + .surgeignore (which can un-ignore with !)",
    source: "https://github.com/sintaxi/surge-sdk/blob/master/stream/lib/stream.js"
  }
};
var HOST_IDS = Object.keys(HOSTS);
function isHostId(s) {
  return HOST_IDS.includes(s);
}
var segs = (p) => p.split("/");
var prefixes = (p) => {
  const s = segs(p);
  return s.map((_, i) => s.slice(0, i + 1).join("/"));
};
var PAGES_IGNORE = ["_worker.js", "_redirects", "_headers", "_routes.json", "functions", "**/.DS_Store", "**/node_modules", "**/.git", ".wrangler"];
var PAGES_MM = PAGES_IGNORE.map((p) => new Minimatch(p));
var PAGES_WHY = {
  "_worker.js": "uploaded as Worker code, not as an asset",
  _redirects: "parsed as config",
  _headers: "parsed as config",
  "_routes.json": "parsed as config",
  functions: "built into Functions, not served"
};
function cfPages() {
  return (path2) => {
    for (const pre of prefixes(path2)) {
      for (const mm of PAGES_MM) {
        if (mm.match(pre)) {
          const why = PAGES_WHY[mm.pattern] ?? `wrangler IGNORE_LIST "${mm.pattern}"`;
          return { fate: "home", why };
        }
      }
    }
    return { fate: "public" };
  };
}
function cfWorkers(input) {
  const patterns = ["/.assetsignore", "/_redirects", "/_headers"];
  if (input.assetsignore !== void 0) patterns.push(...input.assetsignore.split("\n"));
  const ig = (0, import_ignore.default)().add(patterns);
  const userIg = input.assetsignore !== void 0 ? (0, import_ignore.default)().add(input.assetsignore.split("\n")) : void 0;
  return (path2) => {
    if (ig.test(path2).ignored) {
      const why = userIg?.test(path2).ignored ? ".assetsignore" : "assets metafile";
      return { fate: "home", why };
    }
    return { fate: "public" };
  };
}
var VERCEL_DEFAULT_IGNORES = [
  ".hg",
  ".git",
  ".gitmodules",
  ".svn",
  ".cache",
  ".next",
  ".now",
  ".vercel",
  ".npmignore",
  ".dockerignore",
  ".gitignore",
  ".*.swp",
  ".DS_Store",
  ".wafpicke-*",
  ".lock-wscript",
  ".env.local",
  ".env.*.local",
  ".venv",
  ".yarn/cache",
  ".pnp*",
  "npm-debug.log",
  "config.gypi",
  "node_modules",
  "__pycache__",
  "venv",
  "CVS"
];
var clearRelative = (s) => s.replace(/(\n|^)\.\//g, "$1");
function vercel(input, hasCargo) {
  const defaults2 = [...VERCEL_DEFAULT_IGNORES, ...hasCargo ? ["/target"] : []];
  const ig = (0, import_ignore.default)().add(`${defaults2.join("\n")}
${clearRelative(input.vercelignore ?? "")}`);
  const defIg = (0, import_ignore.default)().add(defaults2.join("\n"));
  const served = input.opts.vercelStatic === false ? "uploaded" : "public";
  return (path2) => {
    for (const pre of prefixes(path2)) {
      if (ig.ignores(pre)) return { fate: "home", why: defIg.ignores(pre) ? "Vercel default ignore" : ".vercelignore" };
    }
    return { fate: served };
  };
}
function netlify(input) {
  const skipNodeModules = input.opts.netlifyAtRoot !== false;
  return (path2) => {
    for (const base2 of segs(path2)) {
      if (skipNodeModules && base2 === "node_modules") return { fate: "home", why: "node_modules at the site root" };
      if (base2.startsWith(".") && base2 !== ".well-known") return { fate: "home", why: "Netlify skips dotfiles" };
      if (base2.startsWith("__MACOSX")) return { fate: "home", why: "__MACOSX" };
      if (base2 === "_redirects" || base2 === "_headers") return { fate: "home", why: "bundled into config" };
    }
    return { fate: "public" };
  };
}
var FIREBASE_BUILTIN = ["**/firebase-debug.log", "**/firebase-debug.*.log", ".firebase/*"];
function firebase(input) {
  const user = input.opts.firebaseIgnore ?? [];
  const mms = [...FIREBASE_BUILTIN, ...user].map((p) => ({ p, mm: new Minimatch(p.replace(/^\.\//, ""), { dot: true }), builtin: FIREBASE_BUILTIN.includes(p) }));
  return (path2) => {
    for (const { p, mm, builtin } of mms) {
      if (mm.match(path2) || p.endsWith("/**") && prefixes(path2).some((pre) => mm.match(pre + "/"))) {
        return { fate: "home", why: builtin ? "firebase-tools built-in ignore" : `hosting.ignore "${p}"` };
      }
    }
    return { fate: "public" };
  };
}
function githubPages(input) {
  const hidden = input.opts.includeHiddenFiles === true;
  return (path2) => {
    for (const base2 of segs(path2)) {
      if (base2 === ".git" || base2 === ".github") return { fate: "home", why: "always excluded by upload-pages-artifact" };
      if (!hidden && base2.startsWith(".") && base2.length > 1) return { fate: "home", why: "hidden files excluded (include-hidden-files: false)" };
    }
    return { fate: "public" };
  };
}
function ghPages(input) {
  const dot = input.opts.ghPagesDotfiles === true;
  return (path2) => {
    if (!dot && segs(path2).some((s) => s.startsWith("."))) return { fate: "home", why: "gh-pages skips dotfiles (no --dotfiles)" };
    return { fate: "public" };
  };
}
var SURGE_DEFAULT_IGNORES = [".git", ".*", "*.*~", "node_modules", "bower_components"];
function surge(input) {
  const ig = (0, import_ignore.default)().add(SURGE_DEFAULT_IGNORES);
  if (input.surgeignore) ig.add(input.surgeignore);
  const defIg = (0, import_ignore.default)().add(SURGE_DEFAULT_IGNORES);
  const why = (rel) => !defIg.ignores(rel) ? ".surgeignore" : /(^|\/)\.[^/]*\/?$/.test(rel) ? "Surge skips dotfiles" : /~$/.test(rel) ? "Surge skips editor backups (*.*~)" : `Surge default ignore`;
  return (path2) => {
    const s = segs(path2);
    for (let i = 1; i < s.length; i++) {
      const dir = s.slice(0, i).join("/") + "/";
      if (ig.ignores(dir)) return { fate: "home", why: why(dir) };
    }
    if (ig.ignores(path2)) return { fate: "home", why: why(path2) };
    return { fate: "public" };
  };
}
function hostFilter(host, input, ctx = {}) {
  switch (host) {
    case "cf-pages":
      return cfPages();
    case "cf-workers":
      return cfWorkers(input);
    case "vercel":
      return vercel(input, !!ctx.hasCargo);
    case "netlify":
      return netlify(input);
    case "firebase":
      return firebase(input);
    case "github-pages":
      return githubPages(input);
    case "gh-pages":
      return ghPages(input);
    case "surge":
      return surge(input);
  }
}

// src/format.ts
var id = (s) => s;
var plain = { leak: id, risk: id, info: id, ok: id, dim: id, bold: id, path: id };
function ansi() {
  const w = (a, b) => (s) => `\x1B[${a}m${s}\x1B[${b}m`;
  return { leak: w("1;38;5;196", "0"), risk: w("38;5;214", "39"), info: w("2", "22"), ok: w("38;5;35", "39"), dim: w("2", "22"), bold: w("1", "22"), path: w("38;5;117", "39") };
}
function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  const u = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < u.length - 1) v /= 1024, i++;
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${u[i]}`;
}
var pad = (s, n) => s + " ".repeat(Math.max(0, n - visible(s).length));
var visible = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");
var sev = (st, s) => s === "LEAK" ? st.leak(" LEAK ") : s === "RISK" ? st.risk(" RISK ") : st.info(" info ");
function secretLines(st, secrets, indent) {
  const out = [];
  const w = Math.min(28, Math.max(...secrets.map((s) => s.name.length), 4));
  const pw = Math.min(24, Math.max(...secrets.map((s) => s.provider.length), 8));
  const sw = Math.min(26, Math.max(...secrets.map((s) => s.shape.length), 12));
  for (const s of secrets.slice(0, 12)) {
    out.push(`${indent}${st.bold(pad(s.name, w))}  ${pad(s.provider, pw)}  ${st.dim(pad(s.shape, sw))}  ${st.dim("sha256:" + s.fingerprint)}`);
    if (s.rotate) out.push(`${indent}${" ".repeat(w + 2)}${st.dim("rotate \u2192")} ${s.rotate}`);
  }
  if (secrets.length > 12) out.push(`${indent}${st.dim(`\u2026 ${secrets.length - 12} more`)}`);
  return out;
}
function findingLines(st, f2, showFix = true, pw = 30) {
  const out = [`  ${sev(st, f2.severity)} ${st.path(pad(f2.path, pw))} ${st.dim(pad(fmtBytes(f2.size), 8))} ${f2.title} \u2014 ${f2.detail}`];
  if (f2.secrets.length) out.push(...secretLines(st, f2.secrets, "         "));
  if (showFix && f2.fix && f2.severity !== "INFO") out.push(`         ${st.dim("fix:")} ${f2.fix}`);
  return out;
}
function deploymentText(st, r, o) {
  const d = r.deployment;
  const out = [];
  const base2 = o.root && o.root !== "." ? o.root.replace(/\/+$/, "") + "/" : "";
  const dir = d.dir === "." ? base2 || "./" : base2 + d.dir + "/";
  out.push(`${st.bold("airing")} \xB7 ${st.bold(r.hostName)} \xB7 ${st.path(dir)}  ${st.dim(`(${d.source})`)}`);
  const goes = r.totals.public + r.totals.uploaded;
  const verb = r.totals.uploaded && !r.totals.public ? "upload" : "go public";
  out.push(`  ${goes} file${goes === 1 ? "" : "s"} ${verb} \xB7 ${r.totals.home} stay${r.totals.home === 1 ? "s" : ""} home`);
  if (!r.totals.files) out.push(`  ${st.risk("this directory is empty or missing \u2014 is the build output there yet?")}`);
  const shown = r.findings.filter((f2) => o.all || f2.severity !== "INFO");
  if (shown.length) out.push("");
  const pw = Math.min(44, Math.max(30, ...shown.map((f2) => f2.path.length + 1)));
  for (const f2 of shown) out.push(...findingLines(st, f2, false, pw));
  const hidden = r.findings.length - shown.length;
  if (hidden) out.push(st.dim(`  + ${hidden} info note${hidden === 1 ? "" : "s"} (--all to show)`));
  if (r.remedy) {
    out.push("");
    if (r.remedy.say) out.push(`  ${st.bold("keep it home:")} ${r.remedy.say}`);
    if (r.remedy.lines?.length) out.push(...r.remedy.lines.slice(0, 12).map((l) => `      ${st.path(l)}`));
    for (const n of r.remedy.notes ?? []) out.push(`  ${st.bold("also:")} ${n}`);
  }
  if (r.savedByHost.length) {
    out.push("");
    out.push(`  ${st.ok("saved by the host:")} ${r.savedByHost.slice(0, 6).map((s) => `${s.path} ${st.dim(`(${s.why})`)}`).join(", ")}${r.savedByHost.length > 6 ? st.dim(` +${r.savedByHost.length - 6}`) : ""}`);
  }
  return out;
}
function formatScan(r, st = plain, o = {}) {
  const out = [];
  if (r.matrix) out.push(...matrixText(st, r, o));
  else
    for (const [i, d] of r.deployments.entries()) {
      if (i) out.push("");
      out.push(...deploymentText(st, d, o));
    }
  out.push("");
  out.push(verdict(st, r, o));
  return out.join("\n");
}
function verdict(st, r, o = {}) {
  const all = r.deployments.flatMap((d) => d.findings);
  const leaks = all.filter((f2) => f2.severity === "LEAK").length;
  const risks = all.filter((f2) => f2.severity === "RISK").length;
  if (r.matrix) {
    const worst = [...r.deployments].sort((a, b) => b.findings.filter((f2) => f2.severity === "LEAK").length - a.findings.filter((f2) => f2.severity === "LEAK").length)[0];
    const n = worst?.findings.filter((f2) => f2.severity === "LEAK").length ?? 0;
    if (!n && !risks) return st.ok("\u2713 nothing secret would go public on any host.") + st.dim(" airing only reads; nothing was uploaded.");
    const riskyFiles = new Set(all.filter((f2) => f2.severity === "RISK").map((f2) => f2.path)).size;
    if (!n) return st.risk(`! no secrets, but ${riskyFiles} risky file${riskyFiles === 1 ? "" : "s"} on every host that serves ${riskyFiles === 1 ? "it" : "them"}.`) + st.dim(` details: airing ${o.root && o.root !== "." ? o.root + " " : ""}--host <id>`);
    return st.leak(`\u2717 worst host: ${worst.hostName} would publish ${n} leak${n === 1 ? "" : "s"}.`) + st.dim(` fixes: airing ${o.root && o.root !== "." ? o.root + " " : ""}--host ${worst.deployment.host}${o.matrix ? "" : "   (no deploy config found, so every host was checked)"}`);
  }
  if (leaks) return st.leak(`\u2717 ${leaks} leak${leaks === 1 ? "" : "s"} would be public.`) + st.dim(" nothing was uploaded \u2014 airing only reads. Fix, then deploy.");
  if (risks) return st.risk(`! no secrets, ${risks} risk${risks === 1 ? "" : "s"} worth a look.`) + st.dim(" exit 0 (use --fail-on risk to block)");
  return st.ok("\u2713 clean: nothing secret in the upload set.") + st.dim(" airing only reads; nothing was uploaded.");
}
var SHORT = { "cf-pages": "CF Pages", "cf-workers": "CF Workers", vercel: "Vercel", netlify: "Netlify", firebase: "Firebase", "github-pages": "GH Pages", "gh-pages": "gh-pages", surge: "Surge" };
function matrixRows(r) {
  const rows = /* @__PURE__ */ new Map();
  for (const d of r.deployments) {
    for (const f2 of d.findings) {
      if (f2.severity === "INFO") continue;
      const row = rows.get(f2.path) ?? { label: f2.path, secretish: false, cells: /* @__PURE__ */ new Map() };
      if (/vercel/.test(d.deployment.host) && /uploaded to Vercel/.test(f2.detail)) row.secretish = true;
      const prev = row.cells.get(d.deployment.host);
      if (!prev?.sev || f2.severity === "LEAK" && prev.sev !== "LEAK") row.cells.set(d.deployment.host, { sev: f2.severity });
      if (f2.secrets.length && !/\(/.test(row.label)) row.label = `${f2.path} (${f2.secrets.length} secret${f2.secrets.length === 1 ? "" : "s"})`;
      rows.set(f2.path, row);
    }
  }
  for (const d of r.deployments)
    for (const s of d.savedByHost) {
      const row = rows.get(s.path);
      if (row && !row.cells.has(d.deployment.host)) row.cells.set(d.deployment.host, { home: true });
    }
  return [...rows.values()];
}
function fitLabel(label, max) {
  if (label.length <= max) return label;
  const m = / \(\d+ secrets?\)$/.exec(label);
  const tag = m ? m[0] : "";
  const path2 = label.slice(0, label.length - tag.length);
  const room = max - tag.length;
  const slash = path2.lastIndexOf("/", path2.length - 2);
  const head = slash > 0 ? path2.slice(0, path2.indexOf("/") + 1) : "";
  const tail = slash > 0 ? path2.slice(slash) : path2;
  const short = head && head.length + 1 + tail.length <= room ? head + "\u2026" + tail : "\u2026" + path2.slice(-(room - 1));
  return room > 4 ? short + tag : label.slice(0, max - 1) + "\u2026";
}
function matrixText(st, r, _o) {
  const out = [];
  const dir = r.deployments[0]?.deployment.dir ?? ".";
  out.push(`${st.bold("airing")} \xB7 ${st.path(r.root)}${dir !== "." ? st.path("/" + dir) : ""} \xB7 ${st.dim(_o.matrix ? "--matrix: what each host would hang out in public" : "no deploy config found, so here is what each host would hang out in public")}`);
  out.push("");
  const rows = matrixRows(r);
  if (!rows.length) {
    out.push(st.ok("  every host: nothing secret in this folder."));
    return out;
  }
  const w = Math.min(34, Math.max(...rows.map((x) => x.label.length), 10)) + 2;
  out.push(("  " + pad("", w) + r.deployments.map((d, i, all) => st.dim(i === all.length - 1 ? SHORT[d.deployment.host] : pad(SHORT[d.deployment.host], 11))).join("")).trimEnd());
  for (const row of rows) {
    const cells = r.deployments.map((d) => {
      const c = row.cells.get(d.deployment.host);
      const uploadOnly = d.deployment.host === "vercel" && d.deployment.opts.vercelStatic === false && row.secretish;
      const txt = !c || c.home ? "home" : uploadOnly ? "upload" : c.sev === "LEAK" ? "PUBLIC" : "risk";
      const styled = txt === "PUBLIC" ? st.leak(txt) : txt === "home" ? st.ok(txt) : st.risk(txt);
      return styled + " ".repeat(Math.max(0, 11 - txt.length));
    });
    out.push(("  " + st.path(pad(fitLabel(row.label, w - 2), w)) + cells.join("")).trimEnd());
  }
  return out;
}
function formatMarkdown(r) {
  const out = [];
  for (const d of r.deployments) {
    const leaks = d.findings.filter((f2) => f2.severity === "LEAK");
    out.push(`### airing \xB7 ${d.hostName} \xB7 \`${d.deployment.dir}/\` \u2014 ${leaks.length ? `\u274C ${leaks.length} leak${leaks.length === 1 ? "" : "s"}` : "\u2705 no secrets"}`);
    out.push("");
    out.push(`${d.totals.public + d.totals.uploaded} files go out, ${d.totals.home} stay home (${d.deployment.source}).`);
    const shown = d.findings.filter((f2) => f2.severity !== "INFO");
    if (shown.length) {
      out.push("", "| | path | what | fix |", "|---|---|---|---|");
      for (const f2 of shown) {
        const sec = f2.secrets.length ? `<br>${f2.secrets.map((s) => `\`${s.name}\` (${s.provider}, sha256:${s.fingerprint})`).join(", ")}` : "";
        out.push(`| ${f2.severity} | \`${f2.path}\` | ${f2.title} \u2014 ${f2.detail}${sec} | ${f2.fix} |`);
      }
    }
    out.push("");
  }
  return out.join("\n");
}
function formatProbe(r, st = plain, o = {}) {
  const out = [];
  out.push(`${st.bold("airing probe")} \xB7 ${st.path(r.target)}`);
  if (r.unreachable) {
    out.push("", `  ${st.risk(r.errors[0] ?? "could not reach the site")}`, "");
    out.push(st.risk("? nothing was checked.") + st.dim(" is the URL right and the site deployed? (only probe sites you own)"));
    return out.join("\n");
  }
  out.push(`  ${r.checked} GET request${r.checked === 1 ? "" : "s"} \xB7 ${st.dim(r.notFound.note)}`);
  const shown = r.findings.filter((f2) => o.all || f2.severity !== "INFO");
  if (shown.length) out.push("");
  const ppw = Math.min(52, Math.max(30, ...shown.map((f2) => f2.path.length + 1)));
  for (const f2 of shown) {
    out.push(`  ${sev(st, f2.severity)} ${st.path(pad(f2.path, ppw))} ${st.dim(pad(fmtBytes(f2.size), 8))} ${f2.title} \u2014 ${f2.detail}`);
    if (f2.secrets.length) out.push(...secretLines(st, f2.secrets, "         "));
    if (f2.severity !== "INFO") out.push(`         ${st.dim("fix:")} ${f2.fix}`);
  }
  const hidden = r.findings.length - shown.length;
  if (hidden) out.push(st.dim(`  + ${hidden} info note${hidden === 1 ? "" : "s"} (--all to show)`));
  if (r.errors.length) {
    out.push("");
    for (const e of r.errors.slice(0, 5)) out.push(`  ${st.dim("no answer:")} ${e}`);
    if (r.errors.length > 5) out.push(st.dim(`  + ${r.errors.length - 5} more requests failed \u2014 try --timeout 20`));
  }
  out.push("");
  const leaks = r.findings.filter((f2) => f2.severity === "LEAK").length;
  if (!r.checked || r.errors.length && r.checked <= r.errors.length) out.push(st.risk("? could not reach the site \u2014 nothing was checked."));
  else if (leaks) out.push(st.leak(`\u2717 ${leaks} thing${leaks === 1 ? "" : "s"} anyone can download right now.`) + st.dim(" rotate before you fix \u2014 it has been public."));
  else if (shown.length) out.push(st.risk("! nothing secret reachable, but look at the risks above."));
  else out.push(st.ok("\u2713 nothing exposed at the usual paths.") + st.dim(" (a probe checks ~40 known paths, not every file \u2014 run `airing <dir>` before deploying)"));
  return out.join("\n");
}

// src/mcp.ts
import { createInterface } from "node:readline";
import { resolve as resolve3 } from "node:path";

// src/sha256.ts
var K = new Uint32Array([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]);
function sha256Hex(input) {
  const msg = new TextEncoder().encode(input);
  const l = msg.length;
  const withPad = l + 9 + 63 >> 6 << 6;
  const buf = new Uint8Array(withPad);
  buf.set(msg);
  buf[l] = 128;
  const view = new DataView(buf.buffer);
  view.setUint32(withPad - 4, l * 8 >>> 0);
  view.setUint32(withPad - 8, Math.floor(l * 8 / 2 ** 32));
  const h = new Uint32Array([1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225]);
  const w = new Uint32Array(64);
  const rotr = (x, n) => x >>> n | x << 32 - n;
  for (let off = 0; off < withPad; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ w[i - 15] >>> 3;
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ w[i - 2] >>> 10;
      w[i] = w[i - 16] + s0 + w[i - 7] + s1 >>> 0;
    }
    let [a, b, c, d, e, f2, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = e & f2 ^ ~e & g;
      const t1 = hh + S1 + ch + K[i] + w[i] >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = a & b ^ a & c ^ b & c;
      const t2 = S0 + maj >>> 0;
      hh = g;
      g = f2;
      f2 = e;
      e = d + t1 >>> 0;
      d = c;
      c = b;
      b = a;
      a = t1 + t2 >>> 0;
    }
    h[0] += a;
    h[1] += b;
    h[2] += c;
    h[3] += d;
    h[4] += e;
    h[5] += f2;
    h[6] += g;
    h[7] += hh;
  }
  return Array.from(h, (x) => x.toString(16).padStart(8, "0")).join("");
}
var fingerprint = (value) => sha256Hex(value).slice(0, 8);

// src/providers.ts
var PROVIDERS = [
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
  { id: "database", name: "Database", rotate: "change the database user's password", names: /DATABASE_URL|DB_URL|POSTGRES|MYSQL|MONGO|REDIS_URL|DB_PASS/i, value: /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|rediss):\/\/[^\s:@/]+:(?![^\s@/]*(?:\$\{|\{\{|<|%s|\$[A-Z_]))[^\s@/'"`]+@/ }
];
var SECRET_NAME = /(KEY|SECRET|TOKEN|PASSWORD|PASSWD|PASS$|PWD|PRIVATE|CREDENTIAL|AUTH|DSN|DATABASE_URL|DB_URL|CONNECTION|WEBHOOK|SALT|COOKIE|SESSION)/i;
var PUBLIC_NAME = /(PUBLISHABLE|PUBLIC_?KEY$|_PK$|^PK_|ANON_KEY|SITE_KEY|_URL$|_HOST$|_DOMAIN$|_REGION$|_ID$|AUTH_DOMAIN)/i;
function providerFor(name, value) {
  for (const p of PROVIDERS) if (p.value && p.value.test(value)) return p;
  for (const p of PROVIDERS) if (p.names && p.names.test(name)) return p;
  return void 0;
}
var PUBLIC_PREFIXES = [
  "sk-ant-api03-",
  "sk-ant-",
  "sk-or-v1-",
  "sk-proj-",
  "sk-svcacct-",
  "sk_live_",
  "sk_test_",
  "rk_live_",
  "rk_test_",
  "whsec_",
  "sk-",
  "AIza",
  "xai-",
  "gsk_",
  "hf_",
  "AKIA",
  "ASIA",
  "github_pat_",
  "ghp_",
  "gho_",
  "ghs_",
  "ghu_",
  "ghr_",
  "xoxb-",
  "xoxp-",
  "xoxa-",
  "xapp-",
  "SG.",
  "sbp_",
  "npm_",
  "re_",
  "pk.",
  "sk.",
  "nfp_",
  "eyJ",
  "glpat-",
  "postgresql://",
  "postgres://",
  "mysql://",
  "mongodb+srv://",
  "mongodb://",
  "rediss://",
  "redis://"
];
function shapeOf(value) {
  const v = value.trim();
  const head = PUBLIC_PREFIXES.find((p) => v.startsWith(p) && v.length > p.length + 8) ?? "";
  return `${head}\u2026(${v.length} chars)`;
}
function isPlaceholder(value) {
  const v = value.trim().replace(/^['"]|['"]$/g, "");
  if (v.length === 0) return true;
  if (v.length < 4) return true;
  return /^(x+|\*+|\.+|-+|changeme|change_me|your[-_ ].*|<.*>|\$\{.*\}|placeholder|todo|example|dummy|none|null|undefined|false|true|test|replace[-_ ]?me|sk-\.\.\.|sk-x+|\.\.\.)$/i.test(v);
}

// src/rules.ts
var base = (p) => p.slice(p.lastIndexOf("/") + 1);
var ext2 = (p) => {
  const b = base(p).toLowerCase();
  const i = b.lastIndexOf(".");
  return i > 0 ? b.slice(i + 1) : "";
};
var ENV_TEMPLATE = /^\.env\.(example|sample|template|dist|defaults|schema|tpl)$|\.example$/i;
function isEnvFile(path2) {
  const b = base(path2);
  return /^\.env(\..+)?$/i.test(b) || b === ".dev.vars" || b === ".envrc" || /^[\w.-]+\.env$/i.test(b) || /^\.dev\.vars\.[\w-]+$/.test(b);
}
var KEY_NAMES = /^(id_rsa|id_dsa|id_ecdsa|id_ed25519)(\.old)?$|\.(pem|key|p12|pfx|jks|keystore|ppk|asc)$/i;
var CRED_NAMES = /^(credentials(\.json)?|service[-_]?account.*\.json|.*-firebase-adminsdk-.*\.json|gcloud.*\.json|\.npmrc|\.pypirc|\.netrc|_netrc|\.git-credentials|\.htpasswd|\.pgpass|\.my\.cnf|\.s3cfg|\.boto)$/i;
var DB_EXT = /* @__PURE__ */ new Set(["sql", "dump", "sqlite", "sqlite3", "db", "mdb", "bak"]);
var HISTORY = /^\.(bash|zsh|sh|python|psql|mysql|node_repl|sqlite)_history$|^\.history$/;
var TEXT_EXT = /* @__PURE__ */ new Set(["js", "mjs", "cjs", "jsx", "ts", "tsx", "html", "htm", "json", "txt", "css", "xml", "yml", "yaml", "toml", "md", "vue", "svelte", "astro", "php", "ini", "cfg", "conf", "config", "properties", "env", "sh", "py", "rb", "csv", "webmanifest", "log"]);
var CONFIG_NAMES = /^(wrangler\.(toml|json|jsonc)|netlify\.toml|vercel\.json|firebase\.json|\.firebaserc|project\.json|now\.json|docker-compose\.ya?ml|Dockerfile)$/;
var AGENT_DIRS = /^(\.claude|\.codex|\.cursor|\.opencode|\.aider.*|\.continue|\.windsurf|\.cline)$/;
function parseEnv(text) {
  const out = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*[=:]\s*(.*)$/.exec(line);
    if (!m) continue;
    let v = m[2].trim();
    if (/^["']/.test(v)) {
      const q = v[0];
      const end = v.indexOf(q, 1);
      v = end > 0 ? v.slice(1, end) : v.slice(1);
    } else v = v.replace(/\s+#.*$/, "");
    out.push({ name: m[1], value: v });
  }
  return out;
}
function ref(name, value) {
  const p = providerFor(name, value);
  return { name, provider: p?.name ?? "unknown issuer", fingerprint: fingerprint(value), rotate: p?.rotate, shape: shapeOf(value) };
}
function secretVars(vars) {
  const out = [];
  for (const { name, value } of vars) {
    if (isPlaceholder(value)) continue;
    const valueHit = PROVIDERS.some((p) => p.value?.test(value));
    const nameHit = SECRET_NAME.test(name) && !PUBLIC_NAME.test(name);
    if (valueHit || nameHit) out.push(ref(name, value));
  }
  return out;
}
function inlineSecrets(text, limit = 20) {
  const refs = [];
  const seen = /* @__PURE__ */ new Set();
  let onlyPublicish = true;
  const add = (name, value, publicish, provider, shape) => {
    const fp = fingerprint(value);
    if (seen.has(fp) || refs.length >= limit) return;
    seen.add(fp);
    const p = provider ? void 0 : providerFor(name, value);
    refs.push({ name, provider: provider ?? p?.name ?? name, fingerprint: fp, rotate: p?.rotate, shape: shape ?? shapeOf(value) });
    if (!publicish) onlyPublicish = false;
  };
  for (const p of PROVIDERS) {
    if (!p.value) continue;
    const re = new RegExp(p.value.source, "g");
    for (const m of text.matchAll(re)) add(`${p.name} key`, m[0], !!p.publicInBundles);
  }
  for (const m of text.matchAll(/-----BEGIN ((?:RSA |EC |DSA |OPENSSH |ENCRYPTED |PGP )?PRIVATE KEY(?: BLOCK)?)-----[\s\S]{20,}?-----END/g)) {
    const kind = m[1].replace(/PRIVATE KEY.*/, "").trim();
    const label = { "": "PKCS#8", OPENSSH: "OpenSSH", RSA: "RSA", EC: "EC", DSA: "DSA", ENCRYPTED: "encrypted", PGP: "PGP" }[kind] ?? kind;
    add(`${label} private key`, m[0], false, "PEM block", `${m[0].length} chars`);
  }
  for (const m of text.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g)) {
    try {
      const json = atobUrl(m[1]);
      if (/"role"\s*:\s*"service_role"/.test(json)) add("Supabase service_role JWT", m[0], false);
    } catch {
    }
  }
  return { refs, onlyPublicish: refs.length > 0 && onlyPublicish };
}
function atobUrl(s) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  if (typeof atob === "function") return atob(b64);
  return Buffer.from(b64, "base64").toString("utf8");
}
var f = (rule, severity, path2, size, title, detail, secrets = [], fix = "") => ({ rule, severity, path: path2, size, title, detail, secrets, fix });
function riskyByName(path2) {
  const segs2 = path2.split("/");
  if (segs2.includes(".git")) return "git-dir";
  if (segs2.some((s) => AGENT_DIRS.test(s))) return "agent-config";
  const b = base(path2);
  if (isEnvFile(path2) && !ENV_TEMPLATE.test(b)) return "env-file";
  if (KEY_NAMES.test(b)) return "private-key";
  if (CRED_NAMES.test(b)) return "credentials";
  if (HISTORY.test(b)) return "shell-history";
  if (DB_EXT.has(ext2(path2)) || /\.sql\.gz$/i.test(b)) return "db-dump";
  return void 0;
}
var MB = 1024 * 1024;
async function classify(file) {
  const { path: path2, size } = file;
  const b = base(path2);
  const e = ext2(path2);
  const out = [];
  if (isEnvFile(path2)) {
    const text = await file.readText(MB) ?? "";
    const vars = parseEnv(text);
    const secrets = secretVars(vars);
    const template = ENV_TEMPLATE.test(b);
    if (secrets.length) {
      out.push(f("env-file", "LEAK", path2, size, template ? "env template with real-looking values" : "env file", `${vars.length} variable${vars.length === 1 ? "" : "s"}, ${secrets.length} look${secrets.length === 1 ? "s" : ""} secret`, secrets));
    } else if (vars.length && !template) {
      out.push(f("env-file", "RISK", path2, size, "env file", `${vars.length} variable${vars.length === 1 ? "" : "s"}, none look secret \u2014 still your config, in public`));
    } else if (!template) {
      out.push(f("env-file", "INFO", path2, size, "empty env file", "no KEY=VALUE lines"));
    }
    return out;
  }
  if (KEY_NAMES.test(b)) {
    const text = await file.readText(256 * 1024) ?? "";
    if (/-----BEGIN [A-Z ]*PRIVATE KEY/.test(text) || /PuTTY-User-Key-File/.test(text) || e === "p12" || e === "pfx" || e === "jks" || e === "keystore") {
      out.push(f("private-key", "LEAK", path2, size, "private key", "anyone can download it and act as you", [ref(b, text)]));
      return out;
    }
    if (/-----BEGIN (CERTIFICATE|PUBLIC KEY)/.test(text)) return out;
  }
  if (CRED_NAMES.test(b)) {
    const text = await file.readText(MB) ?? "";
    let secrets = [];
    let why = "";
    if (/service_account/.test(text) && /private_key/.test(text)) {
      secrets = [{ name: "service account private_key", provider: "Google Cloud", fingerprint: fingerprint(text), rotate: "https://console.cloud.google.com/iam-admin/serviceaccounts", shape: "JSON key file" }];
      why = "Google service-account key: full API access as that account";
    } else if (/_authToken\s*=|_auth\s*=|_password\s*=/.test(text)) {
      const m = /(_authToken|_auth|_password)\s*=\s*(\S+)/.exec(text);
      secrets = m && !/\$\{/.test(m[2]) ? [{ ...ref("NPM_TOKEN", m[2]), name: m[1] }] : [];
      why = secrets.length ? "registry auth token" : "registry config (token comes from an env var)";
    } else if (/aws_secret_access_key/i.test(text)) {
      const m = /aws_secret_access_key\s*=\s*(\S+)/i.exec(text);
      secrets = m ? [ref("AWS_SECRET_ACCESS_KEY", m[1])] : [];
      why = "AWS credentials file";
    } else if (/password|machine\s+\S+\s+login/i.test(text) || /:\$apr1\$|:\$2[aby]\$|:\{SHA\}/.test(text) || /https?:\/\/[^\s:@]+:[^\s@]+@/.test(text)) {
      secrets = [ref(b, text)];
      why = "contains credentials";
    }
    if (secrets.length) out.push(f("credentials", "LEAK", path2, size, "credentials file", why, secrets));
    else if (why) out.push(f("credentials", "INFO", path2, size, "credentials config", why));
    else out.push(f("credentials", "RISK", path2, size, "credentials-named file", "named like a credential file; check what is inside"));
    return out;
  }
  if (HISTORY.test(b)) {
    out.push(f("shell-history", "RISK", path2, size, "shell history", "every command you typed, often with tokens pasted inline"));
    return out;
  }
  if (DB_EXT.has(e) || /\.sql\.gz$/i.test(b)) {
    const head = await file.readHead(16);
    const sqlite = head && new TextDecoder().decode(head).startsWith("SQLite format 3");
    if (e === "bak" && !sqlite) {
      out.push(f("backup-file", "RISK", path2, size, "backup file", "editor/server backups often hold old config or source"));
      return out;
    }
    if (e === "db" && !sqlite) return out;
    out.push(f("db-dump", "LEAK", path2, size, sqlite ? "SQLite database" : "database dump", "your data, downloadable in one request"));
    return out;
  }
  if (/\.(old|orig|swp|swo)$|~$/.test(b)) {
    out.push(f("backup-file", "RISK", path2, size, "backup file", "editor/server backups often hold old config or source"));
    return out;
  }
  if (e === "map" && size <= 50 * MB) {
    const text = await file.readText(50 * MB);
    if (text) {
      let sources = 0;
      let withContent = 0;
      let content = "";
      try {
        const j = JSON.parse(text);
        sources = Array.isArray(j.sources) ? j.sources.length : 0;
        if (Array.isArray(j.sourcesContent)) {
          for (const c of j.sourcesContent) if (typeof c === "string" && c.length) withContent++, content += c + "\n";
        }
        if (Array.isArray(j.sections)) withContent += j.sections.length;
      } catch {
      }
      if (withContent) {
        const inl = inlineSecrets(content);
        if (inl.refs.length && !inl.onlyPublicish) out.push(f("inline-secret", "LEAK", path2, size, "secret inside source map", `original source in sourcesContent contains ${inl.refs.length} key${inl.refs.length === 1 ? "" : "s"}`, inl.refs));
        out.push(f("source-map", "RISK", path2, size, "source map with original source", `${withContent} of ${sources} original files readable via sourcesContent`));
      } else if (sources) {
        out.push(f("source-map", "INFO", path2, size, "source map (no sourcesContent)", `${sources} source paths, no source text`));
      }
    }
    return out;
  }
  const segs2 = path2.split("/");
  const agent = segs2.find((s) => AGENT_DIRS.test(s));
  if (agent) {
    out.push(f("agent-config", "RISK", path2, size, `${agent}/ agent files`, "your coding agent's settings, permissions and local notes"));
    return out;
  }
  if (CONFIG_NAMES.test(b)) {
    out.push(f("config-file", "INFO", path2, size, "deploy/config file", "reveals project names and settings; rarely secret"));
  }
  if (b === ".DS_Store") {
    out.push(f("ds-store", "INFO", path2, size, ".DS_Store", "lists the names of files in that folder"));
    return out;
  }
  if ((TEXT_EXT.has(e) || b === "_worker.js") && size <= 8 * MB) {
    const text = await file.readText(8 * MB);
    if (text) {
      const inl = inlineSecrets(text);
      if (inl.refs.length) {
        out.push(
          inl.onlyPublicish ? f("inline-secret", "RISK", path2, size, "Google API key in a public file", "fine only if it is a restricted Firebase/Maps browser key; an unrestricted Gemini/Cloud key here is the $90k bill", inl.refs) : f("inline-secret", "LEAK", path2, size, "secret baked into a public file", `${inl.refs.length} key${inl.refs.length === 1 ? "" : "s"} in served code`, inl.refs)
        );
      }
    }
  }
  return out;
}

// src/version.ts
var VERSION = "0.1.0";

// node_modules/smol-toml/dist/error.js
function getLineColFromPtr(string, ptr) {
  let lines = string.slice(0, ptr).split(/\r?\n/);
  return [lines.length, lines.pop().length + 1];
}
function makeCodeBlock(string, line, column) {
  let lines = string.split(/\r?\n/);
  let codeblock = "";
  let numberLen = (Math.log10(line + 1) | 0) + 1;
  for (let i = line - 1; i <= line + 1; i++) {
    let l = lines[i - 1];
    if (!l)
      continue;
    codeblock += i.toString().padEnd(numberLen, " ");
    codeblock += ":  ";
    codeblock += l;
    codeblock += "\n";
    if (i === line) {
      codeblock += " ".repeat(numberLen + column + 2);
      codeblock += "^\n";
    }
  }
  return codeblock;
}
var TomlError = class _TomlError extends Error {
  line;
  column;
  codeblock;
  constructor(message, options) {
    const [line, column] = getLineColFromPtr(options.toml, options.ptr);
    const codeblock = makeCodeBlock(options.toml, line, column);
    super(`Invalid TOML document: ${message}

${codeblock}`, options);
    this.line = line;
    this.column = column;
    this.codeblock = codeblock;
  }
  /** @internal */
  static x(message, ctx, ptr) {
    throw new _TomlError(message, { toml: ctx.s, ptr: ptr ?? ctx.p });
  }
};

// node_modules/smol-toml/dist/primitive.js
function parseString(ctx) {
  let startPtr = ctx.p;
  let c = ctx.s.charCodeAt(ctx.p++);
  let first = c;
  let isLiteral = c === 39;
  let isMultiline = c === ctx.s.charCodeAt(ctx.p) && c === ctx.s.charCodeAt(ctx.p + 1);
  if (isMultiline) {
    if ((c = ctx.s.charCodeAt(ctx.p += 2)) === 10)
      ctx.p++;
    else if (c === 13 && ctx.s.charCodeAt(ctx.p + 1) === 10)
      ctx.p += 2;
  }
  let parsed = "";
  let sliceStart = ctx.p;
  let state = 0;
  for (; ctx.p < ctx.s.length; ctx.p++) {
    c = ctx.s.charCodeAt(ctx.p);
    if (isMultiline && (c === 10 || c === 13 && ctx.s.charCodeAt(ctx.p + 1) === 10)) {
      state = state && 3;
    } else if (c < 32 && c !== 9 || c === 127) {
      TomlError.x("control characters are not allowed in strings", ctx);
    } else if ((!state || state === 3) && c === first && (!isMultiline || ctx.s.charCodeAt(ctx.p + 1) === first && ctx.s.charCodeAt(ctx.p + 2) === first)) {
      if (isMultiline) {
        if (ctx.s.charCodeAt(ctx.p + 3) === first)
          ctx.p++;
        if (ctx.s.charCodeAt(ctx.p + 3) === first)
          ctx.p++;
      }
      if (!state) {
        let s = ctx.s.slice(sliceStart, ctx.p);
        parsed = parsed ? parsed + s : s;
      }
      ctx.p += isMultiline ? 3 : 1;
      return parsed;
    } else if (!state) {
      if (!isLiteral && c === 92) {
        parsed += ctx.s.slice(sliceStart, sliceStart = ctx.p);
        state = 1;
      }
    } else if (state === 1) {
      if (c === 120 || c === 117 || c === 85) {
        let errPtr = ctx.p++ - 1;
        let value = 0;
        let len = c === 120 ? 2 : c === 117 ? 4 : 8;
        for (let j = 0; j < len; j++, ctx.p++) {
          let hex = ctx.s.charCodeAt(ctx.p);
          let digit = (
            /* 0-9 */
            hex >= 48 && hex <= 57 ? hex - 48 : (
              /* A-F */
              hex >= 65 && hex <= 70 ? hex - 65 + 10 : (
                /* a-f */
                hex >= 97 && hex <= 102 ? hex - 97 + 10 : -1
              )
            )
          );
          if (digit < 0)
            TomlError.x("invalid non-hex character in unicode escape", ctx);
          value = value << 4 | digit;
        }
        if (value < 0 || value > 1114111 || value >= 55296 && value <= 57343) {
          TomlError.x("invalid unicode escape", ctx, errPtr);
        }
        parsed += String.fromCodePoint(value);
        sliceStart = ctx.p--;
        state = 0;
      } else if (isMultiline && (c === 32 || c === 9)) {
        state = 2;
      } else {
        if (c === 98)
          parsed += "\b";
        else if (c === 116)
          parsed += "	";
        else if (c === 110)
          parsed += "\n";
        else if (c === 102)
          parsed += "\f";
        else if (c === 114)
          parsed += "\r";
        else if (c === 101)
          parsed += "\x1B";
        else if (c === 34)
          parsed += '"';
        else if (c === 92)
          parsed += "\\";
        else
          TomlError.x("unrecognised escape sequence", ctx);
        sliceStart = ctx.p + 1;
        state = 0;
      }
    } else if (c !== 32 && c !== 9) {
      if (state === 2)
        TomlError.x("invalid escape: only line-ending whitespace may be escaped", ctx, sliceStart);
      state = !isLiteral && c === 92 ? 1 : 0;
      sliceStart = ctx.p;
    }
  }
  TomlError.x("unfinished string", ctx, startPtr);
}

// node_modules/smol-toml/dist/date.js
var DATE_TIME_RE = /^(\d{4}-\d{2}-\d{2})?[Tt ]?(?:(\d{2}):\d{2}(?::\d{2}(?:\.\d+)?)?)?(Z|z|[-+]\d{2}:\d{2})?$/i;
var TomlDate = class _TomlDate extends Date {
  #hasDate = false;
  #hasTime = false;
  #offset = null;
  constructor(date, fasttype, unsafeDelim) {
    let hasDate = true;
    let hasTime = true;
    let offset = "Z";
    let c;
    if (typeof date === "string") {
      if (fasttype)
        prep: {
          if (fasttype < 3) {
            if (+date.slice(11, 13) > 23) {
              date = "";
              break prep;
            }
            if (fasttype === 2) {
              offset = null;
              date += "Z";
            } else if ((c = date.charCodeAt(date.length - 1)) !== 90 && c !== 122) {
              offset = date.slice(date.length - 6);
            }
            if (unsafeDelim)
              date = date.slice(0, 10) + "T" + date.slice(11);
          } else if (fasttype === 4) {
            date = +date.slice(0, 2) > 23 ? "" : `0000-01-01T${date}Z`;
          }
          hasDate = fasttype !== 4;
          hasTime = fasttype !== 3;
        }
      else {
        let match2 = date.match(DATE_TIME_RE);
        if (match2) {
          if (!match2[1]) {
            hasDate = false;
            date = `0000-01-01T${date}`;
          }
          hasTime = !!match2[2];
          hasTime && date[10] === " " && (date = date.replace(" ", "T"));
          if (match2[2] && +match2[2] > 23) {
            date = "";
          } else {
            offset = match2[3] || null;
            if (!offset && hasTime)
              date += "Z";
          }
        } else {
          date = "";
        }
      }
    }
    super(date);
    if (!isNaN(this.getTime())) {
      this.#hasDate = hasDate;
      this.#hasTime = hasTime;
      this.#offset = offset;
    }
  }
  isDateTime() {
    return this.#hasDate && this.#hasTime;
  }
  isLocal() {
    return !this.#hasDate || !this.#hasTime || !this.#offset;
  }
  isDate() {
    return this.#hasDate && !this.#hasTime;
  }
  isTime() {
    return this.#hasTime && !this.#hasDate;
  }
  isValid() {
    return this.#hasDate || this.#hasTime;
  }
  toISOString() {
    let iso = super.toISOString();
    if (this.isDate())
      return iso.slice(0, 10);
    if (this.isTime())
      return iso.slice(11, 23);
    if (this.#offset === null)
      return iso.slice(0, -1);
    if (this.#offset === "Z" || this.#offset === "z")
      return iso;
    let offset = +this.#offset.slice(1, 3) * 60 + +this.#offset.slice(4, 6);
    offset = this.#offset[0] === "-" ? offset : -offset;
    let offsetDate = new Date(this.getTime() - offset * 6e4);
    return offsetDate.toISOString().slice(0, -1) + this.#offset;
  }
  static wrapAsOffsetDateTime(jsDate, offset = "Z") {
    let date = new _TomlDate(jsDate);
    date.#offset = offset;
    return date;
  }
  static wrapAsLocalDateTime(jsDate) {
    let date = new _TomlDate(jsDate);
    date.#offset = null;
    return date;
  }
  static wrapAsLocalDate(jsDate) {
    let date = new _TomlDate(jsDate);
    date.#hasTime = false;
    date.#offset = null;
    return date;
  }
  static wrapAsLocalTime(jsDate) {
    let date = new _TomlDate(jsDate);
    date.#hasDate = false;
    date.#offset = null;
    return date;
  }
};

// node_modules/smol-toml/dist/extract.js
function isDigit(char, base2 = 10) {
  return base2 === 16 ? char > 47 && char < 58 || char > 64 && char < 71 || char > 96 && char < 103 : char > 47 && char < 48 + base2;
}
function isEndOfValue(char, delim) {
  return char === 32 || char === 9 || char === 10 || char === 13 || // Structure end or next value delimiter
  delim && (char === delim || char === 44) || // Comment
  char === 35;
}
function extractValue(ctx, end) {
  let errPtr = ctx.p;
  let c = ctx.s.charCodeAt(ctx.p);
  if (c === 91 || c === 123) {
    ctx.d-- || TomlError.x("document contains excessively nested structures. aborting.", ctx);
    let value = c === 91 ? parseArray(ctx) : parseInlineTable(ctx);
    ctx.d++;
    return value;
  }
  if (c === 34 || c === 39) {
    return parseString(ctx);
  }
  if (c === 116) {
    if (ctx.s.charCodeAt(++ctx.p) !== 114 || ctx.s.charCodeAt(++ctx.p) !== 117 || ctx.s.charCodeAt(++ctx.p) !== 101)
      TomlError.x("invalid value", ctx, errPtr);
    return ctx.p++, true;
  }
  if (c === 102) {
    if (ctx.s.charCodeAt(++ctx.p) !== 97 || ctx.s.charCodeAt(++ctx.p) !== 108 || ctx.s.charCodeAt(++ctx.p) !== 115 || ctx.s.charCodeAt(++ctx.p) !== 101)
      TomlError.x("invalid value", ctx, errPtr);
    return ctx.p++, false;
  }
  if (c === 43 || c === 45) {
    return parseNumber(ctx, ctx.p, ctx.s.charCodeAt(++ctx.p), 44 - c, end);
  }
  if (ctx.s.charCodeAt(ctx.p + 4) === 45 && ctx.s.charCodeAt(ctx.p + 7) === 45) {
    return parseDate(ctx, c, end);
  }
  if (ctx.s.charCodeAt(ctx.p + 2) === 58) {
    return parseTime(ctx, c, end);
  }
  return parseNumber(ctx, ctx.p, c, 0, end);
}
function parseNumber(ctx, startPtr, startChr, sign, endChr) {
  let c = startChr;
  let state = 0;
  let hasUnderscores = false;
  if (c === 105) {
    if (ctx.s.charCodeAt(++ctx.p) !== 110 || ctx.s.charCodeAt(++ctx.p) !== 102)
      TomlError.x("invalid value", ctx, startPtr);
    return ctx.p++, (sign || 1) / 0;
  }
  if (c === 110) {
    if (ctx.s.charCodeAt(++ctx.p) !== 97 || ctx.s.charCodeAt(++ctx.p) !== 110)
      TomlError.x("invalid value", ctx, startPtr);
    return ctx.p++, NaN;
  }
  if (c === 48) {
    if (++ctx.p >= ctx.s.length || isEndOfValue(c = ctx.s.charCodeAt(ctx.p), endChr))
      return ctx.bi === true ? 0n : 0;
    if (!sign) {
      if (c === 120)
        return parseIntegerBaseN(ctx, startPtr, 16, endChr);
      else if (c === 98)
        return parseIntegerBaseN(ctx, startPtr, 2, endChr);
      else if (c === 111)
        return parseIntegerBaseN(ctx, startPtr, 8, endChr);
    }
    if (c === 46)
      state = 2;
    else if (c === 101 || c === 69)
      state = 4;
    else
      TomlError.x("illegal leading zero", ctx, startPtr);
  } else if (!isDigit(c))
    TomlError.x("invalid value", ctx, startPtr);
  while (++ctx.p < ctx.s.length && (c = ctx.s.charCodeAt(ctx.p), !isEndOfValue(c, endChr))) {
    if (!state)
      state = 1;
    if (c === 95) {
      if (!(state & 1))
        TomlError.x("illegal underscore", ctx);
      state += 11;
      hasUnderscores = true;
    } else if (state === 1 && c === 46)
      state = 2;
    else if ((state === 1 || state === 3) && (c === 101 || c === 69))
      state = 4;
    else if (state === 4 && (c === 43 || c === 45)) {
      state = 6;
    } else if (!isDigit(c))
      TomlError.x(`illegal character in numeric literal`, ctx);
    else if (state > 9)
      state -= 11;
    else if (!(state & 1))
      state++;
  }
  if (!state) {
    let val = (startChr - 48) * (sign || 1);
    return ctx.bi === true ? BigInt(val) : val;
  }
  if (!(state & 1))
    TomlError.x("unfinished numeric value", ctx, startPtr);
  let str = ctx.s.slice(startPtr, ctx.p);
  if (hasUnderscores)
    str = str.replaceAll("_", "");
  return state > 1 ? parseFloat(str) : parseInteger(ctx, str, 10, startPtr);
}
function parseIntegerBaseN(ctx, startPtr, base2, endChr) {
  let c, underscore = 1;
  while (++ctx.p < ctx.s.length && (c = ctx.s.charCodeAt(ctx.p), !isEndOfValue(c, endChr))) {
    if (c === 95) {
      if (underscore & 1)
        TomlError.x("illegal underscore", ctx);
      underscore = 3;
    } else if (!isDigit(c, base2))
      TomlError.x(`illegal character in numeric literal`, ctx);
    else if (underscore & 1)
      underscore--;
  }
  if (underscore & 1)
    TomlError.x("unfinished numeric value", ctx);
  let str = ctx.s.slice(startPtr + 2, ctx.p);
  if (underscore)
    str = str.replaceAll("_", "");
  return parseInteger(ctx, str, base2, startPtr);
}
function parseInteger(ctx, str, base2, startPtr) {
  if (ctx.bi !== true)
    int: {
      let val = parseInt(str, base2);
      if (!Number.isSafeInteger(val)) {
        if (ctx.bi)
          break int;
        TomlError.x("integer value cannot be represented losslessly", ctx, startPtr);
      }
      return val;
    }
  return base2 === 10 ? BigInt(str) : BigInt((base2 === 2 ? "0b" : base2 === 8 ? "0o" : "0x") + str);
}
function parseDate(ctx, c, endChr) {
  let startPtr = ctx.p++, unsafeSeparator;
  if (!isDigit(c) || !isDigit(ctx.s.charCodeAt(ctx.p++)) || !isDigit(ctx.s.charCodeAt(ctx.p++)) || !isDigit(ctx.s.charCodeAt(ctx.p++))) {
    return parseNumber(ctx, ctx.p = startPtr, c, 0, endChr);
  }
  ctx.p += 5;
  if (!isDigit(ctx.s.charCodeAt(ctx.p++)))
    TomlError.x("invalid date-time: date part is malformed", ctx, startPtr);
  if (ctx.p >= ctx.s.length || ((c = ctx.s.charCodeAt(ctx.p)) !== 32 || (unsafeSeparator = true, !isDigit(ctx.s.charCodeAt(ctx.p + 1)))) && c !== 84 && c !== 116) {
    let t2 = ctx.s.slice(startPtr, ctx.p);
    return readDate(ctx, t2, 3, false, startPtr);
  }
  if (ctx.s.charCodeAt(ctx.p += 3) !== 58)
    TomlError.x("invalid date-time: time part is malformed", ctx, startPtr);
  if (ctx.s.charCodeAt(ctx.p += 3) === 58)
    ctx.p += 3;
  if (ctx.s.charCodeAt(ctx.p) === 46)
    while (isDigit(ctx.s.charCodeAt(++ctx.p)))
      ;
  if (c = ctx.s.charCodeAt(ctx.p)) {
    if (c === 90 || c === 122) {
      let t2 = ctx.s.slice(startPtr, ++ctx.p);
      return readDate(ctx, t2, 1, unsafeSeparator, startPtr, "[+00:00]");
    }
    if (c === 43 || c === 45) {
      let t2 = ctx.s.slice(startPtr, ctx.p += 6);
      return readDate(ctx, t2, 1, unsafeSeparator, startPtr, !ctx.ld && "[" + ctx.s.slice(ctx.p - 6, ctx.p) + "]");
    }
  }
  let t = ctx.s.slice(startPtr, ctx.p);
  return readDate(ctx, t, 2, unsafeSeparator, startPtr);
}
function parseTime(ctx, c, endChr) {
  let start = ctx.p;
  if (!isDigit(c) || !isDigit(ctx.s.charCodeAt(++ctx.p))) {
    return parseNumber(ctx, --ctx.p, c, 0, endChr);
  }
  if (ctx.s.charCodeAt(ctx.p += 4) === 58)
    ctx.p += 3;
  if (ctx.s.charCodeAt(ctx.p) === 46)
    while (isDigit(ctx.s.charCodeAt(++ctx.p)))
      ;
  let t = ctx.s.slice(start, ctx.p);
  return readDate(ctx, t, 4, false, start);
}
function readDate(ctx, str, type, unsafeDelim, errPtr, temporalSuffix) {
  if (ctx.ld) {
    let date = new TomlDate(str, type, unsafeDelim);
    if (!date.isValid())
      TomlError.x("invalid date", ctx, errPtr);
    return date;
  }
  try {
    if (temporalSuffix)
      str += temporalSuffix;
    switch (type) {
      case 1:
        return Temporal.ZonedDateTime.from(str);
      case 2:
        return Temporal.PlainDateTime.from(str);
      case 3:
        return Temporal.PlainDate.from(str);
      case 4:
        return Temporal.PlainTime.from(str);
    }
  } catch (e) {
    TomlError.x(e instanceof Error ? e.message : "" + e, ctx, errPtr);
  }
}

// node_modules/smol-toml/dist/util.js
function skipComment(ctx) {
  for (; ctx.p < ctx.s.length; ctx.p++) {
    let c = ctx.s.charCodeAt(ctx.p);
    if (c === 10)
      break;
    if (c === 13 && ctx.s.charCodeAt(ctx.p + 1) === 10) {
      ctx.p++;
      break;
    }
    if (c < 32 && c !== 9 || c === 127) {
      TomlError.x("control characters are not allowed in comments", ctx);
    }
  }
}
function skipVoid(ctx, banNewLines, banComments) {
  let c;
  while (ctx.p < ctx.s.length) {
    while (ctx.p < ctx.s.length && ((c = ctx.s.charCodeAt(ctx.p)) === 32 || c === 9 || !banNewLines && (c === 10 || c === 13 && ctx.s.charCodeAt(ctx.p + 1) === 10)))
      ctx.p++;
    if (banComments || c !== 35)
      break;
    skipComment(ctx);
  }
}

// node_modules/smol-toml/dist/struct.js
function parseKey(ctx, end = 61) {
  let startPtr;
  let state = 0;
  let parsed = [];
  let sliceStart;
  let c = ctx.s.charCodeAt(startPtr = ctx.p);
  do {
    if (c === end) {
      if (!state)
        TomlError.x("unexpected end of key", ctx);
      if (state === 1)
        parsed.push(ctx.s.slice(sliceStart, ctx.p));
      return ctx.p++, parsed;
    } else if (c === 46) {
      if (!state)
        TomlError.x("illegal empty bare key", ctx);
      if (state === 1)
        parsed.push(ctx.s.slice(sliceStart, ctx.p));
      state = 0;
    } else if (!state && (c === 34 || c === 39)) {
      if (c === ctx.s.charCodeAt(ctx.p + 1) && c === ctx.s.charCodeAt(ctx.p + 2))
        TomlError.x("illegal quoted key: multiline strings are not allowed", ctx);
      parsed.push(parseString(ctx));
      state = 2;
      ctx.p--;
    } else if (c === 32 || c === 9) {
      if (state === 1) {
        parsed.push(ctx.s.slice(sliceStart, ctx.p));
        state = 2;
      }
    } else if (state === 2 || c < 48 && c !== 45 || c > 57 && c < 65 || c > 90 && c < 97 && c !== 95 || c > 122) {
      TomlError.x("illegal character in key", ctx);
    } else if (!state) {
      state = 1;
      sliceStart = ctx.p;
    }
  } while (c = ctx.s.charCodeAt(++ctx.p));
  TomlError.x("incomplete key-value: cannot find end of key", ctx, startPtr);
}
function parseInlineTable(ctx) {
  let startPtr = ctx.p++;
  let res = /* @__PURE__ */ Object.create(null);
  let seen = /* @__PURE__ */ new Set();
  let c;
  while (ctx.p < ctx.s.length) {
    skipVoid(ctx);
    if ((c = ctx.s.charCodeAt(ctx.p)) === 125) {
      ctx.p++;
      return res;
    }
    let k;
    let t = res;
    let hasOwn = false;
    let errPtr = ctx.p;
    let key = parseKey(ctx);
    for (let i = 0; i < key.length; i++) {
      if (i)
        t = hasOwn ? t[k] : t[k] = /* @__PURE__ */ Object.create(null);
      k = key[i];
      if ((hasOwn = Object.hasOwn(t, k)) && (typeof t[k] !== "object" || seen.has(t[k]))) {
        TomlError.x("trying to redefine an already defined value", ctx, errPtr);
      }
      let unsafe = k === "__proto__";
      if (ctx.uk && (unsafe || k === "constructor")) {
        t = ctx.uk !== 1 && TomlError.x("document contains an unsafe property", ctx, errPtr);
        break;
      }
      if (!hasOwn && unsafe) {
        Object.defineProperty(t, k, { enumerable: true, configurable: true, writable: true });
      }
    }
    if (hasOwn) {
      TomlError.x("trying to redefine an already defined value", ctx, errPtr);
    }
    skipVoid(ctx, true, true);
    let value = extractValue(
      ctx,
      125
      /* } */
    );
    if (t && typeof (t[k] = value) === "object")
      seen.add(value);
    skipVoid(ctx);
    if ((c = ctx.s.charCodeAt(ctx.p++)) === 125) {
      return res;
    }
    if (c !== 44)
      TomlError.x("expected comma or end of structure", ctx, ctx.p - 1);
  }
  TomlError.x("unfinished table", ctx, startPtr);
}
function parseArray(ctx) {
  let startPtr = ctx.p++;
  let res = [];
  let c;
  while (ctx.p < ctx.s.length) {
    skipVoid(ctx);
    if ((c = ctx.s.charCodeAt(ctx.p)) === 93) {
      ctx.p++;
      return res;
    }
    res.push(extractValue(
      ctx,
      93
      /* ] */
    ));
    skipVoid(ctx);
    if ((c = ctx.s.charCodeAt(ctx.p++)) === 93) {
      return res;
    }
    if (c !== 44)
      TomlError.x("expected comma or end of structure", ctx, ctx.p - 1);
  }
  TomlError.x("unfinished array", ctx, startPtr);
}

// node_modules/smol-toml/dist/parse.js
function peekTable(ctx, key, table, meta, type) {
  let t = table;
  let m = meta;
  let k;
  let hasOwn = false;
  let state;
  for (let i = 0; i < key.length; i++) {
    if (i) {
      t = hasOwn ? t[k] : t[k] = /* @__PURE__ */ Object.create(null);
      m = (state = m[k]).c;
      if (type === 0 && (state.t === 1 || state.t === 2)) {
        return null;
      }
      if (state.t === 2) {
        let l = t.length - 1;
        t = t[l];
        m = m[l].c;
      }
    }
    k = key[i];
    if ((hasOwn = Object.hasOwn(t, k)) && m[k]?.t === 0 && m[k]?.d) {
      return null;
    }
    if (!hasOwn) {
      let unsafe = k === "__proto__";
      if (ctx.uk && (unsafe || k === "constructor"))
        return false;
      if (unsafe) {
        Object.defineProperty(t, k, { enumerable: true, configurable: true, writable: true });
        Object.defineProperty(m, k, { enumerable: true, configurable: true, writable: true });
      }
      m[k] = {
        t: i < key.length - 1 && type === 2 ? 3 : type,
        d: false,
        i: 0,
        c: /* @__PURE__ */ Object.create(null)
      };
    }
  }
  state = m[k];
  if (state.t !== type && !(type === 1 && state.t === 3)) {
    return null;
  }
  if (type === 2) {
    if (!state.d) {
      state.d = true;
      t[k] = [];
    }
    t[k].push(t = /* @__PURE__ */ Object.create(null));
    state.c[state.i++] = state = { t: 1, d: false, i: 0, c: /* @__PURE__ */ Object.create(null) };
  }
  if (state.d) {
    return null;
  }
  state.d = true;
  if (type === 1) {
    t = hasOwn ? t[k] : t[k] = /* @__PURE__ */ Object.create(null);
  } else if (type === 0 && hasOwn) {
    return null;
  }
  return [k, t, state.c];
}
function validateTablePeek(ctx, peek, ptr) {
  if (peek === null || ctx.uk === 2)
    TomlError.x(peek === null ? "trying to redefine an already defined table or value" : "document contains an unsafe property", ctx, ptr);
}
function parse(toml, options = {}) {
  let ctx = {
    s: toml,
    p: 0,
    d: options.maxDepth ?? 1e3,
    bi: options.integersAsBigInt ?? false,
    ld: options.useLegacyDate ?? true,
    uk: options.unsafeKeyBehaviour === "throw" ? 2 : options.unsafeKeyBehaviour === "drop" ? 1 : 0
  };
  let res = /* @__PURE__ */ Object.create(null);
  let meta = /* @__PURE__ */ Object.create(null);
  let tmp;
  let skipping = false;
  let tbl = res;
  let m = meta;
  if (toml.charCodeAt(0) === 65279)
    ctx.p++;
  skipVoid(ctx);
  while (ctx.p < toml.length) {
    if (toml.charCodeAt(ctx.p) === 91) {
      let isTableArray = toml.charCodeAt(++ctx.p) === 91;
      tmp = ctx.p += +isTableArray;
      skipping = false;
      let k = parseKey(
        ctx,
        93
        /* ] */
      );
      if (isTableArray) {
        if (toml.charCodeAt(ctx.p) !== 93) {
          TomlError.x("expected end of table array declaration", ctx);
        }
        ctx.p++;
      }
      let p = peekTable(
        ctx,
        k,
        res,
        meta,
        isTableArray ? 2 : 1
        /* Type.EXPLICIT */
      );
      if (!p) {
        validateTablePeek(ctx, p, tmp);
        skipping = true;
      } else {
        m = p[2];
        tbl = p[1];
      }
    } else {
      tmp = ctx.p;
      let k = parseKey(ctx);
      let p = peekTable(
        ctx,
        k,
        tbl,
        m,
        0
        /* Type.DOTTED */
      );
      if (!p && !skipping)
        validateTablePeek(ctx, p, tmp);
      skipVoid(ctx, true, true);
      let v = extractValue(ctx, void 0);
      if (p && !skipping)
        p[1][p[0]] = v;
    }
    skipVoid(ctx, true);
    if (ctx.p < toml.length && (tmp = toml.charCodeAt(ctx.p)) !== 10 && (tmp !== 13 || toml.charCodeAt(ctx.p + 1) !== 10)) {
      TomlError.x("each key-value declaration must be followed by an end-of-line", ctx);
    }
    skipVoid(ctx);
  }
  return res;
}

// node_modules/smol-toml/dist/stringify.js
var HAS_WELLFORMED = !!"".isWellFormed;

// src/detect.ts
var norm = (p) => {
  const s = p.replace(/\\/g, "/").replace(/^\.\/+/, "").replace(/\/+$/, "");
  return s === "" ? "." : s;
};
var join = (a, b) => norm(a === "." ? b : `${a}/${b}`);
function stripJsonc(s) {
  let out = "";
  let i = 0;
  let inStr = false;
  while (i < s.length) {
    const c = s[i];
    if (inStr) {
      out += c;
      if (c === "\\") out += s[i + 1] ?? "", i++;
      else if (c === '"') inStr = false;
      i++;
    } else if (c === '"') inStr = true, out += c, i++;
    else if (c === "/" && s[i + 1] === "/") while (i < s.length && s[i] !== "\n") i++;
    else if (c === "/" && s[i + 1] === "*") {
      i += 2;
      while (i < s.length && !(s[i] === "*" && s[i + 1] === "/")) i++;
      i += 2;
    } else out += c, i++;
  }
  return out.replace(/,(\s*[}\]])/g, "$1");
}
async function readJson(tree, path2) {
  const t = await tree.readText(path2, 2 * 1024 * 1024);
  if (t === void 0) return void 0;
  try {
    return JSON.parse(stripJsonc(t));
  } catch {
    return void 0;
  }
}
async function readToml(tree, path2) {
  const t = await tree.readText(path2, 2 * 1024 * 1024);
  if (t === void 0) return void 0;
  try {
    return parse(t);
  } catch {
    return void 0;
  }
}
var has = (tree, p) => tree.files.some((f2) => f2.path === p);
async function detectDeployments(tree) {
  const out = [];
  const notes = [];
  const add = (d) => {
    if (!out.some((x) => x.host === d.host && x.dir === d.dir)) out.push(d);
  };
  for (const name of ["wrangler.toml", "wrangler.json", "wrangler.jsonc"]) {
    if (!has(tree, name)) continue;
    const cfg = name.endsWith(".toml") ? await readToml(tree, name) : await readJson(tree, name);
    if (!cfg) {
      notes.push(`${name}: could not parse`);
      continue;
    }
    if (typeof cfg.pages_build_output_dir === "string") add({ host: "cf-pages", dir: norm(cfg.pages_build_output_dir), source: `${name} pages_build_output_dir`, opts: {} });
    const assetsDir = cfg.assets?.directory ?? cfg.site?.bucket;
    if (typeof assetsDir === "string") add({ host: "cf-workers", dir: norm(assetsDir), source: `${name} ${cfg.assets?.directory ? "assets.directory" : "site.bucket"}`, opts: {} });
  }
  if (has(tree, "netlify.toml")) {
    const cfg = await readToml(tree, "netlify.toml");
    const b = norm(cfg?.build?.base ?? ".");
    const pub = cfg?.build?.publish;
    if (typeof pub === "string") {
      const dir = join(b, pub);
      add({ host: "netlify", dir, source: "netlify.toml build.publish", opts: { netlifyAtRoot: dir === b } });
    } else add({ host: "netlify", dir: b, source: "netlify.toml (no build.publish \u2192 base)", opts: { netlifyAtRoot: true } });
  }
  if (has(tree, "firebase.json")) {
    const cfg = await readJson(tree, "firebase.json");
    const hs = cfg?.hosting ? Array.isArray(cfg.hosting) ? cfg.hosting : [cfg.hosting] : [];
    for (const h of hs) {
      if (typeof h?.public !== "string") continue;
      add({
        host: "firebase",
        dir: norm(h.public),
        source: `firebase.json hosting${h.target ? `[${h.target}]` : h.site ? `[${h.site}]` : ""}.public`,
        opts: { firebaseIgnore: Array.isArray(h.ignore) ? h.ignore.filter((x) => typeof x === "string") : void 0 }
      });
    }
  }
  const pkg = await readJson(tree, "package.json");
  const scripts = pkg?.scripts && typeof pkg.scripts === "object" ? pkg.scripts : {};
  if (has(tree, "vercel.json") || has(tree, ".vercel/project.json") || has(tree, "now.json")) {
    const v = await readJson(tree, "vercel.json") ?? {};
    const proj = await readJson(tree, ".vercel/project.json") ?? {};
    const hasBuild = !!(v.buildCommand || v.outputDirectory || v.framework || proj.settings?.framework || proj.settings?.buildCommand || scripts.build);
    add({ host: "vercel", dir: ".", source: has(tree, "vercel.json") ? "vercel.json" : ".vercel/project.json", opts: { vercelStatic: !hasBuild } });
  }
  for (const [name, cmd] of Object.entries(scripts)) {
    for (const d of deploymentsFromCommand(String(cmd))) {
      if (d.host === "vercel") d.opts.vercelStatic = !scripts.build;
      add({ ...d, source: `package.json scripts.${name}` });
    }
  }
  for (const f2 of tree.files) {
    if (!/^\.github\/workflows\/[^/]+\.ya?ml$/.test(f2.path)) continue;
    const y = await tree.readText(f2.path, 512 * 1024) ?? "";
    const blocks = y.split(/\n(?=\s*-\s+(?:name|uses|id):)/);
    for (const blk of blocks) {
      if (/uses:\s*actions\/upload-pages-artifact@/.test(blk)) {
        const p = /\bpath:\s*["']?([^"'\n#]+?)["']?\s*(?:#.*)?$/m.exec(blk)?.[1]?.trim() ?? "_site";
        const hidden = /include-hidden-files:\s*["']?true/.test(blk);
        if (!/\$\{\{/.test(p)) add({ host: "github-pages", dir: norm(p), source: `${f2.path} upload-pages-artifact`, opts: { includeHiddenFiles: hidden } });
      }
      const wa = /uses:\s*cloudflare\/wrangler-action@[\s\S]*?command:\s*["']?([^\n"']+)/.exec(blk);
      if (wa) for (const d of deploymentsFromCommand("wrangler " + wa[1])) add({ ...d, source: `${f2.path} wrangler-action` });
    }
  }
  return { deployments: out, notes, hasBuildScript: typeof scripts.build === "string" };
}
var DIR_FLAG = (cmd, flags) => {
  for (const fl of flags) {
    const m = new RegExp(`(?:^|\\s)${fl.replace(/[-]/g, "\\-")}(?:=|\\s+)(["']?)([^\\s"']+)\\1`).exec(cmd);
    if (m) return m[2];
  }
  return void 0;
};
function simpleCommands(line) {
  return line.split(/&&|\|\||;|\|/).map((s) => s.trim()).filter(Boolean).map((s) => (s.match(/"[^"]*"|'[^']*'|\S+/g) ?? []).map((t) => t.replace(/^["']|["']$/g, "")));
}
var BIN_ALIAS = { "netlify-cli": "netlify", "@netlify/cli": "netlify", "firebase-tools": "firebase", ntl: "netlify", now: "vercel" };
var RUNNERS = /* @__PURE__ */ new Set(["npx", "bunx", "pnpx", "yarn", "pnpm", "bun", "npm", "dlx", "exec", "run", "-y", "--yes", "x"]);
function deploymentsFromCommand(line) {
  const out = [];
  for (const argv0 of simpleCommands(line)) {
    let argv = argv0.filter((a) => !/^[A-Z_][A-Z0-9_]*=/.test(a));
    while (argv.length && RUNNERS.has(argv[0])) argv = argv.slice(1);
    if (!argv.length) continue;
    const raw = argv[0].replace(/(.)@[^/]*$/, "$1");
    const name = raw.startsWith("@") ? raw : raw.replace(/^.*[\\/]/, "").replace(/\.(cmd|exe|ps1)$/i, "");
    const bin = BIN_ALIAS[name] ?? name;
    const rest = argv.slice(1);
    const cmd = rest.join(" ");
    const positionals = (from) => rest.slice(from).filter((a, i, arr) => !a.startsWith("-") && !(i > 0 && /^--?(project-name|branch|commit-hash|commit-message|env|scope|token|site|alias|message|m|auth|config|cwd|target|filter|only|project|name)$/.test(arr[i - 1])));
    if (bin === "wrangler") {
      if (rest[0] === "pages" && (rest[1] === "deploy" || rest[1] === "publish")) {
        const dir = positionals(2)[0];
        out.push({ host: "cf-pages", dir: dir ? norm(dir) : "", source: "command", opts: {} });
      } else if (rest[0] === "deploy" || rest[0] === "publish" || rest[0] === "versions") {
        const assets = DIR_FLAG(cmd, ["--assets", "--site"]);
        out.push({ host: "cf-workers", dir: assets ? norm(assets) : "", source: "command", opts: {} });
      }
    } else if (bin === "vercel" || bin === "now") {
      const sub = rest[0];
      if (sub && /^(env|login|logout|link|pull|ls|list|domains|dns|certs|secrets|logs|inspect|whoami|teams|switch|alias|rm|remove|project|projects|git|init|dev|build|help|telemetry|redeploy|promote|rollback)$/.test(sub)) continue;
      const dirs = positionals(sub === "deploy" ? 1 : 0);
      out.push({ host: "vercel", dir: dirs[0] ? norm(dirs[0]) : ".", source: "command", opts: { vercelStatic: rest.includes("--prebuilt") ? true : void 0 } });
    } else if (bin === "netlify" || bin === "ntl") {
      if (rest[0] !== "deploy") continue;
      const dir = DIR_FLAG(cmd, ["--dir", "-d"]);
      out.push({ host: "netlify", dir: dir ? norm(dir) : "", source: "command", opts: {} });
    } else if (bin === "firebase") {
      if (rest[0] !== "deploy") continue;
      const only = DIR_FLAG(cmd, ["--only"]);
      if (only && !/hosting/.test(only)) continue;
      out.push({ host: "firebase", dir: "", source: "command", opts: {} });
    } else if (bin === "gh-pages") {
      const dir = DIR_FLAG(cmd, ["-d", "--dist"]) ?? ".";
      out.push({ host: "gh-pages", dir: norm(dir), source: "command", opts: { ghPagesDotfiles: rest.includes("--dotfiles") || rest.includes("-t") } });
    } else if (bin === "surge") {
      const dir = surgeProject(rest);
      if (dir !== void 0) out.push({ host: "surge", dir: norm(dir), source: "command", opts: {} });
    }
  }
  return out;
}
var SURGE_VERBS = /* @__PURE__ */ new Set(["login", "logout", "whoami", "verify", "mfa", "list", "revs", "rollback", "rollfore", "cutover", "discard", "teardown", "status", "token", "tokens", "ssl", "plan", "card", "invite", "revoke", "encrypt", "config", "dns", "zone", "debug", "stats", "account", "certs", "files", "audit", "bust", "usage", "traffic", "load", "audience", "nuke", "plus"]);
var SURGE_VALUE_FLAGS = /* @__PURE__ */ new Set(["-p", "--project", "-d", "--domain", "-e", "--endpoint", "-m", "--message", "-a", "--add", "-r", "--remove", "--build"]);
function surgeProject(rest) {
  const pos = [];
  const flags = /* @__PURE__ */ new Map();
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    const eq = /^(--?[a-z-]+)=(.*)$/.exec(a);
    if (eq) flags.set(eq[1], eq[2]);
    else if (SURGE_VALUE_FLAGS.has(a)) flags.set(a, rest[++i] ?? "");
    else if (a.startsWith("-")) flags.set(a, "");
    else pos.push(a);
  }
  if (flags.has("-h") || flags.has("--help") || flags.has("-V") || flags.has("--version")) return void 0;
  const project = flags.get("-p") ?? flags.get("--project");
  const intent = project !== void 0 || [...flags.keys()].some((f2) => /^(-d|--domain|--stage|-s|--preview|-m|--message|-a|--add|-r|--remove|--build|--private|--public)$/.test(f2));
  if (pos[0] === "publish" || pos[0] === "deploy") return project ?? pos[1] ?? ".";
  if (pos[0] && SURGE_VERBS.has(pos[0])) return void 0;
  if (pos[1] && pos[1] !== "publish" && pos[1] !== "deploy" && SURGE_VERBS.has(pos[1])) return void 0;
  if (pos[0] && /\.html?$/i.test(pos[0])) return void 0;
  if (pos[0]) return project ?? pos[0];
  return project ?? (intent || !pos.length ? "." : void 0);
}
var HOST_ORDER = ["cf-pages", "cf-workers", "vercel", "netlify", "firebase", "github-pages", "gh-pages", "surge"];

// src/scan.ts
var RANK = { LEAK: 3, RISK: 2, INFO: 1 };
var worstOf = (fs) => {
  let w = "CLEAN";
  for (const f2 of fs) if (w === "CLEAN" || RANK[f2.severity] > RANK[w]) w = f2.severity;
  return w;
};
function fixFor(host, path2, rule, dirLabel) {
  const pat = rule === "git-dir" ? ".git" : rule === "env-file" ? ".env*" : path2;
  switch (host) {
    case "cf-pages":
      return rule === "git-dir" ? `move it out of ${dirLabel} (wrangler skips .git only by name at any depth \u2014 this one is reachable)` : `deploy only your build output (wrangler pages deploy dist), or move ${path2} out of ${dirLabel} \u2014 Pages has no ignore file`;
    case "cf-workers":
      return `add "${pat}" to ${dirLabel === "." ? "" : dirLabel + "/"}.assetsignore`;
    case "vercel":
      return `add "${pat}" to .vercelignore (Vercel does not read .gitignore)`;
    case "netlify":
      return `move ${path2} out of the publish dir ${dirLabel}`;
    case "firebase":
      return `add "**/${rule === "env-file" ? ".env*" : path2.split("/").pop()}" to hosting.ignore in firebase.json (or restore the default "**/.*")`;
    case "github-pages":
      return `remove it from ${dirLabel}, or drop include-hidden-files: true`;
    case "gh-pages":
      return `remove it from ${dirLabel}, or drop --dotfiles`;
    case "surge":
      return `add "${pat}" to ${dirLabel === "." ? "" : dirLabel + "/"}.surgeignore (and drop any !${pat} line there)`;
  }
}
async function mapLimit(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k]);
      }
    })
  );
  return out;
}
var SERVER_SIDE = {
  "cf-pages": "a Pages Function",
  "cf-workers": "your Worker, with the key in a secret: wrangler secret put",
  vercel: "a Vercel Function, key in Project \u2192 Environment Variables",
  netlify: "a Netlify Function, key in Site configuration \u2192 Environment variables",
  firebase: "a Cloud Function, key in Secret Manager",
  "github-pages": "a serverless function on another host \u2014 GitHub Pages is static only",
  "gh-pages": "a serverless function on another host \u2014 GitHub Pages is static only",
  surge: "a serverless function on another host \u2014 Surge is static only"
};
var BUILD_DIRS = ["dist", "build", "out", "public", "_site", ".output/public", "www"];
function remedyFor(tree, d, findings) {
  const bad = findings.filter((f2) => f2.severity !== "INFO");
  if (!bad.length) return void 0;
  const dir = d.dir === "." ? "" : d.dir + "/";
  const notes = [];
  for (const f2 of bad.filter((f3) => f3.rule === "inline-secret" && !f3.path.endsWith(".map")))
    notes.push(`${f2.path}: the key is compiled into code you serve \u2014 no ignore file can hide it. Move the call server-side (${SERVER_SIDE[d.host]}), or if it is a browser key, restrict it by HTTP referrer and API.`);
  const ignorable = bad.filter((f2) => !(f2.rule === "inline-secret" && !f2.path.endsWith(".map")));
  const patterns = d.host === "cf-workers" || d.host === "vercel" || d.host === "firebase" || d.host === "surge";
  const agentDir = (p) => {
    const s = p.split("/");
    const i = s.findIndex((x) => x.startsWith("."));
    return s.slice(0, i + 1).join("/");
  };
  const line = (f2) => f2.rule === "source-map" || f2.path.endsWith(".map") ? "*.map" : !patterns ? f2.rule === "agent-config" ? agentDir(f2.path) + "/" : f2.path : f2.rule === "git-dir" ? ".git" : f2.rule === "env-file" ? f2.path.endsWith(".dev.vars") ? ".dev.vars" : ".env*" : f2.rule === "agent-config" ? agentDir(f2.path) : f2.path.replace(/\/$/, "");
  const lines = [...new Set(ignorable.map(line))];
  if (lines.includes("*.map")) notes.push("source maps: build with sourcemap: 'hidden' (Vite: build.sourcemap) so .map files never reach the output at all.");
  const atRoot = d.dir === "." && tree.files.some((f2) => f2.path === "package.json");
  const build = atRoot ? BUILD_DIRS.find((b) => tree.files.some((f2) => f2.path.startsWith(b + "/") && /\.html?$/.test(f2.path))) : void 0;
  const r = (say, extra = {}) => ({ say, lines: lines.length ? lines : void 0, notes: notes.length ? notes : void 0, ...extra });
  if (build && ["cf-pages", "netlify", "gh-pages", "firebase", "github-pages", "surge"].includes(d.host)) {
    const cmd = { "cf-pages": `wrangler pages deploy ${build}`, netlify: `netlify deploy --dir ${build}`, "gh-pages": `gh-pages -d ${build}`, firebase: `set "public": "${build}" in firebase.json`, "github-pages": `path: ${build}`, surge: `surge ${build} <domain>` }[d.host];
    return r(`you are deploying the project root \u2014 deploy the build output instead: ${cmd}`, { lines: void 0 });
  }
  if (!lines.length) return r("");
  switch (d.host) {
    case "cf-pages":
      return r(`move these out of ${dir || "the deploy dir"} \u2014 direct uploads to Pages have no ignore file (workers-sdk#14500)`);
    case "cf-workers":
      return r(`add to ${dir}.assetsignore`, { file: `${dir}.assetsignore` });
    case "vercel":
      return r("add to .vercelignore (Vercel never reads .gitignore)", { file: `${dir}.vercelignore` });
    case "netlify":
      return r(`move these out of the publish dir${dir ? " " + dir : ""}`);
    case "firebase":
      return r(`add to "hosting.ignore" in firebase.json`, { file: "firebase.json", lines: lines.map((l) => l.includes("/") || l.startsWith("*") ? l : `**/${l}`) });
    case "github-pages":
      return r(d.opts.includeHiddenFiles ? "drop include-hidden-files: true, or move these out of the artifact path" : `move these out of the artifact path${dir ? " " + dir : ""}`);
    case "gh-pages":
      return r(d.opts.ghPagesDotfiles ? "drop --dotfiles, or move these out" : `move these out of ${dir || "the folder you pass to gh-pages -d"}`);
    case "surge":
      return r(`add to ${dir}.surgeignore (and delete any "!" line there that re-includes them)`, { file: `${dir}.surgeignore` });
  }
}
async function scanDeployment(tree, d) {
  const dir = norm(d.dir || ".");
  const prefix = dir === "." ? "" : dir + "/";
  const inDir = tree.files.filter((f2) => prefix === "" || f2.path.startsWith(prefix)).map((f2) => ({ ...f2, rel: f2.path.slice(prefix.length) }));
  const read = (rel) => tree.readText(prefix + rel, 1024 * 1024);
  const filter2 = hostFilter(
    d.host,
    {
      opts: d.opts,
      vercelignore: d.host === "vercel" ? await read(".vercelignore") ?? await read(".nowignore") : void 0,
      assetsignore: d.host === "cf-workers" ? await read(".assetsignore") : void 0,
      surgeignore: d.host === "surge" ? await read(".surgeignore") : void 0
    },
    { hasCargo: inDir.some((f2) => f2.rel === "Cargo.toml") }
  );
  const fates = inDir.map((f2) => {
    const r = filter2(f2.rel);
    return { path: f2.rel, size: f2.size, fate: r.fate, why: r.why };
  });
  const findings = [];
  const savedByHost = [];
  const gitGroups = /* @__PURE__ */ new Map();
  const nmGroups = /* @__PURE__ */ new Map();
  const out = fates.filter((x) => x.fate !== "home");
  const perFile = await mapLimit(out, 8, async (x) => {
    const segs2 = x.path.split("/");
    const gi = segs2.indexOf(".git");
    if (gi >= 0) {
      const key = segs2.slice(0, gi + 1).join("/");
      const g = gitGroups.get(key) ?? { size: 0, files: 0 };
      g.size += x.size;
      g.files++;
      gitGroups.set(key, g);
      return [];
    }
    const ni = segs2.indexOf("node_modules");
    if (ni >= 0) {
      const key = segs2.slice(0, ni + 1).join("/");
      const g = nmGroups.get(key) ?? { size: 0, files: 0 };
      g.size += x.size;
      g.files++;
      nmGroups.set(key, g);
      return [];
    }
    return classify({
      path: x.path,
      size: x.size,
      readText: (max) => tree.readText(prefix + x.path, max),
      readHead: async (n) => tree.readHead ? tree.readHead(prefix + x.path, n) : void 0
    });
  });
  for (const fs of perFile) findings.push(...fs);
  for (const [key, g] of gitGroups) {
    const cfg = await tree.readText(prefix + key + "/config", 64 * 1024) ?? "";
    const cred = /url\s*=\s*https?:\/\/([^\s:@/]+):([^\s@/]+)@/.exec(cfg);
    findings.push({
      rule: "git-dir",
      severity: "LEAK",
      path: key + "/",
      size: g.size,
      title: "git repository",
      detail: `${g.files} files: full source and history \u2014 tools like git-dumper rebuild the repo from /${key}/${cred ? "; remote URL embeds a token" : ""}`,
      secrets: cred ? [{ name: "remote URL credentials", provider: /github/.test(cfg) ? "GitHub" : "git host", fingerprint: fingerprint(cred[2]), rotate: /github/.test(cfg) ? "https://github.com/settings/tokens" : void 0, shape: `${cred[2].slice(0, 4)}\u2026(${cred[2].length} chars)` }] : [],
      fix: ""
    });
  }
  for (const [key, g] of nmGroups) {
    findings.push({ rule: "node-modules", severity: "INFO", path: key + "/", size: g.size, title: "node_modules", detail: `${g.files} dependency files go public too (not scanned for secrets)`, secrets: [], fix: "" });
  }
  for (const x of fates) {
    if (x.fate !== "home") continue;
    const rule = riskyByName(x.path);
    if (!rule) continue;
    const segs2 = x.path.split("/");
    const gi = segs2.indexOf(".git");
    const p = gi >= 0 ? segs2.slice(0, gi + 1).join("/") + "/" : x.path;
    if (!savedByHost.some((s) => s.path === p)) savedByHost.push({ path: p, why: x.why ?? "skipped", rule });
  }
  const dirLabel = dir === "." ? "the project root" : dir + "/";
  for (const f2 of findings) {
    if (d.host === "vercel" && d.opts.vercelStatic === false && f2.severity === "LEAK") {
      f2.severity = "RISK";
      f2.detail += " \u2014 uploaded to Vercel's build machine; public only if your build copies it into the output";
    }
    if (!f2.fix) f2.fix = fixFor(d.host, f2.path.replace(/\/$/, ""), f2.rule, dirLabel);
  }
  findings.sort((a, b) => RANK[b.severity] - RANK[a.severity] || b.size - a.size || a.path.localeCompare(b.path));
  const totals = { files: fates.length, bytes: fates.reduce((s, x) => s + x.size, 0), public: 0, uploaded: 0, home: 0 };
  for (const x of fates) totals[x.fate]++;
  const remedy = remedyFor(tree, { ...d, dir }, findings);
  return { deployment: { ...d, dir }, hostName: HOSTS[d.host].name, fates, findings, savedByHost, totals, remedy };
}
async function scan(tree, opts = {}) {
  let deployments = [];
  const detected = await detectDeployments(tree);
  let matrix = false;
  if (opts.deployments?.length) {
    deployments = opts.deployments.map((d) => {
      if (d.dir) return d;
      const fromCfg = detected.deployments.find((x) => x.host === d.host);
      return fromCfg ? { ...fromCfg, opts: { ...fromCfg.opts, ...strip(d.opts) }, source: `${d.source} + ${fromCfg.source}` } : { ...d, dir: "." };
    });
  } else if (opts.host) {
    const fromCfg = detected.deployments.find((x) => x.host === opts.host);
    deployments = [opts.dir ? { host: opts.host, dir: norm(opts.dir), source: "--host + --dir", opts: fromCfg?.opts ?? {} } : fromCfg ?? { host: opts.host, dir: ".", source: "--host", opts: {} }];
  } else if (!opts.matrix && detected.deployments.length) {
    deployments = opts.dir ? detected.deployments.map((d) => ({ ...d, dir: join(norm(opts.dir), "."), source: d.source + " (dir overridden)" })) : detected.deployments;
  } else {
    matrix = true;
    const base2 = norm(opts.dir ?? ".");
    deployments = HOST_ORDER.map((host) => {
      const cfg = detected.deployments.find((x) => x.host === host);
      const opts2 = cfg?.opts ?? (host === "vercel" ? { vercelStatic: !detected.hasBuildScript } : {});
      return { host, dir: base2, source: "matrix", opts: opts2 };
    });
  }
  for (const d of deployments) if (d.host === "vercel" && d.opts.vercelStatic === void 0) d.opts = { ...d.opts, vercelStatic: !detected.hasBuildScript };
  const reports = [];
  for (const d of deployments) reports.push(await scanDeployment(tree, d));
  const all = reports.flatMap((r) => r.findings);
  return { tool: "airing", version: VERSION, root: tree.name, matrix, deployments: reports, worst: worstOf(all) };
}
function strip(o) {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== void 0));
}

// src/probe.ts
var UA = `airing/${VERSION} (+https://github.com/Blackman99/airing; checks your own site for exposed files)`;
var looksHtml = (t) => /^\s*(<!doctype|<html|<head|<body|<\?xml|<)/i.test(t);
var envCheck = (path2) => ({
  path: path2,
  rule: "env-file",
  validate: (g) => {
    if (looksHtml(g.text)) return void 0;
    const lines = g.text.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#"));
    const vars = parseEnv(g.text);
    if (!vars.length || vars.length < lines.length * 0.5) return void 0;
    const secrets = secretVars(vars);
    return secrets.length ? { severity: "LEAK", title: "env file is downloadable", detail: `${vars.length} variables, ${secrets.length} look secret`, secrets } : { severity: "RISK", title: "env file is downloadable", detail: `${vars.length} variables, none look secret`, secrets: [] };
  }
});
var CHECKS = [
  ...[".env", ".env.local", ".env.production", ".env.prod", ".env.development", ".env.staging", ".env.backup", ".env.bak", ".env.save", ".env.old", ".dev.vars"].map(envCheck),
  {
    path: ".git/config",
    rule: "git-dir",
    validate: (g) => {
      if (!/\[core\]/.test(g.text) || looksHtml(g.text)) return void 0;
      const cred = /url\s*=\s*https?:\/\/([^\s:@/]+):([^\s@/]+)@/.exec(g.text);
      return {
        severity: "LEAK",
        title: "git repository is downloadable",
        detail: `/.git/config answers \u2014 git-dumper can rebuild your source and history${cred ? "; remote URL embeds a token" : ""}`,
        secrets: cred ? [{ name: "remote URL credentials", provider: "git host", fingerprint: fingerprint(cred[2]), shape: `${cred[2].slice(0, 4)}\u2026(${cred[2].length} chars)` }] : []
      };
    }
  },
  {
    path: ".git/HEAD",
    rule: "git-dir",
    validate: (g) => /^(ref: refs\/|[0-9a-f]{40}\s*$)/.test(g.text) ? { severity: "LEAK", title: "git repository is downloadable", detail: "/.git/HEAD answers", secrets: [] } : void 0
  },
  {
    path: ".npmrc",
    rule: "credentials",
    validate: (g) => {
      if (looksHtml(g.text) || !/registry|_auth|always-auth|@[\w-]+:/.test(g.text)) return void 0;
      const m = /(_authToken|_auth|_password)\s*=\s*(\S+)/.exec(g.text);
      return m && !/\$\{/.test(m[2]) ? { severity: "LEAK", title: ".npmrc with a registry token", detail: `${m[1]} is set`, secrets: [{ name: m[1], provider: "npm", fingerprint: fingerprint(m[2]), rotate: "https://www.npmjs.com/settings/~/tokens", shape: `${m[2].slice(0, 4)}\u2026(${m[2].length} chars)` }] } : { severity: "INFO", title: ".npmrc is downloadable", detail: "registry config, no inline token", secrets: [] };
    }
  },
  ...["id_rsa", "id_ed25519", ".ssh/id_rsa", "server.key", "private.pem", "key.pem"].map(
    (path2) => ({
      path: path2,
      rule: "private-key",
      validate: (g) => /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(g.text) ? { severity: "LEAK", title: "private key is downloadable", detail: "anyone can act as you", secrets: [{ name: path2, provider: "key pair", fingerprint: fingerprint(g.text), shape: "PEM block" }] } : void 0
    })
  ),
  ...["backup.sql", "dump.sql", "db.sql", "database.sql", "data.sql"].map(
    (path2) => ({ path: path2, rule: "db-dump", validate: (g) => !looksHtml(g.text) && /(CREATE TABLE|INSERT INTO|COPY .* FROM stdin)/i.test(g.text) ? { severity: "LEAK", title: "database dump is downloadable", detail: "your data, in one request", secrets: [] } : void 0 })
  ),
  ...["db.sqlite", "database.sqlite", "data.db", "db.sqlite3"].map(
    (path2) => ({ path: path2, rule: "db-dump", validate: (g) => new TextDecoder().decode(g.body.subarray(0, 15)) === "SQLite format 3" ? { severity: "LEAK", title: "SQLite database is downloadable", detail: "your data, in one request", secrets: [] } : void 0 })
  ),
  {
    path: ".aws/credentials",
    rule: "credentials",
    validate: (g) => {
      const m = /aws_secret_access_key\s*=\s*(\S+)/i.exec(g.text);
      return m ? { severity: "LEAK", title: "AWS credentials are downloadable", detail: "aws_secret_access_key is set", secrets: [{ name: "aws_secret_access_key", provider: "AWS", fingerprint: fingerprint(m[1]), rotate: "https://console.aws.amazon.com/iam/home#/security_credentials", shape: `\u2026(${m[1].length} chars)` }] } : void 0;
    }
  },
  ...["service-account.json", "serviceAccount.json", "credentials.json", "firebase-adminsdk.json"].map(
    (path2) => ({
      path: path2,
      rule: "credentials",
      validate: (g) => /"type"\s*:\s*"service_account"/.test(g.text) && /"private_key"/.test(g.text) ? { severity: "LEAK", title: "service-account key is downloadable", detail: "full API access as that account", secrets: [{ name: "private_key", provider: "Google Cloud", fingerprint: fingerprint(g.text), rotate: "https://console.cloud.google.com/iam-admin/serviceaccounts", shape: "JSON key file" }] } : void 0
    })
  ),
  {
    path: ".claude/settings.local.json",
    rule: "agent-config",
    validate: (g) => !looksHtml(g.text) && /"permissions"|"env"|"hooks"/.test(g.text) ? { severity: "RISK", title: "your coding agent's local settings are downloadable", detail: "permissions, env and hook config from .claude/", secrets: [] } : void 0
  },
  {
    path: ".DS_Store",
    rule: "ds-store",
    validate: (g) => g.body.length > 8 && g.body[3] === 1 && new TextDecoder().decode(g.body.subarray(4, 8)) === "Bud1" ? { severity: "INFO", title: ".DS_Store is downloadable", detail: "lists file names in that folder", secrets: [] } : void 0
  },
  { path: "wrangler.toml", rule: "config-file", validate: (g) => !looksHtml(g.text) && /compatibility_date|pages_build_output_dir|^name\s*=/m.test(g.text) ? { severity: "INFO", title: "wrangler.toml is downloadable", detail: "the whole project root was deployed", secrets: [] } : void 0 },
  { path: ".vercel/project.json", rule: "config-file", validate: (g) => /"projectId"/.test(g.text) ? { severity: "INFO", title: ".vercel/project.json is downloadable", detail: "the whole project root was deployed", secrets: [] } : void 0 }
];
async function probe(target, opts = {}) {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 1e4;
  const conc = opts.concurrency ?? 4;
  let url;
  try {
    url = new URL(/^https?:\/\//i.test(target) ? target : `https://${target}`);
  } catch {
    throw new Error(`not a URL: ${target}`);
  }
  url.hash = "";
  url.search = "";
  if (!url.pathname.endsWith("/") && !/\.[a-z0-9]{1,6}$/i.test(url.pathname)) url.pathname += "/";
  const base2 = new URL(url.pathname.endsWith("/") ? url.href : url.href.replace(/[^/]*$/, ""));
  const report = { tool: "airing", version: VERSION, target: base2.href, checked: 0, notFound: { status: 0, note: "" }, findings: [], errors: [], worst: "CLEAN" };
  const get = async (u, max = 5 * 1024 * 1024) => {
    report.checked++;
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetchImpl(u, { redirect: "follow", signal: ac.signal, headers: { "user-agent": UA, accept: "*/*" } });
      const buf = new Uint8Array(await res.arrayBuffer()).subarray(0, max);
      return { url: u, status: res.status, type: res.headers.get("content-type") ?? "", body: buf, text: new TextDecoder().decode(buf), finalUrl: res.url || u };
    } catch (e) {
      const err = e;
      const msg = err.name === "AbortError" ? `no answer within ${Math.round(timeoutMs / 1e3)}s` : err.cause?.code === "ENOTFOUND" ? "DNS: no such host" : err.cause?.code === "ECONNREFUSED" ? "connection refused" : err.cause?.code ? `${err.message} (${err.cause.code})` : err.message;
      report.errors.push(`${u}: ${msg}`);
      return void 0;
    } finally {
      clearTimeout(t);
    }
  };
  const home = await get(base2.href);
  if (!home) {
    report.errors = [`could not reach ${base2.href} \u2014 ${report.errors[0]?.split(": ").slice(1).join(": ") || "no answer"}`];
    report.unreachable = true;
    return report;
  }
  const rand = sha256Hex(String(Date.now()) + Math.random()).slice(0, 10);
  const ghosts = (await Promise.all([get(new URL(`airing-${rand}.env`, base2).href), get(new URL(`.airing-${rand}/config`, base2).href)])).filter(Boolean);
  const ghostHashes = new Set(ghosts.filter((g) => g.status === 200).map((g) => sha256Hex(g.text)));
  ghostHashes.add(sha256Hex(home.text));
  const g0 = ghosts[0];
  report.notFound = g0 ? { status: g0.status, note: g0.status === 200 ? "answers 200 for paths that don't exist (SPA fallback) \u2014 hits are content-checked, not status-checked" : `answers ${g0.status} for paths that don't exist` } : { status: 0, note: "no answer for a missing path" };
  const soft = (g) => g.status !== 200 || ghostHashes.has(sha256Hex(g.text)) || g.finalUrl !== g.url && new URL(g.finalUrl).pathname === base2.pathname;
  const seenRule = /* @__PURE__ */ new Set();
  const push = (path2, g, rule, v, fix) => {
    if (rule === "git-dir") {
      if (seenRule.has("git-dir")) return;
      seenRule.add("git-dir");
    }
    report.findings.push({ rule, path: path2, size: g.body.length, fix, url: g.url, status: g.status, ...v });
  };
  const checks = [...CHECKS, ...(opts.extraPaths ?? []).map((p) => ({ path: p.replace(/^\//, ""), rule: "custom", validate: (g) => ({ severity: "RISK", title: `${p} is downloadable`, detail: `${g.body.length} bytes, ${g.type || "unknown type"}`, secrets: inlineSecrets(g.text).refs }) }))];
  let i = 0;
  await Promise.all(
    Array.from({ length: conc }, async () => {
      while (i < checks.length) {
        const c = checks[i++];
        const g = await get(new URL(c.path, base2).href);
        if (!g || soft(g)) continue;
        const v = c.validate(g);
        if (v) push(new URL(c.path, base2).pathname, g, c.rule, v, fixText(c.rule));
      }
    })
  );
  const inlineHome = inlineSecrets(home.text);
  if (inlineHome.refs.length) push(new URL(home.url).pathname, home, "inline-secret", inlineVerdict(inlineHome, "the page HTML"), fixText("inline-secret"));
  const scripts = [...home.text.matchAll(/<(?:script[^>]*\ssrc|link[^>]*rel=["']?modulepreload["']?[^>]*\shref)=["']([^"']+)["']/gi)].map((m) => {
    try {
      return new URL(m[1], home.finalUrl);
    } catch {
      return void 0;
    }
  }).filter((u) => !!u && u.origin === base2.origin);
  const uniq = [...new Map(scripts.map((u) => [u.href, u])).values()].slice(0, opts.maxScripts ?? 20);
  let k = 0;
  await Promise.all(
    Array.from({ length: conc }, async () => {
      while (k < uniq.length) {
        const s = uniq[k++];
        const g = await get(s.href, 15 * 1024 * 1024);
        if (!g || g.status !== 200) continue;
        const inl = inlineSecrets(g.text);
        if (inl.refs.length) push(s.pathname, g, "inline-secret", inlineVerdict(inl, "served JavaScript"), fixText("inline-secret"));
        const ref2 = /\/\/[#@]\s*sourceMappingURL=([^\s'"]+)\s*$/m.exec(g.text)?.[1];
        const mapUrl = ref2 && !ref2.startsWith("data:") ? new URL(ref2, s).href : `${s.href}.map`;
        if (new URL(mapUrl).origin !== base2.origin) continue;
        const m = await get(mapUrl, 50 * 1024 * 1024);
        if (!m || soft(m)) continue;
        try {
          const j = JSON.parse(m.text);
          if (j.version !== 3 || !Array.isArray(j.sources)) continue;
          const contents = Array.isArray(j.sourcesContent) ? j.sourcesContent.filter((c) => typeof c === "string" && c.length) : [];
          if (contents.length) {
            const inS = inlineSecrets(contents.join("\n"));
            if (inS.refs.length && !inS.onlyPublicish) push(new URL(mapUrl).pathname, m, "inline-secret", { severity: "LEAK", title: "secret inside a public source map", detail: `original source contains ${inS.refs.length} key${inS.refs.length === 1 ? "" : "s"}`, secrets: inS.refs }, fixText("inline-secret"));
            push(new URL(mapUrl).pathname, m, "source-map", { severity: "RISK", title: "source map serves your original source", detail: `${contents.length} of ${j.sources.length} files readable via sourcesContent`, secrets: [] }, fixText("source-map"));
          }
        } catch {
        }
      }
    })
  );
  const RANK2 = { LEAK: 3, RISK: 2, INFO: 1 };
  report.findings.sort((a, b) => RANK2[b.severity] - RANK2[a.severity] || a.path.localeCompare(b.path));
  report.worst = worstOf(report.findings);
  return report;
}
function inlineVerdict(inl, where) {
  return inl.onlyPublicish ? { severity: "RISK", title: `Google API key in ${where}`, detail: "fine only if it is a restricted browser key (Firebase web config); unrestricted, it is someone else's free Gemini", secrets: inl.refs } : { severity: "LEAK", title: `secret in ${where}`, detail: `${inl.refs.length} key${inl.refs.length === 1 ? "" : "s"} anyone can read`, secrets: inl.refs };
}
function fixText(rule) {
  switch (rule) {
    case "env-file":
    case "credentials":
    case "private-key":
    case "inline-secret":
      return "rotate first (it has been public), then remove it from the deploy dir and redeploy; on Cloudflare Pages also delete old deployments \u2014 <hash>.<project>.pages.dev keeps serving them";
    case "git-dir":
      return "deploy only your build output; then rotate anything that was ever committed";
    case "db-dump":
      return "take it down now and treat the data as disclosed";
    case "source-map":
      return "stop shipping sourcesContent (build.sourcemap: 'hidden' / false) or upload maps to your error tracker only";
    default:
      return "remove it from the deploy dir and redeploy";
  }
}

// src/run.ts
import { resolve as resolve2 } from "node:path";

// src/tree-node.ts
import { closeSync, lstatSync, openSync, readdirSync, readSync, statSync } from "node:fs";
import { basename, join as join2, resolve } from "node:path";
var MAX_FILES = 25e4;
function nodeTree(root) {
  const abs = resolve(root);
  const files = [];
  let truncated = false;
  const walk = (dir, rel) => {
    let names;
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
      const p = join2(dir, name);
      const r = rel ? `${rel}/${name}` : name;
      let st2;
      try {
        st2 = lstatSync(p);
        if (st2.isSymbolicLink()) {
          const t = statSync(p);
          if (t.isFile()) files.push({ path: r, size: t.size });
          continue;
        }
      } catch {
        continue;
      }
      if (st2.isDirectory()) walk(p, r);
      else if (st2.isFile()) files.push({ path: r, size: st2.size });
    }
  };
  const st = statSync(abs);
  if (!st.isDirectory()) throw new Error(`${root} is not a directory`);
  walk(abs, "");
  const readBytes = (path2, max) => {
    try {
      const fd = openSync(join2(abs, path2), "r");
      try {
        const size = statSync(join2(abs, path2)).size;
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
      return void 0;
    }
  };
  return {
    name: root === "." ? basename(abs) : root,
    abs,
    files,
    truncated,
    async readText(path2, maxBytes = 4 * 1024 * 1024) {
      const b = readBytes(path2, maxBytes);
      if (!b) return void 0;
      if (b.subarray(0, 8192).includes(0) && !/\.(map|json|js)$/.test(path2)) return "";
      return b.toString("utf8");
    },
    async readHead(path2, n) {
      const b = readBytes(path2, n);
      return b ? new Uint8Array(b) : void 0;
    }
  };
}

// src/run.ts
var failed = (worst, on) => on === "never" ? false : on === "risk" ? worst === "LEAK" || worst === "RISK" : worst === "LEAK";
async function scanPath(path2, opts = {}) {
  const tree = nodeTree(path2);
  const r = await scan(tree, opts);
  return r;
}
function parseDeployLine(line, cwd) {
  let dir = cwd;
  const m = /^\s*cd\s+(["']?)([^"'&;|]+)\1\s*(?:&&|;)\s*/.exec(line);
  if (m) dir = resolve2(cwd, m[2].trim());
  return { cwd: dir, deployments: deploymentsFromCommand(m ? line.slice(m[0].length) : line) };
}

// src/mcp.ts
var TOOLS = [
  {
    name: "scan_deploy",
    description: "Before running a deploy command (wrangler pages deploy, wrangler deploy with assets, vercel, netlify deploy, firebase deploy, actions/upload-pages-artifact, gh-pages, surge), resolve exactly which files that host would upload from a directory using the host's own ignore rules, and report anything secret that would become public: .env / .dev.vars files with secret-looking variables, .git/, private keys, cloud credential files, database dumps, source maps with original source, provider API keys baked into bundles. Secret values are never returned (names, shapes and sha256 fingerprints only). With no host and no deploy config, checks every host. Read-only: never uploads, deploys or edits.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Project directory (absolute, or relative to the server's working directory). Default: the working directory." },
        host: { type: "string", enum: HOST_IDS, description: "Deploy target. Omit to use the project's config (wrangler.toml, netlify.toml, firebase.json, vercel.json, package.json scripts, Pages workflow)." },
        dir: { type: "string", description: "Deploy directory inside path (e.g. dist). Omit to use the config." }
      },
      required: []
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  },
  {
    name: "probe_url",
    description: "Check what anyone can download from a live site right now: ~30 GET requests for the usual leak paths (/.env, /.env.production, /.dev.vars, /.git/config, /.npmrc, private keys, SQL/SQLite dumps, service-account JSON, .claude/settings.local.json) plus the page's own scripts and their source maps. Soft-404/SPA-fallback aware; every hit is content-validated. Secret values are never returned. Only use on sites you own or are authorized to test. Read-only (GET only).",
    inputSchema: { type: "object", properties: { url: { type: "string", description: "Site URL, e.g. https://my-app.pages.dev" } }, required: ["url"] },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
  },
  {
    name: "host_rules",
    description: "What each static host skips by default when it uploads a directory (transcribed from the upstream CLI source, with links). Use to explain why a file would or would not be public.",
    inputSchema: { type: "object", properties: {}, required: [] },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }
];
async function callTool(name, args, cwd = process.cwd()) {
  if (name === "scan_deploy") {
    const path2 = resolve3(cwd, typeof args.path === "string" && args.path ? args.path : ".");
    if (args.host !== void 0 && !isHostId(String(args.host))) return { text: `unknown host "${args.host}". Known: ${HOST_IDS.join(", ")}`, isError: true };
    const r = await scanPath(path2, { host: args.host, dir: typeof args.dir === "string" && args.dir ? args.dir : void 0 });
    const compact = r.deployments.map((d) => ({ host: d.deployment.host, dir: d.deployment.dir, source: d.deployment.source, totals: d.totals, findings: d.findings.filter((f2) => f2.severity !== "INFO"), savedByHost: d.savedByHost.slice(0, 20) }));
    return { text: `worst: ${r.worst}${r.matrix ? " (no deploy config: every host checked)" : ""}

${formatMarkdown(r)}

\`\`\`json
${JSON.stringify({ root: r.root, worst: r.worst, deployments: compact }, null, 2)}
\`\`\`` };
  }
  if (name === "probe_url") {
    if (typeof args.url !== "string" || !args.url) return { text: "url is required", isError: true };
    const r = await probe(args.url);
    return { text: formatProbe(r, plain, {}) + "\n\n```json\n" + JSON.stringify({ target: r.target, worst: r.worst, findings: r.findings, notFound: r.notFound, errors: r.errors.slice(0, 5) }, null, 2) + "\n```" };
  }
  if (name === "host_rules") return { text: JSON.stringify(HOSTS, null, 2) };
  return { text: `unknown tool ${name}`, isError: true };
}
async function runMcp() {
  const rl = createInterface({ input: process.stdin });
  const send = (m) => process.stdout.write(JSON.stringify(m) + "\n");
  const pending = [];
  for await (const line of rl) {
    if (!line.trim()) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } });
      continue;
    }
    const { id: id2, method, params } = msg;
    if (id2 === void 0 || id2 === null) continue;
    const reply = (result) => send({ jsonrpc: "2.0", id: id2, result });
    if (method === "initialize") {
      reply({
        protocolVersion: params?.protocolVersion ?? "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "airing", version: VERSION },
        instructions: "Call scan_deploy on the project before running any deploy command (wrangler, vercel, netlify, firebase, gh-pages, surge). If it reports LEAK, do not deploy; fix the upload set first. After a deploy, probe_url checks the live site. All tools are read-only."
      });
    } else if (method === "ping") reply({});
    else if (method === "tools/list") reply({ tools: TOOLS });
    else if (method === "tools/call") {
      pending.push(
        callTool(params?.name, params?.arguments ?? {}).then(
          (r) => reply({ content: [{ type: "text", text: r.text }], isError: !!r.isError }),
          (e) => reply({ content: [{ type: "text", text: `error: ${e.message}` }], isError: true })
        )
      );
    } else send({ jsonrpc: "2.0", id: id2, error: { code: -32601, message: `method not found: ${method}` } });
  }
  await Promise.all(pending);
}

// src/cli.ts
var HELP = `airing ${VERSION} \u2014 what is your deploy airing in public?

  airing [dir]                     what each host would publish from dir (default .)
  airing [dir] --host <id>         one host, with fixes   (${HOST_IDS.join(" | ")})
  airing probe <url>               what anyone can download from the live site right now
  airing guard -- <deploy cmd>     scan first, run the deploy only if nothing would leak
  airing hook                      Claude Code PreToolUse hook (reads hook JSON on stdin)
  airing hosts                     each host's real ignore rules, with upstream source links
  airing mcp                       read-only MCP server on stdio

options
  --dir <path>        deploy directory inside [dir] (overrides config)
  --matrix            check every host even if config names one
  --fail-on <level>   leak (default) | risk | never
  --json | --markdown output format
  --all               include info notes
  --timeout <s>       probe: seconds per request (default 10)
  --no-color

exit codes: 0 nothing at --fail-on level \xB7 1 would leak / leaking \xB7 2 usage or I/O error
Values are never printed: names, shapes and sha256 fingerprints only.`;
function parseArgs(argv) {
  const a = { _: [], flags: {}, rest: [] };
  const takes = /* @__PURE__ */ new Set(["host", "dir", "fail-on", "timeout", "path"]);
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === "--") {
      a.rest = argv.slice(i + 1);
      break;
    }
    if (x.startsWith("--")) {
      const [k, v] = x.slice(2).split("=", 2);
      if (v !== void 0) a.flags[k] = v;
      else if (takes.has(k)) {
        const next = argv[i + 1];
        if (next === void 0 || next.startsWith("--")) throw new UsageError(`--${k} needs a value`);
        a.flags[k] = next;
        i++;
      } else a.flags[k] = true;
    } else if (x === "-h") a.flags.help = true;
    else if (x === "-v" || x === "-V") a.flags.version = true;
    else a._.push(x);
  }
  return a;
}
var UsageError = class extends Error {
};
var KNOWN = /* @__PURE__ */ new Set(["host", "dir", "fail-on", "timeout", "path", "matrix", "json", "markdown", "all", "no-color", "help", "version"]);
function closest(k) {
  const d = (a, b) => {
    const m = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) m[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return m[a.length][b.length];
  };
  let best, bd = 3;
  for (const c of KNOWN) {
    const x = d(k, c);
    if (x < bd) bd = x, best = c;
  }
  return best;
}
function checkFlags(a) {
  for (const k of Object.keys(a.flags)) {
    if (KNOWN.has(k)) continue;
    const c = closest(k);
    throw new UsageError(`unknown option --${k}${c ? ` (did you mean --${c}?)` : ""}`);
  }
  if (a.flags.timeout !== void 0 && !(Number(a.flags.timeout) > 0)) throw new UsageError(`--timeout is seconds per request, e.g. --timeout 20 (got "${a.flags.timeout}")`);
}
var style = (a) => a.flags["no-color"] || process.env.NO_COLOR || !process.stdout.isTTY ? plain : ansi();
function failOn(a) {
  const v = String(a.flags["fail-on"] ?? "leak");
  if (v !== "leak" && v !== "risk" && v !== "never") throw new UsageError(`--fail-on must be leak, risk or never (got "${v}")`);
  return v;
}
function hostFlag(a) {
  const h = a.flags.host;
  if (h === void 0) return void 0;
  if (typeof h !== "string" || !isHostId(h)) throw new UsageError(`unknown host "${h}". Known: ${HOST_IDS.join(", ")}`);
  return h;
}
async function main(argv) {
  const a = parseArgs(argv);
  checkFlags(a);
  if (a.flags.version) return console.log(VERSION), 0;
  const cmd = a._[0];
  if (a.flags.help || cmd === "help") return console.log(HELP), 0;
  if (cmd === "mcp") return await runMcp(), 0;
  if (cmd === "hosts") {
    if (a.flags.json) return console.log(JSON.stringify(HOSTS, null, 2)), 0;
    const st = style(a);
    for (const h of Object.values(HOSTS)) {
      console.log(`${st.bold(h.name.padEnd(26))} ${st.dim(h.id)}`);
      console.log(`  ${st.dim("runs:")}  ${h.command}`);
      console.log(`  ${st.dim("skips:")} ${h.skips}`);
      console.log(`  ${st.dim("source:")} ${h.source}
`);
    }
    return 0;
  }
  if (cmd === "probe") {
    const url = a._[1];
    if (!url) throw new UsageError("probe needs a URL: airing probe https://my-site.pages.dev");
    const timeoutMs = a.flags.timeout ? Number(a.flags.timeout) * 1e3 : void 0;
    const fo2 = failOn(a);
    const r2 = await probe(url, { timeoutMs });
    if (a.flags.json) console.log(JSON.stringify(r2, null, 2));
    else console.log(formatProbe(r2, style(a), { all: !!a.flags.all }));
    if (r2.errors.length && r2.checked <= r2.errors.length) return 2;
    return failed(r2.worst, fo2) ? 1 : 0;
  }
  if (cmd === "hook") return hook();
  if (cmd === "guard") {
    if (!a.rest.length) throw new UsageError("guard needs the deploy command after --: airing guard -- npx wrangler pages deploy dist");
    const line = a.rest.join(" ");
    const { cwd, deployments } = parseDeployLine(line, process.cwd());
    const fo2 = failOn(a);
    if (!deployments.length) {
      console.error(style(a).risk(`airing: "${a.rest[0]}" is not a deploy command I know (wrangler, vercel, netlify, firebase, gh-pages, surge) \u2014 running it unchecked.`));
    } else {
      const r2 = await scan(nodeTree(cwd), { deployments });
      if (failed(r2.worst, fo2)) {
        console.error(formatScan(r2, process.stderr.isTTY && !process.env.NO_COLOR ? ansi() : plain, { all: !!a.flags.all }));
        console.error(style(a).leak("airing: deploy NOT run."));
        return 1;
      }
      const n = r2.deployments.reduce((s, d) => s + d.totals.public + d.totals.uploaded, 0);
      console.error(style(a).ok(`airing: ${n} files checked, nothing secret \u2014 deploying.`));
    }
    return await new Promise((res) => {
      const child = spawn(a.rest[0], a.rest.slice(1), { stdio: "inherit", shell: process.platform === "win32" });
      child.on("error", (e) => (console.error(`airing: could not run ${a.rest[0]}: ${e.message}`), res(127)));
      child.on("exit", (code, sig) => res(code ?? (sig ? 128 : 1)));
    });
  }
  const path2 = cmd ?? ".";
  if (a._.length > 1) throw new UsageError(`one directory at a time (got ${a._.join(", ")})`);
  const host = hostFlag(a);
  const fo = failOn(a);
  if (!existsSync(path2)) throw new UsageError(`${path2} does not exist \u2014 pass the folder you deploy, e.g. airing dist (or airing . for the project root)`);
  const r = await scanPath(path2, { host, dir: typeof a.flags.dir === "string" ? a.flags.dir : void 0, matrix: !!a.flags.matrix });
  if (a.flags.json) console.log(JSON.stringify(r, (k, v) => k === "fates" && !a.flags.all ? void 0 : v, 2));
  else if (a.flags.markdown) console.log(formatMarkdown(r));
  else console.log(formatScan(r, style(a), { all: !!a.flags.all, root: path2, matrix: !!a.flags.matrix }));
  return failed(r.worst, fo) ? 1 : 0;
}
async function hook() {
  let input = {};
  try {
    input = JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {
    return 0;
  }
  const command = input?.tool_input?.command;
  if (input?.tool_name && input.tool_name !== "Bash") return 0;
  if (typeof command !== "string") return 0;
  const { cwd, deployments } = parseDeployLine(command, typeof input.cwd === "string" ? input.cwd : process.cwd());
  if (!deployments.length) return 0;
  try {
    const r = await scan(nodeTree(cwd), { deployments });
    if (r.worst !== "LEAK") return 0;
    const reason = formatScan(r, plain, {}).split("\n").slice(0, 40).join("\n");
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: `airing blocked this deploy: secrets would be public.

${reason}

Follow the "keep it home:" line above (deploy the build output, or add the ignore lines), rotate any key that was already deployed, then retry. Do not work around this by deploying a different way.`
        }
      }) + "\n"
    );
  } catch {
    return 0;
  }
  return 0;
}
main(process.argv.slice(2)).then(
  (code) => process.exitCode = code,
  (e) => {
    if (e instanceof UsageError) console.error(`airing: ${e.message}
run airing --help`);
    else console.error(`airing: ${e.message}`);
    process.exitCode = 2;
  }
);
