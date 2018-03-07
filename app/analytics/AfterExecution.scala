package analytics

import play.api.libs.json.JsValue
import play.api.Logger
import scala.concurrent.Future
import play.api.libs._

/**
 * Trait used to define expected API that is called after execution by
 *  Analytics Operation.  useful for mocking or extending api.
 *
 */
trait AfterExecution {
    def callMe(callback: String, json: JsValue): Future[ws.Response]
}

trait AfterExecutionUseWebservice extends AfterExecution {
    def callMe(callback: String, json: JsValue): Future[ws.Response] = {
        Logger.info("callback being made to: " + callback)
        ws.WS.url(callback).post(json)
    }
}