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


@RunWith(classOf[JUnitRunner])
class WebTailControllerSpec  extends PlaySpecification{
	
	"/tail lists first 2 lines of file" in new WithApplication {
        	    val Some(result) = route(FakeRequest(GET, "/tail/Arts_Centres.csv/2"))
        	    status(result) must beEqualTo(OK)
	            contentType(result) must beSome("application/json")
	            charset(result) must beSome("utf-8")
	            val json = contentAsJson(result)
        		json.as[JsArray].value.size must beEqualTo(2)
	        }    
	
}