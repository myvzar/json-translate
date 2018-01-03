const path = require('path');
const json = require('./json');

class treeItem {
  constructor(layer) {
    Object.keys(layer||{}).forEach(l => this[l] = layer[l]);
    this.$isItem = true;
  }
}

function parseLayer(layer, defLang) {
  const res = {};
  const keys = new Set();
  const languages = Object.keys(layer)||[];
  languages.forEach(lang => (Object.keys(layer[lang]||{}) || []).forEach(k => keys.add(k)));

  keys.forEach(key => {
    const itemType = typeof layer[defLang][key];
    if(!itemType) console.error(`${key} is missing in ${defLang}. Used as string`);
    const hasDeep = itemType === 'object';

    const vals = (()=>{
      const r = {};
      (languages || []).forEach(l => r[l] = layer[l][key] || (hasDeep ? {} : null));
      return r;
    })()||{};

    return res[key] = hasDeep ? parseLayer(vals,defLang) : new treeItem(vals);
  });

  return res;
}

module.exports = class $tree {

  constructor(options, projectPath) {
    this.items = {};
    this.options = options;
    this.projectPath = projectPath;
  }

  init() {
    if(!this.options || !this.options.baseDir || !this.options.languages || !Object.keys(this.options.languages).length) {
      return Promise.reject("Miss required options. Required : baseDir, languages");
    }
    return Promise
      .all(Object.keys(this.options.languages).map(l => this.loadLangFile(l,this.options.languages[l])))
      .then((items) => {
        const forProcess = {};
        items.forEach(i => forProcess[i.lang] = i.res);
        this.items = parseLayer(forProcess||{}, this.options.defLang || 'en');
        return this;
      })
  }

  langFilePath(pPath, tFile) {
    return path.join(this.projectPath, pPath, tFile);
  }

  loadLangFile(l,lang) {
    const langPath = this.langFilePath(this.options.baseDir,lang.file);
    return json.writeIfNotExist(langPath,{})
      .then(() => json.read(langPath))
      .then(tf => ({lang: l, res: tf}))
  }

  addMultiple(deep,items) {
    deep = (deep||'').split('.');
    const key = deep.pop();
    (this.getDeep(deep))[key] = new treeItem(items);
    return this;
  }

  getDeep(deep) {
    return deep.reduce((layer,item)=>{
      return layer[item] || (layer[item] = {});
    },this.items)
  }

  save() {
    return Promise.all((Object.keys(this.options.languages||{})||[]).map(l => this.saveLanguage(l)))
  }

  saveLanguage(lang) {
    return this.collectLanguage(lang).then((langContent) => {
      const langInfo = this.options.languages[lang];
      const file = this.langFilePath(this.options.baseDir,langInfo.file);
      return json.write(file,langContent);
    });
  }

  collectLanguage(lang) {
    const processLayer = (layer) => {
      const r = {};
      for(let i in layer) {
        if(layer.hasOwnProperty(i)) {
          if(layer[i]) { r[i] = layer[i].$isItem ? (r[i] = layer[i][lang] || null) : processLayer(layer[i]); }
        }
      }
      return r;
    };
    return new Promise((resolve) => {
      return resolve(processLayer(this.items));
    });
  }

};