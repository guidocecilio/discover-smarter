package controllers

import org.junit.runner.RunWith
import org.specs2.Specification
import org.specs2.mock.Mockito
import org.specs2.mutable.SpecificationWithJUnit
import org.specs2.runner.JUnitRunner

import play.api.http.HeaderNames
import play.api.http.HttpProtocol
import play.api.http.Status
import play.api.mvc.Controller
import play.api.test.DefaultAwaitTimeout
import play.api.test.PlaySpecification
import play.api.test.ResultExtractors
import play.api.test.WithApplication
import play.api.test.FakeRequest
import play.api.test.Helpers._
import play.api.libs.json.Json
import play.api.libs.json.JsString
import play.api.libs.json.JsValue
import java.io.File
import play.api.Logger
import controllers.HdtFileServer
import play.api.mvc.AnyContent
import play.api.mvc.SimpleResult
import controllers.json.AnalyticsOperationController
import analytics.AfterExecution
import analytics.ExecuteRule
import analytics.FakeExecuteRule
import analytics.DataBlock
import storage.LocalStore
import storage.SmartResource

import scala.concurrent.Future
import play.api.libs._

/**
 * Tests for executing analytics rules, tests most of the services features
 *
 * Execution of Analytics rules allows us to create new graphs from existing graph data.
 * Should help us with
 *
 */
@RunWith(classOf[JUnitRunner])
class AnalyticsOperationsSpec extends SpecificationWithJUnit with Mockito{

	    lazy val moveHdtFile = {{ 
    	
	      val src = new File("public/hdt/swdf-2012-11-28.hdt")
	      val dest = SmartResource("swdf.hdt")
	      if (!dest.pull.exists) {
	      	new LocalStore{}.initStore()
	      	Files.copyFile(src, dest.pull, true, true)
	      	
	      }
	}
	}
    
    "Analytics Operations" should {
//        "execute tinkergraph rule and return pointer to JSON graph" in new WithApplication {
//            val result = controllers.AnalyticsOperations.executeAsync("tinkerAll")(FakeRequest())
//            contentType(result) must beSome("application/json")
//            charset(result) must beSome("utf-8")
//            val json = contentAsJson(result)
//            (json \ "location").as[String] must contain("/file/smarter-")
//            (json \ "location").as[String] must contain(".json")
//            (json \ "typeOf").as[String] must equalTo("graph")
//            (json \ "encoding").as[String] must equalTo("json")
//        }

        "execute hdt rule and return pointer to HDT graph" in new WithApplication {
        	moveHdtFile
            val result = controllers.json.AnalyticsOperations.executeAsync("dogfoodAll")(FakeRequest().withFormUrlEncodedBody("enc" -> "hdt"))
            contentType(result) must beSome("application/json")
            charset(result) must beSome("utf-8")
            val json = contentAsJson(result)
            (json \ "location").as[String] must contain("/file/swdf-")
            (json \ "typeOf").as[String] must equalTo("graph")
            (json \ "encoding").as[String] must equalTo("hdt")
        }
// FIXME: ND 22/08/2014 these tests are commented out as graphson features are currently disabled.
//        "execute hdt rule and force generation of json graph" in new WithApplication {
//            val result = controllers.AnalyticsOperations.executeAsync("dogfoodAll")(FakeRequest().withFormUrlEncodedBody("enc" -> "json"))
//            contentType(result) must beSome("application/json")
//            charset(result) must beSome("utf-8")
//            val json = contentAsJson(result)
//            (json \ "typeOf").as[String] must equalTo("graph")
//            (json \ "encoding").as[String] must equalTo("json")
//        }

//        "execute hdt rule, make callback" in {
//            
//        	trait MockAfterExecution extends AfterExecution{
//				val mockedFuture  = mock[Future[ws.Response]]
//				def callMe(callback: String, json: JsValue): Future[ws.Response] = {
//				    callback must be("http://fakeurl.com")
//				    mockedFuture
//				}
//			}
//            
//            val urlUnderTest = "http://fake.cob"
//            val analyticsOp = new AnalyticsOperationController with MockAfterExecution with FakeExecuteRule 
//            val result = analyticsOp.executeAsync("tinkerAll")(FakeRequest().withFormUrlEncodedBody("callbackurl" -> "http://fakeurl.com"))
//
//            status(result) must beEqualTo(OK)
//        }
    }
}