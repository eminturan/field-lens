# Changelog

[Türkçe](CHANGELOG.tr.md)

## 0.2.23

- Report page: the per-column filter row is hidden until you press **Column filters**. The button shows how many column filters are active; they keep applying when the row is closed.
- Report page: the row under the pointer is highlighted in light blue, and alternate rows are a little more distinct.

## 0.2.22

- Report page: **Run** is always clickable. Pressing it with something missing outlines that field in red, shows the message right under it and moves focus there; the mark clears once the field is filled. Before, Run was greyed out and the message sat next to the buttons.

## 0.2.21

- Report page: field labels are darker and semi-bold, so they stand apart from hints. **Reset settings** is quieter (muted text with a ↻ icon) but keeps its frame and the click-twice confirmation.

## 0.2.20

- Report page: the settings form is split into four sections: **Scope** (projects, type, assigned to), **Time** (date field and range), **Filter** (states, extra conditions) and **View** (columns, rule). On a wide screen Scope and Time sit side by side.

## 0.2.19

- Widget: its own settings now include **Projects** (this, all or chosen), **Assigned to** and **Extra conditions**, as on the report page. Before, a widget could only get them from a saved query. Saving checks that a project is chosen and every condition is complete.

## 0.2.18

- Report page: **Extra conditions** on any field, joined with AND, with operators that fit the field type (contains, under, ≤ and so on). Values are validated by type and escaped before they reach the query. Conditions are part of saved queries, links and linked widgets.
- Report page: **Group by** a column shows a count per value with a bar split by state; clicking a value filters the table.
- Report page: **Copy table** copies every shown row as a table for Teams, email or Excel (and as tab-separated text), with the CSV's formula protection.

## 0.2.17

- Fix: a widget whose **Source** is a saved query couldn't be saved ("You have errors in your configuration settings"). Saving checked the widget's own type, date field and states, which are empty when they come from the query. Now only what the widget still sets itself is checked: the Monthly trend's custom month range and the breakdown rule.

## 0.2.16

- Fix: searches ignored case only partly. Turkish lower-casing turns "I" into "ı", so "GIT.BOA" did not match "git.boa". Project search, field search, result filters and the duplicate-name check now treat I, ı, İ and i alike.

## 0.2.15

- Report page: **Projects** filter for querying across projects: this project (default), all projects you can see, or chosen projects from a searchable list. Types and states are merged from the projects in scope, a Team Project column is added, and IDs open items in their own project. The scope is part of saved queries and query links.
- Widget: a widget linked to a saved query also takes the query's projects.

## 0.2.14

- Report page: an **Assigned to** filter (anyone, assigned to me via `@Me`, unassigned). It is part of saved queries, so one shared query shows each person their own items.
- Saved queries: **Copy link**. The link opens the report page with the query loaded and run. A link to a deleted or unshared query shows a message.
- Widget: a **Source** setting. Pick a saved query shared with the project and the widget takes its type, date field, states, assigned-to filter and (for Summary, Weekly and By date) range, following later changes to the query. **Open report** then opens that query.

## 0.2.13

- Report page: **saved queries**. Save the form's settings under a name, switch between saved queries, update, rename or delete them. A query is personal unless **Share with the project** is ticked; shared queries are visible to everyone in the project, and only their creator can edit or delete them (a UI restriction). Shared queries are validated when read, and a concurrent save shows a warning.

## 0.2.12

- Report page: a **Reset settings** button at the right of the Run row. The first click asks for confirmation, the second clears type, date field, range, states, columns, the rule, the results and row density, and deletes the saved selections.

## 0.2.11

- Security: rules (the derived column and the widget breakdown) refuse nested repeats such as `(a+)+`, which could freeze the browser of everyone who opens the dashboard. A rule only looks at the first 500 characters of a value. A widget saved with such a rule asks to be configured again.
- Build: the packaging tool's `glob` dependency is pinned to a version without known vulnerabilities (`npm audit`: 0).

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
