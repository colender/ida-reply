let saved = null;


document.addEventListener("contextmenu",(e) => {
    const target = e.composedPath()[0];

  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
    saved = { el: target, start: target.selectionStart, end: target.selectionEnd };
  } else if (target.isContentEditable) {
    const sel = window.getSelection();
    const editable = target.closest("[contenteditable]") || target;
    saved = { el: editable, range: sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null };
  } else {
    saved = null;
  }
},true)



function showForm(names) {
  return new Promise((resolve) => {
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "closed" });

    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        .backdrop {
          position: fixed; inset: 0; z-index: 2147483647;
          background: rgba(0,0,0,0.35);
          display: flex; align-items: center; justify-content: center;
          font-family: system-ui, sans-serif;
        }
        form {
          background: #fff; color: #222; padding: 20px; border-radius: 10px;
          width: 360px; max-width: 90vw; box-shadow: 0 10px 30px rgba(0,0,0,0.25);
        }
        h2 { margin: 0 0 14px; font-size: 16px; }
        label { display: block; font-size: 13px; margin-bottom: 10px; }
        input {
          display: block; width: 100%; box-sizing: border-box; margin-top: 4px;
          padding: 7px 9px; font-size: 14px; border: 1px solid #bbb; border-radius: 6px;
        }
        input:focus { outline: 2px solid #6b5bd2; border-color: transparent; }
        .buttons { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
        button { padding: 7px 14px; font-size: 14px; border-radius: 6px; border: 1px solid #bbb; background: #f4f4f4; cursor: pointer; }
        button[type=submit] { background: #6b5bd2; color: #fff; border-color: #6b5bd2; }
      </style>
      <div class="backdrop">
        <form>
          <h2>IdaReply</h2>
          <div class="fields"></div>
          <div class="buttons">
            <button type="button" class="cancel">Cancel</button>
            <button type="submit">Insert</button>
          </div>
        </form>
      </div>`;

    const fields = shadow.querySelector(".fields");
    for (const name of names) {
      const label = document.createElement("label");
      label.textContent = name;
      const input = document.createElement("input");
      input.dataset.name = name;
      label.appendChild(input);
      fields.appendChild(label);
    }

    const form = shadow.querySelector("form");
    const close = (result) => { host.remove(); resolve(result); };

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const values = {};
      for (const input of form.querySelectorAll("input")) values[input.dataset.name] = input.value;
      close(values);
    });
    shadow.querySelector(".cancel").addEventListener("click", () => close(null));
    shadow.querySelector(".backdrop").addEventListener("click", (e) => {
      if (e.target.classList.contains("backdrop")) close(null); // click outside = cancel
    });
    form.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close(null);
      e.stopPropagation(); // keep the ticket site's shortcuts from firing while typing
    });

    document.documentElement.appendChild(host);
    fields.querySelector("input")?.focus();
  });
}

async function fillPlaceholders(text) {
  const names = [...new Set([...text.matchAll(/\{\{(.+?)\}\}/g)].map(m => m[1]))];
  if (names.length === 0) return text; // nothing to ask, insert right away

  const values = await showForm(names);
  if (!values) return null;

  for (const name of names) text = text.replaceAll(`{{${name}}}`, values[name]);
  return text;
}


browser.runtime.onMessage.addListener(async (msg) => {
  if (msg.type !== "insert" || !saved) return;

  const text = await fillPlaceholders(msg.text);
  if (text === null) return;

  const { el } = saved;

  // Put focus and the cursor back where they were
  el.focus();
  if ("start" in saved) {
    el.setSelectionRange(saved.start, saved.end);
  } else if (saved.range) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(saved.range);
  }

  // Insert at the cursor (keeps Ctrl+Z working)
  if (!document.execCommand("insertText", false, text) && "start" in saved) {
    el.setRangeText(text, saved.start, saved.end, "end");
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
});