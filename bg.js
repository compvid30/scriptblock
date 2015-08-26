
if (config.get('currVersion') < 10300) {
    // Because we introduced lastVersion in 9001
    if (config.get('currVersion') == 10300)
        config.set('lastVersion', 10200);

    config.set('currVersion', 10300);
    config.set('currDisplayVersion', "1.3.0");
}

if (isPasswordGood() !== PASSWORD_STATUS.okay) {
    showOptionsPage();
}


chrome.tabs.onUpdated.addListener(function (tabid, changeinfo, tab) {
    if (config.get('showPageActionButton')) {
        
        chrome.tabs.sendMessage(tab.id, {type: "get sources for top window"}, function (response) {
            if (response.globalAllowAll)
                chrome.browserAction.setIcon({path: "img/disabled.png", tabId: tab.id});
            else if (response.pageSourcesAllowedLength > 0)
                chrome.browserAction.setIcon({path: "img/allowed.png", tabId: tab.id});
            else
                chrome.browserAction.setIcon({path: "img/forbidden.png", tabId: tab.id});

            if (response.pageSourcesTempAllowedLength > 0)
                chrome.browserAction.setIcon({path: "img/temp.png", tabId: tab.id});

            // show badge


                const tabBlockedCount = response.pageSourcesForbiddenLength;
                chrome.browserAction.setBadgeBackgroundColor({ color: [51, 0, 51, 230] });
                chrome.browserAction.setBadgeText({text: tabBlockedCount + '', tabId: tab.id});
        });
    }
    else {
        chrome.browserAction.hide(tab.id);
    }

});
