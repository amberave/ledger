// Power Query: Data > Get Data > From Other Sources > Blank Query > Advanced Editor
// 1) Change the folder path below.  2) Close & Load To... > Table, named "PhoneInbox".
// Needs a "Phone ID" column at the far right of your Excel table named "transactions".
// Result: only rows that are New (Phone ID not in Excel yet) or Changed (edited on the phone since you pasted them).
let
  Source   = Folder.Files("C:\Users\YOU\Sync\Finance"),
  Csvs     = Table.SelectRows(Source, each Text.StartsWith([Name], "phone_txns_") and [Extension] = ".csv"),
  Parsed   = Table.AddColumn(Csvs, "T", each let d = [Date modified] in
               Table.AddColumn(Table.PromoteHeaders(Csv.Document([Content], [Delimiter = ",", Encoding = 65001]), [PromoteAllScalars = true]), "File Date", each d)),
  Combined = Table.Combine(Parsed[T]),
  Types    = {{"Transaction Date", type date}, {"Net Impact", Currency.Type}, {"Share Price", Currency.Type}, {"Transaction Amount", Currency.Type}},
  Typed    = Table.TransformColumnTypes(Combined, Types, "en-US"),
  // newest file wins, so edited rows replace their older versions
  Latest   = Table.Distinct(Table.Buffer(Table.Sort(Typed, {{"File Date", Order.Descending}})), {"Phone ID"}),
  Existing = Table.TransformColumnTypes(Excel.CurrentWorkbook(){[Name = "transactions"]}[Content], Types),
  Joined   = Table.NestedJoin(Latest, {"Phone ID"}, Existing, {"Phone ID"}, "Old", JoinKind.LeftOuter),
  Cols     = {"Transaction Date", "Transaction Type", "Transaction Name", "Company/Shop", "Linked Account", "Net Impact", "Parent Category", "Share Price", "Spending Category", "Transaction Amount", "Affected Budget"},
  Norm     = (v) => if v = null then "" else Text.From(v),
  Differs  = (r) => let o = r[Old]{0} in List.AnyTrue(List.Transform(Cols, (c) => Norm(Record.Field(r, c)) <> Norm(Record.Field(o, c)))),
  Status   = Table.AddColumn(Joined, "Status", each if Table.RowCount([Old]) = 0 then "New" else if Differs(_) then "Changed" else "Same", type text),
  Keep     = Table.SelectRows(Status, each [Status] <> "Same"),
  Result   = Table.RemoveColumns(Keep, {"Old", "File Date"})
in
  Result
