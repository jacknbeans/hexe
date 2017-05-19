'use babel';

import {CompositeDisposable, Disposable, Emitter} from 'atom';
import path from 'path';
import fs from 'fs';
import cs from 'child_process';
import * as Help from './hexe_help';
import url from 'url';
import * as AutoComplete from "./hexe_autocomplete";
import settings from '../settings/settings';
import * as package_deps from 'atom-package-deps';

var oldTime = process.hrtime();
var loaded = true;
var isErrorMessage = false;
var fileFound = false;

class HexePackage {
  constructor(state) {
    package_deps.install('hexe', false).catch((err) => {
      if (err) {
        console.log(err);
      }
    });

    this.disposables = new CompositeDisposable();

    this.disposables.add(atom.commands.add("atom-workspace", "hexe:help", this.help.bind(this)));
    this.disposables.add(atom.commands.add("atom-workspace", "hexe:help-selection", this.helpSelection.bind(this)));
    this.disposables.add(atom.commands.add("atom-workspace", "hexe:run-game", this.runGame.bind(this)));

    this.disposables.add(atom.workspace.addOpener(this.opener.bind(this)));

    this.scriptBindsPath = atom.config.get('hexe.JSONLocation');
    this.disposables.add(atom.config.onDidChange('hexe.JSONLocation', this.changePath.bind(this)));

    this.scriptBinds = null;

    this.watchFile.bind(this);

    this.watchFile();

    Help.setAdoc(this.scriptBinds);
    AutoComplete.setAdoc(this.scriptBinds);
  }

  runGame() {
    cs.spawn("cmd", ["/k I:\\Y2016D-Y2-Team04\\Game\\Project\\game.exe"], {
        "cwd": "I:\\Y2016D-Y2-Team04\\Game\\Project",
        "detached": true
      }
    );
  }

  watchFile() {
    fs.open(this.scriptBindsPath + "\\scriptbinds.json", 'r', (error) => {
      if (error) {
        if (error.code === 'ENOENT') {
          var notifications = atom.notifications.getNotifications();
          for (notification of notifications) {
            if (notification.message == `Couldn't locate scriptbinds.json file!`) {
              notification.dismiss();
            }
          }
          atom.notifications.addError(`Couldn't locate scriptbinds.json file!`, {
            dismissable: true,
            description: `${this.scriptBindsPath} doesn't contain the scriptbinds.json file.`
          });
          isErrorMessage = true;
          return;
        }
        throw error;
      }

      if (isErrorMessage) {
        var notifications = atom.notifications.getNotifications();
        for (notification of notifications) {
          if (notification.message == `Couldn't locate scriptbinds.json file!`) {
            notification.dismiss();
          }
        }

        atom.notifications.addSuccess(`Located scriptbinds.json file! 🙌`);
      }

      fileFound = true;

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
    if (loaded || fileFound) {
      loaded = false;
      fileFound = false;
      return;
    }
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
  loaded = true;
  packageInstance = new HexePackage(state);
}

export function deactivate() {
  packageInstance.dispose();
}

export function provide() {
    return AutoComplete.adocProvider;
}

export var config = settings;
