(function jsonTranslateGUI (){

  return angular

    .module('mabayaTranslate',[])

    .factory('$treeItem',function($opened, $http){

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
            this.hasSubItems = Object.keys(item||{}).filter(i => (typeof item[i] === 'object') && !item[i].$isItem).length
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

        getValues() {
          if(!this.$isItem) return {};
          const ret = {};
          const $this = this;
          angular.forEach($opened.options.languages,function(v, lang){
            ret[lang] = $this[lang];
          });
          return ret;
        }

        save() {
          return $http.post('/save',{
            $isItem : this.$isItem,
            $path : this.$path,
            values : this.getValues()
          })
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

      $tree.get = function(path){
        if(path) {
          return (path.split('.')).reduce((item,path) => {
            if(item && !item.$isItem && item.items && item.items.hasOwnProperty(path)) {
              return item.items[path];
            }
            return null;
          }, $tree.items);
        }
        return $tree.items;
      };

      $tree.new = function(opt = {}){
        return new $treeItem(opt);
      };

      $tree.update = function (item) {
        const deep = (item.$path||'').split('.');
        const key = deep.pop();
        $tree.get(deep.join('.'))[key] = item;
      }

    })

    .service('$opened',function(){
      this.item = null;
      this.options = {};
    })

    .controller('root', function($tree, $opened, $itemModal){

      const $root = this;

      $root.loaded = false;
      $root.options = {};
      $root.menu = {};
      $root.opened = $opened;

      $tree.init().then((data) => {
        $root.options = $opened.options = data.options;
        $root.loaded = true;
        $root.menu = $tree.items;
        $root.menu.$name = 'Root';
        $root.goToPath();
        document.getElementById('loader-wrapper').remove();
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

      $root.goToPath = function(path){
        $opened.item = $tree.get(path);
      };

      function updateView(item) {
        return item.save().then(() => $tree.update(item))
      }

      $root.addWord = function () {
        $itemModal($tree.new({
          isNew : true,
          $isItem : true,
          parentBreadcrumb : $opened.item.$breadcrumb
        })).then(updateView)
      };

      $root.editItem = function (item) {
        $itemModal(item).then(updateView)
      };

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

    .service('$itemModal',function($modal, $opened, $http, $treeItem){

      const modal = new $modal({
        templateUrl : '/tpl/modal.html',
        controller: function($scope){

          $scope.options = $opened.options;

          $scope.inLoading = false;

          $scope.resolve = angular.copy($scope.resolve);

          $scope.translateAll = function(value){
            $scope.inLoading = true;
            $http.post('/translate',{value})
              .then((res) => angular.forEach(res.data,function(v, k){
                if(v) $scope.resolve[k] = v;
              }))
              .finally(() => $scope.inLoading = false);
          };

          $scope.save = function(){
            const params = {};

            if($scope.resolve.$isItem) {
              params.$isItem = $scope.resolve.$isItem;
              angular.forEach($scope.options.languages,(v,lang) => {
                params[lang] = $scope.resolve[lang];
              })
            }

            $scope.$resolve(new $treeItem(
              params,
              $scope.resolve.$name,
              $scope.resolve.parentBreadcrumb||$scope.resolve.$breadcrumb.slice(0,-1)
            ));

          }

        }
      });

      return function openItemModal(item) {
        return modal.open(item)
      }
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

})();