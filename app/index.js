const Server = require('./server');
const path = require('path');

module.exports = (App) => {
  return function Manager(options) {
    App.initPackage().then((packageJson) => {
      App.getTree()
        .then((tree) => tree.init().then(() => tree))
        .then((tree) => {

          const httpServer = new Server(options.port);

          httpServer.get('/',function(req, res){
            return res.sendFile('text/html',path.resolve(__dirname, './statics/index.html'))
          });

          httpServer.get('/favicon.ico',function(req, res){
            return res.sendFile('text/html',path.resolve(__dirname, './statics/favicon.ico'))
          });

          httpServer.get((req) => {
            const stats = ['js','css','tpl'];
            return stats.some((s) => (req.url||'').startsWith(`/${s}/`))
          }, (req, res) => {

            const types = {
              js : 'application/javascript',
              css : 'text/css',
              tpl : 'text/html'
            };

            const rUrl = req.url.split('/');

            const file = rUrl.pop();
            const type = rUrl[1] || null;

            if(type && types.hasOwnProperty(type) && file) {
              return res.sendFile(types[type],path.resolve(__dirname, `./statics/${type}/${file}`))
            } else return res.end();
          });

          httpServer.get('/init',function(req, res){
            return res.sendJson(tree);
          });

          httpServer.post('/translate',function(req, res, body){
            const value = body.value || null;
            if(!value) return res.sendJson({});
            return App.translateToAll(value)
              .then((item) => App.uppercaseCheck(item, value[0] === value[0].toUpperCase()))
              .then((item) => res.sendJson(item))
          });

          httpServer.post('/save',function(req, res, body){
            if(body.$isItem) {
              tree.addMultiple(body.$path||'', body.values);
            } else {
              const deep = (body.$path||'').split('.');
              const key = deep.pop();
              tree.getDeep(deep)[key] = {};
            }
            tree.save().then(() => res.sendJson({status : true}))
          });

      });
    });
  }
};