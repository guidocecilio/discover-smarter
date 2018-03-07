package controllers

import org.specs2.mutable._
import org.junit.runner._
import org.specs2.mock.Mockito
import org.specs2.runner.JUnitRunner

import play.api.test._
import play.api.test.Helpers._

import play.api.libs.json.Json
import play.api.libs.json.JsArray
import play.api.libs.json.JsValue

import play.api.mvc.AnyContent
import play.api.mvc.Controller
import play.api.mvc.AnyContentAsEmpty
import play.api.mvc.Call
import play.api.mvc.Security

import models.Project

/**
 * Tests json services for projects
 *
 */
@RunWith(classOf[JUnitRunner])
class RdfClassTypesSpec extends PlaySpecification{
    
        "In Class Type Controller" should {

        	val fakefile = "filename"
        	val email = "test@test.com"
        	val password = "secret"
        	    
        	val fakeDatasource = Json.obj(
                "id" 			-> fakefile,
                "categoryList" 	-> Map(("key1", "val1"),("key2", "val2")),
                "icons" 		-> Map(("key1", "val1"),("key2", "val2")),
                "iconChars" 	-> Map(("key1", "val1"),("key2", "val2")),
                "colors" 		-> Map(("key1", "val1"),("key2", "val2")),
                "showTargetNodes" -> true
                )

	                
        	"when I create a classtype, I am returned the saved object" in new WithApplication {
	            val result = controllers.json.RdfClassTypes.create()(FakeRequest()
	                    .withJsonBody(fakeDatasource))
	            status(result) must beEqualTo(OK)
	            contentType(result) must beSome("application/json")
	            charset(result) must beSome("utf-8")
	            val json = contentAsJson(result)
        		(json \ "id").as[Option[String]] must beSome("filename")  // WHAAA? this is the result but what does it mean???
	        }
        	
        	        	
        }
}