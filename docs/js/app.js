var app = angular.module('codecraft', ['ngResource', 'infinite-scroll', 'angularSpinner', 'jcs-autoValidate', 'angular-ladda', 'mgcrea.ngStrap', 'toaster', 'ngAnimate', 'ui.router']);

app.config(function ($stateProvider, $urlRouterProvider) {
    $stateProvider
        .state('list', {
            url: "/",
            views: {
                'main': {
                    templateUrl: 'templates/list.html',
                    controller: 'PersonListController'
                }
                ,
                'search': {
                    templateUrl: 'templates/searchform.html',
                    controller: 'PersonListController'
                }
            }
        })
        .state('edit', {
            url: "/edit/:email",
            views: {
                'main': {
                    templateUrl: 'templates/edit.html',
                    controller: 'PersonDetailController'
                }
            }

        })
        .state('create', {
            url: "/create",
            views: {
                'main': {
                    templateUrl: 'templates/edit.html',
                    controller: 'PersonCreateController'
                }
            }
        });
    $urlRouterProvider.otherwise('/');
});

app.config(function($httpProvider, $resourceProvider, laddaProvider){
    $httpProvider.defaults.headers.common['Authorization'] = 'Token 8408d03cc1edebd39db63c944d092ca828c471dd';
    $resourceProvider.defaults.stripTrailingSlashes = false;
    laddaProvider.setOption({style : 'expand-right'});
});

app.factory('Contact', function($resource){
   return $resource("https://api.codecraft.tv/samples/v1/contact/:id/", {id:"@id"}, {update:{method: 'PUT' }});
});

app.controller('PersonDetailController', function ($scope, ContactService, $stateParams, $state) {
    $scope.mode = "Edit";

    console.log($stateParams);

    $scope.contacts = ContactService;

    $scope.contacts.selectedPerson = $scope.contacts.getPerson($stateParams.email);

    $scope.save = function () {
        $scope.contacts.updateContact($scope.contacts.selectedPerson).then(function () { $state.go("list");});

    };
    $scope.remove = function () {
        $scope.contacts.removeContact($scope.contacts.selectedPerson).then(function () { $state.go("list"); });
    };
});

app.controller('PersonListController', function ($scope, $modal, ContactService) {

	$scope.search = "";
	$scope.order = "email";
    $scope.contacts = ContactService;

    $scope.loadMore = function () {
        $scope.contacts.loadMore();
    };

    $scope.showCreateModal = function () {
        $scope.contacts.selectedPerson = {};
        $scope.createModal = $modal({
            scope: $scope,
            template: 'templates/modal.create.tpl.html',
            show: true
        });
    };

    $scope.parentDeleteUser = function (user) {
        $scope.contacts.removeContact(user);
    };
	$scope.sensitiveSearch = function (person) {
		if ($scope.search) {
			return person.name.indexOf($scope.search) == 0 ||
				person.email.indexOf($scope.search) == 0;
		}
		return true;
	};

});

app.controller('PersonCreateController', function ($scope, $state, ContactService) {
    $scope.mode = "Create";
    $scope.contacts = ContactService;
    $scope.save = function () {
        console.log("createContact");
        $scope.contacts.createContact($scope.contacts.selectedPerson)
            .then(function () {
                $state.go("list");
            });
    };
});
app.directive('ccSpinner', function () {
    return {
        'restrict': 'AE',
        'templateUrl': 'templates/spinner.html',
        'scope': {
            'isLoading': '=',
            'message' :'@'
        }
    }
});
app.directive('ccCard', function () {
    return {
        'restrict': 'AE',
        'templateUrl': 'templates/card.html',
        'scope': {
            'user': '=',
        }
        ,
        'controller': function ($scope, ContactService) {
            $scope.isDeleting = false;
            $scope.deleteUser = function () {
                $scope.isDeleting = true;
                ContactService.removeContact($scope.user).then(function () {
                    $scope.isDeleting = false;
                });
            };
        }
    }

});
app.service('ContactService', function (Contact, $rootScope, $q, toaster) {
    var self = {

        'page': 1,
        'hasMore': true,
        'isLoading': false,
        'isSaving': false,
        'isDeleting': false,
        'persons': [],
        'search': null,
        'ordering': 'name',
        'getPerson': function (email) {
            console.log(email);
            for (var i = 0; i < self.persons.length; i++) {
                var obj = self.persons[i];
                if (obj.email == email) {
                    return obj;
                }
            }
        }
        ,
        'doSearch': function () {
            selfhasMore = true;
            self.page = 1;
            self.persons = [];
            self.loadContacts();
        },
        'doOrder': function () {
            self.hasMore = true;
            self.page = 1;
            self.persons = [];
            self.loadContacts();
        },
        'loadContacts': function () {
            if (self.hasMore && !self.isLoading) {
                self.isLoading = true;
                var params = { 'page': self.page, 'search': self.search, 'ordering': self.ordering };
                Contact.get(params, function (data) {
                    console.log(data);
                    angular.forEach(data.results, function (person) {
                        self.persons.push(new Contact(person));
                    });
                    if (!data.next) {
                        self.hasMore = false;
                    }
                    self.isLoading = false;
                });
            }
        },
        'loadMore': function () {
            if (self.hasMore && !self.isLoading) {
                self.page += 1;
                self.loadContacts();
            }
        },
        'updateContact': function (person) {
            var d = $q.defer();
            console.log("Service called Update");
            self.isSaving = true;
            person.$update().then(function () {
                self.isSaving = false;
                toaster.pop('success', 'Updated' + person.name);
                d.resolve()
            });
            return d.promise;
        },
        'removeContact': function (person) {
            var d = $q.defer();
            self.isDeleting = true;
            person.$remove().then(function () {
                self.isDeleting = false;
                var index = self.persons.indexOf(person);
                self.persons.splice(index, 1);
                self.selectedPerson = null;
                toaster.pop('success', 'Deleted' + person.name);
                d.resolve()
            });
            return d.promise;
        },
        'createContact': function (person) {
            var d = $q.defer();
            self.isSaving = true;
            Contact.save(person).$promise.then(function () {
                self.isSaving = false;
                self.selectedPerson = null;
                self.hasMore = true;
                self.page = 1;
                self.persons = [];
                self.loadContacts();
                toaster.pop('success', 'Created' + person.name);
                d.resolve()
            });
            return d.promise;
        },
        'watchFilters': function () {
            $rootScope.$watch(function () {
                return self.search;
            }, function (newVal) {
                if (angular.isDefined(newVal)) {
                    self.doSearch();
                }
            });

            $rootScope.$watch(function () {
                return self.ordering;
            }, function (newVal) {
                if (angular.isDefined(newVal)) {
                    self.doOrder();
                }
            });
        }
    };
    self.loadContacts();
    self.watchFilters();
	return self;

});
app.filter('defaultImage', function () {
    return function (input, param) {
        //console.log(input);
        //console.log(param);
        if (!input) {
            return param;
        }
        return input;
    };
});

/* ng-infinite-scroll - v1.3.0 - 2016-06-30 */
angular.module("infinite-scroll",[]).value("THROTTLE_MILLISECONDS",null).directive("infiniteScroll",["$rootScope","$window","$interval","THROTTLE_MILLISECONDS",function(a,b,c,d){return{scope:{infiniteScroll:"&",infiniteScrollContainer:"=",infiniteScrollDistance:"=",infiniteScrollDisabled:"=",infiniteScrollUseDocumentBottom:"=",infiniteScrollListenForEvent:"@"},link:function(e,f,g){var h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z;return z=angular.element(b),u=null,v=null,j=null,k=null,r=!0,y=!1,x=null,i=!1,q=function(a){return a=a[0]||a,isNaN(a.offsetHeight)?a.document.documentElement.clientHeight:a.offsetHeight},s=function(a){if(a[0].getBoundingClientRect&&!a.css("none"))return a[0].getBoundingClientRect().top+t(a)},t=function(a){return a=a[0]||a,isNaN(window.pageYOffset)?a.document.documentElement.scrollTop:a.ownerDocument.defaultView.pageYOffset},p=function(){var b,d,g,h,l;return k===z?(b=q(k)+t(k[0].document.documentElement),g=s(f)+q(f)):(b=q(k),d=0,void 0!==s(k)&&(d=s(k)),g=s(f)-d+q(f)),y&&(g=q((f[0].ownerDocument||f[0].document).documentElement)),h=g-b,l=h<=q(k)*u+1,l?(j=!0,v?e.$$phase||a.$$phase?e.infiniteScroll():e.$apply(e.infiniteScroll):void 0):(i&&c.cancel(i),j=!1)},w=function(a,b){var d,e,f;return f=null,e=0,d=function(){return e=(new Date).getTime(),c.cancel(f),f=null,a.call()},function(){var g,h;return g=(new Date).getTime(),h=b-(g-e),h<=0?(c.cancel(f),f=null,e=g,a.call()):f?void 0:f=c(d,h,1)}},null!=d&&(p=w(p,d)),e.$on("$destroy",function(){if(k.unbind("scroll",p),null!=x&&(x(),x=null),i)return c.cancel(i)}),n=function(a){return u=parseFloat(a)||0},e.$watch("infiniteScrollDistance",n),n(e.infiniteScrollDistance),m=function(a){if(v=!a,v&&j)return j=!1,p()},e.$watch("infiniteScrollDisabled",m),m(e.infiniteScrollDisabled),o=function(a){return y=a},e.$watch("infiniteScrollUseDocumentBottom",o),o(e.infiniteScrollUseDocumentBottom),h=function(a){if(null!=k&&k.unbind("scroll",p),k=a,null!=a)return k.bind("scroll",p)},h(z),e.infiniteScrollListenForEvent&&(x=a.$on(e.infiniteScrollListenForEvent,p)),l=function(a){if(null!=a&&0!==a.length){if(a.nodeType&&1===a.nodeType?a=angular.element(a):"function"==typeof a.append?a=angular.element(a[a.length-1]):"string"==typeof a&&(a=angular.element(document.querySelector(a))),null!=a)return h(a);throw new Error("invalid infinite-scroll-container attribute.")}},e.$watch("infiniteScrollContainer",l),l(e.infiniteScrollContainer||[]),null!=g.infiniteScrollParent&&h(angular.element(f.parent())),null!=g.infiniteScrollImmediateCheck&&(r=e.$eval(g.infiniteScrollImmediateCheck)),i=c(function(){return r&&p(),c.cancel(i)})}}}]),"undefined"!=typeof module&&"undefined"!=typeof exports&&module.exports===exports&&(module.exports="infinite-scroll");