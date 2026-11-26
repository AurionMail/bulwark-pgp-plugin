// The plugin's dialog (api.ui.openDialog with slot "plugin-dialog"). The
// `view` prop picks what it shows; every view but "account" needs a
// connection first. Buttons go in the host's footer (DialogButtons).

import { createElement as h } from 'react';
import { PickerDialog } from './PickerDialog.tsx';


const VIEWS = {
  picker: PickerDialog,
};

export function PluginDialog(props :any) {
  //const View = VIEWS[props.view];
  //if (!View) return null;
  return h(PickerDialog, { ...props, });
}