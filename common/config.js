/*
This file should not to be used by content scripts.
It should only be loaded once in the extension, ie: background page.
Otherwise, you will have to worry about storage sync issues.
*/
var extFatalError = false;

var config = {
    has: function(key) {
        return key in localStorage;
    },
    get: function(key) {
        if (this.has(key)) {
            try {
                return JSON.parse(localStorage[key]);
            } catch(err) {
                return localStorage[key];
            }
        }
    },
    set: function(key, value) {
		try {
			localStorage[key] = JSON.stringify(value);
		} catch (err) {
			extFatalError = true;
			//if (err == QUOTA_EXCEEDED_ERR) {
				//alert('Local storage quota exceeded for ScriptBlock extension.');
			//}
		}
    },
    defaults: function(vals) {
        for (var key in vals) {
            if (!this.has(key)) {
				this.set(key, vals[key]);
            }
			else	// In case our data gets corrupted during end user use
			{
				var currVal = this.get(key);
				if (currVal === 'undefined' || currVal === 'null')
					this.set(key, vals[key]);			
			}
        };
    }
};

config.defaults({
    whitelist: ["google.com", "google.ca", "google.co.uk", "google.de", "google.com.au", "gstatic.com", "youtube.com", "ytimg.com",
		"live.com", "microsoft.com", "hotmail.com", "apple.com", "yahoo.com", "yahooapis.com", "yimg.com", "paypal.com", "paypalobjects.com"],
	whitelistHash: "",
	
	reloadCurrentTabOnToggle: true,
	showPageActionButton: true,
	
	lastVersion: 0,
	currVersion: 0,
	currDisplayVersion: "1.2.0",
	
	multiSelect: false,
	
	hideHarmfulSearches: true,
	
	// Blacklist mode not currently implemented
	useBlacklistMode: false,
	blacklist: [],
	blacklistHash: ""
});

var sessionConfig = {
    has: function(key) {
        return key in sessionStorage;
    },
    get: function(key) {
        if (this.has(key)) {
            try {
                return JSON.parse(sessionStorage[key]);
            } catch(e) {
                return sessionStorage[key];
            }
        }
    },
    set: function(key, value) {
		try {
			sessionStorage[key] = JSON.stringify(value);
		} catch (err) {
			extFatalError = true;
			//if (err == QUOTA_EXCEEDED_ERR) {
			//	alert('Session storage quota exceeded for ScriptBlock extension.');
			//}
		}
    },
    defaults: function(vals) {
        for (var key in vals) {
            if (!this.has(key) || typeof this.get(key) === 'undefined') {
                this.set(key, vals[key]);
            }
        };
    }
};

sessionConfig.defaults({
	tempAllowList: [],
	tempAllowListHash: "",
	globalAllowAll: false
});


var whitelist = config.get('whitelist');
if (!sortUrlList(whitelist))	// in place sort
{
	whitelist = [];
	config.set('whitelist', []);
}
else
{
	removeDuplicatesInArray(whitelist);
	config.set('whitelist', whitelist);
}
config.set("whitelistHash", Crypto.MD5(whitelist.toString()));

var blacklist = config.get('blacklist');
if (!sortUrlList(blacklist))	// in place sort
{
	blacklist = [];
	config.set('blacklist', []);
}
else
{
	removeDuplicatesInArray(blacklist);
	config.set('blacklist', blacklist);
}
config.set("blacklistHash", Crypto.MD5(blacklist.toString()));

var tempAllowList = sessionConfig.get('tempAllowList');
if (!sortUrlList(tempAllowList))	// in place sort
{
	tempAllowList = [];
	sessionConfig.set('tempAllowList', []);
}
else
{
	removeDuplicatesInArray(tempAllowList);
	sessionConfig.set('tempAllowList', tempAllowList);
}
sessionConfig.set("tempAllowListHash", Crypto.MD5(tempAllowList.toString()));


function clearSettings()
{
	extFatalError = false;
	
	config.set("whitelist", []);
	config.set("whitelistHash", EMPTY_MD5);
	
	config.set("blacklist", []);
	config.set("blacklistHash", EMPTY_MD5);
	
	sessionConfig.set("tempAllowList", []);
	sessionConfig.set("tempAllowListHash", EMPTY_MD5);
	
	window.location.reload();
}

function reloadExt()
{
	window.location.reload();
}

/*
Called by the drop down menu to toggle temporary permissions on and off.
*/
function toggleOnOff(newState) {
	sessionConfig.set('globalAllowAll', newState);
	tempAllowList = [];
	sessionConfig.set('tempAllowList', tempAllowList);
	sessionConfig.set("tempAllowListHash", EMPTY_MD5);
}

function updateLists()
{
	switch(blocking_mode)
	{
		case BMODE_TYPES.BLACKLIST:
		{
			config.set("blacklist", blacklist);
			config.set("blacklistHash", Crypto.MD5(blacklist.toString()));	
			sessionConfig.set("tempAllowList", tempAllowList);	
			sessionConfig.set("tempAllowListHash", Crypto.MD5(tempAllowList.toString()));
			break;
		}
		case BMODE_TYPES.WHITELIST_ALLOW_TOP_LEVEL:
		{
			config.set("whitelist", whitelist);
			config.set("whitelistHash", Crypto.MD5(whitelist.toString()));
			config.set("blacklist", blacklist);
			config.set("blacklistHash", Crypto.MD5(blacklist.toString()));	
			sessionConfig.set("tempAllowList", tempAllowList);	
			sessionConfig.set("tempAllowListHash", Crypto.MD5(tempAllowList.toString()));
		}
		default:	// BMODE_TYPES.WHITELIST
		{
			config.set("whitelist", whitelist);
			config.set("whitelistHash", Crypto.MD5(whitelist.toString()));
			sessionConfig.set("tempAllowList", tempAllowList);	
			sessionConfig.set("tempAllowListHash", Crypto.MD5(tempAllowList.toString()));	
			break;
		}
	}
}

function permitUrl(urls)
{
	switch(blocking_mode)
	{
		case BMODE_TYPES.BLACKLIST:
		{
			for (var i = 0; i < urls.length; i++)
			{
				removeFromList(tempAllowList, "tempAllowList", urls[i], true);
				removeFromList(blacklist, "blacklist", urls[i], false);	
			}
			break;
		}
		case BMODE_TYPES.WHITELIST_ALLOW_TOP_LEVEL:
		{
			for (var i = 0; i < urls.length; i++)
			{
				removeFromList(tempAllowList, "tempAllowList", urls[i], true);
				removeFromList(blacklist, "blacklist", urls[i], false);	
				addToList(whitelist, "whitelist", urls[i], false);	
			}
		}
		default:	// BMODE_TYPES.WHITELIST
		{
			for (var i = 0; i < urls.length; i++)
			{
				removeFromList(tempAllowList, "tempAllowList", urls[i], true);
				addToList(whitelist, "whitelist", urls[i], false);	
			}
			break;
		}
	}	
	updateLists();
}

function revokeUrl(urls)
{	
	switch(blocking_mode)
	{
		case BMODE_TYPES.BLACKLIST:
		{
			for (var i = 0; i < urls.length; i++)
			{
				removeFromList(tempAllowList, "tempAllowList", urls[i], true);
				addToList(blacklist, "blacklist", urls[i], false);
			}
			break;
		}
		case BMODE_TYPES.WHITELIST_ALLOW_TOP_LEVEL:
		{
			for (var i = 0; i < urls.length; i++)
			{
				removeFromList(whitelist, "whitelist", urls[i], false);
				removeFromList(tempAllowList, "tempAllowList", urls[i], true);
				addToList(blacklist, "blacklist", urls[i], false);
			}
		}
		default:	// BMODE_TYPES.WHITELIST
		{
			for (var i = 0; i < urls.length; i++)
			{
				removeFromList(whitelist, "whitelist", urls[i], false);
				removeFromList(tempAllowList, "tempAllowList", urls[i], true);
			}
			break;
		}
	}	
	updateLists();	
}

/*
Only called when in BMODE_TYPES.WHITELIST_ALLOW_TOP_LEVEL
*/
function sameSiteUrl(urls)
{
	for (var i = 0; i < urls.length; i++)
	{
		removeFromList(whitelist, "whitelist", urls[i], false);
		removeFromList(tempAllowList, "tempAllowList", urls[i], true);
		removeFromList(blacklist, "blacklist", urls[i], false);
	}
	updateLists();
}

function tempPermitUrl(urls)
{
	switch(blocking_mode)
	{
		case BMODE_TYPES.BLACKLIST:
		{
			for (var i = 0; i < urls.length; i++)
			{
				addToList(blacklist, "blacklist", urls[i], false);
				addToList(tempAllowList, "tempAllowList", urls[i], true);
			}
			break;
		}
		case BMODE_TYPES.WHITELIST_ALLOW_TOP_LEVEL:
		{
			for (var i = 0; i < urls.length; i++)
			{
				removeFromList(whitelist, "whitelist", urls[i], false);
				removeFromList(blacklist, "blacklist", urls[i], false);
				addToList(tempAllowList, "tempAllowList", urls[i], true);				
			}
		}
		default:	// BMODE_TYPES.WHITELIST
		{
			for (var i = 0; i < urls.length; i++)
			{
				removeFromList(whitelist, "whitelist", urls[i], false);
				addToList(tempAllowList, "tempAllowList", urls[i], true);
			}
			break;
		}
	}	
	updateLists();	
}

function addToList(list, listName, url, isSession) {
	url = url.toLowerCase();
	
	var returnedVal = findUrlPatternIndex(list, url);
	if (returnedVal >= -1)
		return;
	returnedVal = Math.abs(returnedVal + 2);
	list.splice(returnedVal, 0, url);
}

function removeFromList(list, listName, url, isSession) {
	url = url.toLowerCase();
	
	var removedOneOrMore = false;
	while(true)
	{
		var returnedVal = findUrlPatternIndex(list, url);
		if (returnedVal < 0)
			break;
		list.splice(returnedVal, 1);
		removedOneOrMore = true;
		
		for (var i = returnedVal; i < list.length; i++)
		{
			if (patternMatches(url, list[i]))
			{
				list.splice(i, 1);
				i--;
			}
			else
			{
				break;
			}
		}

		for (var i = returnedVal - 1; i >= 0; i--)
		{
			if (patternMatches(url, list[i]))
			{
				list.splice(i, 1);
			}
			else
			{
				break;
			}
		}		
	}
}

/*
In place removal and trimming of the links array.
*/
function removeEmptyInArray(links)
{
	if (links)
	{
		for (var i = 0; i < links.length; i++)
		{
			if (links[i])
				links[i] = links[i].trim();
			if (!links[i])
			{
				links.splice(i, 1);
				i--;
			}			
		}
	}
}

/*
In place removal of duplicates. The "links" must already be sorted.
*/
function removeDuplicatesInArray(links)
{
	if (links)
	{
		for (var i = 0; i < links.length - 1; i++)
		{
			if (patternMatches(links[i], links[i+1]))
			{
				links.splice(i+1, 1);	// links[i+1] will always be longer than links[i] because the list is sorted		
			}			
		}
	}
}

/*
Used by Options.html whitelist tab to save. Assume that the user enters malformed data.
-Remove empty links/trims them
-Remove duplicates
*/
function saveWhitelist(newWhitelist)
{
	removeEmptyInArray(newWhitelist);	// in place removal
	if (!sortUrlList(newWhitelist))	// in place sort
	{
		return false;
	}
	else
	{
		removeDuplicatesInArray(newWhitelist);	// in place removal
		whitelist = newWhitelist;	// This line required by Options.html to update correctly
		config.set('whitelist', whitelist);
		config.set("whitelistHash", Crypto.MD5(whitelist.toString()));
		return true;
	}
}

function saveBlacklist(newBlacklist)
{
	removeEmptyInArray(newBlacklist);	// in place removal
	if (!sortUrlList(newBlacklist))	// in place sort
	{
		return false;
	}
	else
	{
		removeDuplicatesInArray(newBlacklist);	// in place removal
		blacklist = newBlacklist;	// This line required by Options.html to update correctly
		config.set('blacklist', blacklist);
		config.set("blacklistHash", Crypto.MD5(blacklist.toString()));
		return true;
	}
}

function saveTempAllowList(newTempAllowList)
{
	removeEmptyInArray(newTempAllowList);	// in place removal
	if (!sortUrlList(newTempAllowList))	// in place sort
	{
		return false;
	}
	else
	{
		removeDuplicatesInArray(newTempAllowList);	// in place removal
		tempAllowList = newTempAllowList;	// This line required by Options.html to update correctly
		sessionConfig.set('tempAllowList', tempAllowList);
		sessionConfig.set("tempAllowListHash", Crypto.MD5(tempAllowList.toString()));
		return true;
	}
}







