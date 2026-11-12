# Field Lens

Monthly reports from your work items, built on **any date field**. Pick a work item type, a Date/Time field (custom fields included) and a range. Field Lens lists every item whose date falls in that range, summarises it, and puts it on your dashboard.

## Report page

- **Filters**:
  - one work item type
  - any Date/Time field, searchable by display name or reference name
  - one or more states
  - a range: last 15 / 30 / 90 days, this month, last month, or a custom from–to
- **Columns of your choice**: search by display name or reference name, drag to reorder (or Alt + ←/→).
- **Column derived by a rule**: keep only part of a field's value in a new column. For example, `\b(ABC|XY)\b.*` turns "Deniz Arslan ABC Ödeme Hizmetleri" into "ABC Ödeme Hizmetleri". A live preview shows the result.
- **Report header**: after a run the filters fold into one line ("Change report · Planned date · 2026-10-01 – 2026-10-31 · 3 states"), with Edit and CSV next to it.
- **Totals**:
  - the total compared with the previous period (+/− %)
  - one card per state in the board's state colors; click a card to show only that state
- **Results table**:
  - search across all columns, filter each column, and sort by clicking a header
  - 100 rows per page with a sticky header
  - comfortable or compact rows
  - the ID opens the work item
- **CSV export** of the current view: UTF-8 so Excel keeps Turkish characters, with `;` or `,` as separator depending on the interface language.
- Your selections are remembered.

## Dashboard widget

Add **Field Lens** from the widget catalog and choose a view in its settings:

1. **Summary**: the total and the change against the previous period. On its own it is a donut split by state. With a **breakdown field** (system, assignee, …) it becomes horizontal bars, one per value and each split by state. An optional rule can turn the field's value into a group first, for example a person into their unit.
2. **Monthly trend**: the last 3, 6 or 12 months (or a custom range), stacked by state.
3. **Weekly**: items per calendar week in the chosen range.
4. **By date**: one bar for every day that has items, labelled with its date.
5. **Upcoming**: items whose date falls in the next 7 / 14 / 30 / 60 days, earliest first, with links.

Use relative ranges such as "last month" so the dashboard stays current on its own, or set a fixed custom range. Add the widget several times with different views to build a report page. **Open report** takes you to the full report.

## Where to find it

Open a project → **Boards** → **Field Lens**. The widget is under **Dashboards → Edit → Add a widget**.

## Release notes

**0.2.10**: the sample data and documentation examples use made-up names.

**0.2.9**: chart dates are written at an angle when they don't fit, so no date is skipped.

**0.2.8**: a Summary with a breakdown field is drawn as state-stacked horizontal bars.

**0.2.7**: columns derived by a rule (regex) on the report page, and the same rule for the widget's breakdown, with a live preview.

**0.2.6**: the widget Summary view is a donut chart and has an optional breakdown field. The by-week chart is removed from the report page.

**0.2.5**: release notes in English and Turkish.

**0.2.4**: Marketplace page and README in English and Turkish.

**0.2.3**:
- New **By date** widget view.
- The Distribution view is removed.
- Weekly charts use Monday–Sunday weeks labelled with their dates.
- Crowded charts stay readable.

**0.2.2**: custom from–to range in the widget.

**0.2.0**: dashboard widget with Summary, Monthly trend, Weekly and Upcoming views.

**0.1.10**:
- Report header.
- Comparison with the previous period.
- By-week chart.
- Compact rows.

**0.1.7**: search, column filters and sorting.

**0.1.6**: state summary cards in board colors.

Full history: [CHANGELOG.md](https://github.com/eminturan/field-lens/blob/main/CHANGELOG.md) · [Türkçe](https://github.com/eminturan/field-lens/blob/main/CHANGELOG.tr.md)

## Permissions

Read-only: `vso.work`.

English and Turkish interface; follows the Azure DevOps theme. Built for Azure DevOps Server 2022.
