# ---------------------------------------- 
# helper functions
# ---------------------------------------- 

# Just a log helper
log = (args...) ->
	console.log.apply console, args if console.log?
  
# function create an interval function call of 1 second to check if the
# application is ready after the data is loaded.
executeWhenAppReady = (context, func) ->
	id = setInterval(->
		if typeof smarterData isnt "undefined" and _.has(smarterData, "appReady") and smarterData.appReady is true
			clearInterval id
			func.apply context
		return
	, 1000)
	return
  
# ---------------------------------------- 
# The $(document).ready() function.
# ---------------------------------------- 
$ -> # document is ready!
	app = new AppRouter()

	$(document).on "appready", (e) =>
		e.stopImmediatePropagation()
		smarterData.appReady = true
		
	# routing the initial URL
	Backbone.history.start
		pushHistory: true

# ---------------------------------------- 
# Chooses which representation we will use for 
# the data being returned.
# ---------------------------------------- 
class smarterData.GraphBootstrap

	constructor: (route) ->
		log "init chooser"
		@routeUrl = route.url

	loadGraph: (onSuccess) =>
		log "loading " + @routeUrl
		request = $.getJSON @routeUrl
		request.success (data) ->
			# TODO: check firstly if the file is already in the cache and if the
			# file is already cached retrieve it from the cache, execute the
			# request instead.
			GraphStorage()
			if data.encoding is "hdt" then @dataHandler = new HdtGraphHandler(data)
			else 
				if data.typeOf is "graph" then @dataHandler = new JsonGraphHandler(data)
				else
					log "what????"
			if onSuccess then onSuccess(@dataHandler)
			
# ---------------------------------------- ROUTER
class AppRouter extends Backbone.Router
	# initialize: ->
# 		@currentApp = new Tasks
# 			el: $("#main")
				
	routes:
		""                          : "index"
		# "projects/:project/tasks"   : "tasks"
		"rules/:ruleid"				: "rules"
	
	index: (params) ->
		if params != null
			params = JSON.parse("{\"" + decodeURIComponent(params.replace(/&/g, "\",\"").replace(RegExp("=", "g"), "\":\"")) + "\"}")
			if _.has(params, "filters")
				filters = if params.filters.length > 0 then params.filters.split(",") else []
				
				executeWhenAppReady @, () -> 
					$('#search').trigger "updatefilter", [filters]
									
		# show dashboard
		# $("#main").load "/ #main"
		
	# tasks: (project) ->
# 		# load project || display app
# 		currentApp = @currentApp
# 		$("#main").load "/projects/" + project + "/tasks", (tpl) ->
# 			currentApp.render(project)
			
	rules: (ruleid) -> 
		# currentApp = @currentApp
		$("#main").load "/d3graph/" + ruleid, (tpl) ->
			$("#main").html tpl

# ---------------------------------------- 
# general methods for handling data
# ---------------------------------------- 
class DataHandler
	
	constructor: (data) ->
		_.extend @, Backbone.Events
		@localStoreKey=  "JSON" 
		@tag = "#mainbar"
		@viztag = "#viz"
		@maxNodes = 800
		@.on 'storeLoading', -> smarterData.ProgressBar.updateProgress()
		@.on 'storeReady', -> smarterData.ProgressBar.removeProgress()
		@networkNeeded = true
		@graphView = new smarterData.GraphView()
		$("#progress").show();
		$("#entities").hide();
				
		$('a[data-toggle="tab"]').on 'shown.bs.tab', (e) => 
			if e.target.href.split('#')[1] is "graph"
				@visualise()
				$("#facets-panel").show()
			else if e.target.href.split('#')[1] is "tabular"
				$("#facets-panel").hide()
			else if e.target.href.split('#')[1] is "sigma-graph"
				log "showing network"
				$("#search").trigger "all-update"
				@visualise()
			else if e.target.href.split('#')[1] is "data-table"
				log "updating data-table"
				$('#dtable').dataTable().fnDestroy();
				$('#dtable').dataTable();
	
	setLocalStorageKey:(key) ->
		log "setting localStorageKey to: " + key
		@localStoreKey = key
		
	getLocalStorageKey:() ->
		return @localStoreKey
			
	store:() ->
		@.trigger 'storeReady'

	visualise:() =>
		$('#search').trigger "updategraph" 
	
	showNetwork:() =>
		@visualise()
	
	getIndex:(simpleName) =>
		# @hdt.source is "/file/smarter-2014-05-16T1900227550100459f4c56.hdt"
		# need to get simpleName from @hdt
		$.get '/file/latest/'+ simpleName + '/minjena', (response) =>
			@getIndexFile(response)
			return
	
	getIndexFile:(indexFileName) =>
		$.ajax
			url: indexFileName
			async: false
			dataType: "json"
			success: (index) =>
				@index = index
				$("#content").trigger "index_set", @index
				return


# ---------------------------------------- 
# How we handle JSON data
# ---------------------------------------- 
class JsonGraphHandler extends DataHandler

	constructor: (data) ->
		super(data)
		$.getJSON data.location, (@graph) =>
			@store()
			@visualise()
		$("#tabsleft a[href=\"#graph\"]").tab "show"
		


# ---------------------------------------- 
# How we handle HDT data
# ---------------------------------------- 
class HdtGraphHandler extends DataHandler

	constructor: (data) ->
		super(data)
		
		# Events, uses backbone
		@.on 'storeReady', -> @visualiseTabular()
		@.on 'networkTab', -> @visualise()
		
		# set the localstorage key for the current hdt object
		filename = data.location.split("/").pop().slice(0, -4)
		@setLocalStorageKey(data.location);
		
		# if stringifiedHdt
		# 	# HDT is a binary format - how does stringifying it help?
		# 	@hdt = JSON.parse(stringifiedHdt)
		# 	@buildObjects()
		# else
		@hdt = new HDT().readURL(data.location, (@hdt) =>
			
			# TODO: this calls specific EntityRenderer - seehdtd3.js for method, all this sets is the max no of nodes in a result
			@graph = getGeneralD3Graph(@hdt, @maxNodes)
			
			# Pivots Panel
			@pivotsPanel = new PivotsPanel(@hdt,"#pivots")

			# the gremlin query engine that we use
			@gremlinGraph = new GremlinGraph(@hdt)
			@filters = new smarterData.FilterManager(@hdt)
			
			# the gremlin query engine that we use
			@searchpanel = new SearchPanel(@hdt)
			@ext = new Extractor(@gremlinGraph, @hdt)
			@sparqlExe = new SparqlExe(@hdt,"#resultstable")
			@getIndex(filename.split('-')[0] )
			@buildObjects()
			#@store()
		, true, smarterData.ProgressBar.updateProgress)

		@hdtEditor = new HdtEditor()
		$('#execute').on 'click', (e) => 
			querylang = $("#querylang").val()
			if querylang is "SPARQL"
				@sparqlExe.execute()
			else
				@hdtEditor.executeQuery @gremlinGraph

	###
	Method returns "true" if a HDT object with the @localStoreKey value was already
	loaded and stored into the LocalStorage, returns "false" instead.
	###
	restore:() ->
		stringifiedHdtContent = localStorage.getItem(@localStoreKey + '.hdt')
		if stringifiedHdtContent 
			@hdt = new HDT()
			@hdt.array = JSON.parse(stringifiedHdtContent) 
			@hdt.decode()
			
			stringifiedHdtIndex = localStorage.getItem(@localStoreKey + '.index')
			@hdt.arrayindex = JSON.parse(stringifiedHdtIndex)
			@htd.generateIndex()
			
			@.trigger 'objectRestored'
			return true
			
		return false
	
	# override the method store
	store:() ->
		try
			localStorage.setItem(@localStoreKey + '.hdt', 
				JSON.stringify(@hdt.array))
			localStorage.setItem(@localStoreKey + '.index', 
				JSON.stringify(@hdt.arrayindex))
			@.trigger 'storeReady'
		catch e
			if e.code == DOMException.QUOTA_EXCEEDED_ERR
				# FIXME: this should be changed to just remove the graph objects
				# not the full localStorage hashmap.
				localStorage.clear()
				localStorage.setItem(@localStoreKey + '.hdt', 
					JSON.stringify(@hdt.array))
				localStorage.setItem(@localStoreKey + '.index', 
					JSON.stringify(@hdt.arrayindex))
				@.trigger 'storeReady'
		
	# override the method store
	buildObjects:() ->
		@.trigger 'storeReady'

	visualiseTabular:() =>
		@hdtSummary = new HdtSummaryPanel(@hdt)
		@hdtTable = new smarterData.HdtTable(@hdt)
		
		log "system ready!!!!"
		# $(document).on "change", "#search", (e, searchText) => 
		# 	@hdtTable.reload()
		
	
	saveGraphData = ->
		if graph.delta is `undefined`
			alert "Graph hasn't changed"
			return
		obj =
			triples: graph.delta
			hdtfile: "swdf"

		$.ajax
			type: "post"
			url: "/api/save"
			dataType: "json"
			contentType: "application/json"
			data: JSON.stringify(obj)
			success: (data) ->
				graph.delta = `undefined`
				location.reload()
				alert data.message
				return
			error: (data, errorThrown) ->
				alert "Fail to save:\n" + errorThrown


class Extractor
	constructor: (@gremlinGraph, @hdt) ->
		log "Extractor created"
		
		$(document).on "index_set", "#content", (e, @index) => 
			log "Index set"
		
		$(document).on "prepDoc", "#search", (e, fileName) => 
			@addFileToGraph(fileName) unless fileName is `undefined`
		
		$(document).on "extractTopics", "#search", (e, node) => 
			@extractTopics(node) unless node is `undefined`

		$(document).on "saveDelta", "#search", (e) => 
			@saveGraphData()

	saveGraphData : ->
		if @delta is `undefined`
			alert "Graph hasn't changed"
			return
		obj =
			triples: @delta
			hdtfile: "swdf"

		waitDlg = $("<div class=\"modal\" tabindex=\"-1\" role=\"dialog\"> <div class=\"modal-dialog modal-sm\"><center> <div class=\"modal-content\"> <h1> <span class=\"animate glyphicon glyphicon-cog\"></span> Saving ...</h1> </center></div> </div> </div>")
		waitDlg.modal()
		waitDlg.modal "show"

		$.ajax
			type: "post"
			url: "/api/save"
			dataType: "json"
			contentType: "application/json"
			data: JSON.stringify(obj)
			success: (data) ->
				@delta = `undefined`
				location.reload()
				return
			error: (data, errorThrown) ->
				waitDlg.modal "hide"
				alert "Fail to save:\n" + errorThrown

	addFileToGraph: (fileName) ->
		d3data =
			nodes: [
				name: fileName
				label: fileName
				uri: "file://" + fileName
				group: 1
				id: maxid
				hdtid: maxid
				smartertype: "Document"
				path: fileName
				type: "http://xmlns.com/foaf/0.1/#Document"
			]
			links: []

		fileObj = fileName
		@delta = "<file://" + fileName + "> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://xmlns.com/foaf/0.1/#Document> .\n" + "<file://" + fileName + "> <http://www.w3.org/2000/01/rdf-schema#/label> \"" + fileName + "\" .\n"
		filesObjs[maxid] = d3data.nodes[0]
		maxid++
		$("#search").trigger "add-doc", d3data
	
	
	extractTopics: (file) ->
		topics = @disambiguate(@findLinks(@extract(file.path)))
		console.log "topics:"
		console.log topics
		@delta = "<file://" + file.name + "> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://xmlns.com/foaf/0.1/#Document> .\n" + "<file://" + file.name + "> <http://www.w3.org/2000/01/rdf-schema#/label> \"" + file.name + "\" .\n"
		json =
			nodes: []
			links: []

		json.nodes.push file
		for topic of topics
			o = @getNode(topics[topic])
			json.nodes.push o
			@delta += "<file://" + file.name + "> <http://purl.org/dc/elements/1.1/subject> <" + topics[topic] + "> .\n"
			json.links.push
				source: file.hdtid
				target: o.hdtid
				weight: 3

			@delta += "\n"
		label = " Topic Extaction : " + json.name
		label = " Topics Extarcted : " +  file.name
		$("#search").trigger "updategraph", 
			graph : json
			label : label
	
	findLinks: (entities) =>
		links = {}
		suggestions = []
		for e of entities
			suggestions = @hdt.dictionary.getSuggestions(HDT.DictionarySectionRole.OBJECT, entities[e].name, 3)
			continue if typeof(suggestions) == "function" 
			for s of suggestions
				continue if typeof(suggestions[s]) == "function" 
				links[entities[e].name] = []  if links[entities[e].name] is `undefined`
				subject = @hdt.dictionary.stringToId(@hdt.search("", "", suggestions[s]).next().subject, HDT.DictionarySectionRole.SUBJECT)
				links[entities[e].name].push subject  if links[entities[e].name].indexOf(subject) is -1
		links
	
	disambiguate: (linkedEntities) ->
		entities = {}
		for el of linkedEntities
			p = new GremlinPipeline(@gremlinGraph)._(linkedEntities[el]).idVertex().deg()
			index = 0
			max = 0
			i = 0
			while i < linkedEntities[el].length
				val = p.next()
				if max < val
					max = val
					index = i
				i++
			entities[el] = @hdt.dictionary.idToString(linkedEntities[el][index], HDT.DictionarySectionRole.SUBJECT)
		entities
	
	extract: (file) ->
		entities = undefined
		$.ajax
			url: "/api/files/" + file + "/entities"
			async: false
			dataType: "json"
			success: (response) ->
				entities = response
				return
		entities
	
	getNode: (uri) ->
		id = @hdt.dictionary.stringToId(uri, HDT.DictionarySectionRole.SUBJECT)
		list = @hdt.search(uri, "", "")
		node = {}
		node["hdtid"] = id
		node["id"] = id
		node["group"] = 1
		while list.hasNext()
			o = list.next()
			node[o.predicate.split("/").pop().split("#").pop()] = o.object
		node["name"] = node["label"]
		node

#
# Visualisation Classes
#
class smarterData.ProgressBar
	
	constructor: () ->
		_.extend @, Backbone.Events
	
	@updateProgress:(evt) ->		
		percentComplete = Math.ceil((evt.loaded / evt.total) * 100)
		$(".progress-bar").css("width", percentComplete + "%").attr "aria-valuenow", percentComplete
		$(@).trigger "storeReady" if (percentComplete == 100)
	
	@removeProgress:() ->		
		log "showing entities"
		$("#progress").hide()
		$("#entities").show()


class HdtEditor
	constructor: () ->
		@editor = ace.edit("edit")
		@editor.setTheme "ace/theme/github"
		@editor.getSession().setMode "ace/mode/javascript"
		@editor.setShowPrintMargin false
		@editor.setHighlightActiveLine true
		@editor.resize()
	
	executeQuery:(@gremlinGraph) =>
		$("#execute span").attr "class", "glyphicon glyphicon-cog animate"
		pipeline = undefined
		try
			query = @editor.getSession().getValue()
			log query
			
			#pipeline = eval(query)
			functy = new Function("g", query)
			log "evaluating query"
			pipeline = functy @gremlinGraph
			console.log "pipeline is:" + pipeline
			console.log pipeline
			
			$("#tabsleft a[href=\"#graph\"]").tab "show"
			$("#output-panel").show()
			$("#output").empty()
		catch error
			$("#output").append "<span style='color:#FF0000'>" + error + "</span>"
		$("#execute span").attr "class", "glyphicon glyphicon-play"
		$("#execute").trigger "queryExecuted", pipeline
		return
	
	outputText:(obj) ->
		if typeof obj is "undefined"
			$("#output").append o + "<br/>"
		else if typeof obj.hasNext is "function"
			i = 0
			while i < 8 and obj.hasNext()
				@outputText obj.next()
				i++
		else if obj instanceof Array
			if obj.length is 0
				$("#output").append "<span style='color:#FF0000'>No results found</span>"
			else
				i = 0
				while i < o.length
					@outputText obj[i]
					i++
		else
			$("#output").append obj.toString() + "<br/>"
		return


class SearchPanel
	
	constructor: (@hdt) ->
		#auto complete
		$("#search").autocomplete
		
			source: (request, response) =>
				response @hdt.dictionary.getSuggestions(HDT.DictionarySectionRole.OBJECT, request.term, 10)
				return
			
			autoFocus: true 
			
			appendTo: $("#search").closest("div")
				
			select: (event,ui) =>
				@value = ui.item.value
				uri = @hdt.search("", "", @value).next().subject
				log "Sending change event" + uri
				$('#search').trigger "change", uri
				log "event fired"
				$('#search').val('')
				false

		$("#search").data("ui-autocomplete")._renderItem = (ulx, item) =>
			uri = @hdt.search("", "", item.label).next().subject
			type = @hdt.search(uri, "http://www.w3.org/1999/02/22-rdf-syntax-ns#type", "").next().object.split("/").pop().split("#").pop()
			$("<li>").attr("data-value", item.value).append($("<a>").text(item.label).append(" <span class=\"label label-primary\">" + type + "</span><br><small>" + uri + "</small>")).appendTo(ulx)


class HdtSummaryPanel
	
	constructor:(@hdt) ->
		$('#page1').show()
		$("#title").text "Entities"
		$("#size").text @hdt.array.byteLength
		$("#totalentries").text @hdt.dictionary.getNumberOfElements() 
		$("#numshared").text @hdt.dictionary.shared.getNumberOfElements()
		$("#numsubjects").text @hdt.dictionary.subjects.getNumberOfElements()
		$("#numpredicates").text @hdt.dictionary.predicates.getNumberOfElements()
		$("#numobjects").text @hdt.dictionary.objects.getNumberOfElements()



# ---------------------------------------- 
# How we handle HDT data
# ---------------------------------------- 
class GraphStorage
	
	@onSuccess: () ->
		log "success"
	
	@onFail: () ->
		log "fail"
	
	constructor: () ->
		navigator.webkitPersistentStorage.requestQuota 50*1024*1024, (grantedBytes) => 
			window.webkitRequestFileSystem(PERSISTENT, grantedBytes, GraphStorage.onSuccess, GraphStorage.onFail)
		, (e) -> log "Error"

# ---------------------------------------- 
# Pivots Panel
# ---------------------------------------- 
class PivotsPanel
	constructor: (@hdt, @selector) ->
		#rdf-store requires reference to a global hdt varible 
		window.hdt = @hdt 
		rdfstore.create
				engine: "hdt"
				hdt: hdt
			, @storeReady
	
	reset:() =>	
		@store.execute "SELECT ?type (COUNT(?type) AS ?count) WHERE { ?s a ?type . } GROUP BY ?type LIMIT 10", @getTypes

	resetType:()=>
		@update "type-item", @type

	sortCount : (array) =>
    	array.sort (a, b) =>
        	x = parseInt(a["count"].value)
        	y = parseInt(b["count"].value)
        	(if (x < y) then 1 else ((if (x > y) then -1 else 0)))

	getList : (results) =>
		if results.length > 0
			droplist = ""
			list = $("<ul/>")
			i = 0
			while i < results.length
				item = $("<li/>")
				type = "type"  if results[i]["type"] isnt `undefined`
				type = "value"  if results[i]["value"] isnt `undefined`
				type = "predicate"  if results[i]["predicate"] isnt `undefined`
				uri = results[i][type].value
				text = uri.split("/").pop().split("#").pop() + " (" + results[i]["count"].value + ")"
				if type is "value"
					term = results[i][type]
					if term is null
						uri = "null"
					else if term.token is "uri"
						uri = "<" + term.value + ">"
					else if term.token is "literal"
						if typeof term.lang is "string"
							uri = "\"" + term.value + "\"" + "@" + term.lang
						else if typeof term.type is "string"
							uri = "\"" + term.value + "\"" + "^^<" + term.type + ">"
						else
							uri = "\"" + term.value + "\""
					else uri = term.value  if term.token is "blank"
				item.append $("<a/>").text(text).attr("href", "#").attr("uri", uri).attr("class", type + "-item").click(@clickHandler)
				droplist = droplist + "<option value='"+uri+"'>"+uri.split("/").pop().split("#").pop()+"</option>"
				list.append item
				i++
			@edit = new CategoryEditor "#cat-edit", droplist if @edit is `undefined`
			list

	clickHandler : (e) =>
		e.preventDefault()
		@update e.target.className, $(e.target).attr("uri")


	update : (action, uri) =>
    	breadcrumbs = $("<ol/>")
    	breadcrumbs.attr "class", "breadcrumb"
    	if action is "type-item"
        	@type = uri
        	@store.execute "SELECT ?predicate (COUNT(?predicate) AS ?count) WHERE { ?s ?predicate ?o . ?s a <" + @type + "> . } GROUP BY ?predicate LIMIT 10", @getTypes
        	$("#pivot-stack").append "<ol class=\"breadcrumb\"><li><a href=\"#\">All</a></li> <li class=\"active\">" + @type.split("/").pop().split("#").pop() + "</li> </ol>"
        	breadcrumbs.append $("<li/>").append($("<a/>").text("All").attr("href", "#").click(@reset))
        	breadcrumbs.append $("<li/>").append($("<a/>").text(@type.split("/").pop().split("#").pop()).attr("href", "#").attr("class", "active"))
    	if action is "predicate-item"
        	@predicate = uri
        	@store.execute "SELECT ?value (COUNT(?value) AS ?count) WHERE { ?s a <" + @type + "> . ?s <" + @predicate + "> ?value . } GROUP BY ?value LIMIT 10", @getTypes
        	$("#pivot-stack").append "<ol class=\"breadcrumb\"><li><a href=\"#\">All</a></li> <li><a href=\"#\">" + @type.split("/").pop().split("#").pop() + "</a></li> <li class=\"active\">" + @predicate.split("/").pop().split("#").pop() + "</li> </ol>"
        	breadcrumbs.append $("<li/>").append($("<a/>").text("All").attr("href", "#").click(@reset))
        	breadcrumbs.append $("<li/>").append($("<a/>").text(@type.split("/").pop().split("#").pop()).attr("href", "#").click(@resetType))
        	breadcrumbs.append $("<li/>").append($("<a/>").text(@predicate.split("/").pop().split("#").pop()).attr("href", "#").attr("class", "active"))
    	if action is "value-item"
        	@object = uri
        	@store.execute "SELECT DISTINCT ?s WHERE { ?s a <" + @type + "> . ?s <" + @predicate + "> " + @object + " }", @doSearch
        	return
    	$("#pivot-stack").empty()
    	$("#pivot-stack").append breadcrumbs
    	return
    

	doSearch : (success, results) =>
    	if success
        	subjects = []
        	i = 0
        	while i < results.length
            	uri = results[i]["s"].value
            	subjects.push uri
            	i++
        	label = " " + (@type.split("/").pop().split("#").pop()) + " > " + (@predicate.split("/").pop().split("#").pop()) + " > " + (@object.split("/").pop().split("#").pop())
        	$("#search").trigger "searchForItems",
            	subjects: subjects
            	label: label
        	

	getTypes : (success, results) =>
		if success
			typesCount = @sortCount(results)
			list = @getList(typesCount)
			panel = $("<div/>")
			panel.attr "class", "panel panel-default"
			panel.append "<div class=\"panel-heading\"><h3 class=\"panel-title\">Pivots</h3></div>"
			panel.append $("<div/>").attr("class", "panel-body").append("<div id=\"pivot-stack\"></div>").append(list)
			$(@selector).empty()
			$(@selector).append panel
			breadcrumbs = $("<ol/>")
			breadcrumbs.attr "class", "breadcrumb"
			breadcrumbs.append $("<li/>").append($("<a/>").text("All").attr("href", "#").click(@reset))
			$("#pivot-stack").append breadcrumbs

	storeReady: (@store) =>
		@reset()

# ---------------------------------------- 
#  Sparql Executer 
# ---------------------------------------- 
class SparqlExe
	constructor: (@hdt, @selector) ->
		#rdf-store requires reference to a global hdt varible 
		console.log ("here")
		@qn = 1
		@editor = ace.edit("edit")
		window.hdt = @hdt 
		rdfstore.create
				engine: "hdt"
				hdt: hdt
			, @storeReady

	storeReady: (@store) =>
		console.log("store is ready")

	execute:() =>
		query = @editor.getSession().getValue()	
		@store.execute query, @results

	results : (success, results) =>
		if success
			table = $("<table/>")
			table.attr("border",1)
			first = results[0]
			thead = $("<thead />")
			tr = $("<tr />")
			tr.attr("style","background-color:black;color:white")
			for field of first
				tr.append $("<td/>").text(field)
			thead.append tr
			table.append thead

			tbody = $("<tbody />")
			count = 0
			i = 0
			
			while i < results.length
				tr = $("<tr/>")
				for field of first
					term = results[i][field]
					termStr = undefined
					if term is null
						termStr = "null"
					else if term.token is "uri"
						termStr = term.value
					else if term.token is "literal"
						if typeof term.lang is "string"
							termStr = "\"" + term.value + "\"" + "@" + term.lang
						else if typeof term.type is "string"
							termStr = "\"" + term.value + "\"" + "^^<" + term.type + ">"
						else
							termStr = "\"" + term.value + "\""
					else
					termStr = term.value  if term.token is "blank"
					tr.append $("<td/>").text(termStr)
				tbody.append tr
				count++
				i++
			table.append tbody
			$(@selector).empty()
			$(@selector).append table
			$(@selector).append "<br/>"
			subjects = []
			i = 0
			while i < results.length
				return unless results[i]["s"]?
				uri = results[i]["s"].value
				subjects.push uri
				i++
			label = "Query " + @qn
			@qn++
			$("#search").trigger "searchForItems",
				subjects: subjects
				label: label

CategoryEditor = (sel, list) ->
	@template = """
  <div class="panel panel-default">
  	<div class="panel-heading">
  		<h4 class="panel-title"><a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion" href="#Things">Things</a><input type="checkbox" class="pull-right add-filter" checked></h4> 
  	</div>
  	<div id="Things" class="cat-panel panel-collapse in" style="height: auto;">
  		<div class="panel-body">
  			<div class="toolboxs">
  			Icon and Color:
			<div class="btn-toolbar" role="toolbar">
      			<div class="btn-group">
          			<button type="button" class="btn-icon btn btn-default btn-xs"><span char="\ue006" class="glyphicon glyphicon-star"></span> </button>
          			<button type="button" class="btn-icon btn btn-default btn-xs"><span char="\ue022" class="glyphicon glyphicon-file"></span> </button>
          			<button type="button" class="btn-icon btn btn-default btn-xs"><span char="\ue062" class="glyphicon glyphicon-map-marker"></span> </button>
          			<button type="button" class="btn-icon btn btn-default btn-xs"><span char="\ue184" class="glyphicon glyphicon-tower"></span> </button>
          			<button type="button" class="btn-icon btn btn-default btn-xs"><span char="\ue008" class="glyphicon glyphicon-user"></span> </button>
          			<button type="button" class="btn-icon btn btn-default btn-xs"><span char="\ue044" class="glyphicon glyphicon-bookmark"></span> </button>
      			</div>
     			<div class="btn-group">
     	  			<button type="button" class="btn-color btn btn-danger btn-xs">&nbsp;&nbsp;</button>
          			<button type="button" class="btn-color btn btn-default btn-xs">&nbsp;&nbsp;</button>
          			<button type="button" class="btn-color btn btn-primary btn-xs">&nbsp;&nbsp;</button>
          			<button type="button" class="btn-color btn btn-success btn-xs">&nbsp;&nbsp;</button>
          			<button type="button" class="btn-color btn btn-info btn-xs">&nbsp;&nbsp;</button>
          			<button type="button" class="btn-color btn btn-warning btn-xs">&nbsp;&nbsp;</button>
      			</div>
      		</div>
      		Category
   			<select id="alltypes" style="width:160px">
				""" + list + """
   			</select>
   			<button type="button" class="addtype btn btn-default btn-xs"><span class="glyphicon glyphicon-plus"></span></button>
  			</div>
  			<div class="tlist">
  			</div>
  		</div>
  	</div>
	"""
	@categories = ["Thing"]
	@categoryList = {}
	@icons = {}
	@iconChars = {}
	@colors = {}
	@validname = /^[$A-Z_][0-9A-Z_$]*$/i
	@selector = sel
	@count = 1
	@showTargetNodes = true 
	@ruleName = window.location.pathname.split("/").pop()
	self = this
	@onAddPanel = (e) ->
		loop
			name = prompt("Please enter a category name", "Category" + self.count)
			return  unless name?
			if self.categories.indexOf(name) > -1
				alert "cataegory alraedy exisits"
				continue
			unless self.validname.test(name)
				alert "invalid name"
				continue
			self.categories.push name
			break
			break unless true
		self.count++
		self.addPanel name, "question-sign", "\e085", "#AE3A45"


	@onClickRemove = (e) ->
		url = $(this).parent().attr("data-uri").trim()
		delete self.categoryList[url]
		$(this).parent().remove()

	@onAddFilter = (e) ->
		category = $(this).parent().text().trim()
		if $(this).attr("checked")
			$("#search").trigger "remove-filter", category
		else 
			$("#search").trigger "add-filter", category

	@addPanel = (name, icon, iconChar, color) ->
		panel = $(@template)
		self.icons[name] = icon
		self.colors[name] = color
		self.iconChars[name] = iconChar
		console.log self.iconChars[name]
		badge = $('<span class="badge" style="background-color: ' + self.colors[name] + ';"> <span class="glyphicon glyphicon-' + self.icons[name] + '"></span> </span>')
		panel.find(".panel-title").prepend badge
		panel.find(".accordion-toggle").attr("href", "#" + (name)).text name
		panel.find(".panel-collapse").attr("id", name).addClass("collapse").removeClass "in"
		$(@selector).append panel.fadeIn()
		panel.find(".panel").on "show.bs.collapse", (e) ->
		panel.find(".addtype").click @addType
		panel.find(".add-filter").click @onAddFilter
		panel.find(".btn-icon").click @setIcon
		panel.find(".btn-color").click @setColor
		panel.find(".accordion-toggle").dblclick @editTitle
		panel

	@editTitle = (e) ->
		console.log $(this)
		text = $(this).text()
		return if text == "Thing"
		edit = $('<input class="ed" type="text"  data-old="'+text+'"name="edit" value="'+text+'" /> ')
		edit.blur self.editDone
		$(this).parent().find(".accordion-toggle").html edit

	@editDone = (e) ->
		id = $(this).attr("data-old")
		text = $(this).attr("value")
		unless self.validname.test(text)
			alert "Inavlid name, try anothor name"
			text = id
		title = $('<a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion" href="#'+text+'">'+text+'</a>')
		title.dblclick self.editTitle 
		$(this).parent().html title
		$("#"+id).attr "id",text
		for key of self.categoryList
			continue  if typeof self.categoryList[key] is "function"
			self.categoryList[key] = text if self.categoryList[key] is id

		delete self.categories[self.categories.indexOf(id)]
		self.categories.push(text)

		icon = self.icons[id]
		delete self.icons[id]
		self.icons[text] = icon

		color = self.colors[id]
		delete self.colors[id]
		self.colors[text] = color

		iconChar = self.iconChars[id]
		delete self.iconChars[id]
		self.iconChars[text] = iconChar


	@setIcon = (e) ->
		panel = $(this).parent().parent().parent().parent().parent().parent()
		category =  panel.find(".panel-title").text().trim()
		icon = $(this).find("span").attr("class").split(" ").pop().replace "glyphicon-",""
		iconChar = $(this).find("span").attr "char"
		self.iconChars[category] = iconChar 
		self.icons[category] = icon
		badge = $('<span class="badge" style="background-color: ' + self.colors[category] + ';"> <span class="glyphicon glyphicon-' + self.icons[category] + '"></span> </span>')
		console.log "category" + category
		panel.find(".badge").remove() 
		panel.find(".panel-title").prepend badge


	@setColor = (e) ->
		panel = $(this).parent().parent().parent().parent().parent().parent()
		color = $(this).css "background-color"
		color = self.rgb2hex color
		category =  panel.find(".panel-title").text().trim()
		self.colors[category] = color
		badge = $('<span class="badge" style="background-color: ' + self.colors[category] + ';"> <span class="glyphicon glyphicon-' + self.icons[category] + '"></span> </span>')
		panel.find(".badge").remove() 
		panel.find(".panel-title").prepend badge

	@rgb2hex = (rgb) ->
		hex = (x) ->
			("0" + parseInt(x).toString(16)).slice -2
		rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/)
		"#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3])

	@saveClassTypes = (dataToSend) ->
		r = jsonRoutes.controllers.json.RdfClassTypes.create()		
		$.ajax
			type: r.method
			url: r.url
			contentType: "application/json"
			dataType: "json"
			data: JSON.stringify(dataToSend)
			success: (response) =>
				log "RdfClassTypes created"
			error: (err) ->
				log "failed to create RdfClassType"
				
	@loadClassTypes = (ruleId) ->
		r = jsonRoutes.controllers.json.RdfClassTypes.getByRuleId(ruleId)
		$.ajax
			type: r.method
			url: r.url
			contentType: "application/json"
			dataType: "json"
			success: (response) =>
				log "RdfClassTypes created"
				self.someFunctionYouWouldLikeToCall(response)
			error: (err) ->
				log "failed to create RdfClassType"

	@someFunctionYouWouldLikeToCall = (response) ->
		return if response.length == 0
		self.categoryList = response.categoryList
		self.iconChars = response.iconChars
		self.icons = response.icons
		self.colors = response.colors

		for key of self.categoryList
			continue  if typeof self.categoryList[key] is "function"
			panel = $(self.selector).find("#"+self.categoryList[key]);
			if panel.length == 0 
				category = self.categoryList[key]
				self.addPanel category, self.icons[category], self.iconChars[category], self.colors[category]
				panel = $(self.selector).find("#"+category)
				self.categories.push (category)
			uri = key
			name = key.split("/").pop().split("#").pop()
			type = panel.find(".panel-title").text().trim()
			panel.find('.tlist').append "<li data-uri=\"" + uri + "\">" + name + "&nbsp;<button class=\"remove-item btn btn-default btn-xs\" data-col-name=\"name\" type=\"button\"><span class=\"glyphicon glyphicon-remove\"></span></button></li>"
			$(document).on "click", ".remove-item", self.onClickRemove

		$(".toolboxs").hide()
		$(".remove-item").hide()

		self.update()

	@update = () ->
		# ID should be the rule ID
		data = 
			id: self.ruleName
			categoryList : self.categoryList
			icons : self.icons
			iconChars : self.iconChars
			colors: self.colors
			showTargetNodes : self.showTargetNodes
		# push data up to server as an example
		log "Saving..."
		log data
		log JSON.stringify(data)
		self.saveClassTypes(data)
		
		# pull data from server as an example
		#self.loadClassTypes("swdf")
		
		$("#search").trigger "typelist", data
		$("#search").trigger "refrish-view"

	@addType = (e) ->
		uri = $(this).parent().find("select").val()
		name = uri.split("/").pop().split("#").pop()
		type = $(this).parent().parent().parent().parent().find(".panel-title").text().trim()
		if self.categoryList[uri]?
			alert "Already in cateogry : " + self.categoryList[uri]
			return
		self.categoryList[uri] = type
		$(this).parent().parent().find('.tlist').append "<li data-uri=\"" + uri + "\">" + name + "&nbsp;<button class=\"remove-item btn btn-default btn-xs\" data-col-name=\"name\" type=\"button\"><span class=\"glyphicon glyphicon-remove\"></span></button></li>"
		$(document).on "click", ".remove-item", self.onClickRemove


	@toggleMode = (e) ->
		console.log $(this).text()
		if $(this).text() is "Done"
			$(this).text "Edit"
			$(".toolboxs").hide()
			$(".remove-item").hide()
			$(".btn-add-panel").hide()
			self.update()
			$(self.selector).find(".accordion-toggle").off "dblclick"
		else
			$(this).text "Done"
			$(".toolboxs").show()
			$(".remove-item").show()
			$(".btn-add-panel").show()
			$(self.selector).find(".accordion-toggle").dblclick self.editTitle
			$(self.selector).find("#Thing").off "dblclick"

	@showHideTaget = (e) ->
		if $(this).attr("checked")
			self.showTargetNodes  = true
		else 
			self.showTargetNodes  = false
		self.update()

	$(@selector).empty()
	panel = @addPanel "Thing","question-sign", "\e085", "#AE3A45"
	panel.find(".panel-body").text "All other types"
	$(@selector).after "<button class=\"btn btn-xs btn-default btn-add-panel\"><span class=\"glyphicon glyphicon-plus\"></span> Add Category</button><button class=\"btn btn-xs btn-default btn-edit-toggle pull-right\">Edit</button><br/><input id=\"chk-show-target\" type=\"checkbox\"  checked>Include core entities in result<br>"
	$(".btn-add-panel").click @onAddPanel
	$(".btn-edit-toggle").click @toggleMode
	$("#chk-show-target").click @showHideTaget
	$(self.selector).find(".accordion-toggle").off "dblclick"
	#disables edit mode on load
	$(".toolboxs").hide()
	$(".remove-item").hide()
	$(".btn-add-panel").hide()
	self.loadClassTypes(self.ruleName)

 
