/** @jsx React.DOM */
(function(React, webchooser) {
	webchooser.component.DataTable = React.createClass({displayName: 'DataTable',
		defaultColumnDefs: [{
			// target is the visible columns that we would like to 
			// alter
			'targets': 3,
			'render': function(data, type, row) {
				return data;
			}
		}],
		
		getDefaultConfig: function() {
			return {
				data: this.props.data,
				columns: this.props.columns.map(function(d) {
					return { data: d, title: d.capitaliseFirstLetter() };
				}),
				// 'drawCallback': function() {
	// 						self.forceUpdate();
	// 					},
				// 'destroy': true,
				'columnDefs': typeof this.props.columnDefs !== "undefined" ? this.props.columnDefs : this.defaultColumnDefs
			};
		},
	 	
		onMappingButtonClicked: function() {
			console.log('plus button clicked');
		},
		
		getInitialState: function() {
	 		return {data: [], columns: []};
	 	},
	
	 	componentWillMount: function() {
			this.setState({data: this.props.data, columns: this.props.columns});
	 	},
		
		componentDidMount: function() {
	 		$('#mytable')
				.dataTable(this.getDefaultConfig())
				.addClass('table table-striped table-bordered');
	 	},
	
	 	componentDidUpdate: function(){
			$('#mytable').dataTable().fnDestroy();
			$('#mytable').dataTable(this.getDefaultConfig());
	 	},
	
	 	render: function() {
	 		// var rows = this.state.data.map(function(d, index) {
// 	 			return (
// 					<tr><td>{index+1}</td><td>{d.ma_lop}</td><td>{d.ten_mon_hoc}</td></tr>
// 				);
// 	 		});
// 			return (
// 				<table class="table table-bordered" cellspacing="0" width="100%" id="mytable">
// 						<thead>
//
// 						</thead>
// 						<tbody>
// 							{rows}
// 						</tbody>
// 					</table>
// 				</div>
// 			)
			return (
				React.DOM.table({className: "table", cellspacing: "0", width: "100%", id: "mytable"}
				)
			);
	 	}
	});
})(React, webchooser);