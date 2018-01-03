const http = require('http');
const fs = require('fs');

module.exports = class AppServer {

  constructor(port = 2125) {
    this.actions = {};
    this.port = port;
    this.__serve__();
  }

  get(url, action) { return this.__toActions__('get', url, action) }

  post(url, action) { return this.__toActions__('post', url, action) }

  put(url, action) { return this.__toActions__('put', url, action) }

  delete(url, action) { return this.__toActions__('delete', url, action) }

  __toActions__(method, url, action) {
    this.__actionsByMethod(method).push({
      resolve : url,
      action
    })
  }

  __actionsByMethod(method) {
    return this.actions[method] || (this.actions[method] = []);
  }

  __serve__() {
    return http
      .createServer((req, res) => {

        res.sendFile = function(type = 'text/plain', filePath){
          res.setHeader("content-type", type);
          fs.createReadStream(filePath).pipe(res);
        }.bind(res);

        res.sendJson = function(Obj){
          res.setHeader("content-type", 'application/json');
          res.end(JSON.stringify(Obj || {}));
        }.bind(res);

        const methodActions = this.__actionsByMethod((req.method || 'GET').toLowerCase());

        const Action = ((httpUrl) => {
          return (methodActions||[]).find((action) => {
            switch (typeof action.resolve) {
              case 'object' :
                const rules = Object.keys(action.resolve || {});
                return !rules.length ? false : rules.every((r) => {
                  if(r === 'prefix') return httpUrl.startsWith(action.resolve[r]);
                  if(r === 'suffix') return httpUrl.endsWith(action.resolve[r]);
                  return false;
                });
                break;
              case 'function' :
                return action.resolve.call(this, req);
                break;
              default: return httpUrl === action.resolve;
            }
          });
        })(req.url||'*');

        if(Action && Action.action) {
          return Action.action.call(this, req, res);
        } else {
          res.writeHead(404, {"Content-Type": "text/html"});
          res.write(`<h1>Not found</h1>`);
          return res.end();
        }
      })
      .listen(this.port, () => console.log(`Started at http://127.0.0.1:${this.port}`))
  }

};