(function jsonTranslateGUI (){

  return angular

    .module('mabayaTranslate',[])

    .factory('$treeItem',function($opened){

      function makeBreadcrumb(pathArray){
        if(pathArray && pathArray.length)
        {
          return (pathArray||[]).reduce((previousValue, currentValue, index, array)=>{
            previousValue.push({
              title : currentValue,
              link : array.slice(0,index + 1).join('.'),
            });
            return previousValue;
          },[]);
        }
        return [];
      }

      return class $treeItem {

        constructor(item, name = '', parentPath = []) {
          this.$isItem = !!item.$isItem;
          this.$name = name;

          this.$breadcrumb = angular.copy(parentPath);
          if(this.$name) this.$breadcrumb.push(this.$name);

          this.$path = this.$breadcrumb.join('.');

          this.$linkedBreadcrumb = makeBreadcrumb(this.$breadcrumb);
          this.$pyramidBreadcrumb = (this.$linkedBreadcrumb||[]).map(i => i.link);

          if(!this.$isItem) {
            this.items = {};
            this.hasSubItems = Object.keys(item||{}).filter(i => !item[i].$isItem).length
          }

          angular.forEach(item,(v, k) => {
            if(this.$isItem) {
              if(k !== '$isItem') this[k] = v;
            } else {
              this.items[k] = new $treeItem(v, k, this.$breadcrumb);
            }
          });
        }

        isActive() {
          return $opened.item === this;
        }

        opened() {
          return $opened.item &&
            $opened.item.$pyramidBreadcrumb &&
            $opened.item.$pyramidBreadcrumb.length &&
            ~$opened.item.$pyramidBreadcrumb.indexOf(this.$path);
        }

        open() {
          return $opened.item = this;
        }

      }

    })

    .service('$tree',function($http, $treeItem){

      const $tree = this;

      $tree.items = {};

      $tree.loading = $http.get('/init').then((res) => {
        $tree.items = new $treeItem(res.data.items);
        return res.data;
      });

      $tree.init = () => $tree.loading;

    })

    .service('$opened',function(){
      this.item = null;
    })

    .controller('root', function($tree, $opened){

      const $root = this;

      $root.loaded = false;
      $root.options = {};
      $root.menu = {};
      $root.opened = $opened;

      $tree.init().then((data) => {
        $root.options = data.options;
        $root.loaded = true;
        $root.menu = $tree.items;
        $root.menu.$name = 'Root';
        $opened.item = $root.menu;
        document.getElementById('loader-wrapper').remove();
      });

    })

    // DIRECTIVES

    .directive('menuItem',function(){
      return {
        restrict : 'E',
        templateUrl : '/tpl/_menu_item_.html',
        replace : true,
        scope : { item : '=' }
      }
    })

    .name;

    z.service('session',function(){
      this.inited = false;
      this.info = {};

      this.init = (data) => {
        this.info = Object.assign(this.info,data);
        return this.inited = true;
      }

    })

    .service('$tree',(function(){

      function $tree(){
        this.root = new treeNode({name:'root',path:null});
        this.root.isRoot = true;
      }

      function makeBreadcrumb(pathArray){
        if(pathArray && pathArray.length)
        {
          return (pathArray||[]).reduce((previousValue, currentValue, index, array)=>{
            previousValue.push({
              title : currentValue,
              link : array.slice(0,index + 1).join('.'),
            });
            return previousValue;
          },[]);
        }
        return [];
      }

      class treeNode {

        constructor(item){
          this.name = item.name;
          this.path = item.path;

          this.breadcrumb = breadcumb(this.path);
          this.linkedBreadcrumb = makeBreadcrumb(this.breadcrumb);
          this.breadPyramid = (this.linkedBreadcrumb||[]).map(i => i.link);

          this.items = {};
          this.child = {};
          this.value = false;
        }

        push(item){
          return this.child[item.name] = item;
        }

        add(item){
          return this.items[item.name] = item;
        }

        translate(value){
          this.value = value;
          return this;
        }

        toArray(){
          return Object.keys(this.child).map((i)=>this.child[i]);
        }

        getChild(name){
          return this.child[name] || null
        }

        assign(treeDeep)
        {
          const getNamesFrom = (i) => Object.keys(i) || [];
          ((textNodes)=>textNodes.forEach(textNodesItem => (nodeInfo => {
            textNodesItem = this.add(new treeNode(nodeInfo));
            textNodesItem.translate(nodeInfo.value);
          })(treeDeep.items[textNodesItem])))(getNamesFrom(treeDeep.items));
          ((treeNodes)=>treeNodes.forEach(treeNodeItem=>(nodeInfo=>{
            treeNodeItem = this.push(new treeNode(nodeInfo));
            treeNodeItem.assign(nodeInfo);
          })(treeDeep.child[treeNodeItem])))(getNamesFrom(treeDeep.child));
        }

      }

      function breadcumb(b){
        if(!b) return [];
        return Array.isArray(b) ? b : b.split('.');
      }

      $tree.prototype = {
        $set:function(path,rawTreeDeep){
          if(rawTreeDeep) {
            const deep = this.$deep(path);
            if(deep) deep.assign(rawTreeDeep);
          }
          return this;
        },
        $deep:function(path){
          if(!path) return this.root;
          var ret = this.root;
          angular.forEach(breadcumb(path),function(item){
            if(ret) return ret = ret.getChild(item);
          });
          return ret;
        },
        newItem:function(data){
          return new treeNode(data);
        }
      };
      return $tree;
    })())

    .service('$open',function($tree,$http){

      this.current = {};

      const e = (()=>{
        const subscribers = [];
        return {
          add(clb){
            if(angular.isFunction(clb)) subscribers.push(clb);
            return this;
          },
          emit(data){
            return (subscribers||[]).forEach(c=>(c)(data));
          }
        }
      })();

      this.path = function(deep){
        this.current = $tree.$deep(deep);
        return e.emit(this.current);
      };

      this.subscribe = (clb) => e.add(clb);
    })

    .controller('root',function($http,session,$tree,dictionaryModal){

      var $root = this;

      $root.loaded = false;

      $http.get('/init').then(function(response){
        $root.loaded = session.init(response.data);
        return $tree.$set(null,response.data.tree);
      });

      $root.copyPath = function($event){
        var line = $event.target.closest('tr');
        if(line) {
          line = line.getElementsByClassName('item-path')[0];
          if(line) {
            line.select();
            document.execCommand("Copy");
          }
        }
      };

      $root.addWord = function(){
        var item = $tree.newItem({});
        item.isNew = true;
        dictionaryModal.add(item);
      };

      $root.editItem = function(item){
        dictionaryModal.add(item);
      };

    })

    .controller('menu',function($tree,$http,$open){

      const $menu = this;

      $menu.items = $tree.$deep().toArray();

      $menu.reloadApp = function () {
        $http.delete('/init').finally(() => location.reload(true))
      };

    })

    .controller('content',function($open,session){

      var $content = this;

      $content.current = {};
      $content.breadcrumb = [];
      $content.hasList = false;

      $content.languages = session.info.languages;

      function checkHasList() {
        $content.hasList = !!Object.keys($content.current.items).length;
      }

      $open.subscribe((item)=>{
        $content.current = item;
        $content.breadcrumb = $content.current.linkedBreadcrumb;
        checkHasList();
      });

      $content.open = function (path) {
        return $open.path(path);
      };

      $open.path();
    })



    .factory('$modal',function($q, $templateCache, $http, $rootScope, $controller, $animate, $compile){

      function $modal(options){
        this.options = angular.extend({
          container : 'body'
        },options);
      }

      (function(cls){

        var template, element, $scope;

        cls.loadTpl = function(){
          return $q(function(resolve, reject){
            if(this.options.template || template) return resolve(this.options.template || template);
            if(this.options.templateUrl) return $http.get(this.options.templateUrl,{
              cache : $templateCache
            }).then(function(value){
              return element = angular.element(value.data);
            }).then(resolve);
            throw Error('Set Template');
          }.bind(this))
        };

        cls.open = function(data){
          var $this = this;
          return $q(function(resolve,reject){
            return $this.loadTpl()
              .then(function(){
                $scope = $rootScope.$new();

                $scope.resolve = data;

                $scope.$resolve = function(value){
                  return $this.close().then(function(){ return resolve(value); });
                };

                $scope.$reject = function(){
                  return $this.close().then(reject);
                };

                var controller;
                if($this.options.controller) controller = $controller($this.options.controller, {$scope:$scope});
                $compile(element)($scope);
                return $animate.enter(element,document.querySelector($this.options.container));
              })
              .catch(function (reason) { console.error(reason) })
          });
        };

        cls.close = function(){
          return $animate.leave(element).then(function(){
            $scope.$destroy(); $scope && ($scope = null);
            element.remove(); element = null;
          });
        };

      })($modal.prototype = {});

      return $modal;

    })

    .service('dictionaryModal',function($modal, $open){

      var modal = new $modal({
        templateUrl : '/modal.html',
        controller: function($scope, session, $http){
          $scope.languages = session.info.languages;


          console.log($open.current.items);

          $scope.translateTo = function(lang){

            $http.get('https://translate.google.com.ua/translate_a/t?client=t&sl=en&tl=uk&hl=uk&v=1.0&source=is&q=hello')
              .then(function (value) { console.log(value) })
              .catch(function (reason) { console.error(reason) });


            // $http.get('https://translation.googleapis.com/language/translate/v2',{
            //   params : {
            //     key : 'AIzaSyD2RH71oCzdnlvHRHRj3yxjNJMzf_iEbeU',
            //     source : 'en-US',
            //     target : 'uk-Ua',
            //     q : 'Hi!'
            //   }
            // })
            //   .then(function (value) {
            //     console.log(value);
            //   })
            //   .catch(function (reason) { console.error(reason) })
          }

        }
      });

      return {
        add: function(item) {
          return modal.open(item).catch(function(reason){})
        }
      }
    });

})();