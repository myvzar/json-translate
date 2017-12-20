const path = require('path');
const argv = require(path.resolve(__dirname,'argv'));
const json = require(path.resolve(__dirname,'json'));

let defaultTask = null;
const options = {};
const tasks = {};

let appInstance = null;

module.exports = function(appPath, projectPath) {
  return appInstance || (appInstance = new class App {

    constructor() {
      this.appPath = appPath;
      this.projectPath = projectPath;
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

  })
};