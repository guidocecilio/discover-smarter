package controllers.json

import play.api.mvc.Action
import play.api.Routes
import play.api.mvc._

object JsonRoutes extends Controller {
	
	def javascriptRoutes = Action { implicit request =>
	    import routes.javascript._
	    Ok(
	      Routes.javascriptRouter("jsonRoutes")(       
		    AnalyticsOperations.execute, 
		    AnalyticsOperations.executeAsync,
		    
		    AnalyticsRules.create,
		    AnalyticsRules.getAll,
		    
		    RdfClassTypes.create,
		    RdfClassTypes.getAll,
		    RdfClassTypes.getByRuleId,
		    
	        DataSources.createDataSource
	      )
	    ).as("text/javascript") 
	  }
}