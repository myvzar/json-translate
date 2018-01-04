#!/usr/bin/env node

const field = 'json-translate';

const App = (require(
  require('path').resolve(__dirname,'modules','app.js')))
(__dirname, process.cwd(), field);

App.task('start', 'Start translate current project', (require('./app'))(App), true);

App.task('item', 'Add translate',(options) => {
  const taskIndex = process.argv.indexOf('item');
  const [key, enValue] = process.argv.slice(taskIndex + 1, taskIndex + 3);
  if(key && enValue) {
    App.initPackage()
      .then(() => App.translateToAll(enValue))
      .then(item => App.uppercaseCheck(item, options.uppercase))
      .then(item => App.getTree()
        .then($tree => $tree.init().then(()=>$tree.addMultiple(key,item))))
      .then($tree => $tree.save())
      .then(() => {console.log('Item added to languages')})
      .catch(e => console.error(e));
  }
});

App.task('init', 'Init new project', (options) => {
  App.getPackage()
    .then((packageJson) => {
      if(!packageJson.hasOwnProperty(field)) {
        packageJson[field] = Object.assign(App.configObject(),options);
        return App.updatePackage(packageJson)
          .then(() => {
            console.log('Success! Translate inited. package.json updated')
          }).catch(e => {
            console.error('Error update package.json');
            console.error(e);
          })
      } else return console.error('Already inited. Nothing changed');
    })
});

App.task('add', 'Add new language to current project',(options) => {
  if(options.lang) {
    const nLang = options.lang;
    let nDisplay = options.display || nLang;
    nDisplay = nDisplay.substr(0, 1).toUpperCase() + nDisplay.substr(1);
    let nFile = options.file || nLang;
    if(!nFile.endsWith('.json')) nFile += '.json';
    App.getPackage()
      .then(packageJson => {
        if(!packageJson[field]) return console.error('Need to init translation first!');
        if(!packageJson[field].languages) packageJson[field].languages = [];
        packageJson[field].languages[nLang] = {display : nDisplay,file : nFile};
        if(options.default) {packageJson[field].defLang = nLang; }
        return App.updatePackage(packageJson)
          .then(() => console.log('Language added! package.json updated'))
          .then(() => App.createLangFile(packageJson[field].baseDir,nFile))
          .then(() => console.log(`Language file ${nFile} created in ${packageJson[field].baseDir}`))
          .catch(e => console.error('Error!', e))
      });

  } else return console.error('--lang in required');
});

App.options({
  // init + start
  port : {default : 2125},

  // init
  baseDir : {default : '/src/i18n/'},
  apiKey : {default : null},

  // add
  lang : {},
  display : {},
  file : {},
  default : {
    alias : 'd',
    asSetBool : true
  },

  // item
  canRewrite : {
    alias : 'r',
    asSetBool : true
  },

  uppercase : {
    alias : 'u',
    asSetBool : true
  },

  // start

});

App.run();