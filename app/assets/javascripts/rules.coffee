# Just a log helper
log = (args...) ->
  console.log.apply console, args if console.log?

# ---------------------------------------- 
#Rules NEESH
# ---------------------------------------- 
class facets.Rules extends Backbone.View
	initialize: ->
		$("#analytics-rulelist").children(".panel").each (i,rule) ->
			log "adding new rule: " + rule
			new facets.Rule
				el: $(rule)
  	
	events:
		"click .newRule": "newAnalyticsRule"

	newAnalyticsRule: (e) ->
		e.preventDefault()
		log "new rule"
		@project = document.getElementById("rules").getAttribute("ruleproject")
		@setElement(document.getElementById("rules"))
		r = jsRoutes.controllers.AnalyticsCatalogue.add()
		$.ajax
		  url: r.url
		  type: r.method
		  data:
		    project: @project
		  success: (ruleitem) ->
		    _view = new facets.Rule
		      el: $(ruleitem).appendTo("#analytics-rulelist")
		    _view.$el.find(".rulename").editInPlace("edit")
		  error: (err) ->
		  	$.error("Error: " + err)


# ---------------------------------------- 
# Rule
# ---------------------------------------- 
class facets.Rule extends Backbone.View

	initialize: ->
	    console.log('adding new rule...')
	    @name = $("div h4 a .rulename", @$el).editInPlace
	      context: this
	      onChange: @renameRule
	    @id = @$el.attr("data-rule")
	    @projId = @$el.attr("proj-id")
	    @editor = ace.edit("editor"+@id)
	    log "new rule added" + @id

	events:
		"click .saveRule" : "saveRule"
		"click .runRule" : "runRule"
		"click .gotoProject" : "gotoProject"
		
	runRule: (e) ->
		log "saving the running the rule"
		this.saveRule(e)
		window.location.href = "/d3graph/"+@id

	gotoProject: (e) ->
		log "returning to project"
		window.location.href = "/#/projects/"+@projId+"/tasks"

	saveRule: (e) ->
		e.preventDefault()
		log "saving rule"
		r = jsRoutes.controllers.AnalyticsCatalogue.updateQueryString(@id)
		$.ajax
	      url: r.url
	      type: r.method
	      context: this
	      data:
	        querystring: @editor.getSession().getValue()
	      success: (data) ->
	      	@$el.find(".editorMessage").text("saved") 
	      	@$el.find(".editorMessage").fadeIn("slow")
	      	log "appened"
	      error: (err) ->
	      	@$el.find(".editorMessage").text("problem saving") 
	      	$.error("Error: " + err)

	renameRule: (name) =>
		log "renaming rule"
		r = jsRoutes.controllers.AnalyticsCatalogue.rename(@id)
		$.ajax
	      url: r.url
	      type: r.method
	      context: this
	      data:
	        name: name
	      success: (data) ->
	        @name.editInPlace("close", data)
	      error: (err) ->
	        $.error("Error: " + err)