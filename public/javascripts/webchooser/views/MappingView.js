/** @jsx React.DOM */
(function(React, webchooser) {
	var TabbedArea = webchooser.component.TabbedArea;
	var TabPane = webchooser.component.TabPane;
	var Alert = webchooser.component.Alert;
	
    webchooser.component.EntityTabs = React.createClass({displayName: 'EntityTabs',
            componentDidMount: function(prevProps, prevState) {
                var tabs = $(this.getDOMNode());
                tabs.tabs();
                self = this;
                tabs.delegate( "span.ui-icon-close", "click", function() {
      				var value = ($(this).text());
      				entity = _.findWhere(self.props.entities,{name:value});
      				self.props.onRemove(entity);
    			});
    			tabs.tabs({
                    active: -1
                });
    			if (this.props.entities.length == 0) tabs.hide();
            },
            componentDidUpdate: function(prevProps, prevState) {
                var tabs = $(this.getDOMNode());
                tabs.show();
                tabs.tabs("refresh");
                if (this.props.entities.length == 0) tabs.hide();
            },
            handleChange: function (entity){
            	this.props.onChange(entity);
            },
            handleRemove: function (entity){
            	this.props.onRemove(entity);
            },
            render: function() {
            	_this = this;
            	var showlinks = false;
                var li = this.props.entities.map(function(entity) {
                    href = "#" + entity.name;
                    title = entity.name.replace("_"," ");
                    name = entity.name;
                    return (
                    	React.DOM.li(null, 
                    		React.DOM.a({href: href}, title), 
                    		React.DOM.span({className: "ui-icon ui-icon-close", role: "presentation"}, name)
                    	)
                    );
                }); 
                if (this.props.entities.length > 1) showlinks = true;
                var divs = this.props.entities.map(function(entity) {
                	var linkstable = "";
                	if (showlinks) {
                		linkstable = webchooser.component.LinksTable({entity: entity, onChange: _this.handleChange, all: _this.props.entities})
                	}
                    return (
                    	React.DOM.div({id: entity.name}, 
                    		webchooser.component.MappingTable({onRemove: _this.handleRemove, onChange: _this.handleChange, columns: _this.props.columns, sampleRow: _this.props.sampleRow, entity: entity}), 
                    	    linkstable, 
                    	    React.DOM.br(null)
                    	)
                    );
                });
                return (
                	React.DOM.div({class: "tabs-control"}, 
                		React.DOM.ul(null, 
                			li
                		), 
                			divs
                	)
                );
            }
        }),
        webchooser.component.ClassSearchBox = React.createClass({displayName: 'ClassSearchBox',
            componentDidMount: function(prevProps, prevState) {
                var index = ontology_catalogue;
                var autocomplete = $(this.getDOMNode()).find("input").autocomplete({
                    source: function(request, response) {
                        jQuery.get(index, {
                            q: request.term,
                            type: "class",
                            size: 20,
                            fields: ['_id']
                        }, function(data) {
                            hits = data.hits.hits;
                            fill = [];
                            for (key in hits) {
                                desc = hits[key]._source.comment
                                if (desc == undefined) desc = hits[key]._id;
                                fill.push({
                                    id: hits[key]._id,
                                    value: hits[key]._id,
                                    label: hits[key]._source.localName,
                                    prefix: hits[key]._source.vocabulary.prefix,
                                    onto: hits[key]._source.vocabulary.label,
                                    desc: desc
                                });
                            }
                            response(fill);
                        });
                    },
                    minLength: 1
                });
                autocomplete.data("ui-autocomplete")._renderItem = function(ul, item) {
                    return $("<li>")
                        .data("ui-autocomplete-item", item)
                        .append("<a>" + "<span class='label label-primary'>" + item.prefix + "</span>&nbsp;<b>" + item.label + "</b><br/><span class='onto'>" + item.onto + "</span><br/><i><small>" + item.desc + "</small></i></a>")
                        .appendTo(ul);
                };
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
                	React.DOM.div(null, 
                		React.DOM.br(null), 
                		React.DOM.input({size: "45", text: "text"}), 
                		" ", 
                		React.DOM.button({className: "btn btn-primary btn-sm", onClick: this.onClick}, 
                			"Add Entity"
                		)
                	)
                );

            }
        }),
		
		/**
		*/
	    webchooser.component.TypeaheadClassSearchBox = React.createClass({displayName: 'TypeaheadClassSearchBox',
			getInitialState: function() {
				return { itemValue: {} };				
			},
			componentDidMount: function(prevProps, prevState) {
	            var index = ontology_catalogue;
            
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
								type: 'class',
								size: 20,
								fields: ['_id']
						}),
						filter: function(parsedResponse) {
							var hits = parsedResponse.hits.hits, fill = [];
							for (key in hits) {
								desc = hits[key]._source.comment
								if (desc === undefined) {
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
							'Unable to find any class that match the current criterial',
							'</div>'
						].join('\n'),
						suggestion: function(d) { 
							return "<span class='label label-primary'>" + d.prefix + "</span>&nbsp;<b>" + d.label + "</b><br/><span class='onto'>" + d.onto + "</span><br/><i><small>" + d.desc + "</small></i>";
						}
					}
				}).bind('typeahead:selected', function(e, datum, name) {
					e.stopPropagation();
					e.preventDefault();
					this.setState({ itemValue: datum });
					if (this.props.hasOwnProperty('onSelected') && _.isFunction(this.props.onSelected)) {
						this.props.onSelected(datum);
					}	
				}.bind(this));
			},
			
			componentWillUnmount: function() {
				$(this.getDOMNode()).find('.typeahead').typeahead('destroy');
			},
		
	        onClick: function(e) {
				var el = $(this.getDOMNode()).find('.typeahead'),
				type = el.typeahead('val'),
                name = type.split('/').pop().split('#').pop();
				el.typeahead('val', '');
				console.log(this.state.itemValue);
                this.props.onAddEntity($.extend(this.state.itemValue, {type: type, name: name}));
            },
		
	        render: function() {
				return (
					React.DOM.div({id: this.props.id}, 
					  React.DOM.input({className: "form-control typeahead normal", type: "text", size: "45", placeholder: "Classes"}), 
					  React.DOM.button({className: "btn btn-primary", onClick: this.onClick}, "Add Entity")
					)
				);
			}
		}),
				
        webchooser.component.PropertySearchBox = React.createClass({displayName: 'PropertySearchBox',
            componentDidMount: function(prevProps, prevState) {
                var index = ontology_catalogue;
                var autocomplete = $(this.getDOMNode()).find("input").autocomplete({
                    source: function(request, response) {
                        jQuery.get(index, {
                            q: request.term,
                            type: "property",
                            size: 20,
                            fields: ['_id']
                        }, function(data) {
                            hits = data.hits.hits;
                            fill = [];
                            for (key in hits) {
                                desc = hits[key]._source.comment
                                if (desc == undefined) desc = hits[key]._id;
                                fill.push({
                                    id: hits[key]._id,
                                    value: hits[key]._id,
                                    label: hits[key]._source.localName,
                                    prefix: hits[key]._source.vocabulary.prefix,
                                    onto: hits[key]._source.vocabulary.label,
                                    desc: desc
                                });
                            }
                            response(fill);
                        });
                    },
                    minLength: 1
                });
                autocomplete.data("ui-autocomplete")._renderItem = function(ul, item) {
                    return $("<li>")
                        .data("ui-autocomplete-item", item)
                        .append("<a>" + "<span class='label label-primary'>" + item.prefix + "</span>&nbsp;<b>" + item.label + "</b><br/><span class='onto'>" + item.onto + "</span><br/><i><small>" + item.desc + "</small></i></a>")
                        .appendTo(ul);
                };
            },
            handleChange : function (e){
            	var value = $(this.getDOMNode()).find("input").val();
            	this.props.onChange(value);
            },
            render: function() {
                return (
                	React.DOM.div(null, 
                		React.DOM.input({type: "text", value: this.props.property, size: "45", onBlur: this.handleChange, onChange: this.handleChange})
                	)
                );

            }
        }),
		
		/**
		*/
	    webchooser.component.TypeaheadPropertySearchBox = React.createClass({displayName: 'TypeaheadPropertySearchBox',
			componentDidMount: function(prevProps, prevState) {
	            var index = ontology_catalogue;
            
				var engine = new Bloodhound({
					datumTokenizer: function(datum) {
						return Bloodhound.tokenizers.obj.whitespace('value')
					},
					queryTokenizer: Bloodhound.tokenizers.whitespace,
					// `states` is an array of state names defined in "The Basics"
					//local: $.map(this.state.data, function(state) { return { value: state }; }),
					remote: {
						url: index + '?q=' + this.props.onto + ' %QUERY&' + $.param({
								type: 'property',
								size: 20,
								fields: ['_id']
						}),
						filter: function(parsedResponse) {
							var hits = parsedResponse.hits.hits, fill = [];
							for (key in hits) {
								desc = hits[key]._source.comment
								if (desc === undefined) {
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
 			   	
				var $el = $(this.getDOMNode()).find('.typeahead');
 				$el.typeahead({
					hint: true,
					highlight: true,
					minLength: 1
				},	{
					name: 'Property',
					displayKey: 'value',
					// `ttAdapter` wraps the suggestion engine in an adapter that
					// is compatible with the typeahead jQuery plugin
					source: engine.ttAdapter(),
					templates: {
						empty: [
							'<div class="empty-message">',
							'Unable to find any class that match the current criterial',
							'</div>'
						].join('\n'),
						suggestion: function(d) { 
							return "<span class='label label-primary'>" + d.prefix + "</span>&nbsp;<b>" + d.label + "</b><br/><span class='onto'>" + d.onto + "</span><br/><i><small>" + d.desc + "</small></i>";
						}
					}
				}).bind('typeahead:selected', function(e, datum, name) {
					e.stopPropagation();
					e.preventDefault();
					if (this.props.hasOwnProperty('onSelected') && _.isFunction(this.props.onSelected)) {
						this.props.onSelected(datum);
					}	
				}.bind(this));
				
				$el.typeahead('val', this.props.property);
			},
			
			componentWillUnmount: function() {
				$(this.getDOMNode()).find('.typeahead').typeahead('destroy');
			},
		
			handleChange: function(e) {
				var el = $(this.getDOMNode()).find('.typeahead'),
				value = el.typeahead('val');
				this.props.onChange(value);
			},
			
			handleOnFocus: function() {
				
			},
			
			render: function() {
				return (
					React.DOM.div({id: this.props.id}, 
					  React.DOM.input({className: "form-control typeahead compact", type: "text", placeholder: "Property", size: "45", onBlur: this.handleChange, onChange: this.handleChange, onFocus: this.handleOnFocus})
					)
				);
			}
		}),
		
	    webchooser.component.MappingTable = React.createClass({displayName: 'MappingTable',
        	handleDelete : function (mapping){
        		changedEnity = this.props.entity;
        		changedEnity.mappings = _.without(this.props.entity.mappings,_.findWhere(this.props.entity.mappings, mapping))
        		this.props.onChange(changedEnity);
        	},
        	handleChange : function (mapping){
        		changedEnity = this.props.entity;
        		org_mapping = _.findWhere(changedEnity, {id:mapping.id}) 
        		org_mapping = mapping;
        		this.props.onChange(changedEnity);
        	},
        	handleAddMapping : function (e){
        		var value = $(this.getDOMNode()).find(".addColumn").val();
        		changedEnity = this.props.entity;
        		id = _.max(changedEnity.mappings, function(o){return o.id;}).id + 1;
        		sample = this.props.sampleRow[this.props.columns.indexOf(value)]
        		changedEnity.mappings.push({id:id,column:value,property:"",example:sample,"type":"string"});
        		this.props.onChange(changedEnity);
        	},
        	handleEntityDelete : function (e){
        		this.props.onRemove(this.props.entity);
        	},
        	handleChangeLabel : function (e){
        		var value = $(this.getDOMNode()).find("select").val();
        		entity = this.props.entity;
        		entity.label = value;
        		this.props.onChange(entity);
        	},
            render: function() {
            	_this = this;
                var trs = this.props.entity.mappings.map(function(mapping) {
                    return (
                    	webchooser.component.MappingRow({onChange: _this.handleChange, onto: _this.props.entity.onto, onDelete: _this.handleDelete, mapping: mapping})
                    );
                });
                
            	var options = this.props.columns.map(function(col) {
                    return (
                    	React.DOM.option(null, col)
                    );
                });
				
				var selectStyle = {
					width: '100px',
					display: 'inline'
				};
				
				var buttonStyle = {
					'margin-top': '-1px'
				};
								
                return (
                	React.DOM.div(null, 
                	"Label:  ", React.DOM.select({className: "form-control", style: selectStyle, value: _this.props.entity.label, onChange: _this.handleChangeLabel}, options), React.DOM.br(null), React.DOM.br(null), 
                	React.DOM.table({className: "table table-striped table-hover table-condensed mapping-table", width: "100%"}, 
                		React.DOM.thead(null, 
							React.DOM.tr(null, 
	                			React.DOM.th(null, "Column Name"), 
	                			React.DOM.th(null, "Property"), 
	                			React.DOM.th(null, "Example Value"), 
	                			React.DOM.th(null, "Type"), 
	                			React.DOM.th(null)
	                		)
						), 
                		React.DOM.tbody(null, 
                			trs
                		)
                	), 
                	React.DOM.br(null), 
                	React.DOM.span({className: "pull-right"}, 
                		React.DOM.select({className: "addColumn form-control", style: selectStyle}, options), " ", 
                		React.DOM.button({onClick: _this.handleAddMapping, type: "button", style: buttonStyle, className: "btn btn-default btn-sm"}, 
                			React.DOM.span({className: "glyphicon glyphicon-plus"}), "Add Column"
                		)
                	), React.DOM.br(null), React.DOM.br(null)
                	)
                );
            }
        }),
		
        webchooser.component.LinksTable = React.createClass({displayName: 'LinksTable',
        	handleClick : function (e) {
        		var value = $(this.getDOMNode()).find("select").val();
        		changedEnity = this.props.entity;
        		if (changedEnity.links == undefined) {
        			changedEnity.links = [];
        			id = 1;
        		}else {
        			id = _.max(changedEnity.links, function(o){return o.id;}).id + 1;
        		}
        		changedEnity.links.push({id:id,entity:value,property:""});
        		this.props.onChange(changedEnity);
        	},
        	handleLinkDelete : function (link) {
        		changedEnity = this.props.entity;
        		changedEnity.links = _.without(this.props.entity.links,_.findWhere(this.props.entity.links, link))
        		this.props.onChange(changedEnity);
        	},
        	handleChange : function (link) {
        		changedEnity = this.props.entity;
        		org_link = _.findWhere(changedEnity, {id:link.id}) 
        		org_link =link;
        		this.props.onChange(changedEnity);
        	},
			handleOnSelected: function(value) {
				console.log(value);
			},
            render: function() {
            	var _this = this; 
            	var options = this.props.all.map(function(entity) {
            		if (_this.props.entity.name == entity.name) return;
                    return (
                    	React.DOM.option(null, entity.name)
                    );
                });
                var links = "";
                if (this.props.entity.links != undefined){
                	links = this.props.entity.links.map(function(link){
                		return (
                			webchooser.component.LinkRow({link: link, onChange: _this.handleChange, onto: _this.props.entity.onto, onDelete: _this.handleLinkDelete})
                	)	;
                	});
                }
                var table =
                	React.DOM.table({className: "table-striped table-hover", width: "100%"}, 
                		React.DOM.thead(null, React.DOM.tr(null, React.DOM.th(null, "Entity"), React.DOM.th(null, "Property"), React.DOM.th(null))), 
                		React.DOM.tbody(null, 
                			links
                		)
                	)
            	if (this.props.entity.links == undefined || this.props.entity.links.length == 0 ) table = "";
				
				var selectStyle = {
					width: '100px',
					display: 'inline'
				};
				var buttonStyle = {
					'margin-top': '-1px'
				};
				
	          	return (
                	    React.DOM.div(null, 
                			table, 
                		React.DOM.br(null), 
                		React.DOM.span({className: "pull-right"}, 
                			React.DOM.select({className: "form-control", style: selectStyle}, 
                				options
                			), 
                			" ", 
                			React.DOM.button({className: "btn btn-default btn-sm", style: buttonStyle, onClick: this.handleClick}, 
                				React.DOM.span({className: "glyphicon glyphicon-link"}), "Link"
                			)
                		)
                		)
                );
            }
        }),        
		
        webchooser.component.LinkRow = React.createClass({displayName: 'LinkRow',
        	handleRemove : function (e){
        		this.props.onDelete(this.props.link);
        	},
        	handlPropertyChange : function (value){
        		var link = this.props.link;
        		link.property = value;
        		this.props.onChange(link);
        	},
            render: function() {
                return (
                		React.DOM.tr({bgcolor: "black"}, 
                			React.DOM.td(null, React.DOM.span({className: "glyphicon glyphicon-link", 'aria-hidden': "true"}), " ", this.props.link.entity), 
							React.DOM.td(null, webchooser.component.TypeaheadPropertySearchBox({id: this.props.link.id, property: this.props.link.property, onto: this.props.onto, onChange: this.handlPropertyChange})), 
                			React.DOM.td(null, 
                    			React.DOM.button({type: "button", onClick: this.handleRemove, className: "btn btn-danger btn-xs"}, React.DOM.span({className: "glyphicon glyphicon-remove"}))
                    		)
                		)
                );
            }
        }),        
		/**
		Refresent the MappingRow componet
		*/
        webchooser.component.MappingRow = React.createClass({displayName: 'MappingRow',
        	onRemoveClick : function (e){
        		this.props.onDelete(this.props.mapping)
        	},
        	handlPropertyChange : function (value){
        		var mapping = this.props.mapping;
        		mapping.property = value;
        		this.props.onChange(mapping);
        	},
        	handleDataTypeChange : function (e){
        		var value = $(this.getDOMNode()).find("select").val();
        		var mapping = this.props.mapping;
        		mapping.type = value;
        		this.props.onChange(mapping);
        	},
			render: function() {
            	_this = this;
                return (
                    	React.DOM.tr(null, 
                    		React.DOM.td(null, React.DOM.span({className: "glyphicon glyphicon-tag", 'aria-hidden': "true"}), " ", this.props.mapping.column), 
                    		React.DOM.td(null, webchooser.component.TypeaheadPropertySearchBox({id: this.props.mapping.id, property: this.props.mapping.property, onto: this.props.onto, onChange: _this.handlPropertyChange})), 
                    		React.DOM.td(null, this.props.mapping.example), 
                    		React.DOM.td(null, 
                    			React.DOM.select({className: "form-control", value: this.props.mapping.type, onChange: _this.handleDataTypeChange}, 
                    				React.DOM.option({value: "http://www.w3.org/2001/XMLSchema#string"}, "String"), 
                    				React.DOM.option({value: "http://www.w3.org/2001/XMLSchema#decimal"}, "Decimal"), 
                    				React.DOM.option({value: "http://www.w3.org/2001/XMLSchema#integer"}, "Integer"), 
                    				React.DOM.option({value: "http://www.w3.org/2001/XMLSchema#float"}, "Float"), 
                    				React.DOM.option({value: "http://www.w3.org/2001/XMLSchema#double"}, "Double"), 
                    				React.DOM.option({value: "http://www.w3.org/2001/XMLSchema#double"}, "Boolean"), 
                    				React.DOM.option({value: "http://www.w3.org/2001/XMLSchema#dateTime"}, "DateTime")
                    			 )
                    	 	), 
                    	 	React.DOM.td(null, 
                    			React.DOM.button({type: "button", onClick: _this.onRemoveClick, className: "btn btn-danger btn-xs"}, React.DOM.span({className: "glyphicon glyphicon-remove"}))
                    		)
                    	 )
                );
            }
        }),
		
		webchooser.view.MappingView = React.createClass({displayName: 'MappingView',
			requestMappingHeaders: function(filename) {
				var xhr = webchooser.storage.ajax({
					url: '/tail/' + filename + '/2',
					success: function(resp) {
						this.setState({
							columns: resp[0].split(','),
							sampleRow: resp[1].split(','),
							mappingFile : filename,
							entities : []
						});
  					}.bind(this)
				});
			},
			
			requestMappingState: function(filename) {
				var file = filename.split('.')[0];
				webchooser.storage.ajax({
					url: '/textfile/' + file + '.mappingFile', 
					success: function(data) {
						var data = JSON.parse(data);
		  				this.setState({
							columns: data.columns,
							sampleRow: data.sampleRow,
							mappingFile: data.mappingFile,
							entities: data.entities
						});
					}.bind(this),
					error: function(jqXHR) {
						this.requestMappingHeaders(filename);
					}.bind(this)
				});
			},
			
			updateStateFromProps: function(props) {
				// this is a dirty but quick solution to the issue that we cannot use setState
				// un a property transition.
				this.state.columns = props.columns;
				this.state.sampleRow = props.sampleRow;
				this.state.mappingFile = props.mappingFile;
			},
			
			shouldComponentUpdate: function(nextProps, nextState) {
				if (this.props.mappingFile !== nextProps.mappingFile) {
					if (!nextProps.columns.length) {
						//this.requestMappingHeaders(nextProps.mappingFile);
						//loads the mapping file 
						this.requestMappingState(nextProps.mappingFile);
						return true;
					}
					else {
						this.updateStateFromProps(nextProps);
						return true;
					}
				}
				return true;
			},
			
			getInitialState: function() {
                return {
                    entities: [],
					columns: [],
					sampleRow: [],
					mappingFile: ''
                }
            },
            handleAddEntity: function(entity) {
            	var validurl = new RegExp("^(http|https|ftp)\://([a-zA-Z0-9\.\-]+(\:[a-zA-Z0-9\.&amp;%\$\-]+)*@)*((25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9])\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[0-9])|([a-zA-Z0-9\-]+\.)*[a-zA-Z0-9\-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{2}))(\:[0-9]+)*(/($|[a-zA-Z0-9\.\,\?\'\\\+&amp;%\$#\=~_\-]+))*$");
 				if (!validurl.test(entity.type)){
 					alert ("Not a valid class type");
 					return;
 				}
                entities = this.state.entities;
                name = entity.name; 
                count = 2;
                name = name.split(".").join("_");
                while ( _.findWhere(entities, {name:name}) != undefined ){
                	name = name + "_" + count;
                	count ++;
                }
                entity.name = name;
                entity.uri = "http://smarterdata/" + name + "/rownum";
                entity.label = this.state.columns[0];
                entity.mappings = [];
                _this = this;
                this.state.columns.map(function (col){
                	id = entity.mappings.length+1;
                	samplevalue = _this.state.sampleRow[id-1];
                	entity.mappings.push ({id: id ,column:col,property:"",example:samplevalue,"type":"http://www.w3.org/2001/XMLSchema#string"});
                });
                entities.push(entity);
                this.setState({
                    entities: entities,
                });
            },
            handleChange: function(changedEntity) {
            	_entities = this.state.entities;
            	entity = _.findWhere(_entities, {name:changedEntity.name});
            	entity.mappings = changedEntity.mappings;
            	this.setState({
                    entities: _entities,
                });
                console.log (this.state.entities);
            },
            handleRemove : function (removedEntity){
            	entities = this.state.entities;
            	entities = _.without(entities,_.findWhere(entities, {name:removedEntity.name}))
            	this.setState({
                    entities: entities,
                });
            },
            componentDidMount: function(prevProps, prevState) {
            	$(this.getDOMNode()).find( "#dialog" ).dialog({
      				autoOpen: false,
      				width: 1000,
      				buttons: [
    					{
      						text: "Close",
      						click: function() {
        						$( this ).dialog( "close" );
      						}	
    					}
 					]
    			});
    			$(this.getDOMNode()).find("#progress").dialog({
					dialogClass: "no-close",
                    width: 400,
                    modal: true,
                    autoOpen: false
                });
            },
            getTarqlSource : function(){
            	var tarql ="";
            	var bindclause = "", constructclause = "";
            	var prefix = "http://smarterdata/";
            	var count = 0;
            	this.state.entities.map(function (entity){
            		constructclause +=  "\t?" + entity.name + "\ta\t<" + entity.type +">;\n"
            		constructclause +=  "\t\t<http://www.w3.org/2000/01/rdf-schema#label>\t?" + entity.label + ";\n"
            		uri = prefix + entity.name + "/";
            		bindclause +=  "\tBIND(URI(CONCAT('" + uri + "',STR(?ROWNUM))) AS ?" + entity.name+")\n";
            		entity.mappings.map(function (mapping){
            			if (mapping.property == "") return;
            			name = "v" + count;
            			count++;
            			if (mapping.type == "http://www.w3.org/2001/XMLSchema#string"){
            				bindclause +=  "\tBIND(?"+mapping.column.replace(" ","_")+" AS ?"+name+")\n";
            			}else{
            				bindclause +=  "\tBIND(STRDT(?"+mapping.column.replace(" ","_")+",<"+mapping.type+">) AS ?"+name+")\n";
            			}
            			constructclause+= "\t\t<" + mapping.property + ">\t?" + name + ";\n"; 
            		});
            		if (entity.links != undefined) {
            			entity.links.map(function (link){
            				if (link.property == "") return;
            				constructclause+= "\t\t<" + link.property + ">\t?" + link.entity + ";\n"; 
            			});
            		}
            		constructclause = constructclause.substring(0,constructclause.length-2) + ".\n"
            	});
            	constructclause = "CONSTRUCT {\n" + constructclause + "}";
            	bindclause= "WHERE {\n" + bindclause + "}";
            	tarql += "\n" + constructclause;
            	tarql +="\nFROM <" + this.state.mappingFile + ">" 
            	tarql += "\n" + bindclause;
            	return tarql;
            },
            handleGetSource : function (e){
            	tarql = this.getTarqlSource();
            	html = tarql.replace(/"/g, '&quot;').replace(/&/g, '&amp;').replace(/>/g, '&gt;').replace(/</g, '&lt;');
            	$("#dialog").html($("<pre/>").append(html));
            	$("#dialog").dialog("open");  
            	
            },
            handleSave : function (e){
            	var file = this.props.mappingFile.split(".")[0];
            	var saved = false;
            	var tarql =  this.getTarqlSource();
            	post_mapping = {
					type: "POST",
					dataType : "text",
					headers : {"Content-Type" : "text/plain"},
					url : "/textfile/" + file + "/mappingFile",
					data: JSON.stringify(this.state),
					success: function(response) {
						saved = true;
					}
				}
				post_tarql = {
					type: "POST",
					dataType : "text",
					headers : {"Content-Type" : "text/plain"},
					url : "/textfile/" + file + "/tarql",
					data: tarql,
					success: function(response) {
						saved = true;
					}
				}	
				$.ajax(post_mapping);
				$.ajax(post_tarql);	
            },
            handleBuild : function (e){
            	var file = this.props.mappingFile.split(".")[0];
            	$("#progress").dialog('open');
            	$.get( "/api/convert/" + file, function( data ) {
            		$("#progress").dialog('close');
				}).fail(function(){
					alert("Failed to build HDT file");
					$("#progress").dialog('close');
				});
            },
			handleOnSelected: function(value) {
				console.log(value);
			},
            render: function() {
            	var header;
            	var tabs = "";
				var preview = [];
				//header = <Alert bsStyle="info">No CSV file selected, select a CSV file from source tab</Alert>
            	if (this.state.mappingFile == '') header = React.DOM.div({className: "alert alert-info", role: "alert"}, " No CSV file selected, select a CSV file from source tab")
            	else header =  
            		React.DOM.div(null, 
            			webchooser.component.TypeaheadClassSearchBox({id: "class-search-box", onAddEntity: this.handleAddEntity, onSelected: this.handleOnSelected}), 
            				React.DOM.div({className: "btn-group pull-right"}, 
            					React.DOM.button({className: "btn btn-info", onClick: this.handleGetSource}, React.DOM.span({className: "glyphicon glyphicon-list-alt"}), " Source"), 
            					React.DOM.button({className: "btn btn-info", onClick: this.handleSave}, React.DOM.span({className: "glyphicon glyphicon-floppy-disk"}), " Save"), 
            					React.DOM.button({className: "btn btn-info", onClick: this.handleBuild}, React.DOM.span({className: "glyphicon glyphicon-ok"}), " Build")
            				)
            		)
            	for ( i = 0 ; i < this.state.columns.length; i++){
            		row  = React.DOM.tr(null, React.DOM.td(null, i), React.DOM.td(null, this.state.columns[i]), React.DOM.td(null, this.state.sampleRow[i]))
            		preview.push(row);
            	}
            	if (this.state.mappingFile != '') {
					tabs  = 
						React.DOM.div(null, 
						React.DOM.h3(null, "List of columns in CSV"), 
						React.DOM.table({className: "table table-striped table-bordered table-hover table-condensed", width: "100%"}, 
							React.DOM.thead(null, 
								React.DOM.tr(null, React.DOM.th(null), React.DOM.th(null, "Columns"), React.DOM.th(null, "Example Value"))
							), 
							React.DOM.tbody(null, preview)
						)
						)
				}
            	if ( this.state.entities.length > 0 ) tabs = webchooser.component.EntityTabs({onRemove: this.handleRemove, onChange: this.handleChange, entities: this.state.entities, columns: this.state.columns, sampleRow: this.state.sampleRow})
				return (
                	React.DOM.div(null, 
                		React.DOM.h2(null, this.state.mappingFile), 
                		header, 
                		React.DOM.br(null), 
                		React.DOM.br(null), 
                		tabs, 
                		React.DOM.div({id: "dialog", title: "TARQL mapping"}
  						), 
  						React.DOM.div({id: "progress", title: "Converting Mapping into HDT/RDF"}, 
  							React.DOM.img({src: "/assets/images/smoke_loader.gif", alt: "Converting to HDT/RDF...", className: "center"})
  						), 
  						 React.DOM.br(null)
                	)
                );
            }
        });

})(React, webchooser);