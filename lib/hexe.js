'use babel';

import {CompositeDisposable, Disposable, Emitter} from 'atom';
import path from 'path';
import fs from 'fs';
import * as Help from './hexe_help';
import url from 'url';
import * as AutoComplete from "./hexe_autocomplete";
import settings from '../settings/settings'

var oldTime = process.hrtime();

class HexePackage {
  constructor(state) {
    this.disposables = new CompositeDisposable();

    this.disposables.add(atom.commands.add("atom-workspace", "hexe:help", this.help.bind(this)));
    this.disposables.add(atom.commands.add("atom-workspace", "hexe:help-selection", this.helpSelection.bind(this)));

    this.disposables.add(atom.workspace.addOpener(this.opener.bind(this)));

    this.scriptBindsPath = atom.config.get('hexe.JSONLocation');
    this.disposables.add(atom.config.onDidChange('hexe.JSONLocation', this.changePath.bind(this)));

    this.scriptBinds = null;

    this.watchFile.bind(this);

    this.watchFile();

    Help.setAdoc(this.scriptBinds);
    AutoComplete.setAdoc(this.scriptBinds);
  }

  watchFile() {
    fs.open(this.scriptBindsPath + "\\scriptbinds.json", 'r', (error) => {
      if (error) {
        if (error.code === 'ENOENT') {
          console.log(process.hrtime(oldTime)[0]);
          if (process.hrtime(oldTime)[0] > 5) {
            atom.notifications.addError(`scriptbinds.json file not located at ${this.scriptBindsPath}`);
            oldTime = process.hrtime();
          }
          return;
        }
        throw error;
      }

      if (this.watcher) {
        this.watcher.close();
      }

      this.scriptBinds = JSON.parse(fs.readFileSync(this.scriptBindsPath + "\\scriptbinds.json", 'utf8'));
      this.updateScriptBinds();

      this.watcher = fs.watch(this.scriptBindsPath + "\\scriptbinds.json", (eventType, filename) => {
        if (eventType === "change") {
          this.scriptBinds = JSON.parse(fs.readFileSync(this.scriptBindsPath + "\\scriptbinds.json", 'utf8'));
          this.updateScriptBinds();
        }
      });
    });
  }

  changePath() {
    this.scriptBindsPath = atom.config.get('hexe.JSONLocation');
    this.watchFile();
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

  updateScriptBinds() {
    Help.setAdoc(this.scriptBinds);
    AutoComplete.setAdoc(this.scriptBinds);
    atom.notifications.addSuccess("Hexe auto complete and documentation updated");
  }

  dispose() {
    this.disposables.dispose();
  }

  serialize() {
    return {
      deserializer: 'HexePackage',
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

export function provide() {
    return AutoComplete.adocProvider;
}

export var config = settings;
