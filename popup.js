document.addEventListener('DOMContentLoaded', function () {

    $(function () {
        $("#passwordBad").click(function () {
            openTab(chrome.extension.getURL('options.html'));
            window.close();
        });
    });
    $(function () {
        $("#fatalError").click(function () {
            openTab(chrome.extension.getURL('options.html'));
            window.close();
        });
    });
    $(function () {
        $("#extFatalError").click(function () {
            chrome.extension.getBackgroundPage().clearSettings();
            updateCurrentOnUnload = false;
            reloadCurrentAndClose();
        });
    });


    $("#pop_options").click(function () {
        openTab(chrome.extension.getURL('options.html'));
    });
    $("#pop_close").click(function () {
        reloadCurrentAndClose();
    });
    $("#pop_donate").click(function () {
        chrome.tabs.create({url: "https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=XJZJUMSDKPESC"});
    });

    $(function () {
        $("#allowAllShown").click(function () {
            allowAllShown();
        });
    });
    $(function () {
        $("#tempAllowAllShown").click(function () {
            tempAllowShownBlocked();
        });
    });
    $(function () {
        $("#blockAllShown").click(function () {
            blockAllShown();
        });
    });

    $(function () {
        $("#cbMultiSelect").click(function () {
            bgPage.config.set('multiSelect', this.checked);
        });
    });

});

function openTab(url) {
    chrome.tabs.create({url: url});
    window.close();
}


var currTabId = null;
var currTabIndex = null;
var currTabUrl = null;

var numActionShown = 0;
const MAX_NUM_ACTION = 150;

var fatalErrorButton = document.getElementById("fatalError");
var extFatalErrorButton = document.getElementById("extFatalError");
var passwordBadButton = document.getElementById("passwordBad");
var spacerTopDiv = document.getElementById("wrapperSpacerTop");
var spacerBottomDiv = document.getElementById("wrapperSpacerBottom");

var multiSelectCB = document.getElementById("cbMultiSelect");
var multiSelectDiv = document.getElementById("divMultiSelect");

var allowAllShownButton = document.getElementById("allowAllShown");
var blockAllShownButton = document.getElementById("blockAllShown");
var tempAllowShownBlockedButton = document.getElementById("tempAllowAllShown");
var globalAllowTempButton = document.getElementById("globalAllowTemp");
var revokeAllTempButton = document.getElementById("revokeAllTemp");

$("button[name=actionButton]").button();

var encounteredError = false;
const bgPage = chrome.extension.getBackgroundPage();

var passwordStatus = isPasswordGood();
if (passwordStatus !== PASSWORD_STATUS.okay) {
    switch (passwordStatus) {
        case PASSWORD_STATUS.tooShort:
            $("span[name=pwdProbDescrip]").text("Problem: Password is too short, must be at least " + MIN_PASSWORD_LENGTH + " characters.");
            break;
        case PASSWORD_STATUS.tooLong:
            $("span[name=pwdProbDescrip]").text("Problem: Password is too long, must be no greater than " + MAX_PASSWORD_LENGTH + " characters.");
            break;
        case PASSWORD_STATUS.empty:
            $("span[name=pwdProbDescrip]").text("Problem: Password is empty.");
            break;
        case PASSWORD_STATUS.invalidChars:
            $("span[name=pwdProbDescrip]").text("Problem: Password contains invalid characters.");
            break;
        case PASSWORD_STATUS.okay:
            break;
        case PASSWORD_STATUS.undefined:
            $("span[name=pwdProbDescrip]").text("Problem: Your password file is missing/invalid characters are present/the syntax is incorrect.");
            break;
        default:
            $("span[name=pwdProbDescrip]").text("Problem: Unknown problem with password/file.");
            break;
    }
    passwordBadButton.style.display = "block";
}
else if (bgPage.extFatalError) {
    chrome.tabs.getSelected(null,
        function (tab) {
            currTabId = tab.id;
            currTabIndex = tab.index;
            currTabUrl = tab.url;
        }
    );
    extFatalErrorButton.style.display = "block";
    spacerTopDiv.style.display = "block";
}
else {
    chrome.extension.onMessage.addListener(function (msg, src, send) {
        if (msg.type === "get sources response") {
            //chrome.extension.getBackgroundPage().console.log("sources from iframe");
            showLastBlocked(msg);
            send({});
        }
        else {
            send({});
        }
    });

    chrome.tabs.getSelected(null,
        function (tab) {
            currTabId = tab.id;
            currTabIndex = tab.index;
            currTabUrl = tab.url;
            chrome.tabs.sendMessage(tab.id, {type: "get sources"}, showLastBlocked);

        }
    );
}


function chunkUrlForDisplay(currBlockedURL) {
    const maxLines = 5;
    var urlChunks = currBlockedURL.chunk(30);
    var theMessage = "";

    if (urlChunks) {
        for (var j = 0; j < maxLines && j < urlChunks.length; j++) {
            theMessage += (urlChunks[j] + "\n");
        }

        if (urlChunks.length > maxLines) {
            var lastChunk = urlChunks[maxLines].chunk(15);
            theMessage += (lastChunk[0] + "......\n");
        }
    }

    return theMessage;
}

const URL_LIST_TYPE = {
    "allowed": 0,
    "tempAllowed": 1,
    "blocked": 2,
    "untrusted": 3
}

function limitUrlLength(currBlockedURL) {
    return (currBlockedURL.length >= 300 ? currBlockedURL.substring(0, 299) + "......<<CUT OFF, TOO LONG>>" : currBlockedURL);
}

/*
 In case we have duplicates from iframes or unknown TLD's. Uses linear search to go through the already shown elements.
 Probably best to not try a binary-like search on the shown elements because of the small numbers (~less than 10).
 */
function fixAlreadyShown(currBlockedURL) {
    var isAlreadyShown = false;
    var docEls = document.getElementsByName("urlActionForm");
    for (var i = 0; i < docEls.length; i++) {
        var currDataUrl = docEls[i].childNodes[1].childNodes[0].getAttribute("data-url");
        //console.log("outside  " + currBlockedURL + "    " + currDataUrl);
        if (patternMatches(currBlockedURL, currDataUrl)) {
            //console.log("matches    " + currBlockedURL  + "    " + currDataUrl);
            if (currBlockedURL.length < currDataUrl.length) {
                var currUrlTitleEl = docEls[i].childNodes[0];	//.childNodes[0];
                var currRBs = docEls[i].childNodes[1].childNodes;	// Goes in multiples of 2

                currUrlTitleEl.innerText = limitUrlLength(currBlockedURL);

                /*   var RatedUrl = document.createElement("a");
                 RatedUrl.className = "RatedUrl";
                 RatedUrl.href = "#";
                 RatedUrl.innerText = "(Rating)";
                 RatedUrl.setAttribute("data-url", currBlockedURL);
                 RatedUrl.onclick = openRatedUrl;
                 currUrlTitleEl.appendChild(RatedUrl);

                 var infoUrl = document.createElement("a");
                 infoUrl.className = "infoUrl";
                 infoUrl.href = "#";
                 infoUrl.innerText = "(?)";
                 infoUrl.setAttribute("data-url", currBlockedURL);
                 infoUrl.onclick = openInfoUrl;
                 currUrlTitleEl.appendChild(infoUrl);   */


                currRBs[0].setAttribute("data-url", currBlockedURL);	// Allow
                currRBs[2].setAttribute("data-url", currBlockedURL);	// Block This Site
                currRBs[4].setAttribute("data-url", currBlockedURL);	// Temp

                if (currRBs[6])
                    currRBs[6].setAttribute("data-url", currBlockedURL);	// In case we have an extra button
            }

            isAlreadyShown = true;
        }
    }
    return isAlreadyShown;
}

function addButtonsFromUrlList(urlList, urlListType, topDomain, topDomainIsWhitelisted) {
    if (urlList) {
        for (var i = 0; i < urlList.length; i++) {
            // Note: It is expected and important that the urlList is already encoded with encodeURI,
            // which it should be if urlList was filled using only returned values from getPrimaryDomain(...)
            // Otherwise, we will have unexpected formatting when rendering the text if there are malformed strings.
            var currBlockedURL = urlList[i];

            if (currBlockedURL) {
                if (fixAlreadyShown(currBlockedURL))
                    continue;

                if (numActionShown > MAX_NUM_ACTION) {
                    var overFlowMsg = document.createElement("div");
                    overFlowMsg.className = "urlActionForm";
                    overFlowMsg.setAttribute("name", "urlActionForm");
                    overFlowMsg.style.padding = "5px 0px 5px 0px";
                    overFlowMsg.innerText = "Overflow.....too many scripts. At least " + (urlList.length - i) + " more.\nMalicious site?";
                    spacerBottomDiv.parentNode.insertBefore(overFlowMsg, spacerBottomDiv);
                    overFlowMsg.style.display = "block";
                    break;
                }

                numActionShown++;

                var aForm = document.createElement("div");
                aForm.className = "urlActionForm";
                aForm.setAttribute("name", "urlActionForm");
                var aRadioSetDiv = document.createElement("div");
                aRadioSetDiv.className = "aRadioSetDiv";

                var divUrl = document.createElement("div");
                divUrl.className = "urlTitle";
                divUrl.innerText = limitUrlLength(currBlockedURL);

                /* var RatedUrl = document.createElement("a");
                 RatedUrl.className = "RatedUrl";
                 RatedUrl.href = "#";
                 RatedUrl.innerText = "(Rating)";
                 RatedUrl.setAttribute("data-url", currBlockedURL);
                 RatedUrl.onclick = openRatedUrl;
                 divUrl.appendChild(RatedUrl);

                 var infoUrl = document.createElement("a");
                 infoUrl.className = "infoUrl";
                 infoUrl.href = "#";
                 infoUrl.innerText = "(?)";
                 infoUrl.setAttribute("data-url", currBlockedURL);
                 infoUrl.onclick = openInfoUrl;
                 divUrl.appendChild(infoUrl);*/

                aForm.appendChild(divUrl);


                var rbGroupName = randomID();

                var rbAlwaysAllow = document.createElement("input");
                rbAlwaysAllow.type = "radio";
                rbAlwaysAllow.id = randomID();
                rbAlwaysAllow.name = rbGroupName;
                rbAlwaysAllow.setAttribute("data-url", currBlockedURL);
                rbAlwaysAllow.onclick = addSite;
                if (urlListType === URL_LIST_TYPE.allowed) rbAlwaysAllow.checked = true;
                aRadioSetDiv.appendChild(rbAlwaysAllow);
                var labelAlwaysAllow = document.createElement("label");
                labelAlwaysAllow.setAttribute("for", rbAlwaysAllow.id);
                labelAlwaysAllow.innerText = "Allow";
                aRadioSetDiv.appendChild(labelAlwaysAllow);

                var rbBlock = document.createElement("input");
                rbBlock.type = "radio";
                rbBlock.id = randomID();
                rbBlock.name = rbGroupName;
                rbBlock.setAttribute("data-url", currBlockedURL);
                rbBlock.onclick = removeSite;
                if ((urlListType === URL_LIST_TYPE.blocked && blocking_mode !== BMODE_TYPES.WHITELIST_ALLOW_TOP_LEVEL)
                    || (urlListType === URL_LIST_TYPE.untrusted && blocking_mode === BMODE_TYPES.WHITELIST_ALLOW_TOP_LEVEL))
                    rbBlock.checked = true;
                aRadioSetDiv.appendChild(rbBlock);
                var labelBlock = document.createElement("label");
                labelBlock.setAttribute("for", rbBlock.id);
                labelBlock.innerText = blocking_mode === BMODE_TYPES.WHITELIST_ALLOW_TOP_LEVEL ? "Block" : "Block";
                aRadioSetDiv.appendChild(labelBlock);

                if (blocking_mode === BMODE_TYPES.WHITELIST_ALLOW_TOP_LEVEL) {
                    var rbSameSite = document.createElement("input");
                    rbSameSite.type = "radio";
                    rbSameSite.id = randomID();
                    rbSameSite.name = rbGroupName;
                    rbSameSite.setAttribute("data-url", currBlockedURL);
                    rbSameSite.onclick = sameSite;
                    if (urlListType === URL_LIST_TYPE.blocked
                        || (urlListType === URL_LIST_TYPE.allowed && topDomain === currBlockedURL && !topDomainIsWhitelisted))
                        rbSameSite.checked = true;
                    aRadioSetDiv.appendChild(rbSameSite);
                    var labelSameSite = document.createElement("label");
                    labelSameSite.setAttribute("for", rbSameSite.id);
                    labelSameSite.innerText = "Same";
                    aRadioSetDiv.appendChild(labelSameSite);
                }

                var rbTempAllow = document.createElement("input");
                rbTempAllow.type = "radio";
                rbTempAllow.id = randomID();
                rbTempAllow.name = rbGroupName;
                rbTempAllow.setAttribute("data-url", currBlockedURL);
                rbTempAllow.onclick = tempAllowSite;
                if (urlListType === URL_LIST_TYPE.tempAllowed) rbTempAllow.checked = true;
                aRadioSetDiv.appendChild(rbTempAllow);
                var labelTempAllow = document.createElement("label");
                labelTempAllow.setAttribute("for", rbTempAllow.id);
                labelTempAllow.innerText = "Temp";
                aRadioSetDiv.appendChild(labelTempAllow);

                $(aRadioSetDiv).buttonset();

                aForm.appendChild(aRadioSetDiv);


                var divRated = document.createElement("div");
                divRated.className = "urlTitle";
                //divUrl.innerText = limitUrlLength(currBlockedURL);

                var ratedUrl = document.createElement("a");
                ratedUrl.className = "ratedUrl";
                ratedUrl.href = "#";
                ratedUrl.innerText = "Rating";
                ratedUrl.setAttribute("data-url", currBlockedURL);
                ratedUrl.onclick = openRatedUrl;
                divRated.appendChild(ratedUrl);

                var infoUrl = document.createElement("a");
                infoUrl.className = "infoUrl";
                infoUrl.href = "#";
                infoUrl.innerText = "Info";
                infoUrl.setAttribute("data-url", currBlockedURL);
                infoUrl.onclick = openInfoUrl;
                divRated.appendChild(infoUrl);

                aForm.appendChild(divRated);


                spacerBottomDiv.parentNode.insertBefore(aForm, spacerBottomDiv);
                aForm.style.display = "block";
            }
        }
    }
}

function showLastBlocked(response) {
    if (response.fatalError) {
        encounteredError = true;

        var currBlockedURL = encodeURI(response.url ? response.url : "");
        document.getElementById("fatalErrorUrl").innerText = chunkUrlForDisplay(currBlockedURL);
        fatalErrorButton.onclick = clearSiteStorageAndClose;
        fatalErrorButton.style.display = "block";
        spacerTopDiv.style.display = "block";
    }

    // Toggling on/off
    if (response.globalAllowAll) {
        revokeAllTempButton.style.margin = "30px auto 10px auto";
        revokeAllTempButton.setAttribute("data-newState", "false");
        revokeAllTempButton.style.display = "block";
        revokeAllTempButton.onclick = toggleOnOff;
    }
    else {
        multiSelectDiv.style.display = "block";
        multiSelectCB.checked = bgPage.config.get('multiSelect');
        spacerTopDiv.style.display = "block";

        if (bgPage.tempAllowList.length > 0) {
            revokeAllTempButton.innerText = "Revoke Temporary From\n" + bgPage.tempAllowList.length + " Site(s)\nin All Pages";
            revokeAllTempButton.style.padding = "7px 2px 7px 2px";
            revokeAllTempButton.setAttribute("data-newState", "false");
            revokeAllTempButton.style.display = "block";
            revokeAllTempButton.onclick = toggleOnOff;
        }

        spacerBottomDiv.style.display = "block";
        if (response.pageSourcesForbidden && response.pageSourcesForbidden.length > 0) {
            allowAllShownButton.style.display = "block";
            tempAllowShownBlockedButton.style.display = "block";
        }

        if (response.pageSourcesAllowed && response.pageSourcesAllowed.length > 0) {
            blockAllShownButton.style.display = "block";
        }

        globalAllowTempButton.setAttribute("data-newState", "true");
        globalAllowTempButton.style.display = "block";
        globalAllowTempButton.onclick = toggleOnOff;

        addButtonsFromUrlList(response.pageSourcesTempAllowed, URL_LIST_TYPE.tempAllowed, response.topDomain, response.topDomainIsWhitelisted);
        addButtonsFromUrlList(response.pageSourcesAllowed, URL_LIST_TYPE.allowed, response.topDomain, response.topDomainIsWhitelisted);

        // Untrust needs to be before blocked in case of iframes
        addButtonsFromUrlList(response.pageSourcesUntrusted, URL_LIST_TYPE.untrusted, response.topDomain, response.topDomainIsWhitelisted);
        addButtonsFromUrlList(response.pageSourcesForbidden, URL_LIST_TYPE.blocked, response.topDomain, response.topDomainIsWhitelisted);

    }

    // Workaround for Google Chrome on netbooks with screen heights of less than 700px where the
    // drop down menu is cut off by the screen.
    if (screen.height < 700 && document.documentElement.clientHeight > 500) {
        document.getElementById("spaceFiller").style.display = "block";
    }
}

var updateCurrentOnUnload = false;

function doTasks() {
    if (updateCurrentOnUnload)
        bgPage.updateAllTabs(false);
}

function openInfoUrl() {
    var url = this.getAttribute("data-url");
    chrome.tabs.create({"url": "http://www.google.com/safebrowsing/diagnostic?site=" + encodeURIComponent(url), "index": currTabIndex});
    window.close();
}

function openRatedUrl() {
    var url = this.getAttribute("data-url");
    chrome.tabs.create({"url": "http://www.mywot.com/en/scorecard/" + encodeURIComponent(url), "index": currTabIndex});
    window.close();
}

function tempAllowSite() {
    var urls = new Array();
    urls.push(this.getAttribute("data-url"));
    bgPage.tempPermitUrl(urls);

    if (multiSelectCB.checked)
        updateCurrentOnUnload = true;
    else {
        bgPage.updateAllTabs(false);
        reloadCurrentAndClose();
        //window.close();
    }
}

function removeSite() {
    var urls = new Array();
    urls.push(this.getAttribute("data-url"));
    bgPage.revokeUrl(urls);

    if (multiSelectCB.checked)
        updateCurrentOnUnload = true;
    else {
        bgPage.updateAllTabs(false);
        window.close();
    }
}

function addSite() {
    var urls = new Array();
    urls.push(this.getAttribute("data-url"));
    bgPage.permitUrl(urls);

    if (multiSelectCB.checked)
        updateCurrentOnUnload = true;
    else {
        bgPage.updateAllTabs(false);
        reloadCurrentAndClose();
        //window.close();
    }
}

function sameSite() {
    var urls = new Array();
    urls.push(this.getAttribute("data-url"));
    bgPage.sameSiteUrl(urls);

    if (multiSelectCB.checked)
        updateCurrentOnUnload = true;
    else {
        bgPage.updateAllTabs(false);
        reloadCurrentAndClose();
        //window.close();
    }
}

function blockAllShown() {
    var urls = new Array();
    var docEls = document.getElementsByName("urlActionForm");
    for (var i = 0; i < docEls.length; i++) {
        urls.push(docEls[i].childNodes[1].childNodes[0].getAttribute("data-url"));
    }
    bgPage.revokeUrl(urls);

    updateCurrentOnUnload = false;
    bgPage.updateAllTabs(false);
    window.close();
}

function allowAllShown() {
    var urls = new Array();
    var docEls = document.getElementsByName("urlActionForm");
    for (var i = 0; i < docEls.length; i++) {
        urls.push(docEls[i].childNodes[1].childNodes[0].getAttribute("data-url"));
    }
    bgPage.permitUrl(urls);

    updateCurrentOnUnload = false;
    bgPage.updateAllTabs(false);
    window.close();
}

function tempAllowShownBlocked() {
    var urls = new Array();
    var docEls = document.getElementsByName("urlActionForm");
    for (var i = 0; i < docEls.length; i++) {
        // The second childNodes goes in multiples of 2 because jQuery renders an element over the radio boxes
        if (!docEls[i].childNodes[1].childNodes[0].checked)		// Looks at the "Allow" button
            urls.push(docEls[i].childNodes[1].childNodes[0].getAttribute("data-url"));
    }
    bgPage.tempPermitUrl(urls);

    updateCurrentOnUnload = false;
    bgPage.updateAllTabs(false);
    window.close();
}


function toggleOnOff() {
    var newState = this.getAttribute("data-newState") === "true" ? true : false;
    bgPage.toggleOnOff(newState);
    bgPage.updateAllTabs(false);
    window.close();
}

function clearSiteStorageAndClose() {
    bgPage.resetSiteStorage(currTabId);
    window.close();
}

function reloadCurrentAndClose() {
    chrome.tabs.update(currTabId, {"url": currTabUrl});
    window.close();
}