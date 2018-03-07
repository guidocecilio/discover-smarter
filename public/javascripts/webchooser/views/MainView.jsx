/** @jsx React.DOM */
(function(React, webchooser) {
	webchooser.view.MainView = React.createClass({
		render: function(){
			return (
				<div className="main-content-wrapper">
					<div className="navbar navbar-default navbar-static-top" role="navigation">
						<div className="container">
							<div className="navbar-header">
								<a className="navbar-brand" href="#">SmarterData</a>
							</div>
							<div id="navbar" className="navbar-collapse collapse">
							</div>
						</div>
					</div>
					<div className="container-fluid">
						<div className="row">
							<div id="view" className="col-md-12"></div>
						</div>
					</div>
					<webchooser.component.ContentLoader />
				</div>
			);
	 	}
	});
	
	webchooser.component.ContentLoader = React.createClass({
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
				<div id="contentLoader" className="sd-loader"></div>
			);
		}
	});
})(React, webchooser);