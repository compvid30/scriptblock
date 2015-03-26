function showOptionsPage() {
    chrome.windows.getAll({populate: true}, function (windowsArray) {
        var optionsPageURL = chrome.extension.getURL("options.html");
        for (var i = 0; i < windowsArray.length; i++) {
            var currWindow = windowsArray[i];
            for (var j = 0; j < currWindow.tabs.length; j++) {
                if (currWindow.tabs[j].url == optionsPageURL)
                    chrome.tabs.remove(currWindow.tabs[j].id);
            }
        }
        chrome.tabs.create({"url": optionsPageURL});
    });
}

function updateAllTabs(refreshLists) {
    chrome.windows.getAll({populate: true}, function (windowsArray) {
        if (refreshLists) {
            whitelist = config.get('whitelist');
        }

        var newSettings = generateAllSettings();
        for (var i = 0; i < windowsArray.length; i++) {
            var currWindow = windowsArray[i];
            for (var j = 0; j < currWindow.tabs.length; j++) {
                chrome.tabs.sendMessage(currWindow.tabs[j].id, newSettings);
            }
        }
    });
}

function resetSiteStorage(currTabId) {
    var newSettings = generateAllSettings();
    newSettings.type = "reset all storage";
    newSettings.reload = true;
    chrome.tabs.sendMessage(currTabId, newSettings);
}

/*
 Generates a json object with all the applicable settings for a website of "url".
 */
function generateAllSettings() {
    var tempAllowListHash = sessionConfig.get("tempAllowListHash");
    return {"type": "update settings",
        "whitelist": {"whitelist": whitelist, "whitelistHash": config.get("whitelistHash"),
            "globalAllowAll": sessionConfig.get("globalAllowAll"),
            "tempAllowList": tempAllowList, "tempAllowListHash": tempAllowListHash,
            "tempExpiry": (tempAllowListHash === EMPTY_MD5 ? 0 : (new Date()).getTime() + 1000 * 3600),	// Expire after 1 hour
            "blacklist": blacklist, "blacklistHash": config.get("blacklistHash")},
        "reload": config.get('reloadCurrentTabOnToggle')};
}

/*
 Listens for messages from our content scripts to provide settings information.
 */
chrome.extension.onMessage.addListener(function (msg, src, send) {
    if (msg.type === "get settings block start") {
        //console.log("get settings block start msg: " + msg.url);
        //console.log("get settings block start src: " + src);
        // If src is null, we are very likely blocking something inside of another Google Chrome extension.
        // However, we don't have a good way of showing the whitelister.
        var theSettings = generateAllSettings();	//msg.url, ((src && src.tab) ? src.tab.url : "")
        send(theSettings);
    }
    else if (msg.type === "get block harmful search") {
        send({"setting": config.get('hideHarmfulSearches')});
    }
    else if (msg.type === "test") {
        send({"result": true});
    }
    else {
        send({});
    }
});


