


async function loadResponses(){
    const responses = await fetch(browser.runtime.getURL("responses.json"));

    return responses.json();
}



browser.runtime.onInstalled.addListener(async ()=> {
     const responses = await loadResponses();


    browser.menus.create({id: "ida-root",title:"Ida Reply",contexts: ["editable"]});
    browser.menus.create({id:"ida-responses",title:"Responses",contexts:["editable"]});
    browser.menus.create({id:"ida-signature",title:"Change Signature Name",contexts:["editable"]});
    for(const r of responses.responses){
        browser.menus.create({ id: r.id,parentId: "ida-sub",title:r.title,contexts:["editable"]})
    }
});


browser.menus.onClicked.addListener(async (info,tab) => {
    const data = await loadResponses();

    const r = data.responses.find(x => x.id === info.menuItemId);
    const text = r.lines.join("\n").replaceAll("{signature}",data.signature);
    
    browser.tabs.sendMessage(tab.id,{type:"insert",text},{frameId: info.frameId })


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


