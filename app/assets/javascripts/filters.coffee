# Just a log helper
log = (args...) ->
	console.log.apply console, args if console.log?

String::alphaNum = -> 
	@.replace /[^a-zA-Z0-9]/g, ''

String::validURL = ->
	pattern = new RegExp("/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/")
	isUrl = pattern.test(@)
	log "that " + @ + " is a URL is " + isUrl
	!isUrl

String::hashCode = ->
	hash = 0
	i = undefined
	chr = undefined
	len = undefined
	return hash  if @length is 0
	i = 0
	len = @length

	while i < len
		chr = @charCodeAt(i)
		hash = ((hash << 5) - hash) + chr
		hash |= 0 # Convert to 32bit integer
		i++
	hash

Array::merge = (other) -> Array::push.apply @, other

GremlinGraph::searchForItem  = (searchKey) ->
	console.log "Searching for: " + searchKey

	graph = @processPipeline @v(searchKey)
	for node in graph.nodes
		log "important node" + node.label
		node["isTarget"] = true
	bigger = @v(searchKey).both()
	@processPipeline bigger, graph
	edges = @v(searchKey).bothE()
	@processPipeline edges, graph
	#		graph.nodes = _.union coreNode, outs

GremlinGraph::getOne = (searchKey) ->
	@processPipeline @v(searchKey)

GremlinGraph::processPipeline  = (pipeline, graph) ->
	graph = {nodes:[], links:[]} if graph is undefined
	@listOfIds = new Array()
	while pipeline.hasNext()
		item = pipeline.next()
		if item instanceof Array
			for element in item 
				@processPipeItem(element , graph) 
		else
			@processPipeItem(item , graph) 
	graph
	
GremlinGraph::processPipeItem  = (result, graph) ->

	# get vertices
	if (result.constructor.name is "HDTVertex")
		unless result.getPropertyMap() is undefined
			if result.getPropertyMap().hasNext()
				id = result.getPropertyMap().next().subject 
				found = $.inArray id, @listOfIds 
				if found == -1
					graph.nodes.push @vertexToNode result
					@listOfIds.push id
	# get edges
	if (result.constructor.name is "HDTEdge")
		graph.links.push @edgeToLink result
	

GremlinGraph::addSmartURI = (node) ->
	node["smartURI"] = @hdt.dictionary.idToString(node.id, HDT.DictionarySectionRole.SUBJECT)
	node

GremlinGraph::vertexToNode = (vertex) ->
	id = vertex.getPropertyMap().next().subject
	node = 
		id: id
		hdtid : id
		group : 1
	@addSmartURI node
	node["type"]  = @hdt.search(node["smartURI"],"http://www.w3.org/1999/02/22-rdf-syntax-ns#type","").next().object
	vert = vertex.getPropertyMap()
	while vert.hasNext()
		protoNode = vert.next()
		key = protoNode.key.split("/").pop().split("#").pop()
		node[key] = protoNode.value
		node["name"] = node[key] if key is "label"
	node

GremlinGraph::edgeToLink = (hdtEdge) ->
	{source: hdtEdge.triple.subject, target: hdtEdge.triple.object, weight:3, label: hdtEdge.getLabel().split("/").pop().split("#").pop()}


############################################################		
# Utility classes for managing the color that 
############################################################		
class BagItem
	constructor:(@name, @colour, @icon, @iconhelper) ->
		
class RdfClassTypes
	constructor:() ->
		@classBags = []
		@classBags.push(new BagItem "undefined", "#FF6B6B", """\ue085""", "question-sign")
		@classBags.push(new BagItem "Document", "#4ECDC4", """\ue022""", "file")
		@classBags.push(new BagItem "Location", "#556270", """\ue062""", "map-marker")
		@classBags.push(new BagItem "Organization", "#C44D58", """\ue184""", "tower")
		@classBags.push(new BagItem "Person", "#C7F464", """\ue008""", "user")

	
	getItem:(name) ->
		item = _.find @classBags, (item) -> name is item.name

		if item is undefined then @classBags[0] else item


##############################################################################	
# manages union operations in list
#############################################################################
class UnionSet
	
	joinNodes: (graph, memo) ->
		_.uniq _.union(graph.nodes, memo.nodes), false, (item, key, hdtid) ->
		  item.hdtid
	
	joinLinks: (graph, memo) ->
		links = _.union(graph.links, memo.links)
	
	
##############################################################################	
# manages intersection operations in list
#############################################################################	
class IntersectSet

	joinNodes: (graph, memo) =>
		@nodes = @intersection(graph.nodes, memo.nodes)
	
	getTargetLinksInNodes:(links) =>
		_.flatten _.map @nodes, (node) => _.filter links, (link) -> node.hdtid is link.target
		
	getSourceLinksInNodes:(links) =>
		_.flatten _.map @nodes, (node) => _.filter links, (link) -> node.hdtid is link.source
	
	joinLinks: (graph, memo) =>
		@getSourceLinksInNodes(@getTargetLinksInNodes(graph.links.concat(memo.links)))
		
	push:(obj, important, c) ->
		important.push obj.hdtid
		c.push obj
	
	intersection: (a, b) ->
		c = []
		@important = []
		for inner in a
			if (inner.isTarget?) and (inner.hdtid not in @important)
				@push inner, @important, c 
			else
				for outer in b
					c.push inner if (inner.hdtid is outer.hdtid)
					if (outer.isTarget?) and (outer.hdtid not in @important)
						@push outer, @important, c 
		c

##############################################################################	
# manages list of filters and can run union or intersection operations on them
#############################################################################
class SetManager
	
	constructor:(@typefilter) ->
		@search = []
		@classTypes = new RdfClassTypes()
		@typesInfo = 
			categoryList : {}
			icons : {}
			iconChars : {}
			colors: {}
			showTargetNodes : true
	
	union:() ->
		@mergeSets(new UnionSet())
		
	intersection:() ->
		@mergeSets(new IntersectSet())
	
	mergeSets:(setOperation) =>
		targetnodes = []
		updatedGraph = _.reduce @search, ((memo, searchItem) -> 
			graph = searchItem.asGraph()
			result = {nodes:[], links:[]} 
			if memo.nodes.length > 0 then result.nodes = setOperation.joinNodes( graph  , memo) else result.nodes = graph.nodes
			if memo.links.length > 0 then result.links = setOperation.joinLinks( graph  , memo) else result.links = graph.links
			result
			
		), {nodes:[], links:[]} 
		targetnodes = setOperation.important
		updatedGraph.links = _.uniq updatedGraph.links, false, (edge) ->
			edge.target + edge.source
		
		addIndex(updatedGraph)
		
		_.each updatedGraph.nodes, (node) => 
			@addSmartType(node)
			node.visible = (node.smartType not in @typefilter) or (node.isTarget? and @typesInfo.showTargetNodes )
			
		_.uniq  updatedGraph.links, false, (link) =>
					srcnode =_.find updatedGraph.nodes, (node) -> node.hdtid == link.source
					trgnode =_.find updatedGraph.nodes, (node) -> node.hdtid == link.target
					if srcnode[link.label] == undefined 
						srcnode[link.label] = trgnode.label
					else 
						if srcnode[link.label].indexOf(trgnode.label) < 0 
							srcnode[link.label] = srcnode[link.label] + ", " + trgnode.label
					if trgnode[link.label] == undefined 
						trgnode[link.label] = srcnode.label
					else 
						if trgnode[link.label].indexOf(srcnode.label) < 0 
							trgnode[link.label] = trgnode[link.label] + ", " + srcnode.label
		
		#log "updatedGraph!"
		#log updatedGraph
		updatedGraph
		
	add:(searchItem) ->
		@search.push (searchItem)
	
	remove:(item) =>
		# item has expected structure of op and opand
		log "removing search item " + item.op + ", " + item.opand + "list [" + @search.length + "]..."
		@search = _.reject @search, (searchItem) -> searchItem.match( item.op, item.opand)
		log "removed search item " + item.opand + ", list is now [" + @search.length + "]"
	
	get:(id) ->
		_.find @search, (item) -> item.id is id
		
	addIndex = (updatedGraph) ->
		log "updating link..."
		@idList = _.pluck updatedGraph.nodes, 'id'
		
		updatedGraph.links = _.filter updatedGraph.links, (link) ->
			@idList.indexOf(link.source) >= 0 and @idList.indexOf(link.target) >= 0
		updatedGraph.nodes = _.uniq updatedGraph.nodes
		updatedGraph
	
	addSmartType: (node) =>
		unless @typesInfo.categoryList[node.type]?
			node.smartType = "Thing"
			classType = @classTypes.getItem(node.smartType)
			node.smartColour = classType.colour
			node.smartIcon = classType.icon
			node.smartIconHelper = classType.iconhelper
		else
			node.smartType = @typesInfo.categoryList[node.type]
			node.smartColour = @typesInfo.colors[node.smartType]
			node.smartIcon = @typesInfo.iconChars[node.smartType]
			node.smartIconHelper = @typesInfo.icons[node.smartType]
		node
	

##############################################################################	
# manages url string
#############################################################################
class UriManager
	
	constructor:(@setManager) ->
		log "URI Manager created"
		
	updateUri:() =>
		filters = _.map @setManager.search, (item) ->
			item.searchString
		window.location.href = "#?filters=" + encodeURIComponent(filters.join ",")


#####################################################################################
# handles all events related to filters
# is responsible for creating and managing the filters, and acts as a "model" for
# other datasets to use
#####################################################################################
class smarterData.FilterManager

	constructor:(@hdt) ->
		_.extend @, Backbone.Events
		@count = 1
		@typefilter = []
		@setManager = new SetManager(@typefilter)
		@UriManager = new UriManager(@setManager)
		@gremlinGraph = new GremlinGraph(@hdt)
		@localStoreKey=  "JSON"
		@firstpass = true
		# manages search space list

		###########
		#  Events
		###########
		
		#------------------------
		# Search events
		#------------------------
		$(document).on "click", ".facet-link", (e) => 
			op = $(e.currentTarget).data("category")
			operand = $(e.currentTarget).data("facet")
			searchitem = _.last @setManager.search
			searchitem.addFilter(op, operand)
			@
			
		$(document).on "change", "#search", (e, searchText) => 
			log "search has changed, now updating graph"
			e.stopImmediatePropagation()
			if searchText?
				@addSearch(searchText)
			@updateGraph()

		# actually takes value from change in URI
		$(document).on "updatefilter", "#search", (e, filters) => 
			# ensure filter not already in application
			if @firstpass
				_.each filters, (filter) =>
					if isNaN(filter) then @addSearch(filter) else @addSearch(Number(filter))
				, @
				@updateGraph()

		$(document).on "nodechosen", "#search", (e, searchText) => 
			if searchText?
				@addSearch(Number(searchText))
			@updateGraph()

		$(document).on "updategraph", "#search", (e, json) => 
			if json?
				@addGraph(json?.label,'glyphicon-filter',json?.graph)
			@updateGraph()

		$(document).on "intersect", "#search", (e, item) => 
			@moveSearch(item.draggedId, item.targetId)
			@updateGraph()


		$(document).on "touchgraph", "#search", (e, json) => 
			@updateGraph()
			
		$(document).on "add-doc", "#search", (e, json) => 
			log "adding doc to filters"
			@addGraph("Document",'glyphicon-file',json)
			@updateGraph()

		#------------------------
		# Type Filter events
		#------------------------
		$(document).on "add-filter", "#search", (e, type) => 
			@typefilter.push(type)
			@updateGraph()
			
		$(document).on "remove-filter", "#search", (e, type) => 
			index = @typefilter.indexOf(type)
			if index > - 1
				delete @typefilter[@typefilter.indexOf(type)]
				@updateGraph()

		$(document).on "typelist", "#search", (e, json) => 
			@setManager.typesInfo = json 
			console.log @setManager.typesInfo
		
		
		$(document).on "refrish-view", "#search", (e) => 
			@updateGraph()

		# used for final part of pivot search
		$(document).on "searchForItems", "#search", (e, json) => 
			pivotGraph = 
				nodes : []
				links : []
			idz = new Array()
			for subject in json.subjects
				unless subject is undefined
					tempg  = @gremlinGraph.searchForItem subject
					#found = $.inArray tempg.id, idz 
					#if found == -1
					pivotGraph.nodes.merge tempg.nodes
					pivotGraph.links.merge tempg.links
						#idz.push tempg.id
			unless pivotGraph is undefined
				pivotGraph.nodes = _.uniq pivotGraph.nodes, false, (item, key, id) ->
		  		  	item.id
				pivotGraph.links = _.uniq pivotGraph.links, false, (edge) ->
					edge.target + edge.source
				@addGraph(json.label,'glyphicon-filter',pivotGraph) 
				@updateGraph()

		$(document).on "queryExecuted", "#execute", (e, pipeline) => 
			log "gremlin pipeline ready for filter"
			@addGremlinPipeline(pipeline) unless pipeline is undefined
			@updateGraph()
		
		log "Filter created."
		$('#search').trigger('appready');
	
	#------------------------
	# updates graph after search is made
	#------------------------
	updateGraph: =>
		@firstpass = false
		@UriManager.updateUri()
		$('#search').trigger "begob", @setManager.union()

			
	# sets one of many seach spaces.  allows filtering
	addSearch: (searchKey) =>
		log "adding search for term" + searchKey
		unless searchKey is undefined
			# get if @search item.id exists - if it does don't add it
			ids = _.pluck @setManager.search, 'opand'
			unless _.include ids, searchKey
				searchItem = new SearchItem(searchKey, @gremlinGraph, @typefilter) 
				searchItem.on "labelremoved", @removeSearch
				@setManager.add (searchItem)
	
	# sets one of many seach spaces.  allows filtering
	addGremlinPipeline: (pipeline) =>
		unless pipeline is undefined
			gremAsJsonGraph =  @gremlinGraph.processPipeline pipeline
			pipeline = {}
			@addGraph "Gremlin Query", "glyphicon-th-list", gremAsJsonGraph
		
	addGraph: (name, icon, gremAsJsonGraph) =>
		log "adding new gremlin graph"
		graphItem = new GraphItem(name, icon, gremAsJsonGraph, @typefilter)
		graphItem.on "labelremoved", @removeSearch
		@setManager.add (graphItem)
	
	removeSearch: (item) =>
		@setManager.remove (item)
		@updateGraph()
		$("#search").trigger("change")
	
	moveSearch: (draggedId, targetId) =>
		log "dragged ID" + draggedId + ", target Id" + targetId
		draggedSearchItem = @setManager.get(draggedId)
		targetSearchItem = @setManager.get(targetId)
		@setManager.remove (draggedSearchItem )
		targetSearchItem.intersect(draggedSearchItem)


##############################
# Super class to all labels  
# that are displayed
##############################	
class SimpleLabel
	
	constructor: (@op, @opand, @parentTag, @typefilter) ->
		_.extend @, Backbone.Events
		if isNaN @opand then @id = @opand.alphaNum() + @opand.alphaNum() else @id = @opand
		@closer = ".close"
		@template = """
				<div id="<%= id %>" class="<%=cssstuff%>" draggable="true" alt="<%= opand %>" ><span class="glyphicon <%=icon%>"></span><%= shorttext %><a class="close">×</a>
				</div>
			"""
		@setManager = new SetManager(@typefilter) if @typefilter?
		$(document).on "click", "#" + @id + " " + @closer, (e) =>
			@remove()
		"ok"
	
	render: () =>
		if isNaN @opand 
			if @opand is "Gremlin Query"
				@shorttext = "Gremlin Query"
			else if @opand.validURL()
				@shorttext = @opand.substr(@opand.lastIndexOf('/') + 1) 
			else
				xx = @gremlinGraph.getOne(Number(@opand))
				@shorttext = xx.nodes[0].label
		else
			xx = @gremlinGraph.getOne(Number(@opand))
			@shorttext = xx.nodes[0].label
		templateStr =_.template @template, id: @id, op: @op, opand: @opand, shorttext: @shorttext, cssstuff: @cssstuff ? "well well-sm col-sm-3", icon: @icon ? "glyphicon-search"
		$(@parentTag).append (templateStr)
		
		# drag drop events
		$(document).on "dragstart", "#"+@id, (e) =>
			dataTransfer = e.originalEvent.dataTransfer
			dataTransfer.effectAllowed = "copy"
			dataTransfer.setData "DraggedElementsId", @id
			log "dragging that thang"
		$(document).on "dragenter", "#"+@id, (e) -> 
			e.preventDefault();
			this.classList.add('over')
		$(document).on "dragleave", "#"+@id, (e) -> 
			e.preventDefault();
			this.classList.remove('over')
		$(document).on "dragover", "#"+@id, (e) => 
			e.preventDefault();
		$(document).on "drop dragdrop", "#"+@id, (e) => 
			#ask container to move this down a level
			draggedId = e.originalEvent.dataTransfer.getData( "DraggedElementsId")
			$("#search").trigger "intersect", {draggedId: draggedId, targetId: @id} 

	removeElement: () =>
		$("#" + @id).remove()
		
	remove: () =>
		$("#" + @id).remove()
		@jsonGraph = {nodes:[], links:[]}
		@.trigger "labelremoved", {op: @op, opand: @opand}
		
	match:(filterOpz, filterOperandz) -> 
		match = (filterOpz == @op) && (filterOperandz == @opand)
		log "matching" + @opand + " with " + filterOperandz + " is " + match
		match
	
	processGraph: () ->
		log "do nothing"
	
	asGraph: () ->
		@setManager.intersection()
	
	intersect: (graphToIntersect) =>
		graphToIntersect.removeElement()
		graphToIntersect.parentTag = "#"+ @id
		graphToIntersect.cssstuff = "label label-primary"
		@setManager.add(graphToIntersect)
		graphToIntersect.render()
		#@render()
		
		
##############################	
# helps with the search
##############################	
class GraphItem extends SimpleLabel

	constructor: (@searchString, @icon, @jsonGraph, @typefilter) ->
		super("searchString", @searchString, "#smartfilters", @typefilter)
		@setManager.add(@processGraph())
		@render()

	processGraph: () ->
		log "process graph"
		si = new SimpleItem(@jsonGraph)
		si


##############################	
# helps with the search
##############################	
class SimpleItem extends SimpleLabel

	constructor: (@jsonGraph) ->
		super("searchString", "not for display", "#smartfilters")
	
	asGraph: () ->
		@jsonGraph


##############################
# helps with the search
##############################
class SearchItem extends SimpleLabel
		
	constructor: (@searchString, @gremlinGraph, @typefilter) ->
		super("searchString",@searchString, "#smartfilters", @typefilter)
		@jsonGraph = {nodes:[], links:[]} 
		@jsonGraph =  @gremlinGraph.searchForItem(@searchString) ? {nodes:[], links:[]}
		@setManager.add(@processGraph())
		@render()
	
	processGraph: () ->
		log "process search item"
		@jsonGraph =  @gremlinGraph.searchForItem(@searchString) ? {nodes:[], links:[]}
		si = new SimpleItem(@jsonGraph)
		si


##############################	
# helps with the search
##############################	
class QueryItem extends SimpleLabel
		
	constructor: (@pipeline, @gremlinGraph, @typefilter) ->
		super("searchString","Gremlin Query", "#smartfilters", @typefilter)
		log "pipeline to be rendered"
		log pipeline
		@icon = "glyphicon-th-list"
		@setManager.add(processGraph())
		@render()
	
	processGraph: () ->
		log "process queryitem"
		@jsonGraph =  @gremlinGraph.processPipeline(@pipeline) ? {nodes:[], links:[]}
		si = new SimpleItem(@jsonGraph)
		si
