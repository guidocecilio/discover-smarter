# Just a log helper
log = (args...) ->
	console.log.apply console, args if console.log?


##################################################################
# This class populates menu items on the graph's context menu
##################################################################
class SigmaMenu
	
	constructor: ->
		popUp = undefined
		@filesObjs = {}
		
		# Setting up menu items on global menu
		$ ->
			$.contextMenu
				selector: "canvas"
				callback: (key, options) ->
					if key is "expand"
						$("#search").trigger "showSelectedNode"
						return
					if key is "topics"
						log "key is topics"
						$("#search").trigger "showTopics"
						return
					if key is "preview"
						log "fire preview event"
						$("#search").trigger "showPreview"
						return
			
					return

				items:
					expand:
						name: "Expand"
			
					topics:
						name: "Extract Topics"
			
					preview:
						name: "Preview"
			
					sep1: "---------"
		
					cancel:
						name: "Cancel"
		
		$(document).on "index_set", "#content", (e, @index) => 
			log "Index set"
	
	
	showPreviewOrSum: (node) ->
		if node is `undefined`
			log "showPreviewOrSum: uri is undefined"
			return
		if @index[node.smartURI] is "Document" then @showPreview node else @showSummary node
	
	
	showSummary: (node) ->
		$("#previewText").empty()
		propsTemplate = _.template "<% _.each(pairs, function(pair) { %>  <h3><%= pair[0] %></h3><%= pair[1] %><br> <% }); %>"
		pairs = _.pairs node
		 
		$("#previewText").append propsTemplate pairs : pairs
		$("#previewDialog").modal()
		$("#previewDialog").modal keyboard: false
		$("#previewDialog").modal "show"
		return
	
	
	showPreview: (node) ->
		@showInDialog( node["abstract"]) unless node["abstract"] is undefined
	
	
	showInDialog: (abst) ->
		if /https?:\/\/(\S)+/.test()
			$("#previewText").empty()
			$("#previewText").append "<iframe width=\"100%\" height=\"800px\"src=\"" + abst + "\"></ifram>"
		else
			$("#previewText").text abst
		$("#previewDialog").modal()
		$("#previewDialog").modal keyboard: false
		$("#previewDialog").modal "show"
		return
	
	
	showPopup: (node) ->
		console.log node["attributes"]
		@popUp and @popUp.remove()
		@popUp = $("").append(node["attributes"]).css(
			display: "inline-block"
			"border-radius": 3
			padding: 5
			background: "#fff"
			color: "#000"
			"box-shadow": "0 0 4px #666"
			position: "absolute"
			left: node.displayX
			top: node.displayY + 15
		)
		$("#sigmaViz").append @popUp
		return
	 
	 
	hidePopup: ->
		@popUp and @popUp.remove()
		@popUp = false
		return


##################################################################
# Sigma graph view, displays the visualisation of the graph
# This class renders the visual centerpiece of smarter data
# And allows users visualise the result of their queries
##################################################################
class smarterData.GraphView
	
	constructor: ->
		log "init graph view"
		
		# globals
		@blacklist = ["hdtid","group","id","smartURI","name","label", "smartIcon", "smartColour", "smartIconHelper", "smartType","type"]
		@selectedNode = undefined
		@SigmaMenu = new SigmaMenu()
		# templates
		@propsTemplate = _.template """
		<div class="panel panel-primary">
			<div class="panel-heading">
		    	<h3 class="panel-title">
					<span class="badge" style ="background-color: <%= node.smartColour %>;"> 
						<span class="glyphicon glyphicon-<%= node.smartIconHelper %>"></span> 
					</span>
					&nbsp;<a href="<%= node.smartURI %> " target="_blank"><%= node.name %></a></h3>
			</div>
			<ul class="list-group">
				<% _.each(pairs, function(pair) { %>  <li class="list-group-item">
					<div><b><%= pair[0] %></b></div><span style="padding-left:4em"><%= pair[1] %></span></li>
					 <% }); %>
			</div>
		</div>
			"""
		
		# Event listeners
		$(document).on "begob", "#search", (e, @graph) => 
			log "graphview set"
			@allUpdate()
		
		$(document).on "all-update", "#search", (e) => 
			@allUpdate()

		$(document).on "index_set", "#content", (e, @index) => 
			log "Index set"
		
		$(document).on "showTopics", "#search", (e) => 
			@showTopics()
			
		$(document).on "showSelectedNode", "#search", (e) => 
			@expandNode() unless @selectedNode is `undefined`
		
		$(document).on "showPreview", "#search", (e) => 
			log "received preview event"
			@SigmaMenu.showPreviewOrSum(@hdtIdToNode(@selectedNode))
		
		# Boilerplate needed when using sigma graph
		# Sets up image data on the nodes
		throw "sigma is not declared"  if typeof sigma is "undefined"
		sigma.utils.pkg "sigma.canvas.nodes"
		sigma.canvas.nodes.image = (->
			renderer = (node, context, settings) ->
				#args = arguments_
				prefix = settings("prefix") or ""
				size = node[prefix + "size"]
				color = node.color or settings("defaultNodeColor")
				url = node.url
				context.save()
				context.beginPath()
				context.arc node[prefix + "x"], node[prefix + "y"], node[prefix + "size"], 0, Math.PI * 2, true
				context.closePath()
				context.clip()
				context.fillStyle = color
				context.fill()
				context.font = (size) + "px Glyphicons Halflings"
				context.fillStyle = "black"
				context.fillText url, node[prefix + "x"] - (size / 2), node[prefix + "y"] + (size / 2), size
				context.restore()
				context.beginPath()
				context.arc node[prefix + "x"], node[prefix + "y"], node[prefix + "size"], 0, Math.PI * 2, true
				context.lineWidth = size / 5
				context.strokeStyle = node.color or settings("defaultNodeColor")
				context.stroke()
				return
			renderer
		)()
		
		# sigma.publicPrototype.outDegreeToSize = ->
		# 	@iterNodes((node) ->
		# 		node.size = node.outDegree
		# 		return
		# 	).draw()


	showTopics:  =>
		log "got call to show topic, getting selected node"
		node = @hdtIdToNode(@selectedNode)
		if node.path is `undefined`
			alert "Resource isn't of type Document" + node.name
			return
		$("#search").trigger "extractTopics", node
		
	hdtIdToNode: (id) ->
		_.find @graph.nodes, (node) -> node.id is id


	allUpdate: =>
		log "activating all update for sigma graph"
		@clearCanvas()
		@initVisualization()


	initVisualization: =>
		log "initialize visualisation"
		transformedNodes = @graph.nodes
		transformedLinks = @graph.links

		filtered =[]
		clusters = []
		clusterLocator = []
		g =
			nodes: []
			edges: []

		i = undefined
		N = transformedNodes.length
		E = transformedLinks.length
		entity = 0
		clusterCount = 0
		clusters.push
			id: "def"
			nodes: []
			color: "#556270"

		clusterLocator["def"] = clusterCount++
		i = 0
		while i < N
			if transformedNodes[i].visible == false
				log "removed "
				log transformedNodes[i]
				filtered.push transformedNodes[i].hdtid
				i++
				continue 
			if typeof transformedNodes[i].hdtid isnt "undefined"
				if typeof transformedNodes[i].group is "undefined"
					cluster = clusters[clusterLocator["def"]]
				else	
					#console.log(transformedNodes[i].group);
					if typeof clusters[clusterLocator["C" + transformedNodes[i].group]] isnt "undefined"
						cluster = clusters[clusterLocator["C" + transformedNodes[i].group]]
					else
						cluster =
							id: "C" + transformedNodes[i].group
							nodes: []
							color: "#556270"

						clusters.push cluster
						clusterLocator["C" + transformedNodes[i].group] = clusterCount++
					size = 120
					node =
						id: transformedNodes[i].hdtid.toString()
						x: Math.random()
						y: Math.random()
						type: "image"
						size: 80
						color: transformedNodes[i].smartColour
						cluster: cluster["id"]
						label: transformedNodes[i].name
						attributes: description

					node.url = transformedNodes[i].smartIcon
					g.nodes.push node
					cluster.nodes.push transformedNodes[i].hdtid.toString()
			i++
		i = 0
		while i < E
			if filtered.indexOf(transformedLinks[i].source) >= 0 or filtered.indexOf(transformedLinks[i].target)  >= 0 
				i++
				continue
			g.edges.push
				type: "curve"
				id: "e" + i
				source: transformedLinks[i].source.toString()
				target: transformedLinks[i].target.toString()
				label: "howdy mum"

			i++
		
		log "creating sigma Instance"
		#CustomShapes.init(@sigmaInst);
		@sigmaInst = new sigma(
			graph: g
			renderer:
			
				# IMPORTANT:
				# This works only with the canvas renderer, so the
				# renderer type set as "canvas" is necessary here.
				container: document.getElementById("sigmaViz")
				type: "canvas"

			settings:
				borderSize: 1 #Something other than 0
				nodeBorderColor: "default" #exactly like this
				defaultNodeBorderColor: "#000" #Any color of your choice
				defaultBorderView: "always" #apply the default color to all nodes always (normal+hover)
				defaultEdgeType: "curve"
				labelThreshold: 13
				doubleClickEnabled: true
				minEdgeSize: 5
				maxEdgeSize: 10
				maxNodeSize: 12
				defaultLabelColor: "#000"
				edgeLabels: true
		)
		@sigmaInst.bind "overNode", (e) =>
			@setNodeFromEvent(e)

		@sigmaInst.bind "outNode", (e) ->
			setTimeout @unselectCallback, 4000

		@sigmaInst.bind "clickNode", (e) =>
			@setNodeFromEvent(e)
			$("#smartentity").empty()
			node = @hdtIdToNode(@selectedNode)
			pairs = _.pairs node 
			pairs = _.reject pairs, (pair) => _.contains @blacklist, pair[0]
			$("#smartentity").append @propsTemplate {pairs : pairs, node: node }

		@sigmaInst.bind "doubleClickNode", (e) =>
			@setNodeFromEvent(e)
			@expandNode()
		
		log "starting force atlas"
		@sigmaInst.startForceAtlas2()
		setTimeout @forceCallback, 5000
		return
	
	expandNode: ->
		$("#search").trigger "nodechosen", [@selectedNode]
	
	
	getNodeFromEvent: (e) ->
		parseInt(e.data.node.id)
	
	
	setNodeFromEvent:(e) =>
		@selectedNode = @getNodeFromEvent(e)
	
		
	unselectCallback: =>
		#@selectedNode = "undefined"
	
	
	forceCallback: =>
		@sigmaInst.stopForceAtlas2()
	
	
	clearCanvas: ->
		$("#sigmaViz").remove()
		$("#sigmaViz-parent").append "<div id=\"sigmaViz\" style=\"height:800px;\"></div>"
		$("#sigmaViz").html ""
		return