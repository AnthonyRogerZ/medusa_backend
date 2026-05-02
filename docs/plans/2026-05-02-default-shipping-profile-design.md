# Default Shipping Profile Auto-Assignment Design

## Goal
Prevent GomGom orders from failing when newly-created/published products do not have a shipping profile.

## Recommended approach
Add a Medusa subscriber listening to `ProductWorkflowEvents.CREATED` and `ProductWorkflowEvents.UPDATED`. For every affected product, load its product record through `remoteQuery`; if `shipping_profile.id` is missing, update it through the product module service with `shipping_profile_id = sp_01K4R1SKQECRBP746HAE675RPC`.

## Why this approach
- Runs server-side, so it works regardless of whether products are created from Admin, import, or API.
- Fixes the issue before customers hit checkout.
- Keeps the current shipping pricing behavior unchanged: variants with `weight=null` still fall back to 100g in `dynamic-shipping`.

## Safety
- Idempotent: products already having a shipping profile are skipped.
- Logs each auto-fix and any failure.
- Default profile id is configurable through `DEFAULT_SHIPPING_PROFILE_ID`, with GomGom’s current default as fallback.
