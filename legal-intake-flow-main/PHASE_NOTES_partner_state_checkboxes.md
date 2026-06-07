# Partner State Checkbox UI Update

## Summary

Updated `/partner/account` lead preferences so partner state coverage uses scrollable checkbox lists instead of a native multi-select box.

## Changed

- `app/partner/account/LeadPreferencesForm.tsx`
  - Replaced the multi-select list for selected states with a scrollable checkbox list.
  - Replaced the multi-select list for excluded states with a scrollable checkbox list.
  - Added a `Clear all` button for each state list.
  - Shows selected state count and selected state abbreviations below the list.
  - No Command/Ctrl/Shift key usage is required to select multiple states.

## Setup

- SQL migration required: No
- Vercel ENV required: No
