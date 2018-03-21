init();

function init() {
    switch (isPasswordGood()) {
        case PASSWORD_STATUS.tooShort:
            $('#passwordBad').css({"display": "block"});
            $('#passwordGood').css({"display": "none"});
            $('#reloadExt').css({"display": "none"});
            $("span[name=pwdProbDescrip]").text("Problem: Password is too short, must be at least " + MIN_PASSWORD_LENGTH + " characters.");
            break;
        case PASSWORD_STATUS.tooLong:
            $('#passwordBad').css({"display": "block"});
            $('#passwordGood').css({"display": "none"});
            $('#reloadExt').css({"display": "none"});
            $("span[name=pwdProbDescrip]").text("Problem: Password is too long, must be no greater than " + MAX_PASSWORD_LENGTH + " characters.");
            break;
        case PASSWORD_STATUS.empty:
            $('#passwordBad').css({"display": "block"});
            $('#passwordGood').css({"display": "none"});
            $('#reloadExt').css({"display": "none"});
            $("span[name=pwdProbDescrip]").text("Problem: Password is empty.");
            break;
        case PASSWORD_STATUS.invalidChars:
            $('#passwordBad').css({"display": "block"});
            $('#passwordGood').css({"display": "none"});
            $('#reloadExt').css({"display": "none"});
            $("span[name=pwdProbDescrip]").text("Problem: Password contains invalid characters.");
            break;
        case PASSWORD_STATUS.okay:
            $('#passwordBad').css({"display": "none"});
            $('#passwordGood').css({"display": "block"});
            $('#reloadExt').css({"display": "none"});
            break;
        case PASSWORD_STATUS.undefined:
            $('#passwordBad').css({"display": "block"});
            $('#passwordGood').css({"display": "none"});
            $('#reloadExt').css({"display": "none"});
            $("span[name=pwdProbDescrip]").text("Problem: Your password file is missing/invalid characters are present/the syntax is incorrect.");
            break;
        default:
            $('#passwordBad').css({"display": "block"});
            $('#passwordGood').css({"display": "none"});
            $('#reloadExt').css({"display": "none"});
            $("span[name=pwdProbDescrip]").text("Problem: Unknown problem with password/file.");
            break;
    }

    var extensionId = chrome.extension.getURL("").match(/[^\/:]+:\/\/([^\/]+)/i);
    extensionId = (extensionId.length > 1 ? extensionId[1] : "");
    $("span[name=extensionId]").text(extensionId);

    if (bgPage.config.get('currVersion') !== bgPage.config.get('lastVersion')) {
        if (bgPage.config.get('lastVersion'))	// Not first install so show that we updated
        {
            $('#extUpdated').css({"display": "block"});
            var newDisplayVersion = bgPage.config.get('currDisplayVersion');
            $("span[name=updatedToVer]").text(newDisplayVersion);
        }
        else {
            $('#extUpdated').css({"display": "none"});
        }

        bgPage.config.set('lastVersion', bgPage.config.get('currVersion'));
    }
    else {
        $('#extUpdated').css({"display": "none"});
    }

    updateWhitelistDisplay();
    updateBlacklistDisplay();
    updateTempAllowListDisplay();
    updateListStats();

    switch (blocking_mode) {
        case BMODE_TYPES.BLACKLIST:
        {
            $("span[name=blockingMode]").text("Current Blocking Mode: Blacklist");
            break;
        }
        case BMODE_TYPES.WHITELIST_ALLOW_TOP_LEVEL:
        {
            $("span[name=blockingMode]").text("Current Blocking Mode: Whitelist, Allow Top Level");
            break;
        }
        default:	// BMODE_TYPES.WHITELIST
        {
            $("span[name=blockingMode]").text("Current Blocking Mode: Whitelist");
            break;
        }
    }

    $("span[name=userAgent]").text(navigator.userAgent);

    $('#labelHeaderVersion').text('Version ' + bgPage.config.get('currDisplayVersion'));

    $('#radio_ON_ReloadTabs').attr('checked', bgPage.config.get('reloadCurrentTabOnToggle'));
    $('#radio_OFF_ReloadTabs').attr('checked', !bgPage.config.get('reloadCurrentTabOnToggle'));

    $('#radio_ON_ShowActionButton').attr('checked', bgPage.config.get('showPageActionButton'));
    $('#radio_OFF_ShowActionButton').attr('checked', !bgPage.config.get('showPageActionButton'));

    $('#radio_ON_HideHarmfulSearches').attr('checked', bgPage.config.get('hideHarmfulSearches'));
    $('#radio_OFF_HideHarmfulSearches').attr('checked', !bgPage.config.get('hideHarmfulSearches'));

    if (bgPage.extFatalError)
        $('#extFatalError').css({"display": "block"});

}