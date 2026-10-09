


async function loadResponses(){
    const responses = await fetch(browser.runtime.getURL("responses.json"));

    return responses.json();
}



browser.runtime.onInstalled.addListener(async ()=> {
     const responses = await loadResponses();


    browser.menus.create({id: "ida-root",title:"Ida Reply",contexts: ["editable"]});
    for(const r of responses.responses){
        browser.menus.create({ id: r.id,parentId: "ida-root",title:r.title,contexts:["editable"]})
    }
});


browser.menus.onClicked.addListener(async (info,tab) => {
    const data = await loadResponses();

    const r = data.responses.find(x => x.id === info.menuItemId);
    const text = r.lines.join("\n").replaceAll("{signature}",data.signature);
    if(r.id === "mfa-another-account"){
       const text = await fillPlaceholders(text)
    }
    if(!r) return;

    
    await browser.scripting.executeScript({
        target: {tabId: tab.id,frameIds:[info.frameId]},
        func:insertAtCursor,
        args:[text]
    });


});


function insertAtCursor(text) {
    const el = document.activeElement;

    if(!el) return ;
    if(document.execCommand("insertText",false,text)) return;

    if(typeof el.setRangeText === "function"){
        el.setRangeText(text,el.selectStart,el.selectionEnd,"end");
        el.dispatchEvent(new Event("input",{bubbles:true}));
    }
}

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
