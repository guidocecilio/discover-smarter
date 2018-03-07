package analytics

import play.api.libs._
import play.api.libs.json._
import play.api.libs.json.Json._
import scala.concurrent.Future
import play.api.libs.json.JsValue
import play.api.Logger

/**
 * Trait with all functions used by Analytics Operations.  Intended to act as part of
 * Execution Component, allowing us to mock out some services and calls.
 *
 * This is an 2nd pass of an implementation of the cake pattern.
 * 
 * @author naodun
 *
 */
trait AnalyticsOperation{

    this: ExecuteRule with AfterExecution =>

    def executeAsyncOp(analyticsRuleId: String, enc: Option[String], callbackurl: Option[String]):JsValue = { 
        Logger.debug("Async Execution")
        val datablockResult = executeRule(analyticsRuleId).get.json()

        callbackurl match {
            case Some(url) =>
                val result: Future[ws.Response] = {
                    callMe(url, datablockResult)
                    //TODO: ND If callback fails then add metric
                }
            case None => Logger.info("No callback made")
        }
        datablockResult
    }

}