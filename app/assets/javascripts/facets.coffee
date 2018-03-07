
# Just a log helper
log = (args...) ->
	console.log.apply console, args if console.log?

# ---------------------------------------------------------- 
# Truncates strings that are too long and appends a ...
# ----------------------------------------------------------
String::trunc = -> 
	if @length>50
		@substr(0,49)+'&hellip;'
	else
		@

String::detrunc = -> 
	if @length>50
		@substr(0,49)
	else
		@


# ---------------------------------------------------------- 
# Model entity representing a single Facet
# ----------------------------------------------------------
class FacetItem extends Backbone.Model

	defaults:
		category: 'some category'
		facet: 'A Facet'
		count: 0
		total: 10
		width: 0


# ---------------------------------------------------------- 
# Facet collection
# ----------------------------------------------------------
class FacetItems extends Backbone.Collection

	model: FacetItem


# ---------------------------------------------------------- 
# Model entity representing a single Facet
# ----------------------------------------------------------
class FacetCategory extends Backbone.Model

	defaults:
		category: 'some category'
		count: 333
		total: 10
		width: 0
		facets: []

# ---------------------------------------------------------- 
# Facet collection
# ----------------------------------------------------------
class FacetCategoryList extends Backbone.Collection

	model: FacetCategory
	localStorage: new Backbone.LocalStorage("JSON")
	
	handleURI: (uri) ->
		if uri.contains("#")
			uri.substring(url.indexOf('#')+1)
		else
			uri
			
	parse: (billy) ->
		log 'Graph Json received by faceted browser, now processing'
		data = localStorage.getItem "JSON"
		data = JSON.parse data
		keyList = _.reduce data.nodes, (nodearray, node) ->  
			if nodearray instanceof Array
				_.union Object.keys(node), nodearray
			else
				Object.keys(node)
		#log "got all keys now entering map reduce"
		AllfacetItems = _.map keyList, (category) ->
			facets = _.compact _.pluck data.nodes, category
			shortCategory = category
			if (category.indexOf('#'))
				shortCategory = category.substring(category.indexOf('#')+1)
			
			# FIXME: nd: updating some gui stuff here might instead use a global that can be rendered as part of a view
			$('#search_by_category').append "<li><a href='#'>"+ shortCategory + "</a></li>"
			
			uniquefacets = _.uniq facets
			log "got categories, length of no of unique facets is: " + uniquefacets.length
			facetItems = _.map uniquefacets, (name) -> 
				fCount = _.reduce facets, ((counts, x) ->  if x is name then counts + 1 else counts), 0
				fWidth = (fCount / facets.length)*100;
				#log "about to create facet item: [" + name + "], category [" + category + "]"
				new FacetItem({category: shortCategory.replace(/(^"|"$)/g, '') , facet: (""+name).replace(/(^"|"$)/g, '').trunc(), count: fCount, total: facets.length, width: fWidth}) 
			facetItems = _.sortBy facetItems, (facetItem) ->
				facetItem.get("count");
			facetItems.reverse()
			#log "creating category with items"
			new FacetCategory({category: shortCategory , count:facets.length, total: data.nodes.lenght, facets: facetItems})
		facets.registerSearch()
		AllfacetItems = _.sortBy AllfacetItems, (facetCategory) ->
				facetCategory.get("count")
		AllfacetItems.reverse()


#### Tags ####

# ---------------------------------------------------------- 
# Tag for representing a selected facet
# ----------------------------------------------------------
class FacetTag extends Backbone.Model

	defaults:
		category: 'some category'
		facet: 'A Facet'

# ---------------------------------------- 
#Facets - manages faceted browsing sidebar
# ---------------------------------------- 
class FacetTagView extends Backbone.View

	initialize: () ->
		log "Setting tag..." 
		@el = $("body").find("#facettags")
		@id = @model.get('category').replace /[^a-zA-Z0-9]/g, ''
		facetName = @model.get 'facet'
		facetName = facetName.replace /[^a-zA-Z0-9]/g, ''
		@id += facetName 
		@render()
		$("#" + @id).bind 'click', @removeTag

	render: =>
		log "about to render " + @id
		$(@el).append """
			<div id="#{@id}" class="label label-success" >#{@model.get 'category'}:#{@model.get 'facet'}
			</div>&nbsp
		"""
		@

	removeTag: (e) =>
		log "removing tag [" + @id + "]"
		cat = @model.get 'category'
		mod = @model.get 'facet'
		facets.removeFilter(cat, mod.detrunc())
		$("#" + @id).html ""
		@.remove()
		@
#### end of tags ####


# ---------------------------------------------------------- 
# Facet Item View - shows facet item with nice visualization
# ----------------------------------------------------------
class FacetItemView extends Backbone.View

	tagName: 'li'

	initialize: ->
		#log  "in FacetItemView"
		@facet =""
		#_.bindAll @

	events:
		"click .facet-link": 'filterGraph'

	render: ->
		$(@el).html """
		<div class="row" >
	        <div class="col-xs-7"><a data-category="#{@model.get('category').replace /[^a-zA-Z0-9]/g, ''}" data-facet="#{@model.get 'facet'}" class="facet-link">#{@model.get 'facet'}</a></div>
	        <div  class="col-xs-3" style="height: 10px; padding-top:2px;">
				<div class="progress" style="height: 8px;">
					<div class="progress-bar progress-bar-success" role="progressbar" aria-valuenow="#{@model.get 'width'}" aria-valuemin="0" aria-valuemax="100" style="width:#{@model.get 'width'}%">
						<span class="sr-only">80% Complete (success)</span>
					</div>
				</div>
	        </div>
	        <div class="col-xs-2">
				<span class="label label-default">#{@model.get 'count'}</span>
	        </div>
	    </div>
		"""
		@
		
	filterGraph: ->
		facet = @model.get 'facet'
		facet  = facet + ""
		category = @model.get 'category'
		item = new FacetTag
		item.set(facet: facet)
		item.set(category: category)
		#item_view = new FacetTagView model: item
		facets.modifyFilter(category, facet.detrunc())


# ---------------------------------------------------------- 
# Facet Category View - shows facet category, 
# and kicks of display of facet items too
# ----------------------------------------------------------
class FacetCategoryView extends Backbone.View

	tagName: 'li'

	initialize: ->
		#log "in FacetCategoryView" 
		@ShortModel = @model.get('category').replace /[^a-zA-Z0-9]/g, ''
		@itemCollection = new FacetItems @model.get "facets"
		@listenTo @itemCollection, "reset", @yetmore
		@itemCollection.bind 'add', @appendItem
		$('#facet-entities').append @render().el
		@viewItemCount = 0
		@yetmore()
		#_.bindAll @

	events:
		"click .moreFacets": 'renderAll'
	
	render: ->
		$(@el).html """
			<button class="btn btn-default btn-xs" data-toggle="collapse" data-target="##{@ShortModel}" style="width: 100%;" >
	        <div class="row" alt="#{@model.get 'category'}" style="text-align: left;">
				<div class="col-xs-2"><span class="label label-default" style="color:#fffff;">#{@model.get 'count'}</span></div>
	        	<div class="col-xs-8"><b>#{@model.get('category')}</b></div>
	        </div>
	        </button>
        <ul id="#{@ShortModel}" class="nav collapse">
        </ul>
		"""
		@

	renderEnd: ->
		$(@el).html """
	        <span class="label label-primary">...</span>
		"""
		@

	appendItem: (item) ->
		if @viewItemCount < 3
			item_view = new FacetItemView model: item
			$('#facet-entities').append item_view.render().el
		else if @viewItemCount == 3
			@viewItemCount = @viewItemCount + 1
			$('#facet-entities').append item_view.renderEnd().el
	
	yetmore: ->
		threshold = 0
		@itemCollection.each (facetItem) ->
			threshold = threshold + 1
			tagToAppend = '#' + facetItem.get('category').replace /[^a-zA-Z0-9]/g, ''
			if threshold is 10
				$(tagToAppend).append '<li><span class="moreFacets label label-primary">...</span></li>'
			else if threshold < 10
				item_view = new FacetItemView model: facetItem
				$(tagToAppend).append item_view.render().el
			
	renderAll: ->
		tagToAppend = '#' + @ShortModel
		$(tagToAppend).empty()
		@viewItemCount = 0
		@itemCollection.each (facetItem) ->
			item_view = new FacetItemView model: facetItem
			$(tagToAppend).append item_view.render().el

# ---------------------------------------- 
#Facets - manages faceted browsing sidebar
# ---------------------------------------- 
class facets.FacetGroupView extends Backbone.View

	el: $ '#facetgroups'

	initialize : (e) ->
		@categoryCollection = new FacetCategoryList
		@listenTo @categoryCollection, "reset", @more
		@categoryCollection.bind 'add', @appendCategory
		@categoryCollection.fetch reset: true
		$(document).on "begob", "#search", (e, graph) => 
			log "Begob we got it"
			@categoryCollection.fetch reset: true
			@more()
	
	events:
		"click .facet": 'doFacet'

	doFacet: (e) ->
		e.preventDefault()
		item = new FacetItem
		item.set part2: "#{item.get 'count'} #{12}"
		@categoryCollection.add item
	
	appendCategory: (item) ->
		category_view = new FacetCategoryView model: item
		$('#facet-entities').append category_view.render().el
	
	more: ->
		@categoryCollection.each (facetCategory) ->
			item_view = new FacetCategoryView model: facetCategory
			