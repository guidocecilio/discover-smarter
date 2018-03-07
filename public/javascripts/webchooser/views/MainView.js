/** @jsx React.DOM */
(function(React, webchooser) {
	webchooser.view.MainView = React.createClass({displayName: 'MainView',
		render: function(){
			return (
				React.DOM.div({className: "main-content-wrapper"}, 
					React.DOM.div({className: "navbar navbar-default navbar-static-top", role: "navigation"}, 
						React.DOM.div({className: "container"}, 
							React.DOM.div({className: "navbar-header"}, 
								React.DOM.a({className: "navbar-brand", href: "#"}, "SmarterData")
							), 
							React.DOM.div({id: "navbar", className: "navbar-collapse collapse"}
							)
						)
					), 
					React.DOM.div({className: "container-fluid"}, 
						React.DOM.div({className: "row"}, 
							React.DOM.div({id: "view", className: "col-md-12"})
						)
					), 
					webchooser.component.ContentLoader(null)
				)
			);
	 	}
	});
	
	webchooser.component.ContentLoader = React.createClass({displayName: 'ContentLoader',
		componentDidMount: function() {
			this.hideLoader();
		},
		/**
		Method shows the loading mask when switching views.
 
		@method showLoader
		**/
		showLoader: function() {
			$(this.getDOMNode()).fadeIn();
		},
 
		/**
		Method hides the loading mask when switching views.
 
		@method hideLoader
		**/
		hideLoader: function() {
			$(this.getDOMNode()).fadeOut();
		},
		
		render: function() {
			return (
				React.DOM.div({id: "contentLoader", className: "sd-loader"})
			);
		}
	});
})(React, webchooser);