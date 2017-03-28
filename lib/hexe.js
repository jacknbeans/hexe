'use babel';

import {CompositeDisposable, Disposable, Emitter} from 'atom';
import path from 'path';
import fs from 'fs';
import * as Help from './hexe_help';
import HexeJSON from './json';
import url from 'url';
import * as AutoComplete from "./hexe_autocomplete";

class HexePackage {
  constructor(state) {
    this.disposables = new CompositeDisposable();

    this.disposables.add(atom.commands.add("atom-workspace", "hexe:help", this.help.bind(this)));
    this.disposables.add(atom.commands.add("atom-workspace", "hexe:help-selection", this.helpSelection.bind(this)));

    this.disposables.add(atom.workspace.addOpener(this.opener.bind(this)));

    this.emitter = new Emitter();
    this.disposables.add(this.emitter.on('scriptbinds-updated', this.updateScriptBinds));
    state.scriptBinds.emitter = this.emitter;

    this.scriptBinds = new HexeJSON(state.scriptBinds);

    Help.setAdoc(this.scriptBinds.getScriptBinds());
    AutoComplete.setAdoc(this.scriptBinds.getScriptBinds());
  }

  expandedSelection(f) {
    var te = atom.workspace.getActiveTextEditor();
    var sel = te.getSelectedBufferRange();
    var row = sel.start.row;
    var start = sel.start.column;
    var end = sel.end.row == row ? sel.end.column : sel.start.column;
    var line = te.lineTextForBufferRow(row);

    while (start > 0) {
      var s = line.substr(start-1, end-start+1)
      if (!f(s))
        break;
      start--;
    }
    while (end < line.length) {
      var s = line.substr(start, end-start+1);
      if (!f(s))
        break;
      end++;
    }
    return line.substr(start, end-start);
  }

  help(event) {
    Help.showHelpList();
  }

  helpSelection(event) {
    var s = this.expandedSelection(s => s.match(/^[a-zA-Z._0-9]*$/));
    if (s === "")
      return;
    else if (Help.has(s))
      atom.workspace.open(`hexe-help://help/${s}`, {split: "right"});
    else
      atom.notifications.addError(`\`${s}\` not found in Lua API.`);
  }

  opener(uri) {
    var o = url.parse(uri);
    if (o.protocol === "hexe-help:") {
      return Help.createHelpView(o.pathname.substr(1));
    }
  }

  updateScriptBinds(updatedScriptBinds) {
    Help.setAdoc(updatedScriptBinds);
    AutoComplete.setAdoc(updatedScriptBinds);
    atom.notifications.addSuccess("Hexe auto complete and documentation updated");
  }

  dispose() {
    this.disposables.dispose();
  }

  serialize() {
    return {
      scriptBinds: this.scriptBinds.serialize()
    };
  }
}

let packageInstance = null;

export function activate(state) {
  packageInstance = new HexePackage(state);
}

export function deactivate() {
  packageInstance.dispose();
}

export function serialize() {
  return packageInstance.serialize();
}

export function provide() {
    return AutoComplete.adocProvider;
}
