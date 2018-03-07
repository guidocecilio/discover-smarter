(function(React, webchooser) {

	webchooser.view.ViewManager = function() {
				
		var viewManager = {
			
			currentView: null,
			rootNode: document.getElementById('view'),
			
			getCurrentView: function() {
				return this.currentView;
			},
			
			/**
			
			@return {ReactComponent} A reference to the component.
			*/
			show: function(view) {
				if (this.currentView) {
					// http://facebook.github.io/react/docs/top-level-api.html#react.unmountcomponentatnode
					React.unmountComponentAtNode(this.rootNode);
				}
				
				this.currentView = view;
				return React.renderComponent(this.currentView, this.rootNode);
			}
		};
		
		//_.extend(viewManager, Backbone.Events);
		return viewManager;
	}
	
})(React, webchooser);