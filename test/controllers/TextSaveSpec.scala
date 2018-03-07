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
 * Tests json services for saving raw text as smart resource
 *
 */
@RunWith(classOf[JUnitRunner])
class TextSaveSpec extends PlaySpecification{
    
        "Text Save Json Controller" should {
        	    
        	val fakeContent = "bobo"

        	"when I create a classtype, I am returned the saved object" in new WithApplication {
	            val result = controllers.json.TextSave.create("fakefile", "fakeext")(FakeRequest()
	                    .withTextBody(fakeContent))
	            status(result) must beEqualTo(OK)
	            contentType(result) must beSome("application/json")
	            charset(result) must beSome("utf-8")
	            val json = contentAsJson(result)
        		(json \ "originalFile").as[Option[String]] must beSome("fakefile.fakeext") 
	        }
        	
        	        	
        }
}