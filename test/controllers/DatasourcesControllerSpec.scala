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
class DatasourcesControllerSpec extends PlaySpecification{
    
        "In Datasources Controller" should {

        	val fakefile = "filename"
        	val email = "test@test.com"
        	val password = "secret"
        	    
        	val fakeDatasource = Json.obj(
                "name" 			-> fakefile,
                "location" 		-> fakefile,
                "project" 		-> 1,
                "description" 	-> "haggis",
                "dataType" 		-> "graph"
                )

            "/datasource URL gives all datasources" in new WithApplication {
        	    val Some(result) = route(FakeRequest(GET, "/datasource"))
        	    status(result) must beEqualTo(OK)
	            contentType(result) must beSome("application/json")
	            charset(result) must beSome("utf-8")
	            val json = contentAsJson(result)
        		json.as[JsArray].value.size must beGreaterThan(3)
	        }    
	                
        	"when I create a datasource, I am returned a pointer to that source" in new WithApplication {
	            val result = controllers.json.DataSources.createDataSource()(FakeRequest()
	                    .withJsonBody(fakeDatasource))
	            status(result) must beEqualTo(OK)
	            contentType(result) must beSome("application/json")
	            charset(result) must beSome("utf-8")
	            val json = contentAsJson(result)
	            //(json \ "id").as[Int] must beEqualTo(1)  // 1 indexed array
        		(json \ "self").as[Option[String]] must beSome("/")  // WHAAA? this is the result but what does it mean???
	        }
        	
        	"I can get a datasources belonging to a project " in new WithApplication {
   
        	    controllers.json.DataSources.createDataSource()(FakeRequest().withJsonBody(fakeDatasource))
        	    
	            val result = controllers.json.DataSources.getDataSourcesByProjectId(1)(FakeRequest())
	            status(result) must beEqualTo(OK)
	            contentType(result) must beSome("application/json")
	            charset(result) must beSome("utf-8")
	            
	            val json = contentAsJson(result)
	            val asArray = json.as[JsArray].value
        		val x = json.as[JsArray].value.size
//        		asArray.filter(proj => (proj \ "name").as[Option[String]].equals("filename") )
        		val firstProj =  (json) (x-1)
        		
        		// check first project matches that set in global class
        		(firstProj \ "name").as[Option[String]] must beSome("filename")
        		(firstProj \ "location").as[Option[String]] must beSome("filename")
	            (firstProj \ "project").as[Option[String]] must beEqualTo(None) //TODO: why is this not set...
	            (firstProj \ "description").as[Option[String]] must beSome("haggis")
	            (firstProj \ "dataType").as[Option[String]] must beSome("graph")
	        }
        	
        	"When I list all datasources, I am returned a json array of datasources containing one I added" in new WithApplication {

        	    controllers.json.DataSources.createDataSource()(FakeRequest().withJsonBody(fakeDatasource))
        	    
	            val result = controllers.json.DataSources.listDataSources()(FakeRequest()
	                    .withSession(Security.username -> "test@test.com"))
	            status(result) must beEqualTo(OK)
	            contentType(result) must beSome("application/json")
	            charset(result) must beSome("utf-8")
	            
	            val json = contentAsJson(result)
        		val x = json.as[JsArray].value.size
        		val firstProj =  (json) (x-1)
        		
        		// assumes ordered list, should be the fake Datasource we added earlier in test
        		(firstProj \ "name").as[Option[String]] must beSome("filename")
        		(firstProj \ "location").as[Option[String]] must beSome("filename")
	            (firstProj \ "project").as[Option[String]] must beEqualTo(None) //TODO: why is this not set...
	            (firstProj \ "description").as[Option[String]] must beSome("haggis")
	            (firstProj \ "dataType").as[Option[String]] must beSome("graph")
	        }
        	        	
        }
}