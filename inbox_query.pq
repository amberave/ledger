// Power Query: Data > Get Data > From Other Sources > Blank Query > Advanced Editor
// Change the folder path, then Close & Load To... > Table. Name the resulting table "PhoneInbox".
let
  Source   = Folder.Files("C:\Users\YOU\Sync\Finance"),
  Csvs     = Table.SelectRows(Source, each Text.StartsWith([Name], "phone_txns_") and [Extension] = ".csv"),
  Parsed   = Table.AddColumn(Csvs, "T", each Table.PromoteHeaders(Csv.Document([Content], [Delimiter = ",", Encoding = 65001]), [PromoteAllScalars = true])),
  Combined = Table.Combine(Parsed[T]),
  Typed    = Table.TransformColumnTypes(Combined, {{"Transaction Date", type date}, {"Net Impact", Currency.Type}, {"Share Price", Currency.Type}, {"Transaction Amount", Currency.Type}}, "en-US"),
  Deduped  = Table.Distinct(Typed, {"Phone ID"}),
  Existing = Excel.CurrentWorkbook(){[Name = "transactions"]}[Content][Phone ID],
  NotYet   = Table.SelectRows(Deduped, each not List.Contains(Existing, [Phone ID]))
in
  NotYet
