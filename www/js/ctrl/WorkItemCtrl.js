angular.module('clearConcert').controller('WorkItemCtrl',
		['$scope','$location', 'workItem', 'catalog', 'settings','$http', '$routeParams', '$loadDialog',
		 '$window', 'approvalService', 
		function($scope, $location, workItem, catalog, settings, $http, $routeParams, $loadDialog,
				  $window, approvalService){

	$scope.item = workItem.item;
	$scope.resource = workItem.resource;
	$scope.comments = workItem.comments;
	$scope.catalog = catalog;
	$scope.editProperty = $routeParams.prop;
	$scope.approvalValue = workItem.approvalValue;
	
	$scope.favType = favoriteTypes.WORKITEM;

	$scope.editPop = false;

	function init() {
		if (workItem.isNew) {
			$scope.setProjectArea(catalog.list()[0]);
			$scope.item['rtc_cm:filedAgainst'] = {'rdf:resource': catalog.list()[0].categories[0]['rdf:resource'] };
			$scope.filedAgainst = catalog.list()[0].categories[0];
		} else {
			renderItem();
		}
	}
	setTimeout(init);

	//renderItem();

	$scope.isNew = function() {
		return workItem.isNew;
	};

	$scope.go = function(target) {
    	$location.path('/'+target);
  	};

  	$scope.navigateToLink = function(linkItem){
  		var id = linkItem['rdf:resource'].fesubstring(linkItem['rdf:resource'].lastIndexOf('/'))
  		$location.path('/workitem'+id+'/')
  	}

	function buildTypeList(projectId) {
		return $http.get(settings.repository+'oslc/types/'+projectId).success(function(data) {
			if (typeof data == "string") {
				data = [{}];
			}
			$scope.typeOptions = data;
		});
	}

	$scope.edit = function(what) {
    	$scope.originalItemData = angular.copy($scope.item);
    	$scope.editProperty = what;
    	$location.path("workitem/$0/$1".format(workItem.identifier, what));
  	};

	$scope.cancelEdit = function() {
    	angular.extend(workItem.item, $scope.originalItemData);
  	};

	function transitionFromEdit() {
    	$window.history.back();
  	}

  	$scope.save = function() {
    	workItem.item['rtc_cm:estimate'] = estimateToMS($scope.estimate.amount, $scope.estimate.unit);
    	return workItem.$save().then(renderItem, function(response) {
      		if (response.status === 412) {
        		$error("Cannot save.\nWork item is out of sync with repository.\nWork item has been reloaded, try again.", true);
      		} else {
        		$dialog(response.data['oslc_cm:message'], "View in Web")
        		.then(function(isViewInWeb) {
          			if (isViewInWeb) {
            			$scope.openExternalBrowser(workItem.item['rdf:resource']);
          			}
        		});
      		}
      	transitionFromEdit();
    });
  };

  $scope.saveEdit = function() {
    if ($scope.isNew()) {
      transitionFromEdit();
    } else {
      var promise = $scope.save().then($scope.editDone, $scope.editDone);
      //promiseTracker('fullSpin')
        //.addPromise(promise, 'Saving $0...'.format($scope.editProperty));
    	$loadDialog.waitFor(promise, 'Saving...');
    	return promise;
    }
  };

	function renderItem() {
		if (workItem.isNew) return;

		$scope.item = workItem.item;
		$scope.resource = workItem.resource;
		$scope.comments = workItem.comments;
		$scope.catalog = catalog;
		$scope.approvals = workItem.approvals;
	    //alert("approvals: "+$scope.approvals.length);

		var projectRes = $scope.item['rtc_cm:projectArea']['rdf:resource'];
		var projectId = projectRes.substring(projectRes.lastIndexOf("/")+1);

		//console.log($scope.item);
		//console.log($scope.resource);

		//buildTypeList(projectId);

		$scope.setProjectArea(catalog.byId(projectId));

		//Severity
		var url = $scope.item["oslc_cm:severity"]["rdf:resource"];
		url = url.substring(0,url.indexOf("/severity"))+"/severity.json";
		$http.get(url).then(function(response) {
			$scope.severityOptions = response.data; 
		});

		//State
		url = settings.repository + "oslc/workflows/" + projectId + "/actions/";
		$http.get(url, {
			params: {
						type: workItem.resource['dc:type']['dc:identifier'],
			state: workItem.resource['rtc_cm:state']['dc:identifier']
					}
		}).then(function(response) {
		
			$scope.stateOptions = [workItem.resource['rtc_cm:state']].concat(response.data);
		});

		//Owners
		$scope.ownerOptions = [];
		if (workItem.resource['rtc_cm:ownedBy'] && workItem.resource['rtc_cm:ownedBy']['rdf:resource']) {
			$q.all($scope.resource['rtc_cm:projectArea']['rtc_cm:members'].map(function(member) {
				return $http.get(member['rdf:resource']).then(function(response) {
					return response.data;
				});
			})).then(function(owners) {
				var ownerInList = false;
				angular.forEach(owners, function(o) {
					if (workItem.resource['rtc_cm:ownedBy']['rdf:resource'] == o['rdf:resource']) {
						ownerInList = true;
					}
				});
				if (!ownerInList) {
					owners.unshift(workItem.resource['rtc_cm:ownedBy']);
				}
				$scope.ownerOptions = owners;
			});
		}

		//Priority
		url = $scope.item["oslc_cm:priority"]["rdf:resource"];
		url = url.substring(0,url.indexOf("/priority"))+"/priority.json";
		$http.get(url).then(function(response) {
			$scope.priorityOptions = response.data;
		});

		//Estimate
		$scope.estimateUnits = [
		{title: "weeks", id: "w"},
		{title: "days", id: "d"},
		{title: "hours", id: "h"},
		{title: "minutes", id: "m"},
		{title: "seconds", id: "s"}
		];
		$scope.estimateIdToTitle = function(id) {
			switch(id) {
				case 'w': return "weeks";
				case 'd': return "days";
				case 'h': return "hours";
				case 'm': return "minutes";
				default : return "seconds";
			}
		};
		$scope.estimate = estimateFromMS(workItem.item["rtc_cm:estimate"]);

		angular.forEach(catalog.list(), function(item) {
			if (projectId == item.projectId) {
				$scope.projectArea = item;
			}
		});

		if(!$scope.$$phase){
			$scope.$apply();
		}else{
			$location.path("workitem/$0".format(workItem.identifier));
		}
		
	}

	$scope.setProjectArea = function(projectArea) {
		$scope.item['rtc_cm:projectArea'] = $scope.item['rtc_cm:projectArea'] || {};
		$scope.item['rtc_cm:projectArea']['rdf:resource'] = projectArea['rdf:resource'];
		buildTypeList(projectArea.projectId).then(function() {
			//If we switched project areas, but the new type list still has
			//a type with the same title as our current type, keep that type
			angular.forEach($scope.typeOptions, function(type) {
				if ($scope.itemType && type['dc:title'] == $scope.itemType['dc:title']) {
					$scope.itemType = type;
				}
			});
			//If there was no matching type, just set it to the first in the list
			if (!$scope.itemType) {
				$scope.itemType = $scope.typeOptions[0];
			}
			if (typeof $scope.item != 'undefined') {
				$scope.item['dc:type'] = $scope.item['dc:type'] || {};
				$scope.item['dc:type']['rdf:resource'] = $scope.itemType['rdf:resource'];
			}
		});
		$scope.projectArea = projectArea;
		if ($scope.isNew() && projectArea.categories.length) {
			$scope.item['rtc_cm:filedAgainst'] = $scope.item['rtc_cm:filedAgainst'] || {};
			$scope.item['rtc_cm:filedAgainst']['rdf:resource'] = projectArea.categories[0]['rdf:resource'];
			$scope.filedAgainst = projectArea.categories[0];
		}
	};

	function estimateFromMS(ms) {
		var estimate = { unit: "w" }; //default weeks
		if (ms !== null &&  ms !== undefined && ms > 0) {
			var seconds = +ms / 1000;
			if (seconds >= 600000) {
				estimate.amount = Math.floor(seconds/600000*10)/10;
				estimate.unit = "w";
			} else if (seconds >= 80000) { 
				estimate.amount = Math.floor(seconds/80000*10)/10;
				estimate.unit = "d";
			} else if (seconds >= 3000) {
				estimate.amount = Math.floor(seconds/3000*10)/10;
				estimate.unit = "h";
			} else if (seconds >= 60) {
				estimate.amount = Math.floor(seconds/60*10)/10;
				estimate.unit = "m";
			} else {
				estimate.amount = Math.floor(seconds);
				estimate.unit = "s";
			}
		}
		return estimate;
	};

	function estimateToMS(amount, unit) {
		if (amount === null || amount === undefined || isNaN(+amount)) {
			return null;
		}
		var multiplier = {
			w: 600000,
			d: 80000,
			h: 3000,
			m: 60,
			s: 1
		};
		return Math.floor(multiplier[unit] * amount * 1000);
	};

	$scope.create = function() {
	    if (!workItem.item['dc:title']) {
	      return Dialog.error("Please add a summary before creating work item.");
	    } 
	    var promise = workItem.$create().then(function(newWorkItemId) {
	      $scope.$nav.go('/workitem/$0'.format(newWorkItemId));
	    }, function(response) { 
	      $dialog(response.data['oslc_cm:message'] || response.data.errorMessage, "View in Web")
	      .then(function(isViewInWeb) {
	        if (isViewInWeb) {
	          var projectRes = $scope.item['rtc_cm:projectArea']['rdf:resource'];
	          angular.forEach(catalog.list(), function(item) {
	            if (projectRes.indexOf(item.projectId) > -1) {
	              $scope.openExternalBrowser(settings.repository + 'web/projects/' + item.title + '#action=com.ibm.team.workitem.newWorkItem');
	            }
	          });
	        }
	      });
	    });
	    promiseTracker('fullSpin')
	      .addPromise(promise, 'Creating $0...'.format(workItem.item['dc:title']));
	    
	};

	$scope.approvalClick = function(approvalItem){
		approvalService.item = approvalItem;
		approvalService.approvalValue = $scope.approvalValue;
		approvalService.projectAreaId = $scope.projectArea.projectId;
		approvalService.repository = settings.repository;
		$location.path('/approval');
	};

}]);
