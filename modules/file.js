const fs = require('fs');

module.exports = new class file {

  constructor() {
    this.encoding = 'utf8';
  }

  read(filePath) {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, this.encoding, (err, data) => {
        if(err) return reject(err);
        return resolve(data);
      })
    });
  }

  write(filePath, content) {
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath,content,this.encoding,(err, data) => {
        if(err) return reject(err);
        return resolve(data);
      })
    });
  }

  writeIfNotExist(filePath, content) {
    if(!fs.existsSync(filePath)) return this.write(filePath, content);
    return Promise.resolve();
  }

};