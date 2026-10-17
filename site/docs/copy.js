// docs: the same peg "copy" as the landing, on every code block (comments and "# …" tails stripped)
for (const pre of document.querySelectorAll("pre.code")) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "peg-copy"; b.textContent = "copy"; b.setAttribute("aria-label", "copy this snippet");
  const text = pre.textContent.split("\n").filter((l) => !l.startsWith("// ")).map((l) => l.replace(/\s{2,}#\s.*$/, "")).join("\n");
  pre.append(b);
  b.addEventListener("click", async () => {
    let ok = true;
    try { await navigator.clipboard.writeText(text); } catch {
      const t = document.createElement("textarea"); t.value = text; t.style.cssText = "position:fixed;opacity:0"; document.body.append(t); t.select(); ok = document.execCommand("copy"); t.remove();
    }
    b.classList.toggle("done", ok); b.textContent = ok ? "pegged ✓" : "select + ⌘C";
    clearTimeout(b._t); b._t = setTimeout(() => { b.classList.remove("done"); b.textContent = "copy"; }, 1800);
  });
}
