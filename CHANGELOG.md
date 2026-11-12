# Changelog

[Türkçe](CHANGELOG.tr.md)

## 0.2.10

- The sample data and the examples in the documentation now use made-up names, units and fields.

## 0.2.9

- Widget charts (By date, Weekly, Monthly trend): when date labels don't fit side by side, they are written at 45° so every bar keeps its date. Before, every other label was skipped. The first label is no longer cut off at the left edge.
- The legend under the charts has a little more room at the bottom.

## 0.2.8

- Widget, **Summary** with a breakdown field: it is now drawn as **horizontal bars**, one per value, biggest first. Each bar is split by the chosen states in the board's colors, and hovering a bar shows the counts per state. All values are shown (no "Other"), and long lists scroll inside the widget. Without a breakdown field, the Summary stays a donut split by state.

## 0.2.7

- Report page: a **column derived by a rule**. Pick a source field, write a rule (regex) and a column name. The new column holds the first part of the field's displayed value that matches the rule. For example, `\b(ABC|XY)\b.*` turns "Deniz Arslan ABC Ödeme Hizmetleri" into "ABC Ödeme Hizmetleri". Values that don't match show "(no match)" and empty values stay empty.
  - The column can be searched, filtered and sorted, is included in the CSV, and is saved with your selections.
  - A live preview shows the rule applied to real values after a run. An invalid rule is reported and its column is left out until it is fixed.
- Widget, **Summary**: an optional rule for the breakdown field, so the donut can be split by unit instead of by person. The settings panel shows a live preview using the widget's own filters.

## 0.2.6

- Widget, **Summary** view: a **donut chart** with the total in the middle and a legend with counts and percentages. It replaces the state bar.
- Widget, **Summary** view: an optional **breakdown field**. When it is empty, the donut is split by state. When a field is chosen, items in the chosen states are counted by that field's values: the 7 largest are shown, the rest are grouped as "Other", and empty values appear as "(empty)".
- Report page: the by-week chart is removed. The weekly view remains in the widget.

## 0.2.5

- Release notes in English and Turkish (`CHANGELOG.md`, `CHANGELOG.tr.md`). The Marketplace page and the READMEs link to them.

## 0.2.4

- Marketplace page in English (`overview.md`) and Turkish (`overview.tr.md`).
- The README is rewritten and now has a Turkish version (`README.tr.md`).

## 0.2.3

- Widget: a new **By date** view draws one bar for every day that has items, labelled with its date.
- Widget: the **Distribution** view is removed. A widget that was set to it asks to be configured again.
- Weekly charts on the report page and in the widget now use Monday–Sunday calendar weeks, labelled with their dates (`13–19.10`). Before, weeks were counted from the first day of the range and labelled with their first day only.
- Charts hide the counts above narrow bars; the count is still shown when you hover a bar. Date labels are spaced out so they don't overlap, and labels at the edges are no longer cut off.

## 0.2.2

- Widget: a custom from–to range for Summary, Weekly and Monthly trend. The settings panel stops you from saving a start date after the end date.

## 0.2.1

- Widget: no state is preselected in the settings any more; you choose the states.

## 0.2.0

- **Dashboard widget**. Pick its view in the settings: Summary, Monthly trend, Weekly, Distribution or Upcoming. Each view has its own type, date field, states and relative range. The widget can be 2–6 columns wide and 1–4 rows tall, and has an **Open report** link.
- The chart is shared between the report page and the widget.

## 0.1.12

- Removed the "Busiest day" card.

## 0.1.11

- Hovering the Total card shows the exact previous-period dates.

## 0.1.10

- After a run, the filters fold into a one-line **report header** with Edit and CSV.
- The **Total** card is compared with the **previous period**: the month before for a whole calendar month, otherwise the same number of days right before the range.
- A **by-week chart** stacked by state.
- **Comfortable / compact** row density, remembered in the browser.

## 0.1.9

- Grey placeholders while a query runs.

## 0.1.8

- When a filter is on, the CSV button shows how many rows it will download.

## 0.1.7

- **Search** across all columns, a **filter box** under every column header, and **sorting** by clicking a header (ascending → descending → off). Text filters also update the state cards.

## 0.1.6

- **State summary cards** in the board's state colors. Click a card to show only that state in the table and the CSV.
- Colored state dots in the table, a filter panel, a sticky table header and a primary Run button.

## 0.1.5

- Reorder columns by dragging them, or with Alt + ←/→ on a focused column.

## 0.1.4 and earlier

First release of the report page under Boards:

- One work item type, any Date/Time field (searchable, never hardcoded), one or more states, and a range: last 15 / 30 / 90 days, this month, last month or custom, with both ends inclusive.
- Columns of your choice, searchable by display name (large) or reference name (small).
- 100 rows per page. Long cells scroll inside a fixed-height row.
- CSV export for Excel: UTF-8 with BOM, `;` or `,` by language, and protection against formulas.
- Selections are saved per user.
- English and Turkish interface.
