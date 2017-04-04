'use babel';

import fs from 'fs';
import convert from 'xml-js';

var m_InputDir = "I:\\Y2016C-Y2-PROGTeam04\\documentation\\doxygen\\output\\xml\\";
var m_OutputDir = "I:\\Y2016C-Y2-PROGTeam04\\documentation\\doxygen\\output\\json\\"
var m_ScriptBinds = null;
var m_FileNames = [];
var m_ParamValues = {
  "const char *": "string",
  "const char*": "string",
  "bool": "boolean",
  "int": "number",
  "unsigned int": "number",
  "float": "number",
  "ScriptHandle": "pointer",
  "glm::vec2": "table",
  "glm::vec3": "table",
  "ScriptTable": "table",
  "SmartScriptTable": "table",
  "hexe::gameplay::tile::TileCoord": "table",
  "gameplay::tile::TileCoord": "table",
  "tile::TileCoord": "table",
  "TileCoord": "table",
  "hexe::component::Entity": "number",
  "component::Entity": "number",
  "Entity": "number",
  "KeyCode": "number",
  "input::KeyCode": "number",
  "hexe::input::KeyCode": "number"
};
var m_Prefix = "hexe::service::scripts::scriptbinds::ScriptBind_";
var m_Prefix1 = "hexegame::scriptbinds::ScriptBind_";

function readXmlToJson(fileName, encoding) {
  return new Promise((resolve, reject) => {
    fs.readFile(fileName, encoding, (error, data) => {
      if (!error) {
        var jsonStr = convert.xml2json(data, {compact: true, spaces: 2});
        var json = JSON.parse(jsonStr);
        resolve(json);
      }
      else {
        reject(error);
      }
    });
  });
}

function processScriptBind(scriptBind) {
  var nonChar = /(\040)$|(\056)(\040)$/g;

  var scriptBindName = null;
  if (scriptBind.compoundname._text.includes(m_Prefix)) {
    scriptBindName = scriptBind.compoundname._text.replace(m_Prefix, '');
  }
  else if (scriptBind.compoundname._text.includes(m_Prefix1)) {
    scriptBindName = scriptBind.compoundname._text.replace(m_Prefix1, '');
  }

  var methods = null;
  if (Array.isArray(scriptBind.sectiondef)) {
    methods = scriptBind.sectiondef[1].memberdef;
  }
  else {
    methods = scriptBind.sectiondef.memberdef;
  }

  if (scriptBind.briefdescription.hasOwnProperty("para")) {
    m_ScriptBinds.scriptbinds[scriptBindName].description =
      scriptBind.briefdescription.para._text.replace(nonChar, '');
  }
  else {
    console.log("No description on script bind " + scriptBindName);
  }

  for (var i = 1; i < methods.length; i++) {
    var method = {description: "",
                  params: {}, ret: {type: "", description: ""}};
    var methodName = methods[i].name._text;

    if (methods[i].briefdescription.hasOwnProperty("para")) {
      method.description = methods[i].briefdescription.para._text
                                     .replace(nonChar, '');
    }
    else {
      console.log("No description on function " + methodName + " for " +
                  "script bind " + scriptBindName);
    }

    method.ret.type = "void";

    if (methods[i].detaileddescription.hasOwnProperty("para")) {
      var paramlist = methods[i].detaileddescription.para.parameterlist;

      if (Array.isArray(paramlist)) {
        for (var j in paramlist) {
          var paramitem = paramlist[j].parameteritem;
          if (paramlist[j]._attributes.kind == "param") {
            for (var param = 1; param < methods[i].param.length; param++) {
              var paramName = methods[i].param[param].declname._text;
              var paramType = m_ParamValues[methods[i].param[param].type
                                                     ._text];
              var paramDesc = "";
              if (Array.isArray(paramitem)) {
                paramDesc = paramitem[param-1].parameterdescription.para
                                              ._text.replace(nonChar, '');
              }
              else {
                paramDesc = paramitem.parameterdescription.para._text
                                     .replace(nonChar, '');
              }
              method.params[paramName] = {};
              method.params[paramName].type = paramType;
              method.params[paramName].description = paramDesc;
            }
          }
          else if (paramlist[j]._attributes.kind == "retval") {
            method.ret.type = m_ParamValues[paramitem.parameternamelist
                                                    .parametername._text];
            method.ret.description = paramitem.parameterdescription.para
                                              ._text.replace(nonChar, '');
          }
        }
      }
      else {
        var paramitem = paramlist.parameteritem;
        for (var param = 1; param < methods[i].param.length; param++) {
          var paramName = methods[i].param[param].declname._text;
          var paramType = m_ParamValues[methods[i].param[param].type._text];
          var paramDesc = "";
          if (Array.isArray(paramitem)) {
            paramDesc = paramitem[param-1].parameterdescription.para
                                          ._text.replace(nonChar, '');
          }
          else {
            paramDesc = paramitem.parameterdescription.para._text
                                 .replace(nonChar, '');
          }
          method.params[paramName] = {};
          method.params[paramName].type = paramType;
          method.params[paramName].description = paramDesc;
        }
      }
    }

    m_ScriptBinds.scriptbinds[scriptBindName].methods[methodName] = method;
  }
}

function createJSON() {
  return new Promise((resolve, reject) => {
    readXmlToJson(m_InputDir + 'index.xml', 'utf8').then((json) => {
      json.scriptbinds = json.doxygenindex;
      delete json.doxygenindex;
      delete json._declaration;
      delete json.scriptbinds._attributes;

      var scriptbinds = json.scriptbinds;
      var classes = json.scriptbinds.compound;
      for (var i in classes) {
        if (classes[i].name._text.includes(m_Prefix) ||
            classes[i].name._text.includes(m_Prefix1)) {
          m_FileNames.push(classes[i]._attributes.refid + '.xml');

          if (classes[i].name._text.includes(m_Prefix)) {
            classes[i].name._text = classes[i].name._text.replace(m_Prefix, '');
          }
          else if (classes[i].name._text.includes(m_Prefix1)) {
            classes[i].name._text = classes[i].name._text.replace(m_Prefix1, '');
          }

          var name = classes[i].name._text;
          scriptbinds[name] = {
            description: "",
            methods: {}
          };

          delete classes[i]._attributes;
          delete classes[i].member;
        }
      }

      delete json.scriptbinds.compound;
      m_ScriptBinds = json;

      var promises = [];
      for (var file in m_FileNames) {
        promises.push(readXmlToJson(m_InputDir + m_FileNames[file], 'utf8'));
      }
      Promise.all(promises).then(values => {
        for (var value in values) {
          var scriptBind = values[value].doxygen.compounddef;
          processScriptBind(scriptBind);
        }

        resolve();
      }).catch((error) => {
        throw error;
      });
    });
  });
}

export default class HexeJSON {
  constructor(state) {
    this.hexeDocVersion = state ? state.hexeDocVersion : '0.0.0';

    fs.watch(m_InputDir + "indexpage.xml", (eventType, filename) => {
      if (eventType == 'change') {
        readXmlToJson(m_InputDir + "indexpage.xml", 'utf8').then((json) => {
          const newDocVersion = json.doxygen.compounddef.detaileddescription.para._text;
          if (this.hexeDocVersion != newDocVersion) {
            createJSON().then(() => {
              fs.writeFile(m_OutputDir + "scriptbinds.json",
                           JSON.stringify(m_ScriptBinds, null, 2), 'utf8',
                           (error) => {
                if (error) throw error;
                m_ScriptBinds = JSON.parse(fs.readFileSync(m_OutputDir + "scriptbinds.json", 'utf8'));
                state.emitter.emit('scriptbinds-updated', m_ScriptBinds);
                this.hexeDocVersion = newDocVersion;
              });
            }).catch((error) => {
              throw error;
            });
          }
        }).catch((error) => {
          throw error;
        });
      }
    });

    m_ScriptBinds = JSON.parse(fs.readFileSync(m_OutputDir + "scriptbinds.json", 'utf8'));
  }

  getScriptBinds() {
    return m_ScriptBinds;
  }

  serialize() {
    return {
      hexeDocVersion: this.hexeDocVersion
    }
  }
}
