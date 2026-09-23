const RULE_ID_BLOCK = 1;
const RULE_ID_ALLOW = 2;

export const enableTabLock = async (allowedDomains: string[]) => {
  const BLOCKED_PAGE_URL = chrome.runtime.getURL("blocked.html");

  const rules: chrome.declarativeNetRequest.Rule[] = [
    {
      id: RULE_ID_BLOCK,
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
        redirect: { url: BLOCKED_PAGE_URL }
      },
      condition: {
        urlFilter: "|http*",
        resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME]
      }
    }
  ];

  if (allowedDomains.length > 0) {
    rules.push({
      id: RULE_ID_ALLOW,
      priority: 2, // Higher priority than block
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.ALLOW
      },
      condition: {
        requestDomains: allowedDomains,
        resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME]
      }
    });
  }

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [RULE_ID_BLOCK, RULE_ID_ALLOW],
    addRules: rules
  });
};

export const disableTabLock = async () => {
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [RULE_ID_BLOCK, RULE_ID_ALLOW]
  });
};

// Fallback logic for tabs
const checkTab = (tabId: number, url?: string, allowedDomains?: string[]) => {
  if (!url) return;
  
  // Only act on http/https
  if (!url.startsWith('http://') && !url.startsWith('https://')) return;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    if (allowedDomains) {
      const isAllowed = allowedDomains.some(domain => {
        // Handle wildcard subdomains like *.docs.google.com or exact match
        if (domain.startsWith('*.')) {
          const baseDomain = domain.substring(2);
          return hostname === baseDomain || hostname.endsWith(`.${baseDomain}`);
        }
        return hostname === domain;
      });

      if (isAllowed) return; // Tab is allowed
    }

    // Redirect to blocked page
    const BLOCKED_PAGE_URL = chrome.runtime.getURL("blocked.html");
    chrome.tabs.update(tabId, { url: BLOCKED_PAGE_URL });
  } catch (e) {
    // Invalid URL, ignore
  }
};

let tabUpdatedListener: ((tabId: number, changeInfo: any, tab: chrome.tabs.Tab) => void) | null = null;
let tabCreatedListener: ((tab: chrome.tabs.Tab) => void) | null = null;

export const startTabListeners = (allowedDomains: string[]) => {
  stopTabListeners();

  tabUpdatedListener = (tabId, changeInfo, _tab) => {
    if (changeInfo.url) {
      checkTab(tabId, changeInfo.url, allowedDomains);
    }
  };

  tabCreatedListener = (tab) => {
    if (tab.id && tab.pendingUrl) {
      checkTab(tab.id, tab.pendingUrl, allowedDomains);
    } else if (tab.id && tab.url) {
      checkTab(tab.id, tab.url, allowedDomains);
    }
  };

  chrome.tabs.onUpdated.addListener(tabUpdatedListener);
  chrome.tabs.onCreated.addListener(tabCreatedListener);
};

export const stopTabListeners = () => {
  if (tabUpdatedListener) {
    chrome.tabs.onUpdated.removeListener(tabUpdatedListener);
    tabUpdatedListener = null;
  }
  if (tabCreatedListener) {
    chrome.tabs.onCreated.removeListener(tabCreatedListener);
    tabCreatedListener = null;
  }
};
