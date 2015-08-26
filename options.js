document.addEventListener('DOMContentLoaded', function () {

    $(function () {
        $("#extFatalError").click(function () {
            chrome.extension.getBackgroundPage().clearSettings();
            chrome.extension.getBackgroundPage().showOptionsPage();
        });
    });

    $(function () {
        $("#reloadExt").click(function () {
            chrome.extension.getBackgroundPage().reloadExt();
            window.close();
        });
    });

    $(function () {
        $("#button_ListSave").click(function () {
            save();
            saveButtonAnimate(this.id);
        });
    });

    $(function () {
        $("#button_ChoicesSave").click(function () {
            save();
            saveButtonAnimate(this.id);
        });
    });
});

const bgPage = chrome.extension.getBackgroundPage();

function saveButtonAnimate(buttonId) {
    $('#' + buttonId).button('option', 'label', 'SAVED!');
    setTimeout(function () {
        $('#' + buttonId).button('option', 'label', 'Save Changes');
    }, 1500);
}

$(function () {
    $('#tabs').tabs();
// Button
    $("button[name=button_ListSave]").button();
//$("#button_ListSave").button();
    $("#button_ChoicesSave").button();
    $("#extFatalError").button();
    $("#reloadExt").button();

    $("#radioset_ShowActionButton").buttonset();
    $("#radioset_ReloadTabs").buttonset();
    $("#radioset_HideHarmfulSearches").buttonset();


});

function lines(s) {
    var links = (s ? s.split('\n') : []);
    for (var i in links)
        links[i] = encodeURI(links[i]);
    return links;
}


function save() {
    bgPage.saveWhitelist(lines($('#whitelist').val()));
    updateWhitelistDisplay();	// To take care of the cases when the storage event is not fired

    bgPage.saveBlacklist(lines($('#blacklist').val()));
    updateBlacklistDisplay();

    bgPage.saveTempAllowList(lines($('#tempAllowList').val()));
    updateTempAllowListDisplay();

    updateListStats();

    /*bgPage.config.set('reloadCurrentTabOnToggle', $('#radio_ON_ReloadTabs').attr('checked') ? true : false);
    bgPage.config.set('showPageActionButton', $('#radio_ON_ShowActionButton').attr('checked') ? true : false);
    bgPage.config.set('hideHarmfulSearches', $('#radio_ON_HideHarmfulSearches').attr('checked') ? true : false);*/
}

function handleStorageChangeUpdateLists(event) {
    console.log(event.key);
    if (event.key === "whitelist") {
        updateWhitelistDisplay();
        updateListStats();
    }
    else if (event.key === "blacklist") {
        updateBlacklistDisplay();
        updateListStats();
    }
    /*
     else if (event.key === "tempAllowList")	// Bug: sessionStorage does not fire storage events
     {
     updateTempAllowListDisplay();
     }
     */
}

function updateWhitelistDisplay() {
    $('#whitelist').val(bgPage.whitelist.join('\n'));
}

function updateBlacklistDisplay() {
    $('#blacklist').val(bgPage.blacklist.join('\n'));

}

function updateTempAllowListDisplay() {
    $('#tempAllowList').val(bgPage.tempAllowList.join('\n'));
}

function updateListStats() {
    const maxStorageSize = 5 * 1024 * 1024;
    const encryptIncreaseFact = 3.2;
    var rawListLengths = bgPage.whitelist.length + bgPage.blacklist.length + bgPage.tempAllowList.length;
    $("span[name=numListEntries]").text(rawListLengths);

    var listSpace = bgPage.localStorage["whitelist"].length + bgPage.localStorage["blacklist"].length + bgPage.sessionStorage["tempAllowList"].length;
    $("span[name=listSpace]").text(listSpace);
    $("span[name=listSpacePct]").text((listSpace / maxStorageSize * 100).toFixed(5));

    $("span[name=listSizeEncrypted]").text(Math.ceil(listSpace * encryptIncreaseFact));
    $("span[name=listSizeEncryptedPct]").text((Math.ceil(listSpace * encryptIncreaseFact) / maxStorageSize * 100).toFixed(5));

    $("span[name=maxStorageSize]").text(maxStorageSize);

    var currLength = rawListLengths >= 10 ? rawListLengths : 10;
    listSpace = listSpace >= 150 ? listSpace : 150;
    $("span[name=estMaxListEntries]").text(Math.floor(currLength / ((listSpace * encryptIncreaseFact) / maxStorageSize)));
}

window.addEventListener("storage", handleStorageChangeUpdateLists, false);