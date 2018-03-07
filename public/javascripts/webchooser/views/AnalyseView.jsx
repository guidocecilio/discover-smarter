/** @jsx React.DOM */
(function(React, webchooser) {
	var Button = webchooser.component.Button;
	var Modal = webchooser.component.Modal;
	var ModalTrigger = webchooser.component.ModalTrigger;
	var OverlayMixin = webchooser.component.OverlayMixin;
	var OverlayTrigger = webchooser.component.OverlayTrigger;
	var Tooltip = webchooser.component.Tooltip;
	var TabbedArea = webchooser.component.TabbedArea;
	var TabPane = webchooser.component.TabPane;
	
	
	var LoadingButton = React.createClass({
	  getInitialState: function() {
	    return {
	      isLoading: false
	    };
	  },

	  render: function() {
	    var isLoading = this.state.isLoading;
	    return (
	        <Button
	          bsStyle="primary"
	          disabled={isLoading}
	          onClick={!isLoading ? this.handleClick : null}>
	          {isLoading ? 'Loading...' : 'Loading state'}
	        </Button>
	      );
	  },

	  handleClick: function() {
	    this.setState({isLoading: true});

	    // This probably where you would have an `ajax` call
	    setTimeout(function() {

	      // Completed of async action, set loading state back
	      this.setState({isLoading: false});
	    }.bind(this), 2000);
	  }
	});
	
	// Our custom component is managing whether the Modal is visible
	var CustomModalTrigger = React.createClass({
	  mixins: [OverlayMixin],

	  getInitialState: function () {
	    return {
	      isModalOpen: false
	    };
	  },

	  handleToggle: function () {
	    this.setState({
	      isModalOpen: !this.state.isModalOpen
	    });
	  },

	  render: function () {
	    return (
	      <Button onClick={this.handleToggle} bsStyle="primary">Launch</Button>
	    );
	  },

	  // This is called by the `OverlayMixin` when this component
	  // is mounted or updated and the return value is appended to the body.
	  renderOverlay: function () {
	    if (!this.state.isModalOpen) {
	      return <span/>;
	    }

	    return (
	        <Modal title="Modal heading" onRequestHide={this.handleToggle}>
	          <div className="modal-body">
	            This modal is controlled by our custom trigger component.
	          </div>
	          <div className="modal-footer">
	            <Button onClick={this.handleToggle}>Close</Button>
	          </div>
	        </Modal>
	      );
	  }
	});
	
    webchooser.component.Typeahead = React.createClass({
		componentDidMount: function(prevProps, prevState) {
            var index = "http://192.168.59.103:9200/lov/_search";
            
			var engine = new Bloodhound({
				datumTokenizer: function(datum) {
					console.log(datum);
					return Bloodhound.tokenizers.obj.whitespace('value')
				},
				queryTokenizer: Bloodhound.tokenizers.whitespace,
				// `states` is an array of state names defined in "The Basics"
				//local: $.map(this.state.data, function(state) { return { value: state }; }),
				remote: {
					url: index + '?q=%QUERY&' + $.param({
							type: "class",
							size: 20,
							fields: ['_id']
					}),
					filter: function(parsedResponse) {
						var hits = parsedResponse.hits.hits, fill = [];
						for (key in hits) {
							desc = hits[key]._source.comment
							if (desc == undefined) {
								desc = hits[key]._id;
							}
							fill.push({
								id: hits[key]._id,
								value: hits[key]._id,
								label: hits[key]._source.localName,
								prefix: hits[key]._source.vocabulary.prefix,
								onto: hits[key]._source.vocabulary.label,
								desc: desc
							});
						}
						return fill;
					}
				}
			});
 
			// kicks off the loading/processing of `local` and `prefetch`
			engine.initialize();
 
			$('#' + this.props.id + ' .typeahead').typeahead({
				hint: true,
				highlight: true,
				minLength: 1
			},	{
				name: 'Classes',
				displayKey: 'value',
				// `ttAdapter` wraps the suggestion engine in an adapter that
				// is compatible with the typeahead jQuery plugin
				source: engine.ttAdapter(),
				templates: {
					empty: [
						'<div class="empty-message">',
						'unable to find any Best Picture winners that match the current query',
						'</div>'
					].join('\n'),
					suggestion: function(d) { 
						return "<span class='label label-primary'>" + d.prefix + "</span>&nbsp;<b>" + d.label + "</b><br/><span class='onto'>" + d.onto + "</span><br/><i><small>" + d.desc + "</small></i>";
					}
				}
			});
        },
		
        onClick: function(e) {
            type = $(this.getDOMNode()).find("input").val();
            name = type.split("/").pop().split("#").pop()
            $(this.getDOMNode()).find("input").val("");
            this.props.onAddEntity({
                name: name,
                type: type
            });
        },
		
        render: function() {
			return (
				<div id={this.props.id}>
				  <input className="typeahead" type="text" placeholder="Classes" />
				  <button className="btn btn-primary btn-sm" onClick={this.onClick}>Add Entity</button>
				</div>
			);
		}
    }),
	
	
	 webchooser.view.AnalyseView = React.createClass({
		 
	 	render: function(){
			var wellStyles = {maxWidth: 400, margin: '0 auto 10px'};
			
			return (
				<div>
					<div>
						<webchooser.component.Typeahead id="bloodhound"/>
					</div>
						
				<div>
				<ButtonToolbar>
				      {/* Standard button */}
				      <Button>Default</Button>

				      {/* Provides extra visual weight and identifies the primary action in a set of buttons */}
				      <Button bsStyle="primary">Primary</Button>

				      {/* Indicates a successful or positive action */}
				      <Button bsStyle="success">Success</Button>

				      {/* Contextual button for informational alert messages */}
				      <Button bsStyle="info">Info</Button>

				      {/* Indicates caution should be taken with this action */}
				      <Button bsStyle="warning">Warning</Button>

				      {/* Indicates a dangerous or potentially negative action */}
				      <Button bsStyle="danger">Danger</Button>

				      {/* Deemphasize a button by making it look like a link while maintaining button behavior */}
				      <Button bsStyle="link">Link</Button>
				    </ButtonToolbar>
					</div>
					<div>
					      <ButtonToolbar>
					        <Button bsStyle="primary" bsSize="large">Large button</Button>
					        <Button bsSize="large">Large button</Button>
					      </ButtonToolbar>
					      <ButtonToolbar>
					        <Button bsStyle="primary">Default button</Button>
					        <Button>Default button</Button>
					      </ButtonToolbar>
					      <ButtonToolbar>
					        <Button bsStyle="primary" bsSize="small">Small button</Button>
					        <Button bsSize="small">Small button</Button>
					      </ButtonToolbar>
					      <ButtonToolbar>
					        <Button bsStyle="primary" bsSize="xsmall">Extra small button</Button>
					        <Button bsSize="xsmall">Extra small button</Button>
					      </ButtonToolbar>
					    </div>
						<div className="well" style={wellStyles}>
						      <Button bsStyle="primary" bsSize="large" block>Block level button</Button>
						      <Button bsSize="large" block>Block level button</Button>
						    </div>
							
							<div>
								<h1>Active state</h1>
								<ButtonToolbar>
							      <Button bsStyle="primary" bsSize="large" active>Primary button</Button>
							      <Button bsSize="large" active>Button</Button>
							    </ButtonToolbar>
							</div>
							
							<div>
								<h1>Disable state</h1>
							<ButtonToolbar>
							      <Button bsStyle="primary" bsSize="large" disabled>Primary button</Button>
							      <Button bsSize="large" disabled>Button</Button>
							    </ButtonToolbar>
							</div>
							
							<div>
								<h1>Button loading state</h1>
								<LoadingButton />
							</div>
							
							<div>
							    <CustomModalTrigger />
							</div>
							
							<div>
							<ButtonToolbar>
						      <OverlayTrigger placement="left" overlay={<Tooltip><strong>Holy guacamole!</strong> Check this info.</Tooltip>}>
						        <Button bsStyle="default">Holy guacamole!</Button>
						      </OverlayTrigger>
						      <OverlayTrigger placement="top" overlay={<Tooltip><strong>Holy guacamole!</strong> Check this info.</Tooltip>}>
						        <Button bsStyle="default">Holy guacamole!</Button>
						      </OverlayTrigger>
						      <OverlayTrigger placement="bottom" overlay={<Tooltip><strong>Holy guacamole!</strong> Check this info.</Tooltip>}>
						        <Button bsStyle="default">Holy guacamole!</Button>
						      </OverlayTrigger>
						      <OverlayTrigger placement="right" overlay={<Tooltip><strong>Holy guacamole!</strong> Check this info.</Tooltip>}>
						        <Button bsStyle="default">Holy guacamole!</Button>
						      </OverlayTrigger>
						    </ButtonToolbar>
							</div>
							
							<div>
								<TabbedArea defaultActiveKey={2}>
							      <TabPane key={1} tab="Tab 1">TabPane 1 content</TabPane>
							      <TabPane key={2} tab="Tab 2">TabPane 2 content</TabPane>
							    </TabbedArea>
							</div>
						</div>
		
			)
	 	}
	});
})(React, webchooser);