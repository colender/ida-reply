


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
    const responses = await loadResponses();

    const r = responses.responses.find(x => x.id === info.menuItemId);

    if(!r) return;

    const text = r.lines.join("\n").replaceAll("{signature}",responses.signature);
    await browser.scripting.executeScript({
        target: {tabId: tab.id,frameIds:[info.frameId]},
        func:insertAtCursor,
        args:[r.text]
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