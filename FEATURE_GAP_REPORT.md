# Feature Gap Report

## Existing Features

- React/Vite application with routed desktop finance workspace.
- Routes exist for Dashboard, Transactions, Categories, Category Detail, Accounts, Budgets, Reports, Analytics, Goals, and Settings.
- Figma-matched dark UI shell with sidebar, sticky header, responsive mobile navigation, cards, charts, tables, and modals.
- Transaction creation modal supports type, amount, description, date, category, account, notes, and persists new rows.
- Transactions page supports search plus category and account filters.
- Dashboard KPIs, recent transactions, and account balance cards read from the current transaction store.
- Accounts page recalculates balances from the transaction store.
- Category detail page adapts to selected category route.
- Recharts visualizations exist for cash flow, expense breakdown, account trend, category performance, analytics, and goal/budget progress.
- Local data persistence currently uses browser `localStorage`.

## Missing Features

- No IndexedDB or SQLite-grade storage layer yet.
- No migration wrapper from `localStorage` to a stronger storage engine.
- No transaction edit, delete, duplicate, transfer, bulk edit, bulk delete, attachment, tag, or detail workflow.
- No category create, edit, delete/archive, merge, or live category-stat workflow.
- No account create, edit, delete/archive, transfer, reconciliation, balance history, or account-detail workflow.
- No functional report generation beyond static report rows.
- No CSV, Excel, or PDF export flows.
- No budget creation/editing or overspending alert workflow.
- No goal creation/editing or analytics workflow.
- No global search results or deep-link behavior from the header search field.
- No recurring payment model behind upcoming payments.
- No settings persistence for currency, date format, theme, backup, import, or export.
- No backup/restore flow.
- No empty-state design for filtered transaction lists or missing data.

## Dead UI

- Header search input is visual only.
- Header date range button is visual only.
- Header notification bell is visual only.
- Dashboard cash-flow period buttons are visual only.
- Dashboard account overflow icon is visual only.
- Dashboard Add Account button is visual only.
- Dashboard expense breakdown slices do not drill into categories.
- Dashboard upcoming payments are static and not tied to recurring transactions.
- Transactions Import CSV, Export, More Filters, pagination, and table row clicks are incomplete.
- Categories New Category and card overflow buttons are incomplete.
- Accounts Link Account and account overflow buttons are incomplete.
- Category Detail Report button and period selector are incomplete.
- Analytics date selector and Export PDF button are incomplete.
- Budgets Create Budget and budget overflow buttons are incomplete.
- Reports Generate Report, All Time, Filter, report cards, and download buttons are incomplete.
- Goals New Goal and goal overflow buttons are incomplete.
- Settings tabs, avatar controls, Save Changes, and device Revoke are incomplete.
- Add Transaction Receipt and Add Tags buttons are incomplete.
- Older duplicate layout/modal components exist under `src/app/components/layout` and `src/app/components/modals` but are not active.

## Incomplete Workflows

- Create transaction works, but edit/delete/duplicate/attachments/tags/transfers are missing.
- Search works on Transactions page, but global search is missing.
- Balances update in Dashboard and Accounts, but Analytics, Budgets, Reports, Goals, and Categories still use mostly static data.
- Category cards navigate, but category records cannot be managed.
- Account balances display, but accounts cannot be managed.
- Reports exist visually, but export/download is missing.
- Settings form accepts typing, but preferences are not saved.
- Backup and restore are absent.

## Missing Data Connections

- Analytics charts do not derive from real transactions.
- Budget cards are not connected to category spend.
- Goals are not stored or editable.
- Reports are not generated from transactions.
- Upcoming payments are static and disconnected from recurring schedules.
- Category cards do not recalculate from current transaction totals.
- Account trend charts are static and not generated from balance history.

## UX Issues

- Many buttons provide no feedback.
- Missing confirmation for destructive actions.
- Missing validation beyond basic add transaction fields.
- Missing toasts or success/failure states.
- Missing empty states for filtered search results.
- Missing import error handling.
- Missing backup/restore safety copy.
- Settings tabs look clickable but do not change visible settings sections.
- Icon-only overflow buttons lack menus.

## Recommended Features

Based on Actual Budget, Firefly III, YNAB, Monarch, Copilot Money, and Quicken:

- Envelope/category budgeting with monthly rollover options.
- Rules-based categorization for imports.
- Recurring transactions and upcoming bills.
- Account reconciliation workflow.
- Split transactions.
- Payee/client tracking.
- Transaction tags and notes.
- Local-first backup/restore.
- CSV import/export with clear mapping.
- Drill-down analytics from every chart.
- Financial health score with transparent calculations.
- Forecasting based on recurring income, bills, and budget pace.

## v0 Implementation Priorities

1. Upgrade storage from `localStorage` to IndexedDB with migration.
2. Complete transaction CRUD, duplicate, bulk delete, tags, notes, attachments, import/export, and transfer support.
3. Complete the most visible dead buttons with modals, menus, downloads, or drill-down navigation.
4. Connect dashboards, categories, accounts, reports, budgets, goals, analytics, and settings to shared app state.
5. Add backup/restore and final completion notes for remaining non-v0 limitations.
