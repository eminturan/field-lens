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
| **Columns** | Any fields. Search by display name (large) or reference name (small). Drag a column chip to reorder it, or focus it with Tab and press Alt + ←/→. |

The chosen date field is added to the columns automatically. Selections are saved per user (Extension Data Service, user scope) and restored next time; types or fields that no longer exist are dropped.

### Column derived by a rule

Under **Column derived by a rule**, pick a source field, write a rule (a JavaScript regular expression) and a column name.

- The new column holds the first part of the source field's **displayed** value that matches the rule. For identity fields this is the display name.
- Values that don't match show `(no match)`, and empty values stay empty.
- Example: `\b(ABC|XY)\b.*` keeps everything from the word ABC or XY to the end, so "Deniz Arslan ABC Ödeme Hizmetleri" becomes "ABC Ödeme Hizmetleri".
- After a run, a preview shows the rule applied to up to six real values. An invalid rule shows its error, and the column is left out until the rule is fixed.
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

- The other settings are work item type, date field and states. No state is preselected: you pick them.
- Relative ranges move with the calendar, so a "Last month" dashboard is always current. A custom range stays fixed.
- The widget can be 2–6 columns wide and 1–4 rows tall. Charts scale to the widget. When bars get narrow, counts move into the hover tooltip and date labels are written at 45°. Only when bars are very narrow (a long range by date) are labels thinned out.
- **Open report** opens the Field Lens page. It does not carry the widget's filters over.

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

- Saving and restoring selections through the Extension Data Service.
- The inclusive end day on a month-end range with the real date field.
- Time zone: WIQL compares dates on the server, while charts group by the browser's day. Items near midnight may land on a neighbouring day.
- The widget: catalog entry, settings panel, live preview, and settings persisting after Save.
- The **Open report** link (`/<project>/_apps/hub/turanemin.field-lens.hub`).

## License

[MIT](LICENSE). Release notes: [CHANGELOG.md](CHANGELOG.md).
