---
name: Org structure tab
description: Company Management "الهيكل التنظيمي" tab data source and scoping rule
---
The org-structure tree (Company Management → structure tab) is built from companies + branches.

- `type` ("main"/"subsidiary"/"branch") and `parentId` are NOT DB columns — they live inside the company's `settings` JSON and are mapped in fetchData. The DB `companies` table has no `type`/`parent_id` columns.
- **Rule:** the structure tab must scope by **permissions** (userScopedCompanies / allowedBranchIds), NOT by the active business activity.
  **Why:** activity scoping keeps only companies where id==activity.companyId or parentId==activity.companyId; when a subsidiary activity is active the main company (id, parentId=null) is excluded and the whole tree renders blank — users read this as "the page is broken / can't enter data".
  **How to apply:** roots = companies where type==="main" OR no visible parent, so mains + independent companies always show. Data entry (add subsidiary / add branch, edit on click) reuses the existing company/branch dialogs via setCompanyForm/setBranchForm + setShow*Dialog.
