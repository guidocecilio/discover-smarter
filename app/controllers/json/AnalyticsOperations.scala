package controllers.json

import analytics.AfterExecution
import analytics.AfterExecutionUseWebservice
import analytics.AnalyticsOperation
import analytics.ExecuteDBRule
import analytics.ExecuteRule
import play.api.data.Form
import play.api.data.Forms.mapping
import play.api.data.Forms.optional
import play.api.data.Forms.text
import play.api.mvc.Action
import play.api.mvc.Controller

/**
 * Controller object for analytics operations, used by play to execute analytics
 */
object AnalyticsOperations extends AnalyticsOperationController with AfterExecutionUseWebservice with ExecuteDBRule
 
    
trait AnalyticsOperationController extends Controller with AnalyticsOperation {
    
    this: ExecuteRule with AfterExecution =>
    
    val executeOpForm = Form(
        mapping(
            "callbackurl" -> optional(text),
            "enc" -> optional(text))(executeOpParams.apply)(executeOpParams.unapply))
     
    case class executeOpParams(callbackurl: Option[String], enc: Option[String])   
            
     /**
     *  @param analyticsRuleId
     *   @return
     */
    def execute(analyticsRuleId: String) = Action {
        executeRule(analyticsRuleId) match {
            case None => Ok("no such rule exists")
            case Some(result) => Ok(result.json())
        }
    }

    def executeAsync(analyticsRuleId: String) = Action { implicit request =>
        val executeOptions = executeOpForm.bindFromRequest.get
        Ok(executeAsyncOp(analyticsRuleId, executeOptions.enc, executeOptions.callbackurl))
    }  
}