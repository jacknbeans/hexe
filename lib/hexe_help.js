'use babel';

import {SelectListView, ScrollView} from 'atom-space-pen-views';
import marked from 'marked';

marked.setOptions({
    renderer: new marked.Renderer(),
    gfm: true,
    tables: true,
    breaks: false,
    sanitize: true,
    smartLists: true,
    smartypants: false
})

let adoc = {}

export function setAdoc(x) {
    adoc = x;
}

export function has(x) {
    const values = x.split(".");
    return adoc.scriptbinds[x] || adoc.scriptbinds[values[0]];
}

function prefixScriptBind(method) {
  return this + "." + method;
}

class HelpListView extends SelectListView {
    constructor() {
        super();
        var listItems = Object.keys(adoc.scriptbinds).sort();
        for (var scriptbind in adoc.scriptbinds) {
          listItems = listItems.concat(
            Object.keys(adoc.scriptbinds[scriptbind].methods)
              .map(prefixScriptBind, scriptbind)
              .sort());
        }
        this.setItems(listItems);
        this.panel = atom.workspace.addModalPanel({item: this});
        this.panel.show();
        this.focusFilterEditor();
    }

    viewForItem(item) {
        return `<li>${item}</li>`
    }

    confirmed(item) {
        this.panel.hide();
        atom.workspace.open(`hexe-help://help/${item}`, {split: 'right'});
    }

    cancelled() {
        this.panel.hide();
    }
}

function convertToMarkdown(key) {
    const values = key.split(".");
    const value = adoc.scriptbinds[key] || adoc.scriptbinds[values[0]];
    let markdown = [];

    if (value.methods.hasOwnProperty(values[1])) {
      markdown.push(`## Description`);
      markdown.push(`${value.methods[values[1]].description}`)

      var methodParams = {};

      for (param of value.methods[values[1]].params) {
        var names = Object.keys(param);
        methodParams[names[0]] = {};
        methodParams[names[0]].description = param.description;
        methodParams[names[0]].type = param.type;
      }

      var paramString = Object.keys(methodParams).join(", ");
      var methodString = `${values[1]}(${paramString}) :`;
      for (ret of value.methods[values[1]].ret) {
        methodString = methodString.concat(` ${ret.type},`);
      }
      methodString = methodString.replace(/[,]$/, "");
      markdown.push(`### ${methodString}`);
      var params = [];
      for (let param of value.methods[values[1]].params) {
        var names = Object.keys(param);
        params.push(`* \`${param[names[0]].type} ` +
                    `${names[0]}\` : ` +
                    `${param[names[0]].description}`);
      }
      markdown.push(params.join("\n"));

      markdown.push(`### Returns`);

      var returns = [];
      for (ret of value.methods[values[1]].ret) {
        returns.push(`* \`${ret.type}\`: ${ret.desc}`);
      }
      markdown.push(returns.join("\n"));

      return marked(markdown.join("\n\n"));
    }

    markdown.push(`## Description`);
    markdown.push(`${value.description}`)

    for (var method in value.methods) {
      var methodParams = {};

      for (let param of value.methods[method].params) {
        var names = Object.keys(param);
        methodParams[names[0]] = {};
        methodParams[names[0]].description = param.description;
        methodParams[names[0]].type = param.type;
      }

      var paramString = Object.keys(methodParams).join(", ");
      var methodString = `${method}(${paramString}) :`;
      for (ret of value.methods[method].ret) {
        methodString = methodString.concat(` ${ret.type},`);
      }
      methodString = methodString.replace(/[,]$/, "");
      markdown.push(`### ${methodString}`);
      var params = [];
      for (let param of value.methods[method].params) {
        var names = Object.keys(param);
        params.push(`* \`${param[names[0]].type} ` +
                      `${names[0]}\` : ` +
                      `${param[names[0]].description}`);
      }
      markdown.push(params.join("\n"));

      markdown.push(`### Returns`);

      var returns = [];
      for (ret of value.methods[method].ret) {
        if (ret.type == "void") {
          returns.push(`\`${ret.type}\`: ` +
                        `Function doesn't return anything`);
        }
        else {
          returns.push(`* \`${ret.type}\`: ${ret.desc}`);
        }
      }
      markdown.push(returns.join("\n"));
    }

    return marked(markdown.join("\n\n"));
}

class HelpView extends ScrollView {
    static content() {
        return this.div({class: 'markdown-preview native-key-bindings'})
    }
    constructor(s) {
        super()
        this.topic = s;
        this.html(convertToMarkdown(s))
    }
    getTitle() {
        return `Hexe Help: ${this.topic}`;
    }
}

export function showHelpList() {
    let hlv = new HelpListView();
}

export function createHelpView(s) {
    return new HelpView(s);
}
