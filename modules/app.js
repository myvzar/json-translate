const path = require('path');
const translate = require('@vitalets/google-translate-api');

const argv = require(path.resolve(__dirname,'argv'));
const json = require(path.resolve(__dirname,'json'));
const tree = require(path.resolve(__dirname,'tree'));

let defaultTask = null;
const options = {};
const tasks = {};

let appInstance = null;

module.exports = function(appPath, projectPath, packageField) {
  return appInstance || (appInstance = new class App {

    constructor() {
      this.appPath = appPath;
      this.projectPath = projectPath;
      this.packageField = packageField;
      this.package = null;
    }

    task(name, description, fn, isDefault = false) {
      tasks[name] = { name, description, fn };
      if(isDefault && !defaultTask) { defaultTask = name }
      return this;
    }

    options(uo){
      Object.assign(options, uo);
      return this;
    }

    run() {
      const run_argv = argv(Object.keys(tasks),options);
      const useTask = run_argv.task || defaultTask;
      if(useTask && tasks.hasOwnProperty(useTask)) {
        return (tasks[useTask].fn)(run_argv.options);
      } else return console.error(new Error('Dont know this action'));
    }

    packageJsonPath() {
      return path.join(this.projectPath,'package.json');
    }

    getPackage() {
      return json.read(this.packageJsonPath()).then(jsonData => {
        if(typeof jsonData !== 'object') throw new Error('Bad package.json');
        return jsonData;
      }).catch(e => console.error(e));
    }

    updatePackage(data) {
      return json.write(this.packageJsonPath(),data);
    }

    configObject() {
      return {
        port : options.port.default,
        baseDir : options.baseDir.default,
        apiKey : options.apiKey.default,
        languages : {}
      }
    }

    langFilePath(...p) {
      return path.join(this.projectPath,...p);
    }

    createLangFile(languagesFolder,languageFile) {
      return json.writeIfNotExist(this.langFilePath(languagesFolder, languageFile), {})
    }

    initPackage() {
      return this.getPackage()
        .then(packageJson => this.package = packageJson[this.packageField])
        .catch((e) => console.error('Need to init project', e))
    }

    getTree() {
      return this.getPackage()
        .then(packageJson => packageJson[this.packageField])
        .then(opts => {
          if(!opts) { throw new Error('Need to init project'); }
          return new tree(opts, this.projectPath);
        })
    }

    translateToAll(dVal) {
      if(!this.package.defLang) return Promise.reject('Need to set default language');
      if(!dVal) return Promise.reject('Empty Default language text');
      const Languages = Object.keys(this.package.languages);
      const defLangIndex = Languages.indexOf(this.package && this.package.defLang || 'en');
      if(~defLangIndex) Languages.splice(defLangIndex, 1);
      if(!Languages.length) return Promise.reject('Languages list is empty');
      return Promise.all(Languages.map(l => this.translateItem(dVal, this.package.defLang, l)))
        .then((r) => {
          const result = {};
          result[this.package.defLang] = dVal;
          r.forEach(tri => tri && tri.t && (result[tri.t] = tri.res));
          return result;
        });
    }

    translateItem(text, from, to) {
      return translate(text, { from, to })
        .then(tr => ({ t : to, res : tr.text }))
        .catch((e) => console.log('Translate error', e))
    }

    uppercaseCheck(items, needToUppercase) {
      if(items) {
        for(let i in items) {
          if(items.hasOwnProperty(i)) {
            items[i] = items[i].substr(0, 1)[needToUppercase ? 'toUpperCase' : 'toLowerCase']() + items[i].substr(1).toLowerCase();
          }
        }
      }
      return items;
    }

    readJsonFile(file) {
      return json.read(file)
    }

  })
};
