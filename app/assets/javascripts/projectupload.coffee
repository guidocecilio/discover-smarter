##################################################
# Extensions to the dropzone plugin that is currently 
# used for uploading files that 
# then used to show entity extraction
##################################################
log = (args...) ->
  console.log.apply console, args if console.log?
  
Dropzone.options.projectUpload = 
	maxFilesize: 500,
	dictDefaultMessage: "Drop HDT or RDF file to create a new project"
	
	
	init: ->
		_this = this
		@rdfTypes = ["rdf","hdt","nt",".n3"]

		$.getJSON "/file", (files) ->
			allowed_types = [
				".txt"
				".pdf"
				".doc"
				".rdf"
				".hdt"
				".nt"
				".n3"
			]
			for file of files
				allow = false
				for t of allowed_types
					unless files[file].name.indexOf(allowed_types[t]) is -1
						allow = true
						continue
				_this.emit "addedfile", files[file]	if allow
			return

		@on "addedfile", (file) ->
			log file
			
		@on "success", (file, response) ->
			$("#projects").trigger "projectSuccessFileadded", response
			_this.removeFile file
			log "on success"
			log file
					
		@on "complete", (file) ->
			log "on complete"
			log file
			
		$(document).on "projectSuccessFileadded", "#projects", (e, response) =>
			log "projectSuccessFileadded message managed by the DOM document element"
			if response.originalFile.split('.').pop() in @rdfTypes then @modal = new ApplicationModal(response) 
			return
			
		return
		
		
class ApplicationModal

	constructor: (@fileinfo) ->
		@hideOtherModals()
		r = jsRoutes.controllers.Projects.listProjects()
		$.ajax
			url: r.url
			type: r.method
			success: (projects) =>
				@buildModal(projects)
				@openModal()
			error: (err) ->
				$.error("Error: " + err)
	
	hideOtherModals: ->
		$('.modal').modal('hide').remove()

	buildModal: (projects)=>
		
		@PushData = {
			name: @fileinfo.simpleName,
			dataType: "graph",
			location: @fileinfo.originalFile
		}
		
		$(".dropdown").on "shown.bs.dropdown", ->
			$(this).dropdown "toggle"  if $(this).find(".dropdown-menu").children().length is 0
			return

		@container = $("<div></div>").addClass('modal')
		text = 	"""<div class="modal-dialog">
				        <div class="modal-content">
				            <div class="modal-header">
				            <button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span></button>
				            <h4 class="modal-title" id="myModalLabel">Adding New RDF Datasource</h4>
				            </div>
				            <div class="modal-body">
								<form class="form-horizontal" role="form">
									<div class="form-group">
										<label class="col-sm-3 control-label">Original file &nbsp<span class="glyphicon glyphicon-file"></span></label>
										<p class="form-control-static"> <%= originalFile %> </p>
									</div>
									<div class="form-group">
										<label class="col-sm-3 control-label">Location &nbsp<span class="glyphicon glyphicon-cloud"></span></label>
										<p class="form-control-static"> <a href="<%= clientUrl %> "><%= clientUrl %></a> </p>
									</div>
									<div  class="form-group">
										<div class="dropdown">
											<label class="col-sm-3 control-label" for="wiz_group_dropdown">Group &nbsp<span class="glyphicon glyphicon-briefcase"></span></label>
											<div id="wiz_group_div" class="col-sm-9">
											    <input class="form-control" id="wiz_group_dropdown" data-id="-1" name="group" type="text" data-toggle="dropdown">
											    <ul class="dropdown-menu col-sm-10" role="menu" style="margin-left: 20px;" aria-labelledby="wiz_group_dropdown">
											    	<% _.each(proj, function(pro) { %> <li><a class="result" data-id="<%= pro.id %>"><%= pro.folder %>/<%= pro.name %></a></li>
													<% }); %>
											    </ul>
											</div>
										</div>
									</div>
									<div class="form-group">
										<label class="col-sm-3 control-label">Description &nbsp<span class="glyphicon glyphicon-edit"></span></label>
										<div class="col-sm-9">
											<textarea id="wiz_desc" class="form-control col-sm-9" rows="3">created from <%= originalFile %> </textarea>
										</div>

									</div>
								</form>
				            </div>
				            <div class="modal-footer">
				                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
				                <button type="button" id="wiz_submit" class="btn btn-primary">Save changes</button>
				            </div>
				    </div>
				</div>"""
		# compile/execute template and attach to dom as modal dialog
		compiled = _.template text
		textToAttach = compiled proj: projects, originalFile: @fileinfo.originalFile, clientUrl: @fileinfo.clientUrl, 
		@container.append textToAttach 
		$("body").append @container
		
		# handle dropdown
		$("#wiz_group_dropdown").on "input", =>
			$("#wiz_group_dropdown").data("id", -1)
			@PushData.project = -1
		
		$(".dropdown-menu li a").on "click", (e) =>
			$("#wiz_group_dropdown").data("id", $(e.currentTarget).data("id"))
			$("#wiz_group_dropdown").val($(e.currentTarget).text())
			@PushData.project = $(e.currentTarget).data("id")
		
		$("#wiz_submit").on "click", =>
			console.log("adding datasource to the project")
			@PushData.description = $("#wiz_desc").val()
			if $("#wiz_group_dropdown").val() is ""
				$("#wiz_group_div").append("""<div class="alert alert-danger" role="alert">choose a group.</div>""")
			else
				@saveDatasource()

	saveDatasource: =>
		r = jsonRoutes.controllers.json.DataSources.createDataSource()
		$.ajax
			type: r.method
			url: r.url
			contentType: "application/json"
			dataType: "json"
			data: JSON.stringify(@PushData)
			success: (response) =>
				log "Datasource created successfully, id is " + response.id
				@PushData.id = response.id
				@saveAnalyticsRule()
				$('.modal').modal('hide')
			error: (err) ->
				$(".modal-header").append("""<div class="alert alert-danger" role="alert">"""+err.substring(0,20)+"</div>")
				log err.statusText + ". " + err.responseText + "."

	saveAnalyticsRule: =>
		dataToSend = 
			id: @fileinfo.originalFile.split('.').shift().replace(/\s/g, "") + "All"
			name: @fileinfo.originalFile.split('.').shift() + " All"
			queryString: "g"
			queryLang: "gremlin"
			graph: @PushData.id
			lastExecuted: new Date().toISOString()
			lastExecutedResult: "sucess"
			success: true
			project: @PushData.project
		
		r = jsonRoutes.controllers.json.AnalyticsRules.create()
		$.ajax
			type: r.method
			url: r.url
			contentType: "application/json"
			dataType: "json"
			data: JSON.stringify(dataToSend)
			success: (response) =>
				log "rule created"
			error: (err) ->
				$(".modal-header").append("""<div class="alert alert-danger" role="alert">"""+err.substring(0,20)+"</div>")
				log err.statusText + ". " + err.responseText + "."
		

	openModal: ->
		@container.modal('show')

window.ApplicationModal = ApplicationModal