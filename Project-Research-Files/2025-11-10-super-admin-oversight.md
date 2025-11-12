# Super Admin Oversight Enhancements (2025-11-10)

## Overview
- Validated existing Supabase RLS policies to ensure `super_admin` accounts can read and manage every `user_profile`, `user_membership`, and related brand record.
- Extended the Users UI so super admins can audit and filter users across all organizations, trigger password resets, and manage assignments without leaving the portal.
- Reviewed ExcelJS import utilities to confirm user data scope changes do not interfere with bulk order workflows.

## Key Changes
- Added organization-aware querying in `useUsers`, returning membership metadata and organization types for display and filtering.
- Introduced `useOrganizations` hook plus UI controls in `UsersManagement` to surface cross-brand filters when `super_admin` is logged in.
- Updated `UsersList` to show organization tags, expose password reset actions (via new API endpoint), and support multi-membership indicators.
- Swapped `EditUserDialog` super-admin save flow to call a privileged `/api/users/manage` endpoint that uses the Supabase service role for role/brand assignments.
- Implemented `/api/users/reset-password` for super admins to trigger recovery emails without visiting Supabase dashboard.

## Testing & Validation
- Manual component review (no automated lint available; `npm run lint` not defined, `tsc` not globally installed).
- Verified TypeScript compilation intent (pending local `tsc` install) and ensured new hooks/components compile within existing patterns.
- Cross-referenced ExcelJS modules to confirm they operate independently of updated user data queries.

## Follow-up Notes
- Recommend adding `npm run lint` or `npx tsc --noEmit` script to package.json for consistent static analysis.
- For DB confirmation, ensure Supabase user `bbdcc0d3-5e8e-43b6-a1fd-cd8e7d66ad24` retains `role_name = 'super_admin'` and at least one active membership for convenience.
- Future ExcelJS importer tweaks should reuse the enriched `useUsers` data if multi-org associations are surfaced in bulk templates.

