var ws = new WebSocket('ws://127.0.0.1:1337/');


if (typeof Array.isArray === 'undefined') {
  Array.isArray = function(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  }
}

function isArray(obj) {
  return Array.isArray(obj);
}


function onDisconnect() {
  console.log("Connection with Chiika has been lost.");
}
function onConnectionError(error) {
  console.log("There has been an error with connection to Chiika");
  console.log(error);
}

function onChiikaRequest(data) {
  data = JSON.parse(data);

  if(data.state == 'get-tabs') {
    getAllTabs().then(function(tabs) {
      send('all-tabs',tabs);
    })
  }
}

ws.onopen = function(event) {
  console.log("connection open");
};
ws.onclose = function() {
  onDisconnect();
};
ws.onerror = function(event) {
  onConnectionError(event);
};
ws.onmessage = function(message) {
  onChiikaRequest(message.data);
}

function tabToCommon(tabId) {
  return new Promise(function(resolve) {
    chrome.tabs.get(tabId,function(tabObj) {
      resolve(tabObj);
    })
  })
}

function getAllTabs() {
  return new Promise(function(resolve) {
    chrome.tabs.query({ windowId: null }, function(tabs) {
      resolve(tabs);
    })
  })
}

function tabDataToJson(tab) {
  title = tab.title;
  url = tab.url;
  obj = { title: title, url: url }

  return JSON.stringify(obj);
}
function tabMessageBody(state,tab) {
  return state + " " + tabDataToJson(tab);
}

function send(state,tabs) {
  var string = state + " ";
  if(isArray(tabs)) {
    var lesser = []
    tabs.forEach(function(v) {
      lesser.push({ title: v.title, url: v.url });
    })
    string += JSON.stringify(lesser);
  }
  else {
    string += tabDataToJson(tabs);
  }
  if(ws.readyState !== ws.CLOSED && ws.readyState !== ws.CLOSING && ws.readyState !== ws.CONNECTING) {
    ws.send(string);
  }
}

var tabs = [];

chrome.tabs.onCreated.addListener(function(tab) {
  tabToCommon(tab.id).then(function(tabObj) {
    console.log("onCreated - " + tabObj.title + " - " + tabObj.url);
    send('tab-created',tabObj);
  })
});

chrome.tabs.onActivated.addListener(function(activeInfo) {
  tabToCommon(activeInfo.tabId).then(function(tabObj) {
    console.log("onActivated - " + tabObj.title + " - " + tabObj.url);
    send('tab-activated',tabObj);
    tabs[tabObj.id] = tabObj;
  })
});
chrome.tabs.onRemoved.addListener(function(tabId,removeInfo) {
  var removedTab = tabs[tabId];
  console.log("onRemoved - " + removedTab.title + " - " + removedTab.url);
  send('tab-closed',removedTab);
  delete removedTab;
});

chrome.tabs.onUpdated.addListener(function(tabId,changeInfo) {
  var tabId = tabId;
  var status = changeInfo.status;
  var title = changeInfo.title; //Chrome 48
  var url   = changeInfo.url;

  if(status == 'complete') {
    tabToCommon(tabId).then(function(tabObj) {
      console.log("onUpdated-complete " + tabObj.title + "- " + tabObj.url);
      send('tab-updated',tabObj);
      tabs[tabObj.id] = tabObj;
    })
  }
});
