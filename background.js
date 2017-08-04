/*
 Basically figured everything out.
 But this kind of history does not actually help me create a visual representation of the tabs throughout a given search!

 The data it records only keeps track of new tab creation point urls and not the navigation inbetween.
 It is a start possibly, but way too shallow, and misses critical information.

 But what would be a much better method is:
 Each node is a tab.

 -on every navigation, save url and navigation time
 -i dont want to support multiwindowing


 And actually, there were some great inspirations to aim for:
 http://js.cytoscape.org/demos/animated-bfs/
 If we save time information, we could accurately portray time as a dimensional factor as well

 http://js.cytoscape.org/demos/colajs-graph/
 http://js.cytoscape.org/
 Basically, I would like a page to spawn like this, with the outlined information i have on my board.

 We could definitely create a visual output if we save our data format correctly here.

 ...
 scroll logging % per url and active time spent per url should be in the visual tree

 */
console.log('-- BEGIN-----------------------');
console.log('Tab Origin Plus - background.js');
console.log('-------------------------------');
//http://www.jsonschemavalidator.net/

let activeTabList = [{"windowId": "default", "tabId": "default"}];
const now = new Date().getTime();
const sessionId = '1++' + now;

const dataSchema = {
  "$schema": "http://json-schema.org/schema#",
  //"id": "http://yourdomain.com/schemas/myschema.json",
  "definitions": {
    "nodeReference": { //  -creation node id, window, tab, created from url, creating url, creation time
      "type": "object",
      "properties": {
        "windowId": {"type": "string"},
        "tabId": {"type": "string"},
        "creatorUrl": {"type": "string"},
        "createdUrl": {"type": "string"},
        "creationTime": {"type": "string"}
      }
    }
  },
  "type": "object",
  "properties": {
    "windowId": {"type": "string"},
    "tabId": {"type": "string"},
    "creationTime": {"type": "string"}, // duplicate data, but also put at this tier because of 'close-time'
    "removeTime": {"type": "string"},
    "urlNavigationHistory": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "url": {"type": "string"},
          "title": {"type": "string"},
          "favIconUrl": {"type": "string"},
          "creationTime": {"type": "string"}
        },
        "required": ["url", "title", "favIconUrl", "creationTime"]
      }
    },
    "nodeActivity": {
      "type": "array",
      "description": "Array of when this tab has been active.",
      "items": {
        "type": "object",
        "properties": {
          "startTime": {"type": "string"},
          "endTime": {"type": "string"}
        },
        "required": ["startTime"]
      }
    },
    "parentNode": {"$ref": "#/definitions/nodeReference"},
    "childrenNodes": {
      "type": "array",
      "items": {"$ref": "#/definitions/nodeReference"}
    }
  },
  "required": ["windowId", "tabId", "creationTime", "urlHistory", "nodeActivity", "parentNode", "childrenNodes"]
};

function tabs_get(targetTabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.get(targetTabId, function (match) {
      resolve(match);
    })
  })
}
function storage_get() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(sessionId, (result) => {
      const tree = result[sessionId] || [];
      resolve(tree);
    })
  })
}
function storage_find(targetId, tree) {
  return new Promise((resolve, reject) => {
    for (let i = 0; i < tree.length; i++) {
      if (tree[i].tabId == targetId) resolve([tree, tree[i], i]);
    }
  })
}
function storage_set(tree) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({[sessionId]: tree}, () => {
      resolve(tree);
    })
  })
}
function promise_message(message, passThru) {
  console.log(message);
  return Promise.resolve(passThru);
}

const isThisArrayNull = (array) => {return !!array.length};
const getLastElement = (array) => {return array[array.length - 1]};
const getCurrentTime = () => {return Math.floor(new Date() / 1000);}; // This is current time in seconds since Epoch

// Open the origin url of the given tab.
const openTabOrigin = (tab) => {

  console.log('-- START---------------------');
  console.log('We are inside: openTabOrigin');
  console.log('You just clicked on the Chrome Extension Button (ie. the browserAction)');
  console.log('');


  const id = tab.id.toString();
  chrome.storage.local.get(id, function (result) {
    const result_stack = result[id] || [];

    console.log('Printing out the result_stack (Tab Origin Urls)');
    result_stack.forEach((element) => {
      console.log(element);
    });

    if (isThisArrayNull(result_stack)) {
      chrome.tabs.query({url: getLastElement(result_stack)}, function (matches) {
        if (matches.length > 0) {
          console.log("Found switch to " + matches[0].id + ", activating now");
          chrome.tabs.update(matches[0].id, {active: true});
          chrome.windows.update(matches[0].windowId, {focused: true});
        } else {
          const dest = getLastElement(result_stack);
          console.log("Opening tab for url " + dest);
          chrome.tabs.create({url: dest, index: tab.index}, function (newtab) {
            // We don't want to set the last tab to the one we just came
            // from (this one), instead we want to inherit the parent tab
            // stack so we can keep going all the way back.
            chrome.storage.local.set({[newtab.id.toString()]: result_stack.slice(0, -1)});
          });
        }
      });
    } else {
      console.log("Could not find origin for tab", id);  // totally normal to get here.
      chrome.browserAction.setBadgeText({text: "N/A", tabId: tab.id});
    }
  });
};

// Click the Chrome Extension Button!
//chrome.browserAction.onClicked.addListener();

/*
 TO DO THINGS HERE:

  Change Focus Problem:
 // This is partially broken, when I do an ctrl+t and open a new tab that immediately bounces into the foreground,
 // The tabs don't update! But when I close it down it does update...
 // Coverage incomplete; experiment more.

  Clean up the old exploratory code with the crying eyes.
  It has some good notes on tab creation behavior.

  What to do on window creation with a new implicit tab?
  How do we detect that? How do we create an object for that?
  onWindowLoad?
    Does this need to also take into account the current pinned tabs?
    FUCK YES IT DOES
      New problem spaces...
        Schema: Include root tabs and pinned tabs now somehow.

  Clean up code + First Commit

  Add Closing and Restoring with sessionId from sessions. This is not small.

  Add catch code to the end of my promise chains. I have a link somewhere with bad/best practices for promises.
  https://pouchdb.com/2015/05/18/we-have-a-problem-with-promises.html
 */

// This fires when a tab is created!
chrome.tabs.onCreated.addListener(function (tab) {
  console.log('-- TAB CREATED --------------------- openerTabId = ' + tab.openerTabId);

  const list = [
    storage_get(),
    tabs_get.bind(null, tab.openerTabId)()
  ];

  Promise.all(list).then((results) => {
    const thisTabCreationTime = getCurrentTime();
    const tree = results[0];
    const match = results[1];

    const newNode = {
      windowId: tab.windowId,
      tabId: tab.id,
      creationTime: thisTabCreationTime,
      removeTime: "",
      urlNavigationHistory: [
        {
          "url": tab.url,
          "title": tab.title,
          "favIconUrl": tab.favIconUrl,
          "creationTime": thisTabCreationTime
        }
      ],
      nodeActivity: [],
      parentNode: {
        windowId: match.windowId,
        tabId: match.id,
        creationTime: thisTabCreationTime,
        creatorUrl: match.url,
        createdUrl: tab.url
      },
      childrenNodes: []
    };
    const childNodeObject = {
      windowId: tab.windowId,
      tabId: tab.id,
      creationTime: thisTabCreationTime,
      creatorUrl: match.url,
      createdUrl: tab.url
    };

    tree.push(newNode);
    storage_set(tree)
      .then(storage_find.bind(null, match.id.toString()))
      .then(([tree, node, index]) => {
        tree[index].childrenNodes.push(childNodeObject);
        return Promise.resolve(tree);
      })
      .then(storage_set)
      .then(() => {console.log('Finished Creating Tabs');})
      .catch(console.log.bind(console));
  }).catch(console.log.bind(console));

  //TODO:7/28 CLEAN UP THIS CONSOLE OUT with proper messaing
  ////BELOW IS CODE FOR TAB CREATION TRACKING PURPOSES.
  ////CLEAN UP AND FIGURE OUT PROPER CONSOLE OUT STATEMENTS.
  // This tab has been opened from another tab!
  if (tab.openerTabId !== undefined) {

    // get 'match' tab based on the openerTabId
    chrome.tabs.get(tab.openerTabId, function (match) {
      // if this exists...
      if (match !== undefined) {
        // learning portion removed. rest is here for learning?
      } else {
        // if below else is encountered, that tab that was undefined will trigger this.
        console.log("Could not find opener for tab " + tab.url);
      }
    });
  } else {
    // I can reliably get to this point if i CTRL Click open a new tab from the new tab (no url) page

    // This is a root page!

    // ACTUALLY AND ALSO! This is also a side effect of the mechanism from the openTabOrigin
    // chrome.tabs.create({url: dest, index: tab.index}, function(newtab) {
    console.log("ㅠㅠ Undefined opener for tab " + tab.url + " ㅠㅠ");
  }
});

// Closing a tab? Adding a remove time.
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  console.log('-- TAB CLOSED --------------------- Closing Tab ID = ' + tabId);

  storage_get()
    .then(storage_find.bind(null, tabId.toString()))
    .then(([tree, node, index]) => {
      tree[index].removeTime = getCurrentTime();
      return Promise.resolve(tree);
    })
    .then(storage_set)
    .then(() => {console.log('Finished Closing Tabs');})
    .catch(console.log.bind(console));
});

// We are changing tab focus!
chrome.tabs.onActivated.addListener((activeInfo) => {
  // This is partially broken, when I do an ctrl+t and open a new tab that immediately bounces into the foreground,
  // The tabs don't update! But when I close it down it does update...
  // Coverage incomplete; experiment more.

  const previousTab = getLastElement(activeTabList).tabId.toString();
  const previousTabWindow = getLastElement(activeTabList).windowId.toString();
  const currentTab = activeInfo.tabId.toString();
  const currentTabWindow = activeInfo.windowId.toString();
  const activationTime = getCurrentTime();

  console.log('-- CHANGE ------------------ FROM: ' + previousTab + '.' + previousTabWindow + '    TO: ' + currentTab + '.' + currentTabWindow);

  // Update our historical list of active tabs. Useful for times like now!
  activeTabList.push({"windowId": currentTabWindow, "tabId": currentTab});

  storage_get()
    .then(storage_find.bind(null, previousTab))
    .then(([tree, node, index]) => {
      if (!tree[index].nodeActivity.length) tree[index].nodeActivity.push({"startTime": 0, "endTime": activationTime});
      else tree[index].nodeActivity[(tree[index].nodeActivity.length - 1)].endTime = activationTime;
      return Promise.resolve(tree);
    })
    .then(storage_set)
    .then(storage_find.bind(null, currentTab))
    .then(([tree, node, index]) => {
      tree[index].nodeActivity.push({"startTime": activationTime});
      return Promise.resolve(tree);
    })
    .then(storage_set)
    .then(() => {console.log('Finished updating Previous+Activated Tab');})
    .catch(console.log.bind(console));
});

// Log every navigation into its tab!
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status == 'complete') {

    console.log('-- onUpdated---------------------' + changeInfo.status);

    const list = [
      storage_get().then(storage_find.bind(null, tabId.toString())),
      tabs_get.bind(null, tabId)()
    ];

    Promise.all(list).then((results) => {
      const time = getCurrentTime();
      const [tree, node, index] = results[0];
      const match = results[1];

      tree[index].urlNavigationHistory.push({
        "url": match.url,
        "title": match.title,
        "favIconUrl": match.favIconUrl,
        "creationTime": time
      });

      storage_set(tree)
        .then(() => {console.log('Finished Saving Navigation');})
        .catch(console.log.bind(console));
    }).catch(console.log.bind(console));

  }
});


// TESTING STUFF
/*


 // Closing a tab? Adding a remove time.
 chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
 console.log('-- TAB CLOSED --------------------- Closing Tab ID = ' + tabId);
 const removingTabId = tabId.toString();

 ////LEGACY CODE
 // chrome.storage.local.get(removingTabId, (result) => {
 //   const nodeObject = result[removingTabId];
 //   nodeObject.removeTime = getCurrentTime();
 //
 //   chrome.storage.local.set({[removingTabId]: nodeObject});
 // });

 chrome.storage.local.get(sessionId, (result) => {
 const nodeObject = result[sessionId];
 for (let i = 0; i < nodeObject.length; i++) {
 if (nodeObject[i].id == removingTabId) nodeObject[i].removeTime = getCurrentTime();
 }
 chrome.storage.local.set({[sessionId]: nodeObject});
 });
 });

 // We are changing tab focus!
 chrome.tabs.onActivated.addListener((activeInfo) => {
 let previousTab = getLastElement(activeTabList).tabId.toString();
 let previousTabWindow = getLastElement(activeTabList).windowId.toString();
 let currentTab = activeInfo.tabId.toString();
 let currentTabWindow = activeInfo.windowId.toString();
 const activationTime = getCurrentTime();

 console.log('-- CHANGE ------------------ FROM: ' + previousTab + '.' + previousTabWindow + '    TO: ' + currentTab + '.' + currentTabWindow);

 // Update our historical list of active tabs. Useful for times like now!
 activeTabList.push({
 "windowId": currentTabWindow,
 "tabId": currentTab
 });

 // Add endTime to the previousTab

 ////LEGACY CODE
 // chrome.storage.local.get(previousTab, (result) => {
 //   const nodeObject = result[previousTab]; // This can be undefined...?
 //   nodeObject.nodeActivity[(nodeObject.nodeActivity.length - 1)].endTime = activationTime;
 //   chrome.storage.local.set({[previousTab]: nodeObject});
 // });

 chrome.storage.local.get(sessionId, (result) => {
 const nodeObject = result[sessionId];
 for (let i = 0; i < nodeObject.length; i++) {
 if (nodeObject[i].id == previousTab) {
 nodeObject[i].nodeActivity[(nodeObject[i].nodeActivity.length - 1)].endTime = activationTime;
 }
 }
 chrome.storage.local.set({[sessionId]: nodeObject});
 });

 // Add startTime to the currentTab

 ////LEGACYC CODE
 // chrome.storage.local.get(currentTab, (result) => {
 //   const nodeObject = result[currentTab];
 //   nodeObject.nodeActivity.push({"startTime": activationTime});
 //   chrome.storage.local.set({[currentTab]: nodeObject});
 // });

 chrome.storage.local.get(sessionId, (result) => {
 const nodeObject = result[sessionId];
 for (let i = 0; i < nodeObject.length; i++) {
 if (nodeObject[i].id == currentTab) {
 nodeObject[i].nodeActivity.push({"startTime": activationTime});
 }
 }
 chrome.storage.local.set({[sessionId]: nodeObject});
 });
 });

 // Log every navigation into its tab!
 chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
 if (changeInfo.status == 'complete') {
 console.log('-- onUpdated---------------------' + changeInfo.status);
 const time = getCurrentTime();
 chrome.tabs.get(tabId, function (match) {

 ////LEGACY CODE
 // chrome.storage.local.get(tabId.toString(), (result) => {
 //   const nodeObject = result[tabId];
 //   nodeObject.urlNavigationHistory.push({
 //     "url": match.url,
 //     "title": match.title,
 //     "favIconUrl": match.favIconUrl,
 //     "creationTime": time
 //   });
 //   chrome.storage.local.set({[tabId]: nodeObject});
 // });

 chrome.storage.local.get(sessionId, (result) => {
 const nodeObject = result[sessionId];
 for (var i = 0; i < nodeObject.length; i++) {
 if (nodeObject[i].id == tabId.toString()) {
 nodeObject[i].urlNavigationHistory.push({
 "url": match.url,
 "title": match.title,
 "favIconUrl": match.favIconUrl,
 "creationTime": time
 });
 }
 }
 chrome.storage.local.set({[sessionId]: nodeObject});
 });
 });
 }
 });

 // New Window?
 chrome.windows.onCreated.addListener((window) => {
 console.log('Window Created: ' + window.id);
 window.tabs.forEach(window.id, (tab) => {
 console.log(tab.id);
 });
 });

 // https://developer.chrome.com/extensions/runtime#method-getURL
 // https://developer.chrome.com/extensions/runtime#event-onStartup
 // https://developer.chrome.com/extensions/windows#event-onCreated
 // https://developer.chrome.com/extensions/windows#event-onFocusChanged


 */
// TESTING STUFF
