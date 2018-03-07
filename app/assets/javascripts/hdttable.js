// global window: true, document: true, jQuery: true, _:true, smarterData: true,
// config: true, console: true
(function($, _, ns, config) {
	
	// defining a model namespace to hold the Smarter Data models
	ns.model = ns.model || {};
	// we defined a constants namespace to hold some default contant values.
	ns.model.constants = ns.model.constants || {};
	// defining the default smater type as "Thing"
	ns.model.constants.DEFAULT_SMARTER_TYPE = 'Thing';
	
	/**
	* The HdtTable class
	*
	* @class HdtTable
	* @namespace smarterData
	* @constructor
	*/
	function HdtTable(hdt) {
		this.hdt = hdt;
		this.cols = ["smartURI","label","smartType"];
		this.index = '';
		// FIXME: I don't know why we have this global hdt reference.
		window.hdt = hdt;
		// add event listener
		this.bindEventListeners();
	};
	
	/**
	* Method used to bind the necesary listeners related to the HdtTable
	*
	* @method bindEventListeners
	* @return {void}
	*/
	HdtTable.prototype.bindEventListeners = function() {
		// add event listener to the document to handle the "begob" event
		// threw by the search form.
		var _this = this;
		$(document).on('begob', '#search', function(e, graph) {
			e.stopPropagation();
			_this.renderTable(graph);
			return;
	    });
		
		$(document).on('index_set', '#content', function(e, index) {
			e.stopPropagation();
			console.log ("Setting index in HDTTable...")
			_this.index = index;
			console.log ("  HDTTable index set");
			_this.initialize();
		});
		
	};
	
	/**
	* Method initializes the HtdTable by retrieving the type and subtypes from
	* the hdt object rendering them on the right block and also creates the
	* entities book with the pagination component.
	*
	* @method initialize
	* @return {int} Number of pages added to the rendered table.
	*/
	HdtTable.prototype.initialize = function() {
		console.log("Invoking the HdtTable.initialize() method");
		console.log("Retrieving the types and rendering them");
		var values = this.retrieveTypes();
	
		
		console.log("Rendeting the table");
		return this.renderTable();
	};
	
	/**
	* Method retrieves the types and subtypes from the HDT file. Once the types
	* are retrived they are rendered.
	*
	* @method retrieveTypes
	* @return {int} Number of pages added to the rendered table.
	*/
	HdtTable.prototype.retrieveTypes = function() {
		var _this = this, typeslist = {}, typeslistdetails = {};
		
		it = _this.hdt.search('', 
			'http://www.w3.org/1999/02/22-rdf-syntax-ns#type','');
		var count = 0;
		while (it.hasNext()) {
			var triple = it.next();
			if (_this.index[triple.subject] === undefined)
				continue;
			if (typeslist[_this.index[triple.subject]] === undefined) {
				typeslist[_this.index[triple.subject]] = 0;
				typeslistdetails[_this.index[triple.subject]] = [];
			}
			typeslist[_this.index[triple.subject]]++;
			subtypes = _this.hdt.search(triple.subject,
					"http://www.w3.org/1999/02/22-rdf-syntax-ns#type", "");
			while (subtypes.hasNext()) {
				obj = subtypes.next().object;
				if (typeslistdetails[_this.index[triple.subject]][obj] 
						== undefined)
					typeslistdetails[_this.index[triple.subject]][obj] = 1;
				else
					typeslistdetails[_this.index[triple.subject]][obj]++;
			}
		}
		
		return [typeslist, typeslistdetails]
	};
	
	/**
	* Method renders the HdtTable usign the hdt property object
	*
	* @method load
	* @return {int} Number of pages added to the rendered table.
	* @deprecated Use 'HdtTable.initialize' instead.
	*/
	HdtTable.prototype.load = function() {
		var _this = this, typeslist = {}, typeslistdetails = {}, 
		maxEntities = 20, pagesLoaded = 0;
		// FIXME: need to change so filename is passed os name of function.

		it = _this.hdt.search('', 
			'http://www.w3.org/1999/02/22-rdf-syntax-ns#type','');
		var count = 0;
		while (it.hasNext()) {
			$("#content").append(
					'<div class="page list-group" style="display:none"id="page'
							+ (pagesLoaded + 1) + '"></div>');
			i = 0;
			while (it.hasNext()) {
				var triple = it.next();
				if (_this.index[triple.subject] == undefined)
					continue;
				if (typeslist[_this.index[triple.subject]] == undefined) {
					typeslist[_this.index[triple.subject]] = 0;
					typeslistdetails[_this.index[triple.subject]] = [];
				}
				typeslist[_this.index[triple.subject]]++;
				subtypes = _this.hdt.search(triple.subject,
						"http://www.w3.org/1999/02/22-rdf-syntax-ns#type", "");
				while (subtypes.hasNext()) {
					obj = subtypes.next().object;
					if (typeslistdetails[_this.index[triple.subject]][obj] == undefined)
						typeslistdetails[_this.index[triple.subject]][obj] = 1;
					else
						typeslistdetails[_this.index[triple.subject]][obj]++;
				}
	
				if (_this.index[triple.subject] == "Document")
					prv = "<button style='float:right' class='btn btn-default btn-xs btn-prv pull-right' uri='"+triple.subject+"'><span class='glyphicon glyphicon-zoom-in'></span>Preview</button>";
				else
					prv = "";
				label = _this.hdt.search(triple.subject,"http://www.w3.org/2000/01/rdf-schema#label", "");
				if (label.hasNext()){
					label_text = label.next().object.replace('"','').replace('"','');
				}else {
					label_text = triple.subject;
				}
				$('#page' + (pagesLoaded + 1)).append(
						'<div class="list-group-item"><span class="label label-primary">'
								+ _this.index[triple.subject] + ' </span>&nbsp; <small><a href="javascript:void(0)" class="entity-item" content="item-'+count+'" uri="'+triple.subject+'">'
								+ label_text + '</a></small> ' + prv + '<div id="item-'+count+'"></div></div>');
				count++;
				i++;
				if (i > maxEntities)
					break;
			}
			pagesLoaded++;
		}
		
		$("#tabularlist").show();
		$("#loading").hide();
		return pagesLoaded;
	};
	
	/**
	* Method renders the HdtTable from a graph 
	*
	* @method renderTable
	* @param {Object} graph A graph object with the entities and its links.
	* @return {int} Number of pages added to the rendered table.
	*/
	HdtTable.prototype.renderTable = function(graph) {
		//app.graphHandler.graph.nodes.forEach(function(d, i) { var type = graph.HdtTable.index[d.uri]; if (type !== undefined) console.log(type); });
		var _this = this, maxEntitiesPerPage = 20, currentPage = 0,
		itemsAdded = 0, totalItemsAdded = 0, undefinedTypeEntities = 0;
		// FIXME: need to change so filename is passed os name of function.
		
		var TABULARLIST_ID = 'tabularlist',
		CONTAINER_ID = 'content',
		LOADER_ID = 'loading',
		PAGE_SELECTION_ID = 'page-selection',
		PAGE_PREFIX_ID = 'page_';
		
		$('#' + TABULARLIST_ID).hide();
		$('#' + CONTAINER_ID).empty();
		$('#' + LOADER_ID).show();
		
		// if the event has been thrown and the graph is empty the full graph
		// should be rendered. 
		// FIXME: this logic should be place in the method that throw the event.
		if (typeof graph === "undefined" ) {
			graph = smarterData.graphHandler.graph
		}
		
		graph.nodes.forEach( function(d, i) { 
			// The "this" pointer is the window in this context and graph is a
			// global namespace where the HtdTable.index object is residing.
			var smartType = d.smartType;//_this.index[d.uri]; 
			
			if (d.visible == false || d.isTarget == true) return;
			if (smartType === undefined) {
				smartType = ns.model.constants.DEFAULT_SMARTER_TYPE;
			}
						
			if (itemsAdded % maxEntitiesPerPage == 0) {
				$('#' + CONTAINER_ID).append('<div class="page list-group" '+
					'style="display:none" id="' + PAGE_PREFIX_ID + 
						(currentPage + 1) + '"></div>');
				itemsAdded = 0;
				currentPage++;
			}
										
			if (smartType == 'Document') {
				var abstractString;
				if (typeof(d['abstract']) !== "undefined") {
					abstractString = d['abstract'];
					// FIXME: the abstract text should be clean before assing
					// to the graph
					abstractString = abstractString.substring(1, abstractString.length-1);
				}
				else {
					abstractString = d.title;
				}	
								
				previewHtmlButton = '<button style="float:right" class="preview btn ' + 
					'btn-default btn-xs btn-prv pull-right" uri="' + d.smartURI + '"' +
					' data-abstract="'+ abstractString + '"' + 
					' data-toggle="modal" data-target="#previewDialog">' +
					'<span class="glyphicon glyphicon-zoom-in"></span>' +
					'Preview</button>';
			} else {
				previewHtmlButton = '';
			}
						
			// FIXME: extract the subject from the node data in d 
			subject = '';
			$('#' + PAGE_PREFIX_ID + currentPage).append(
				'<div class="list-group-item"><span class="label label-primary" style="background-color:' + d.smartColour + '">'
					+ smartType + ' </span>&nbsp; <small><a href="javascript:void(0)" class="entity-item" content="item-' + i + '" uri="' +  d.smartURI + '">'
					+ d.name + '</a></small> ' + previewHtmlButton + '<div id="item-' + i + '"></div></div>');
					
			itemsAdded++;
			totalItemsAdded++;
		});
		
		$('#' + TABULARLIST_ID).show();
		$('#' + LOADER_ID).hide();
		
	    
		_this.updatePagination({ total: currentPage, maxVisible: 10, page: 1});
		// add onclick event listener to all the button with the "preview" class
		$('.preview').click(function(e) {
			e.stopPropagation();
		    _this.showInDialog($(this).attr('data-abstract'));
		});
		
		_this.renderDataTable(graph);	
		
		console.log('Graph number of nodes: ' + graph.nodes.length + 
			', num of links: ' + graph.links.length);
		console.log('Total entities added: ' + totalItemsAdded);
		
		// sent
		$('#tabularlist').trigger('appready');
		// return currentPage that is equal to the number of pages loaded
		return currentPage;
	};
	
	/**
	* Method renders the DataTable from a graph 
	*
	* @method renderDataTable
	* @param {Object} graph A graph object with the entities and its links.
	* @return {void}
	*/
	HdtTable.prototype.renderDataTable = function(graph) {
		var _this = this;
		var dataSet = [];
		var attributes = [];
		
		graph.nodes.forEach( function(d, i) {
			if (d.visible == false) return;

			for (key in d){
				if (_this.cols.indexOf(key) > -1) continue;
				if (attributes.indexOf(key) < 0) attributes.push(key);
			}
	
			var row = [];
			var hasValue = false;
			
			for (key=0; key< _this.cols.length; key++){
				if(d[_this.cols[key]]==undefined){
					row.push("")
				}else{
					hasValue = true;
					row.push(d[_this.cols[key]]);
				}
			}
			
			if (hasValue)dataSet.push(row);
		});
		
		$('#datatable').empty();
		

		$('#datatable').html('<table cellpadding="0" cellspacing="0" border="0" class="display" id="dtable"></table>');
		
		$('#columns').empty();
		$('#columns').append("Columns: ");
		for (key=0; key < _this.cols.length; key++) $('#columns').append(' <button class="removecolumn btn btn-default btn-xs" data-col-name="'+_this.cols[key]+'" type="button" class="btn btn-default btn-xs">'+_this.cols[key]+'&nbsp;<span class="glyphicon glyphicon-remove"></span></button>');
		
		var select = $('<select id="collist"/>');
		for (key=0; key< attributes.length; key++) select.append( $('<option>').text(attributes[key]).attr('value',attributes[key]) ) ;
		$('#columns').append(select);
		$('#columns').append(' <button id="addcolumn" type="button" class="btn btn-default btn-xs"><span class="glyphicon glyphicon-plus"></span></button><div class="pull-right export-panel"><button id="export2csv" type="button" class="btn btn-default btn-xs" title="Export the current datatable to a CSV file">CSV</button><button id="export2csv-full" type="button" class="btn btn-default btn-xs" title="Export graph to a CSV file">Graph CSV </button></div>');
		
		$('#addcolumn').click(function(e) {
			_this.cols.push($("#collist").val());
			_this.renderDataTable(graph);
		});
		
		$('.removecolumn').click(function(e) {
			e.stopPropagation();
		    _this.cols.splice(_this.cols.indexOf($(this).attr('data-col-name')),1);
		    _this.renderDataTable(graph);
		});

		if (_this.cols.length == 0)return;
		var columns =[];
		for (key=0; key< _this.cols.length; key++) columns.push({ "title": _this.cols[key],"oDefault": ""});

		$('#dtable').dataTable( {
	    	"scrollX": true,
	        "data": dataSet,
	        "columns":  columns
	    } );
				
		// // add the onclick event to the csv export button
// 		$('#export2csv').click( function(e) {
// 			e.stopPropagation();
// 			// TODO: the document title should be replaced by the selected
// 			// dataset
// 			_this.JSONToCSVConvertor(graph, 'DogFood');
// 		});
		
		// add the onclick event to the csv export button
		$('#export2csv-full').click( function(e) {
			e.stopPropagation();
			// TODO: the document title should be replaced by the selected
			// dataset
			_this.JSONToCSVConvertor(graph, 'DogFood_full');
		});
		
		$('#export2csv').click( function(e) {
			e.stopPropagation();
			// TODO: the document title should be replaced by the selected
			// dataset
			_this.exportDatasetArrayToCSV(_.pluck(columns, 'title'), dataSet, 'DogFood_datatable');
		}); 	
	};
	
	/**
	* Method that check for the content passed and if this is a valid URL the
	* resource is loaded into an iframe. If the content is a text this is just
	* shown as a text into the dialog content area. 
	*
	* @method validURL
	* @param {String} content String to be shown in the dialog content area.
	*/
	HdtTable.prototype.showInDialog = function(content) {
		if (this.validURL(content)) {
	        $("#previewText").empty();
	        $("#previewText").append("<iframe width=\"100%\" height=\"800px\"src=\"" + content + "\"></ifram>");
	    } else {
	        $("#previewText").text(content);
	    }
	    // $("#previewDialog").modal();
	    $("#previewDialog").modal({
	    	keyboard: false
	    });
	    $("#previewDialog").modal("show");
	};
	
	/**
	* Method to check if a URL is valid 
	*
	* @method validURL
	* @param {String} str String to validate.
	* @return {Boolean} true if valid URL, false in the other case.
	*/
	HdtTable.prototype.validURL= function(str) {
		var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
			'((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
		  	'((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
		  	'(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
		  	'(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
		  	'(\\#[-a-z\\d_]*)?$','i'); // fragment locator
		if(!pattern.test(str)) {
		    return false;
		} else {
		    return true;
		}
	};
	
	/**
	* Event handler invoked after renders the HdtTable from a graph 
	*
	* @method renderTable
	* @param {Object} graph A graph object with the entities and its links.
	* @return {int} Number of pages added to the rendered table.
	*/
	HdtTable.prototype.reload = function(event, searchText) {
		console.log(event);
		console.log(searchText);
		console.log('The HdtTable.reload() method is not implemented yet.');
	};
	
	/**
	* Method add the pagination functionality to the element parameter 
	*
	* @method updatePagination
	* @param {Object} params object containing the bootpag default values.
	*/
	HdtTable.prototype.updatePagination = function(params) {
		PAGE_SELECTION_ID = 'page-selection',
		PAGE_PREFIX_ID = 'page_'; 
		
		$('#' + PAGE_SELECTION_ID).bootpag(params)
			.on('page', function(event, num) {
          		$('.page').hide();
          		$('#' + PAGE_PREFIX_ID + num).show();
        	});
        $('#' + PAGE_PREFIX_ID + '1').show();
	};
	
	/**
	* Method add the pagination functionality to the element parameter 
	*
	* @method updatePagination
	* @param {Object} params object containing the bootpag default values.
	*/
	HdtTable.prototype.appendPreviewContent = function(node) {
		console.log('preview');
	};
	
	/**
	*
	*/
	HdtTable.prototype.JSONToCSVConvertor = function(jsonGraph, documentTitle) {
	    // If JSONData is not an object then JSON.parse will parse the JSON
		// string in an Object
	    var csv = '', 
		data = typeof jsonGraph !== 'object' ? JSON.parse(jsonGraph) : jsonGraph;
      
	    //Set Report title in first row or line
    
		// Add a document title if is defined and different of the empty string
		if (typeof documentTitle !== 'undefined' && documentTitle !== '') {
			csv += documentTitle + '\r\n\n';
		}
	    // add the predicate in the first row representing the table columns
	  	csv += ',' + _.pluck(data.links, 'label').join(',') + '\r\n';
		    
		var nodesHash = {};
		_.each(data.nodes, function(node) {
			nodesHash[node.id] = node
		});
				
		_.each(data.nodes, function(node) {
			var row = "";
			row += node.label + ",";
			_.each(data.links, function(link) {
				if (link.source === node.id) {
					row += nodesHash[link.target].label + ',';
				} 
				else {
					row += '' + ',';
				}
			});
			// remove the last comma
			row.slice(0, row.length - 1);
			// add the carried return and new line
			csv += row + '\r\n';
		})
	
	    // Generate a file name
	    var fileName = 'SmarteData_dataexport_';
	    // this will remove the blank-spaces from the title and replace it with
		// an underscore
	    fileName += documentTitle.replace(/ /g, '_');   
		
	    this.autoDownloadCsvFile(fileName, csv);
    };
	
	/**
	*
	*/
	HdtTable.prototype.exportDatasetArrayToCSV = function(columns, rows, documentTitle) {
	    // If JSONData is not an object then JSON.parse will parse the JSON
		// string in an Object
	    var csv = '', data = rows;
      
	    //Set Report title in first row or line
    
		// Add a document title if is defined and different of the empty string
		if (typeof documentTitle !== 'undefined' && documentTitle !== '') {
			csv += documentTitle + '\r\n\n';
		}
	    // add the predicate in the first row representing the table columns
	  	csv += columns.join(',') + '\r\n';
		    
		_.each(data, function(row) {
			// add the carried return and new line
			csv += row.join(',') + '\r\n';
		})
	
	    // Generate a file name
	    var fileName = 'SmarterData_dataexport_';
	    // this will remove the blank-spaces from the title and replace it with
		// an underscore
	    fileName += documentTitle.replace(/ /g, '_');   
    
	    this.autoDownloadCsvFile(fileName, csv);
	};
	
	/**
	*
	*/
	HdtTable.prototype.autoDownloadCsvFile = function(fileName, csv) {
	    //Initialize file format you want csv or xls
	    var uri = 'data:text/csv;charset=utf-8,' + escape(csv);
    
	    // Now the little tricky part.
	    // you can use either>> window.open(uri);
	    // but this will not work in some browsers
	    // or you will not get the correct file extension    
    
	    //this trick will generate a temp <a /> tag
	    var link = document.createElement('a');    
	    link.href = uri;
    
	    // set the visibility hidden so it will not effect on your web-layout
	    link.style = 'visibility:hidden';
	    link.download = fileName + '.csv';
    
	    // this part will append the anchor tag and remove it after 
		// automatic click
	    document.body.appendChild(link);
	    link.click();
	    document.body.removeChild(link);
	};
		
	// export the HdtTable class to the namespace
	ns.HdtTable = HdtTable;
	
})(jQuery, _, smarterData);
	
