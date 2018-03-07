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
	
	var ProgressBar = React.createClass({
		propTypes: {
			min: React.PropTypes.number,
			now: React.PropTypes.number,
			max: React.PropTypes.number,
			label: React.PropTypes.renderable,
			srOnly: React.PropTypes.bool,
			striped: React.PropTypes.bool,
			active: React.PropTypes.bool
		},

		getDefaultProps: function () {
			return {
				bsClass: 'progress-bar',
				min: 0,
				max: 100
			};
		},

		getPercentage: function (now, min, max) {
			return Math.ceil((now - min) / (max - min) * 100);
		},
		
		render: function () {
			var classes = {
				'progress-bar': true
			};

			if (this.props.active) {
				classes['progress-bar-striped'] = true;
				classes['active'] = true;
			} else if (this.props.striped) {
				classes['progress-bar-striped'] = true;
			}
			return (
				<div className="progress">
					{this.renderProgressBar(classes)}
				</div>
			);
		},

		renderProgressBar: function(classes) {
			var percentage = this.getPercentage(
				this.props.now,
				this.props.min,
				this.props.max
			);
			
			return (
				<div className={classSet(classes)} role="progressbar" 
					style={{width: percentage + '%'}}
					aria-valuenow={this.props.now}
					aria-valuemin={this.props.min}
					aria-valuemax={this.props.max}>
		  	      	<span className="sr-only">
		  	        	{this.props.label}
		  	      	</span>
				</div>	
			);
	  },

	});
	
    webchooser.component.CSVFileLoader = React.createClass({
		getInitialState: function() {
			return { files: [] };
		},
		
		sendFile: function(file) {
			var uri = '/file';
			var xhr = new XMLHttpRequest();
			var fd = new FormData();
			
			// add even handlers to follow the upload progress
			// The listeners are bound to the XMLHttpRequest.upload object.
			xhr.upload.addEventListener('progress', function(e) {
				if (e.lengthComputable) {
					var percentage = Math.round((e.loaded * 100) / e.total);
					console.log(percentage);
					//self.ctrl.update(percentage);;
				}
			}, false);
			
			xhr.upload.addEventListener('load', function(e){
				console.log('finished');
				//canvas.parentNode.removeChild(canvas);
			}, false);
			
			// generate the POST request
			xhr.open('POST', uri, true);
			xhr.onreadystatechange = function() {
				if (xhr.readyState == 4 && xhr.status == 200) {
					var response = JSON.parse(xhr.response);
					if (response.status === 'SUCCESS') {
						if (response.clientUrl.split('.').pop() === 'error') {
							alert('An error has occurred in the server side. The original file name is: "' + response.originalFile + 
								'". And the client URL name ends in ".error" ("'+ response.clientUrl +'")');
						}
						else {
							this.removeFile(response.originalFile);
						}
					}
				}
			}.bind(this);
			fd.append('file', file);
						
			// Initiate a multipart/form-data upload
			xhr.send(fd);
		},
		
		componentDidMount: function(prevProps, prevState) {
			var _this = this;
			var dropZone = $(document).find('.dropzone');
			
			// check if there is at least one element with the class 
			// and use the first in the result as the drop zone.
			if (dropZone.length) {
				dropZone = dropZone[0];
			}
	
			var handleDragOver = function(e) {
				e.stopPropagation();
				e.preventDefault();
			};
					
			dropZone.addEventListener('dragover', handleDragOver, false);
			dropZone.addEventListener('drop', this.handleOnDropFile, false);
		},
		
		handleOnDropFile: function(e) {
			e.stopPropagation();
			e.preventDefault();

			this.pushFileListAndUpdateState(e.dataTransfer.files);
						
			// var filesArray = e.dataTransfer.files, destArray = [];
// 			for (var i = 0; i < filesArray.length; i++) {
// 				this.sendFile(filesArray[i]);
// 			}
		},
		
		handleFileSelect: function(e) {
			//var files = this.pushFileListAndUpdateState(e.target.files);
			this.pushFileListAndUpdateState(e.target.files);
			// invoke the parent handler	
			// this.props.updateSources(files);
		},
		
		_fileExists: function(filename) {
			var result = _.find(this.state.files, function(file) {
				return file.name === filename;
			});
			return result !== undefined;
		},
		
		pushFileListAndUpdateState: function(fileList) {
			var newFiles = [];
			for (var i = 0, f; f = fileList[i]; i++) {
				if (this._fileExists(f.name)) {
					alert('The file "' + f.name + '", already is in the list.');
				}
				else {
					newFiles.push(f);
				}
			}
			if (this.state.files.length) {
				newFiles = React.addons.update(this.state.files, {$push: newFiles});
			}
			this.setState({files: newFiles});
			
			return newFiles;
		},
		
		handleUpload: function(e) {
			var filename = e.currentTarget.getAttribute('data-fileid');
			
			var file = _.find(this.state.files, function(file) {
				return file.name === filename;
			});
			
			if (file !== 'undefined') {
				this.sendFile(file);
			}
		},
		
		removeFile: function(filename) {
			newFileList = [];
			
			_.each(this.state.files, function(file, index) {
				if (file.name !== filename) {
					newFileList.push(file);
				}
			});
			
			this.setState({files: newFileList});
		},
		
		hendleRemove: function(e) {
			var filename = e.currentTarget.getAttribute('data-fileid');
			this.removeFile(filename);
		},
		
		render: function() {
			var styles = {
				padding: '10px 1px 1px 1px'
			};
			
			var rows = this.state.files.map(function(f, index) {
	 			return (
					<tr className="template-upload fade in" data-file={f}>
						<td>
							<p className="name">{f.name}</p>
							<strong className="error text-danger"></strong>
						</td>
						<td>
							<p className="type">{f.type || 'n/a'}</p>
							<strong className="error text-danger"></strong>
						</td>
						<td>
							<p className="size">{f.size} bytes</p>
							<strong className="error text-danger"></strong>
						</td>
						<td>
							<p className="date">{f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a'}</p>
							<strong className="error text-danger"></strong>
						</td>
						<td>
							<div className="progress progress-striped active" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
								<div className="progress-bar progress-bar-success"></div>
							</div>
						</td>
						<td>
							<button className="btn btn-primary btn-xs start" data-fileid={f.name} onClick={this.handleUpload}>
								<i className="glyphicon glyphicon-upload btn-xs"></i>&nbsp;<span>Upload</span>
							</button>
							&nbsp;
							<button className="btn btn-warning btn-xs cancel" data-fileid={f.name} onClick={this.hendleRemove}>
								<i className="glyphicon glyphicon-remove-circle"></i>&nbsp;<span>Remove</span>
							</button>
						</td>
					</tr>
				);
	 		}.bind(this));
			
			// 
			var fileList = (rows.length) ?
				<table role="presentation" className="filelist table table-striped">
					<thead>
						<tr><th>Name</th><th>Type</th><th>Size</th><th>Last modified date</th><th>Progress</th><th>Actions</th></tr>
					</thead>
					<tbody className="files">{rows}</tbody>
				</table>
				: {};
			
			return (
				<div style={styles}>
					<div className="row fileupload-buttonbar">
						<div className="col-lg-7">
							<button className="btn btn-primary fileinput-button">
								<span className="glyphicon glyphicon-plus"></span><span>&nbsp;Add files...</span>
									<input accept="text/csv" onChange={this.handleFileSelect} type="file" name="files[]" multiple />
							</button>
							<div className="hide">
							<button type="submit" className="btn btn-primary start">
								<i className="glyphicon glyphicon-upload"></i>
								<span>Upload all</span>
							</button>
							<button type="reset" className="btn btn-warning cancel">
								<i className="glyphicon glyphicon-ban-circle"></i>
								<span>Cancel upload</span>
							</button>
							<button type="button" className="btn btn-danger delete">
								<i className="glyphicon glyphicon-trash"></i>
								<span>Delete</span>
							</button>
							<input type="checkbox" className="toggle" />
							<span className="fileupload-process"></span>
							</div>
						</div>
						<div className="hide">
						<div className="col-lg-5 fileupload-progress fade">
							<div className="progress progress-striped active" role="progressbar" aria-valuemin="0" aria-valuemax="100">
								<div className="progress-bar progress-bar-success" ></div>
							</div>
							<div className="progress-extended">&nbsp;</div>
						</div>
						</div>
					</div>
					{fileList}
				</div>
			);
		}
	});
	
	var BuildTabPanel = React.createClass({
		
		getInitialState: function() {
			return {sources: [], columns: [], mappingFile: '', fileColumns: [], sampleRow: []};
		},
		
		loadSources: function() {
			$.ajax({
				url: this.props.url,
				dataType: 'json',
				success: function(data) {
					var filteredData = _.filter(data, function(d) {
						return (d.name.split('.').pop().toLowerCase() === 'csv');
					});
					filteredData = _.map(filteredData, function(d, key) {
						return {
							id: key, 
							name: d.name, 
							location: '', 
							project: 1, 
							description: '', 
							dataType: '', 
							size: d.size, 
							lastUpdated: '2011/04/25', 
							mappedTo: '',
							columns: [],
							sampleRow: []
						};
					});
									
					this.setState({sources: filteredData, columns: ['name', 'size', 'lastUpdated', 'mappedTo']});
				}.bind(this),
				error: function(xhr, status, err) {
					console.error(this.props.url, status, err.toString());
				}.bind(this)
			});
		},
		/**
		*/
		componentDidMount: function() {
			this.loadSources();
			
			// Add event handler to the handle "plusbuttonclicked" notifications
	 		$('#sources').on('plusbuttonclicked', this.onMappingButtonClicked);
		},
		
	 	componentWillUnmount : function() {
			$('#sources').off('plusbuttonclicked', this.onMappingButtonClicked);
		},
		
		onClickPlusButton: function() {
			alert('it works!!!');
		},
		
		onMappingButtonClicked: function(e, sourceId) {
			e.stopPropagation();
			e.preventDefault();
			
			// sourceId = parseInt(sourceId);
			var source = _.find(this.state.sources, function(obj) { 
				return obj.id == sourceId; }
			);
			
			this.setState({
				'mappingFile': source.name,
				'sampleRow': source.sampleRow,
				'fileColumns': source.columns
			});

			// React.renderComponent(
// 				<ProgressBar label="progress" srOnly="true" striped="true" active="true" now="45" min="0" max="100"/>,
// 				e.target.parentNode
// 			);
						
			$('#build-tabs a[href="#mappings"]').tab('show');
		},
		
		handleUpdateSources: function(fileList) {
			console.log(fileList);
			var _this = this;
			
			var invalidFileList = [];
			for (var i = 0, f; f = fileList[i]; i++) {
				// if file mime type is not "text/csv" then discard the file
				if (f.type !== 'text/csv') {
					invalidFileList.push(f.name);
					continue;
				}
				
				var reader = new FileReader();
				var onloadedHandler = function(e) {
					console.log(e);
					
					if (e.target.readyState === FileReader.DONE) {
						var lines = e.target.result.split('\n').slice(0, 2);
					}
				};
				
				reader.onload = (function(file, context) {
					var _this = context, f = file;
					return function(e) {
						var lines = e.target.result.split('\n').slice(0, 2),
						columns = _this.state.columns,
						sources = _this.state.sources,
						localSources = sources.filter(function(obj) {
							return obj.id[0] === '_';
						});
						
						// var nameExists = (_.find(sources, function(s) {
// 							return s.name === f.name;
// 						}) === 'undefined') ? false : true;
						
						var newSource = {
							id: '_' + (localSources.length + 1),
							name: 'local_' + f.name,
							location: '',
							project: 1,
							description: '',
							dataType: '',
							size: f.size,
							lastUpdated: f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a',
							mappedTo: '',
							columns: lines[0].split(','),
							sampleRow: lines[1].split(',')
						};
						
						// var newstate = React.addons.update(_this.state, {sources: {$push: [newSource]}});
						sources.push(newSource);
						_this.setState({sources: sources, columns: columns});
					};
				})(f, this);
				// reader.onloadend = onloadedHandler;
				// Read in the image file as a data URL.
				reader.readAsText(f);
			}
		},	
		
		handleRefresh: function(e) {
			this.loadSources();
		},
		
	    render: function() {
			var _this = this;
			var columnDefs = [{
				// target is the visible columns that we would like to 
				// alter
				'targets': 3,
				'render': function(data, type, row) {
					return '<button type="button" class="btn btn-default btn-xs pull-right" onclick="$(this).trigger(\'plusbuttonclicked\',[\'' + row.id + '\']);"><span class="glyphicon glyphicon-plus"></span></button>';
				}
			}];
			return (
				<div>
					<ul className="nav nav-tabs" id="build-tabs" role="tablist">
						<li className="active"><a href="#sources" role="tab" data-toggle="tab">Sources</a></li>
						<li><a href="#projects" role="tab" data-toggle="tab">Projects</a></li>
						<li><a href="#mappings" role="tab" data-toggle="tab">Mappings</a></li>
						<li><a href="#queries" role="tab" data-toggle="tab">Queries</a></li>
						<li><a href="#ontologies" role="tab" data-toggle="tab">Ontologies</a></li>
					</ul>
					
					<div className="tab-content">
						<div className="tab-pane fade in active dropzone" id="sources">
							<webchooser.component.CSVFileLoader updateSources={this.handleUpdateSources} />
							<div className="datatable">
								<div className="btn-group">
									<button type="button" className="btn btn-default btn-sm" onClick={this.handleRefresh}>
										<span className="glyphicon glyphicon-refresh" aria-hidden="true"></span> Refresh sources
									</button>
								</div>
								
								<webchooser.component.DataTable data={this.state.sources} columns={this.state.columns} columnDefs={columnDefs}/>
							</div>
						</div>
						<div className="tab-pane fade" id="projects">...</div>
						<div className="tab-pane fade" id="mappings">
							<webchooser.view.MappingView mappingFile={this.state.mappingFile} columns={this.state.fileColumns} sampleRow={this.state.sampleRow} />
						</div>
						<div className="tab-pane fade" id="queries">...</div>
						<div className="tab-pane fade" id="ontologies">...</div>
					</div>
				</div>
			);
		}
	});
		
	webchooser.view.BuildView = React.createClass({
		render: function(){
			return (
				<div>
					<BuildTabPanel url="/file" />
				</div>
			);
	 	}
	});

})(React, webchooser);