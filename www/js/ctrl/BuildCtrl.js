angular.module('clearConcert').controller('BuildCtrl',
		['$scope', '$loadDialog', '$location', '$routeParams', 'catalog', 'build',
		 function($scope, $loadDialog, $location, $routeParams, catalog, build){

			console.log(catalog.list());
			$scope.projects = catalog.list();
			
			$scope.getProjectBuilds = function(projectId) {
				var promise = build.buildsForProject(projectId).then(function(builds) {
					$scope.builds = builds;
					return builds;
				}, function(response) {
					//Dialog.error("Error Fetching Project Builds");
					alert("Error Fetching Project Builds");
				});
				$loadDialog.waitFor(promise, 'Loading Builds...');
				return promise;
			};
			
			$scope.selectProject = function(proj) {
				console.log(proj);
				$scope.getProjectBuilds(proj.projectId).then(function(builds) {
					$scope.builds = builds;
					if (builds.length === 0) {
						var err = "No Builds found in '$0'";
						//Toast.show(err.format(proj.title));
						alert(err.format(proj.title));
					} else {
						$location.path("/build/$0".format(proj.projectId));
					}
				});
			};
			
			$scope.go = function(target) {
			    $location.path('/'+target);
			  };
			}]);
