/** @jsx React.DOM */
(function(React, webchooser) {
	var RouterMixin = {
		componentWillMount : function() {
			this.callback = (function(route, params) {
				this.onRouteChange({route: route, params: params});
				this.forceUpdate();
			}).bind(this);
  
			this.props.router.on('route', this.callback);
		},
	  
		componentWillUnmount : function() {
			this.props.router.off('route', this.callback);
		}
	};
	
	webchooser.view.Navbar = React.createClass({
		mixins: [RouterMixin],
		
		onRouteChange: function(route) {
			console.log('onRouteChange');
			console.log(this.props.router.currentRoute);
			console.log(route);
		},
		
	 	render: function(){
			console.log('rendering nav');
			
			var rows = [], 
			self = this, 
			className = '';
			this.props.options.forEach(function(option) {
				if (self.props.router.currentRoute !== null) {
					className = (self.props.router.currentRoute.route === option.url) ? 'active' : '';
				}
				rows.push(
					React.DOM.li({className: className}, 
						React.DOM.a({href: '#' + option.url}, option.text)
					)
				);
			});
					
			return (
				React.DOM.ul({className: "nav navbar-nav"}, 
					rows
				)
			);
	 	}
	});
})(React, webchooser);