(function(Backbone, webchooser) {
	'use strict';
	/**
	Houses the Backbone.Router implementation.
 
	@class RouteManager
	@submodule router
	@namespace router
	**/
	webchooser.router.RouteManager = Backbone.Router.extend({
		/**
		* Property houses the Backbone routes
		*
		* @property routes
		* @type Object
		*/
		routes : {
	    	'': 'analyse',
			'analyse': 'analyse',
			'build': 'build',
			'build/:option': 'build',
			'view': 'view',
			'build/projects': 'projects',
			'build/mappings': 'mappings',
			'build/queries': 'queries',
			'build/ontologies': 'ontologies'
	  	},
		
		/**
		* Property houses the Backbone route current state/route
		*
		* @property currentRoute
		* @type Object
		*/
		currentRoute: null,

		build: function() {
			console.log('build reoute selected');
			var view = new webchooser.view.BuildView();
			webchooser.app.viewManager.show(view);
		},
		
		analyse: function() {
			var view = new webchooser.view.AnalyseView();
			webchooser.app.viewManager.show(view);
		},
		
		view: function() {
			var view = new webchooser.view.ViewView();
			webchooser.app.viewManager.show(view);
		},
	
		/**
		Listens for the route changes. When triggered it updates the class name
		on the HTML container and broadcasts the changed route.
	
		@method onRouteChanged
		@param {String} route Reference th the full route path	 
		*/
		onRouteChanged: function() {
			console.log('main onRouteChanged');
					
			var route= '', params = null;
			if (arguments.length === 2) {
				var r = arguments[0].split(':');
				route = (r[0] === 'router') ? r[1] : r[0];
				params = arguments[1];
			}
			else if (arguments.length === 3) {
				route = arguments[1];
				params = arguments[2];
			}
			
			console.log(route);
			console.log(params);
			
			delete this.currentRoute;
			this.currentRoute = {route: route, params: params};
		},
	
		/**
		Method initialize the router
	
		@method initialize
		*/
		initialize: function() {
			// Bind all routes so when they change, call the onRouteChanged
			// method.
			this.on('route', _.bind(this.onRouteChanged, this));
			
			// render the main view in the container
			var mainView = new webchooser.view.MainView();
			React.renderComponent(mainView, document.getElementById('container'));

			// initialize the ViewManager and append the Navbar
			webchooser.app.viewManager = new webchooser.view.ViewManager();
			
			// render the navbar into the main view
			var navbar = new webchooser.view.Navbar({
				router: this,
				options: webchooser.app.navbarOptions
			});
			React.renderComponent(navbar, document.getElementById('navbar'));
			
			// start routing
			Backbone.history.start();
		}
	});
	
})(Backbone, webchooser);