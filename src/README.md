# #12564 - User can see X01 type timeline analysis

## External sources

[Redmine issue](https://google.com/)
[Figma visuals](https://google.com/)

## Requirements

- User can only see their own statistics
- Statistics contain tournament game statistics too
- Users must be able to see their game statistics
- Game statistics should consist of the following datasets
  - Number of games (integer)
  - Number of throws (integer)
  - 3-dart average (decimal separator: "."; example: "12.3")
  - First 9 average (decimal separator: "."; example: "76.3")
  - Checkout rate (decimal separator: "."; format: "d%"; example: "76.3%")
- For each dataset an explanatory descripton should be displayed - **!!! Wording needed !!!**
- Each decimal number should be rounded to **one** decimal place
- Each aggregated total should be displayed
- Each number should use a thousands separator (1 space character)
- Fallback display value is zero 
	- If there is no available data for the bar it is zero

### Filtering
- User should be able to select the time period of a dataset
  - Labelled as "Time period"
  - Available time periods 
    - Last 6 months
    - Last year (meaning today - 365 days)
    - All time
- User should be able to select the granularity of a dataset
  - Labelled as "View"
  - Available granularities
    - Annualy
    - Monthly
    - Weekly
    - Daily
- User should be able to narrow down the time period on the *client side* with a slider
  - the slider's full range is the available time period *(A - D)*
  - the slider's steps are calculated based on the granularity and the time period *dinamically*
    - eg. if time period is 'Last year' and granularity is 'Monthly' the slider has 12 steps
    - eg. if time period is 'Last year' and granularity is 'daily' the slider has 365
  - The slider's selectors snap to the the steps
  - the slider's selected time period *(B - C)* is what needs to be rendered as a graph
  - the selection of the slider needs to be at least 1 step long
  - by default the selected time period is the available time period *(A=B, C=D)*
  - if the time period is changed the slider's selection has to be reset to default
  - if the view is changed 
    - the selected time period start date should be rounded down to closed interval
    - the selected time period end date should be rounded up to open interval
    - there is one know edge case
      - if the user switches between monthly and weekly views the selected time period will grow with each selection
      - if the selection reaches the available time period boundaries, it should not grow any further

```
|------X======O------|
A      B      C      D 

|------X=============O
A      B             C,D 

X=============O------|
A,B           C      D 

X====================O
A,B                  C,D 
```

> *A - available time period start date*
> *B - selected time period start date*
> *C - selected time period end date*
> *D - available time period end date*
> *X - closed interval*
> *O - open interval*
{.is-info}

### Client side caching 

- Use client side caching for every (dataset X time period X granularity) change
  - Example user flow: 
    - User selects (dataset: "Number of games" X time period: "Last year" X granularity: "**Monthly**")
    - Data is requested from the server
    - User selects (dataset: "Number of games" X time period: "Last year" X granularity: "**Weekly**")
    - Data is requested from the server
    - User selects (dataset: "Number of games" X time period: "Last year" X granularity: "**Monthly**") *again*
    - Data is *not requested* from the server
- Do *not* use client side caching for showing datasets that could be calculated from previously fetched data on the client side 
  - Example: 
    - User selects (dataset: "Number of games" X time period: "**Last year**" X granularity: "Monthly")
    - Data is requested from the server
    - User selects (dataset: "Number of games" X time period: "**Last 6 months**" X granularity: "Monthly")
    - Data is requested from the server, meaning we *do not* use the previously fetched data
      - This approach could be improved on future iterations

### Data export 

- Handled by the client side
- The current view should be exportable to a CSV file
  - the title format of the file is `[game type]_[dataset name]_[data granularity]_from_[period start date]_to_[period end date].csv`
  	- *"x01_games_monthly_from_01-01-2022_to_31-12-2022.csv"*
  	- *"x01_first_9_average_daily_from_01-04-2022_to_06-09-2023.csv"*
  - the first column should contain the bar names ("December, 2023", "Week 42", "05.12.2023")
  - the second column contains the corresponding piece of data as **number**
  - separating character should be ";"
- Header row is
  - "Date"
  - "Value"

### Visual requirements
- Every component of the timeline analysis needs to handle the existing themes (currently light/dark)
- The data is presented on a bar chart
- Time is represented on the x-axis
- Volume is represented on the y-axis
- There is a scale that divides the available vertical space into four equal height bars with 5 horizontal lines
- When user hovers over each category (time period X granularity) the label and the value of the category (bar) should be visible
- The labels of the categories should be displayed below 
  - All of them if possible
  - Some of them if there is not enough horizontal space
- Prepare for cases where a bar's value is zero
  - user can hover over a transparent black bar that is the full height of the scale
    - only visible when hovered over
    - triggers label to be shown in a tooltip
    - it's seemingly rendered behind the actual data bar
- The dataset tiles should not wrap horizontally
  - If there is not enough horizontal space for them, they should simply be scrollable horizontally
  
## Proposal

### Querying for the data - POC

- Two parallel queries will request on the backend
  - for the data that is within the requested time period
  - for the first document before the time period
	- we need the document that was right before the last one to calculate the delta of the data piece
  - the aggregation handled in one single query is too slow

### General approach

- Fetch for the data of the new component separately (from Redux)
  - There are 2 queries 
    - One requesting the totals
    - One requesting the selected period
  - This way caching would be trivial with a library like react-query 
  - Storing the data in redux is unnecesarry, since we only use the data in one place
  - We don't have to worry about all the other statistics that are already sent
  - Introduce 2 new enpoints on the server for this purpose
- Calculate data to be sent on the fly
  - No migration is needed

## Subtasks `[112h]`

### Fetch data `[24h]`
- Add AdvancedStatisticsController
  - The endpoint does not follow the path pattern used in UserController
  - The data is only ivolved with the `userstatistics` collection currently
  	- But can be extended in the future
- Add new endpoint `GET api/advanced-statistics/timeline-analysis/X01`
  - Query params:
    - dataset: "number-of-games" | "number-of-throws" | "three-dart-average" | "first-nine-average" | "checkout-rate"
    - from: DateString (timestamp)
      - lesser than to field
      - minimum 2017 - There is an example in the code
      - handled as greater than or equal to
    - to: DateString (timestamp)
      - greater than from field
      - maximum now() + 1 day
      - handled as lesser than
    - granularity: "annualy" | "monthly" | "weekly" | "daily" 
  - Aggregation
 	  - Two queries in parallel
      - one for the asked time period
      - one for the last document before the asked period
  - Tests
  - Use timestamps as recieved from the client
    - Users only understand their timezones
  - Group all statistic document by `granularity`
    - They are already ordered
- Add X01TimelineAnalysis component 
  - Fetch data with hardcoded query params using react query
  - Render stringified json
  - Show loading state
  - Show network error
- Add separate endpoint for aggregated totals
  - Fetch them separately
    - It's easier to cache the the related data
    - It's an optimalization
		- `GET api/advanced-statistics/timeline-analysis/X01/totals`

```typescript
type FetchX01TimelineAnalysisParams = {
	readonly dataset: "number-of-games" | "number-of-throws" | "three-dart-average" | "first-nine-average" | "checkout-rate"
  readonly from: string
  readonly to: string
  readonly granularity: "annualy" | "monthly" | "weekly" | "daily"
}

type FetchX01AggregatedStatisticsResponseDto = {
	readonly checkoutRate: number
	readonly firstNineAverage: number
	readonly numberOfGames: number
	readonly numberOfThrows: number
	readonly threeDartAverage: number
}

type FetchX01TimelineAnalysisResponseDto = {
	readonly timelineAnalysis: readonly FetchX01TimelineAnalysisDataPieceDto[]
}

type FetchX01TimelineAnalysisDataPieceDto = {
  readonly time: string
  readonly value: number
}
```

### Filter by dataset on the client `[6h]`
- Add Tile component
  - Has an active state
  - Needs to handle custom themes
- Add OverflowScroll component
  - Supports horizontal layout
  - Might be useful - [Radix Scroll Area](https://www.radix-ui.com/themes/docs/components/scroll-area)
- Add DatasetSelector component
  - Use Tile and OverflowScroll components
	- Change `dataset` query param to dynamic
- Display description of the dataset
  - Use dummy wording
  
### Export data `[8h]`
- add download button
- export date to csv
- spike: are there eny limits to client side data export (slower devices)
  - maybe solved by using a trycatch

### Filter by time period on the client `[12h]`
- Add Label component
  - Supports horizontal layout
  - Needs to handle custom themes
- Add Dropdown component
  - Mark all current implementations of dropdowns as deprecated
  - Use [Radix Dropdown](https://www.radix-ui.com/primitives/docs/components/dropdown-menu)
  - Use Label component
  - Needs to handle custom themes
- Add TimePeriod component
  - Use Dropdown component
	- Change `time-period` query param to dynamic

### Filter by granularity on the client `[4h]`
- Add Granularity component
  - Use Dropdown component
	- Change `from` and `to` query param to dynamic
    - The `to` field is always today
    - Both `from` and `to` fields are rounded down *on the client*
    
### Narrow selected time period `[16h]`

- Add Slider component
  - Find all previous slider components and mark them as deprecated
  - Use [Radix Slider](https://www.radix-ui.com/primitives/docs/components/slider#range)
  - Needs to handle custom themes
  - Supports steps
  - Supports range selection
- Add NarrowSelection component
  - Use Slider component
  - Minimum 1 step between selected range beginning and end
  - Calculates the steps according to `time-period` and `granularity`
  - Step values are rounded down
	- Filters data according to the selection
  
### Show data in bar chart `[36h]`
- Draw scales
  - There are 5 horizontal lines from the same distance to each other
  - The bottom one is always at zero
  - The top one is minimum the same height as the highest bar
    - highest bar (h)
      - h <= 20  => round up h to the nearest divisor of 4
      - h <= 80  => round up h to the nearest divisor of 40
      - h <= 100 => round up h to the nearest divisor of 100
      - h <= 10000 => round up h to the nearest divisor of 1000
    - Examples
      - h = 3, scales: 0, 1, 2, 3, 4
      - h = 14, scales: 0, 4, 8, 12, 16
      - h = 51, scales: 0, 20, 40, 60, 80
      - h = 112, scales: 0, 50, 100, 150, 200
      - h = 678, scales: 0, 175, 350, 525, 700
      - h = 1001, scales: 0, 275, 550, 825, 1100
- Add labels to scales
- Draw bars
  - Space between them change as horizontal space changes
    - More horizontal space -> more space between
    - Less horizontal space -> less space between
    - There should be one transparent full height bar over each bar so that the user can hover over the data easily
- Add labels to bars
  - Labels have to change dynamically
    - More horizontal space -> all labels are visible
    - Less horizontal space -> fewer labels are visible
- Add tooltip to bars 
  - Shows formatted label and formatted value
  - Render transparent full-height bars in front of the actual bars for the user to hover over
  - Render transparent black full-height bars behind the actual bars
    - Visible when the previous bar is hovered over

### Handle loading and error states `[4h]`
- Disable all controls while data is loading
- Add Spinner component
- Show spinner while loading
  - Hide graph drawing
- Show error message in case of an error 
  - Add Retry button
  
 ### Modify wordings `[2h]`
 
 - This is needed because not all wordings are final

## Actual calculations of the metrics

Copied from the Redmine issue as is

### Games
lastGameOfMonth:gamesCount.total - lastGameOfPreviousMonth:gamesCount.total
 
### Throws
lastGameOfMonth:throwsCount - lastGameOfPreviousMonth:throwsCount
 
### Average
lastGameOfMonth:average.sum - lastGameOfPreviousMonth:average.sum  / lastGameOfMonth:average.count - lastGameOfPreviousMonth:average.count  * 3
 
### First 9 AVG
lastGameOfMonth:first9Average.sum - lastGameOfPreviousMonth:first9Average.sum  / lastGameOfMonth:first9Average.count - (lastGameOfPreviousMonth):first9Average.count  * 3
 
### Checkout rate 
lastGameOfMonth:checkout.double.hits - (lastGameOfPreviousMonth):checkout.double.hits / lastGameOfMonth:checkout.double.throws - lastGameOfPreviousMonth:checkout.double.throws  * 100
