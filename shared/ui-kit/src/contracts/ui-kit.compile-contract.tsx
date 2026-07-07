import {
  ActionBar,
  Badge,
  Button,
  DataTable,
  Dialog,
  Sheet,
  Text,
  TextField,
  resolveTextAlign
} from "../index";

type ExampleRow = {
  id: string;
  title: string;
};

const exampleRows: readonly ExampleRow[] = [{ id: "one", title: "Example" }];

export function UiKitCompileContract() {
  return (
    <>
      <Text role="titleMd" tone="default" align="start" direction="rtl">
        عنوان عربي
      </Text>
      <Text role="body" tone="secondary" align="start" direction="ltr">
        English body
      </Text>
      <Button
        label="Continue"
        tone="primary"
        size="md"
        accessibilityState={{ selected: false }}
        onPress={() => undefined}
      />
      <Badge label="Ready" tone="success" />
      <TextField label="Name" value="" onChangeText={() => undefined} />
      <ActionBar primary={<Button label="Save" />} secondary={<Button label="Cancel" tone="secondary" />} />
      <DataTable
        rows={exampleRows}
        columns={[{ key: "title", header: "Title", render: (row) => <Text>{row.title}</Text> }]}
        getRowKey={(row) => row.id}
      />
      <Dialog open={false} onOpenChange={() => undefined} title="Confirm" />
      <Sheet open={false} onOpenChange={() => undefined} title="Details" />

      {/* @ts-expect-error arbitrary text color roles bypass semantic roles */}
      <Text color="invalidTextColorRole">Invalid color override</Text>
      {/* @ts-expect-error business-domain props do not belong in generic controls */}
      <Button orderId="order-1" label="Invalid domain prop" />
    </>
  );
}

const rtlStart: "right" = resolveTextAlign("rtl", "start") as "right";
const ltrStart: "left" = resolveTextAlign("ltr", "start") as "left";
const centered: "center" = resolveTextAlign("rtl", "center") as "center";

void rtlStart;
void ltrStart;
void centered;
