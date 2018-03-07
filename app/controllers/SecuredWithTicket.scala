package controllers

import language.postfixOps

import play.api.mvc._
import play.api.mvc.Results._
import play.api.libs.ws.WS
import play.api.Play.current
import play.api.Logger
import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

trait SecuredWithTicket {

	val logger = Logger("secured")
//
//	final def fail(reason: String) = {
//		logger.debug(s"Access attempt failed: $reason")
//		Unauthorized("must be authenticated")
//	}
//
//	final def secured[A](action: Action[A]) = 
//		Security.Authenticated(
//			req => req.headers.get("authTicket"), _ => fail("no ticket found")) {
//			ticket =>  Action.async {
//				request => withTicket(ticket) {
//					action(request)
//			}
//		}
//	}
//
//	private def withTicket(ticket: String)(produceResult: => Result): Future[Result] =
//		isValid(ticket) map {
//			valid => if (valid) produceResult else fail(s"provided ticket $ticket is invalid")
//		}
//
//	def isValid(ticket: String): Future[Boolean]
}