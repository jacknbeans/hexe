'use babel';

import fs from 'fs';
import path from 'path';

let adoc = {}

export function setAdoc(x) {
  adoc = x;
}

function formatAutoComplete(key, v, replacementPrefix) {
  let o = {
    text: key,
    replacementPrefix: replacementPrefix,
    type: "value",
    description: v.description
  }

  if (v.hasOwnProperty('methods')) {
    o.snippet = `${key}`;
    o.type = "class";
  }
  else {
    var params = {};

    for (param of v.params) {
      var names = Object.keys(param);
      params[names[0]] = param;
    }

    params = Object.keys(params).map((x,i) => `\${${i+1}:${x}}`).join(", ");

    o.snippet = `${key}(${params})`;
    o.type = "function";
    o.leftLabel = v.ret.type;
  }

  return o;
}

function getPrefix(te, pos, f) {
  var row = pos.row;
  var start = pos.column;
  var end = pos.column;
  var line = te.lineTextForBufferRow(row);
  while (start > 0) {
    var s = line.substr(start-1, end-start+1)
    if (!f(s))
      break;
    start--;
  }
  return line.substr(start, end-start);
}

function depthTwoMatches(root, dir, base) {
  return [path.join(root, dir)]
    .filter(f => fs.existsSync(f) && fs.statSync(f).isDirectory())
    .map(f => fs.readdirSync(f))
    .reduce((a,b) => a.concat(b), [])
    .filter(x => x.startsWith(base))
    .map(x => path.join(dir,x))
    .map(x =>
      fs.statSync(path.join(root,x)).isDirectory()
        ? fs.readdirSync(path.join(root,x))
          .map(y => path.join(x,y))
        : [x]
      )
    .reduce((a,b) => a.concat(b), [])
    .map(x => fs.statSync(path.join(root,x)).isDirectory() ? x + "/" : x);
}

function autocompletePath(prefix) {
  let dir = path.dirname(prefix);
  let base = path.basename(prefix);
  const dirLen = dir == "." ? 0 : dir.length+1;
  const paths = atom.project.rootDirectories
    .map(rd => rd.path)
    .map(root => depthTwoMatches(root, dir, base))
    .reduce((a,b) => a.concat(b), [])
    .map(x => x.replace(/\\/g, '/'))
    .map(x => {return {
      text: x.substr(dirLen).match(/[^.]*[^/.]/)[0],
      displayText: x.substr(dirLen).match(/[^.]*/)[0],
      replacementPrefix: prefix.substr(dirLen),
      rightLabel: path.extname(x)
    }});
  return paths;
}

export var adocProvider = {
  selector: ".source.lua",

  inclusionPriority: 100,
  excludeLowerPriority: true,

  getSuggestions: ({editor, bufferPosition, scopeDescriptor, prefix, activatedManually}) => {
    const luaApiPrefix = getPrefix(editor, bufferPosition, s => s.match(/^[a-zA-Z._0-9]+$/))
    const pathPrefix = getPrefix(editor, bufferPosition, s => s.match(/^['"]?[a-zA-Z0-9_\-/]+$/))
    if (pathPrefix.length > luaApiPrefix.length && pathPrefix.match(/^['"]/)) {
      return autocompletePath(pathPrefix.substr(1));
    } else {
      const keys = luaApiPrefix.split('.');
      if (keys.length == 0) return [];
      if (keys.length == 2) {
        if (prefix == '.') {
          if (!adoc.scriptbinds[keys[0]]) return [];

          if (!adoc.scriptbinds.hasOwnProperty(keys[0])) return [];

          return Object.keys(adoc.scriptbinds[keys[0]].methods)
            .map(x => formatAutoComplete(x, adoc.scriptbinds[keys[0]].methods[x], null));
        }

        if (!adoc.scriptbinds.hasOwnProperty(keys[0])) return [];

        return Object.keys(adoc.scriptbinds[keys[0]].methods)
          .filter(x => x.startsWith(prefix))
          .map(x => formatAutoComplete(x, adoc.scriptbinds[keys[0]].methods[x], prefix));
      }

      if (adoc == null) {
        atom.notifications.addError(`No script binds documentation found`, {
          dismissable: true,
          description: `Go to Packages -> Settings View -> Manage Packages and search for hexe.
            Click on the Settings button and then change the path that is there to where the
            scriptbinds.json file is located on your computer.`
        });
        return [];
      }

      if (!adoc.hasOwnProperty("scriptbinds") || prefix == '' && !activatedManually) return [];

      return Object.keys(adoc.scriptbinds)
        .filter(x => x.startsWith(prefix))
        .map(x => formatAutoComplete(x, adoc.scriptbinds[x], prefix));
    }
  }
};
