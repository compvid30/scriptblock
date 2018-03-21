// To help improve the effectiveness of the inline script mitigation
if (!do_not_mitigate_inline_scripts)
{
	if (!((PASSWORD_GOOD === PASSWORD_STATUS.okay) && (isGloballyAllowed() || isWhitelisted(topDomain) || isTempAllowListed(topDomain))))
	{	
		clearUnloads();
	}
}

function clearUnloads()
{
	var keepGoing = (window.onbeforeunload || window.onunload);
	window.onbeforeunload = null;
	window.onunload = null;
	if (keepGoing) setTimeout("clearUnloads()", 5000);
}

// Example node we want to block that Google Search lists as "This site may harm your computer."::
// <li class="g"><h3 class="r"><a href="/interstitial?url=http://example.com/harmful.html" ........</li>
// The links can also be given as:
// http://www.google.co.uk/interstitial?url=http://example.com/harmful.html
// https://encrypted.google.com/interstitial?url=http://example.com/harmful.html

// Note: This blocking is not compatible with AutoPagerize type extensions
const reGoogleSearchResults = /^http[s]*:\/\/(www|encrypted)\.google\.([^\/])+\/search\?/i;
if (reGoogleSearchResults.test(window.location.href))
{	
	chrome.extension.sendMessage({"type": "get block harmful search"}, function(result){
		if (result.setting)
		{
			const reHarmfulLinks = /^(http[s]*:\/\/(www|encrypted)\.google\.([^\/])+)*\/interstitial\?/i;
			var allLinks = document.getElementsByTagName("a");
			var currLink;
			for (var i = 0; i < allLinks.length; i++)
			{
				currLink = allLinks[i];
				if (currLink.href && reHarmfulLinks.test(currLink.href))
				{
					var pOfLink = currLink.parentNode;
					var p2OfLink = pOfLink.parentNode;

					if (p2OfLink.nodeName.toUpperCase() === "LI")
					{						
						p2OfLink.parentNode.removeChild(p2OfLink);
					}
					else
					{						
						pOfLink.parentNode.removeChild(pOfLink);
					}
				}
			}
		}
	});
}


