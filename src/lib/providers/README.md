# Adding a CRM provider

The integration system is a plugin architecture. Adding a new CRM is **one new
module** plus **one import line** in the composition root — no other file
changes, and the new provider automatically works with Review Automation, CRM,
Messaging, Analytics, Workflows, and Reports.

## Why it "just works" everywhere

Nothing downstream references a provider. The platform is built on two
provider-agnostic contracts:

- **Canonical CRM model** (`@/lib/crm`) — every provider maps its data into the
  same `Customer / Job / Invoice / Estimate / Appointment / Technician / Company`.
- **Standardized events** (`@/lib/events`) — every provider publishes the same
  `JOB_COMPLETED`, `INVOICE_PAID`, … events.

The event listener, review engine, workflows, conversations (messaging),
dashboards (analytics), and reports all consume those two contracts. So once a
provider emits standardized events from canonical data, it is invisible to them
— it simply flows through.

## Steps

1. **CRM mapper** — `src/lib/crm/adapters/<crm>.ts`: implement `CrmProviderAdapter`
   (pure functions mapping raw records → canonical model). Copy an existing one.

2. **Integration adapter** — `src/lib/integration/adapters/<crm>.ts`: extend
   `AbstractIntegrationAdapter` with the provider's OAuth config, webhook
   event map, and API calls. Reuses all shared orchestration (sync, retry,
   logging, publish).

3. **Provider definition** — `src/lib/providers/adapters/<crm>.ts`: bundle the
   descriptor + mapper + integration factory into a `ProviderDefinition` and
   call `registerProvider(...)`.

4. **Register it** — add `import "@/lib/providers/adapters/<crm>";` to
   `src/lib/providers/index.ts` (the composition root).

That's it. The provider now appears in the marketplace, is buildable via
`createIntegration(id, ctx)`, maps via `getCrmMapper(id)`, and drives every
downstream system.
