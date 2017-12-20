module.exports = function(tasks, options){

  const ret = {
    task : (process.argv||[]).find(i => ~tasks.indexOf(i)),
    options : {}
  };

  const argv = (function(){
    const res = {};
    process.argv.forEach((item)=>{
      let i = null;
      if(item.startsWith('--')) i = item.substring(2);
      if(!i && item.startsWith('-')) i = item.substring(1);
      if(i) {
        i = i.split('=');
        const key = i[0];
        if(key) {
          let value = true;
          if(i[1]) {try { value = JSON.parse(i[1]) } catch (e) { value = i[1] }}
          res[key] = value;
        }
      }
    });
    return res;
  })(process.argv);

  for (let o in options) {
    if(options.hasOwnProperty(o)) {
      const option = options[o];
      let isset = argv.hasOwnProperty(o);
      if(!isset && option.alias) isset = argv.hasOwnProperty(option.alias);
      if( isset ) {
        ret.options[o] = argv[o]||argv[option.alias];
      } else {
        if(option.default) { ret.options[o] = option.default; continue; }
        if(option.asSetBool) { ret.options[o] = false; }
      }
    }
  }

  return ret;
};