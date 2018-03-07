package controllers

import play.api.mvc.Controller
import play.api.Logger


/**
 * Barebones secured service, used for heartbeat and tests.
 * 
 * @author naoise
 *
 */
object PingController extends Controller with Secured {

	  def ping = IsAuthenticated { username => implicit request =>
	 	Logger.info("PING!!!")
	    Ok("logged in as: " + username)
	  }
	
}