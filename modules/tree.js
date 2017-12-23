const path = require('path');
const json = require('./json');

module.exports = class $tree {

  constructor(options, projectPath) {
    this.options = options;
    this.projectPath = projectPath;
  }

  init() {
    if(!this.options || !this.options.baseDir || !this.options.languages || !Object.keys(this.options.languages).length) {
      return Promise.reject("Miss required options. Required : baseDir, languages");
    }
    return Promise
      .all(Object.keys(this.options.languages).map(l => this.loadLangFile(l,this.options.languages[l])))
      .then(() => {
        console.log('All loaded');
      })
  }

  langFilePath(pPath, tFile) {
    return path.join(this.projectPath, pPath, tFile);
  }

  loadLangFile(l,lang) {
    const langPath = this.langFilePath(this.options.baseDir,lang.file);
    return json.writeIfNotExist(langPath,{})
      .then(() => json.read(langPath))
      .then(tf => {
        console.log(`========${l}=========`);
        console.log(tf);
        console.log(`=================`);
      })
  }

};