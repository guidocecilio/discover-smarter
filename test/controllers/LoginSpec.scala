package controllers

import org.junit.runner.RunWith
import org.specs2.runner.JUnitRunner
import org.specs2.mutable._
import play.api.libs.iteratee._
import play.api.mvc._
import play.api.test._
import play.api.test.Helpers._
import play.api.test.FakeApplication
import play.api.libs.concurrent.Promise
import concurrent.duration.Duration
import play.api.mvc.Cookie
import scala.concurrent.Future

/**
 * Useful trait for tests on secured services.
 * mix it in and call logMeIn() to log in and get session cookie
 * once called use 
 * val authcookie = logMeIn()
 * FakeRequest(GET, your/fave/url").withCookies(authcookie)
 *
 * @author naoise
 *
 */
trait WithLogin{
	val PLAY_SESSION = "PLAY_SESSION"
	
	def logMeIn():Cookie = logMeIn("test@test.com","secret")
	
	def logMeIn(user: String, password: String):Cookie = {
		val Some(loginResult) = route(FakeRequest(POST, "/login")
            		.withFormUrlEncodedBody(
            				"email" -> user,
            				"password" -> password
            				))
        val Some(cookie:Cookie) = cookies(loginResult).get(PLAY_SESSION)
        cookie
	}
}

/**
 * Simple assists for testing response messages from webservices
 * @author naodun
 *
 */
trait WebCheck extends Specification{
  
	def isHTML(result: Future[SimpleResult]){
		status(result) must equalTo(OK)
		charset(result) must beSome("utf-8")
		contentType(result) must beSome("text/html")
	}
	
	def isJSON(result: Future[SimpleResult]){
		status(result) must equalTo(OK)
		charset(result) must beSome("utf-8")
		contentType(result) must beSome("application/json")
	}
}

/**
 * Simple example of using logmein function
 * 
 * @author naoiseandval
 *
 */
@RunWith(classOf[JUnitRunner])
class LoginSpec extends Specification with WithLogin {

  "Application" should {
        // this compiles fine
        "show the login page" in new WithApplication{
            val result = controllers.Application.login()(FakeRequest())
            status(result) must equalTo(OK)
            contentType(result) must beSome("text/html")
            charset(result) must beSome("utf-8")
            contentAsString(result) must contain("form")        
        }

        "respond to the login route is ok" in new WithApplication{
            val Some(result) = route(FakeRequest(GET, "/login"))
            status(result) must equalTo(OK)
            contentType(result) must beSome("text/html")
            charset(result) must beSome("utf-8")
            contentAsString(result) must contain("form")
        }
        
        "login works, I am redirected and I can access secured ping services" in new WithApplication{
            val req = FakeRequest(GET, "/ping").withCookies(logMeIn())
            val Some(pingresult) = route(req)
            status(pingresult) must equalTo(OK)
            val text = contentAsString(pingresult)	
            text must beEqualTo("logged in as: test@test.com")
        }
    }
	
}