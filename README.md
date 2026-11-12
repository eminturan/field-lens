# Field Lens

An Azure DevOps Server 2022 extension for monthly reports built on **any date field**. It lists the work items of one type whose chosen Date/Time field falls in a date range, summarises them, exports them as CSV and puts them on a dashboard.

[Türkçe](README.tr.md)

## Report page

Open a project → **Boards** → **Field Lens**.

### Filters

| Filter | Details |
| --- | --- |
| **Work item type** | One type. The team looks at one card type. |
| **Date field** | Any Date/Time field, custom fields included (for example `Custom.TargetDate`). Searchable by display name or reference name. Nothing is hardcoded. |
| **Range** | Last 15 / 30 / 90 days, this month, last month or a custom from–to. Both ends are inclusive. |
| **States** | One or more. An item counts when its **current** state is one of them. |
| **Projects** | **This project** (default), **All projects** you can see, or **Chosen projects** from a searchable list. Across projects, types and states are merged from the projects in scope (a state's color comes from the first project that has it), a **Team Project** column is added after ID, and the ID opens the item in its own project. Results respect your permissions. |
| **Extra conditions** | Any number of field conditions, all joined with AND. Operators depend on the field type: text `=`, `≠`, contains, doesn't contain; numbers and dates `=`, `≠`, `<`, `>`, `≤`, `≥`; long text contains / doesn't contain; paths `=`, `≠`, under, not under; yes/no fields `=`, `≠`. An empty value with `=` finds empty fields. Values are checked by type before they reach the query (numbers, `YYYY-MM-DD` dates, yes/no) and text is escaped. |
| **Assigned to** | Anyone (default), **Assigned to me** (whoever runs the report, `@Me`) or **Unassigned**. A shared query with "Assigned to me" shows each person their own items. |
| **Columns** | Any fields. Search by display name (large) or reference name (small). Drag a column chip to reorder it, or focus it with Tab and press Alt + ←/→. |

The chosen date field is added to the columns automatically. Selections are saved per user (Extension Data Service, user scope) and restored next time; types or fields that no longer exist are dropped. **Reset settings** (at the right of the Run row, click twice to confirm) clears everything at once: type, date field, range, states, columns, rule and row density go back to their defaults and the remembered selections are deleted; saved queries are kept.

### Saved queries

The **Saved query** bar above the filter panel:

- **Save as** saves the form's settings (type, date field, range, states, columns, rule) under a name. The name can't be empty, is at most 80 characters, and must be unique (ignoring case).
- Picking a query from the list loads its settings into the form; click **Run** for the report. Relative ranges (for example "Last month") are worked out on the day you open them; a custom range is fixed.
- When the form differs from the selected query, **changed** appears next to it and **Save** updates the query. **Rename** and **Delete** (with a confirmation) are there too.
- **Share with the project** (only when saving): unticked, the query is stored in user scope and only you see it. Ticked, it goes to a shared collection per project and everyone in the project sees it. The list groups "My queries" and "Project queries", and someone else's query shows its creator's name.
- Only the creator can update, rename or delete a shared query; others use **Save as** for their own copy. This is a **UI restriction**: Extension Data Service doesn't check ownership. Every query read from the shared list is validated (unexpected fields are dropped, rules and fields go through the usual checks).
- If two people save the same query at the same time, the second gets a warning and the list reloads (document version, `__etag`).
- **Copy link** puts a link to the selected query on the clipboard (if the browser blocks that, the link is shown to copy by hand). Opening it loads the query and runs the report. A personal query's link only works for its owner; a link to a deleted or unshared query says so.
- **Reset settings** doesn't touch saved queries.

### Column derived by a rule

Under **Column derived by a rule**, pick a source field, write a rule (a JavaScript regular expression) and a column name.

- The new column holds the first part of the source field's **displayed** value that matches the rule. For identity fields this is the display name.
- Values that don't match show `(no match)`, and empty values stay empty.
- Example: `\b(ABC|XY)\b.*` keeps everything from the word ABC or XY to the end, so "Deniz Arslan ABC Ödeme Hizmetleri" becomes "ABC Ödeme Hizmetleri".
- After a run, a preview shows the rule applied to up to six real values. An invalid rule shows its error, and the column is left out until the rule is fixed. Nested repeats such as `(a+)+` are refused because they can freeze the browser, and a rule only looks at the first 500 characters of a value.
- The column is computed in the browser (the source field is fetched instead), can be searched, filtered and sorted, goes into the CSV, and is saved with your selections.

### Results

- After **Run**, the filters fold into a one-line report header; **Edit** opens them again. Grey placeholders show while the query runs.
- **Total** is compared with the **previous period**:
  - If the range is a whole calendar month, the previous period is the month before.
  - Otherwise it is the same number of days right before the range.
  - Hovering the card shows the exact dates.
  - The comparison is hidden while a search or column filter is on.
- **State cards** use the board's state colors. Clicking one shows only that state in the table and the CSV.
- **Table**:
  - search across all columns, a filter box under every header, and sorting by clicking a header (ascending → descending → off)
  - 100 rows per page and a sticky header
  - comfortable or compact density
  - long cells scroll inside the cell
  - the ID opens the work item
- Text filters also update the state cards.

### Grouping and copying

- **Group by** a column: one row per value with its count and a bar split by state, biggest first, based on the rows currently shown. Clicking a value filters the table to it. Grouping is not saved.
- **Copy table** copies every shown row (not only the current page) with its columns. It pastes as a table into Teams, email or Excel, and as tab-separated text elsewhere. Cells starting with `=`, `+`, `-` or `@` get a leading `'`, as in the CSV. If the browser blocks the clipboard, a message suggests the CSV.

### CSV export

**Export CSV** downloads every row of the current view (state card, search and column filters applied), not just the page on screen. When a filter is on, the button shows the row count.

- UTF-8 with BOM, so Excel keeps Turkish characters.
- The separator is `;` in the Turkish interface and `,` in the English one.
- Cells starting with `=`, `+`, `-` or `@` get a leading `'` so Excel does not run them as formulas.
- The file is named `field-lens_<type>[_<state>]_<from>_<to>.csv`.

## Dashboard widget

On a dashboard: **Edit → Add a widget → Field Lens**, then the edit icon for settings. Every viewer sees the same settings.

| View | Shows | Range setting |
| --- | --- | --- |
| **Summary** | Total and change against the previous period. Without a breakdown field: a donut split by state, with counts and percentages. With an optional **breakdown field**: one horizontal bar per value, biggest first, each split by state (empty values as "(empty)", long lists scroll). The breakdown can go through a rule first (same syntax as the derived column), with a live preview in the settings | Relative preset or custom |
| **Monthly trend** | One stacked bar per calendar month | Last 3 / 6 / 12 months or custom |
| **Weekly** | One stacked bar per Monday–Sunday week, labelled `13–19.10` | Relative preset or custom |
| **By date** | One bar for each day that has items, labelled with its date | Relative preset or custom |
| **Upcoming** | Items whose date falls from today to the next 7 / 14 / 30 / 60 days, earliest first; up to 100 are listed, the ID opens the item | Always from today |

- **Source**: the widget's own settings, or a saved query shared with the project. With a query, the projects, extra conditions, type, date field, states, assigned-to filter and (for Summary, Weekly and By date) range come from it and follow its changes; Monthly trend keeps its month count and Upcoming its day count. If the query is deleted, the widget says so.
- With its own settings, the other settings are work item type, date field and states. No state is preselected: you pick them.
- Relative ranges move with the calendar, so a "Last month" dashboard is always current. A custom range stays fixed.
- The widget can be 2–6 columns wide and 1–4 rows tall. Charts scale to the widget. When bars get narrow, counts move into the hover tooltip and date labels are written at 45°. Only when bars are very narrow (a long range by date) are labels thinned out.
- **Open report** opens the Field Lens page. For a widget linked to a saved query it opens that query and runs it; otherwise the widget's filters are not carried over.

## Limits and calculation details

- One query returns at most 20,000 items. When that is reached, a warning says the list may be incomplete.
- The previous-period count is a separate count-only query. If it fails, the comparison is simply not shown.
- Dates are compared by day. Charts group values by the browser's local day.
- Read-only. The only scope is `vso.work`.

## Development

```bash
npm install
npm run dev        # sample data, ?lang=tr|en
                   # report page:    http://localhost:3003/hub/hub.html
                   # widget:         http://localhost:3003/report-widget/report-widget.html?view=summary|trend|weekly|daily|upcoming
                   # widget settings: http://localhost:3003/report-config/report-config.html
npm test
npm run package    # out/turanemin.field-lens-<version>.vsix
```

Bump `version` in `package.json`, `package-lock.json` and `vss-extension.json` before every package. For each release, add an entry to `CHANGELOG.md` and `CHANGELOG.tr.md`, and to the "Release notes" sections of `overview.md` and `overview.tr.md`. To upload: Collection Settings → Extensions → Browse local extensions → Manage extensions → Upload extension.

Layout:

- `src/hub/`: the report page. The modules below are shared with the widget.
  - `logic.ts`: pure functions with unit tests
  - `api.ts`: REST, api-version 7.0
  - `chart.tsx`
  - `fieldPicker.tsx`
  - `i18n.ts`
- `src/widget/`: the dashboard widget and its settings panel.

## To verify on a real server

- Saved queries: the shared collection reads as an empty list the first time, another user sees a shared query but can't edit it, and a concurrent save shows the warning.
- Saving and restoring selections through the Extension Data Service.
- The inclusive end day on a month-end range with the real date field.
- Time zone: WIQL compares dates on the server, while charts group by the browser's day. Items near midnight may land on a neighbouring day.
- The widget: catalog entry, settings panel, live preview, and settings persisting after Save.
- The **Open report** link (`/<project>/_apps/hub/turanemin.field-lens.hub`) and query links (`…hub?query=<id>`): the page must receive the `query` parameter.
- **Assigned to me** (`@Me`) resolves to the person running the report.
- Across projects: the project list (`_apis/projects`), merged types and states, and item links to other projects.

## License

[MIT](LICENSE). Release notes: [CHANGELOG.md](CHANGELOG.md).
