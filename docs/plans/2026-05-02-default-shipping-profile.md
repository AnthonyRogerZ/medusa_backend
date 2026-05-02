# Default Shipping Profile Auto-Assignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automatically assign GomGom's Default Shipping Profile to products missing a shipping profile.

**Architecture:** Add a Medusa subscriber for product created/updated events. It queries each product, skips products that already have a shipping profile, and updates only missing ones through the product module service.

**Tech Stack:** Medusa v2.9, TypeScript subscribers, `ProductWorkflowEvents`, product module service, `remoteQuery`.

---

### Task 1: Add subscriber

**Files:**
- Create: `src/subscribers/default-shipping-profile.ts`

**Steps:**
1. Import `SubscriberArgs` and `ProductWorkflowEvents`.
2. Define `DEFAULT_SHIPPING_PROFILE_ID` from env fallback `sp_01K4R1SKQECRBP746HAE675RPC`.
3. Normalize event payload to product ids.
4. Use `remoteQuery` to fetch product `id`, `title`, `shipping_profile.id`.
5. If missing, call `productModuleService.updateProducts(productId, { shipping_profile_id: DEFAULT_SHIPPING_PROFILE_ID })`.
6. Log skip/update/error.

### Task 2: Verify

**Commands:**
- `npm run build`
- Optional live check after deploy: create/update a draft product without shipping profile and confirm logs show auto-assignment.

### Task 3: Deploy

**Commands:**
- Commit and push to the backend repo’s configured remote so Railway deploys.
