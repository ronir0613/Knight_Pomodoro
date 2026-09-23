import { TimerState, UserSettings } from '../storage/models';

/**
 * Blocking is purely derived — it is NEVER a manual toggle.
 * Call updateRules() on every state transition and every settings change.
 *
 * Rule ID allocation:
 *   1          = strict mode block-all rule
 *   2          = strict mode allow rule (requestDomains)
 *   2000–2999  = non-strict blocklist rules (one per domain)
 */

const RULE_STRICT_BLOCK = 1;
const RULE_STRICT_ALLOW = 2;
const RULE_BLOCKLIST_BASE = 2000;

const BLOCKED_PAGE = () => chrome.runtime.getURL('blocked.html');

// ─── Build rule sets ──────────────────────────────────────────────────────────

function buildStrictRules(allowedDomains: string[]): chrome.declarativeNetRequest.Rule[] {
  const rules: chrome.declarativeNetRequest.Rule[] = [
    {
      id: RULE_STRICT_BLOCK,
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
        redirect: { url: BLOCKED_PAGE() },
      },
      condition: {
        urlFilter: '|http',
        resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
      },
    },
  ];

  if (allowedDomains.length > 0) {
    rules.push({
      id: RULE_STRICT_ALLOW,
      priority: 2,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.ALLOW,
      },
      condition: {
        requestDomains: allowedDomains,
        resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
      },
    });
  }

  return rules;
}

function buildBlocklistRules(
  blocklist: string[]
): chrome.declarativeNetRequest.Rule[] {
  return blocklist.slice(0, 999).map((domain, index) => ({
    id: RULE_BLOCKLIST_BASE + index,
    priority: 1,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
      redirect: { url: `${BLOCKED_PAGE()}?site=${encodeURIComponent(domain)}` },
    },
    condition: {
      // Match the domain and all subdomains
      requestDomains: [domain],
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
    },
  }));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Recompute and apply declarativeNetRequest dynamic rules based on current state.
 * Clears all existing dynamic rules first, then applies the correct set.
 */
export const updateRules = async (
  state: TimerState,
  settings: UserSettings
): Promise<void> => {
  const focusAndRunning =
    state.currentState === 'focus' && state.pausedAt === null;

  // Collect all IDs we might have set previously
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existingRules.map((r) => r.id);

  let addRules: chrome.declarativeNetRequest.Rule[] = [];

  if (focusAndRunning) {
    if (settings.strictMode) {
      addRules = buildStrictRules(settings.allowedDomains);
    } else if (settings.blocklist.length > 0) {
      addRules = buildBlocklistRules(settings.blocklist);
    }
  }
  // Else: break / idle / paused → no rules (auto-unblock)

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules,
  });
};
