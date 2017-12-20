const file = require('./file');

module.exports = new class jsonFile {

  read(filePath) {
    return file.read(filePath).then((source)=>JSON.parse(source))
  }

  write(filePath, object) {
    return file.write(filePath, this.objectToFormattedString(object))
  }

  objectToFormattedString(object) {
    return JSON.stringify(object,null,2);
  }

  writeIfNotExist(filePath, object) {
    return file.writeIfNotExist(filePath, this.objectToFormattedString(object))
  }

};