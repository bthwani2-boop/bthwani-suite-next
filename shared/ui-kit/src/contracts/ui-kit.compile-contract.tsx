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

      {/* @ts-expect-error arbitrary text colors bypass semantic roles */}
      <Text color="#123456">Invalid color override</Text>
      {/* @ts-expect-error business-domain props do not belong in generic controls */}
      <Button orderId="order-1" label="Invalid domain prop" />
    </>
  );
}

const rtlStart: "right" = resolveTextAlign("start", "rtl");
const ltrStart: "left" = resolveTextAlign("start", "ltr");
const centered: "center" = resolveTextAlign("center", "rtl");

void rtlStart;
void ltrStart;
void centered;
