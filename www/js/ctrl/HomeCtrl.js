angular.module('clearConcert')

.controller('HomeCtrl',['$scope','$location', 'Favorites', 'settings', 
                        function($scope, $location, Favorites, settings){
	$scope.search={
		text:""
	};
	
	$scope.queryFavsLength = Favorites.getFavsByType(settings.repository, favoriteTypes.QUERY).length;
	$scope.buildFavsLength = Favorites.getFavsByType(settings.repository, favoriteTypes.BUILD).length;
	$scope.workItemsFavsLength =
		Favorites.getFavsByType(settings.repository, favoriteTypes.WORKITEM).length;
	$scope.searchFavsLength = Favorites.getFavsByType(settings.repository, favoriteTypes.SEARCH).length;
	
	$scope.go = function(target) {
		$scope.$hidePanel();
		$location.path('/' + target);
	};

}]);