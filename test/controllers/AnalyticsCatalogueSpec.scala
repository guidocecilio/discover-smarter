package controllers

import org.junit.runner.RunWith
import org.specs2.Specification
import org.specs2.mock.Mockito
import org.specs2.mutable.SpecificationWithJUnit
import org.specs2.runner.JUnitRunner
import org.junit.runner.RunWith
import org.specs2.mutable.SpecificationWithJUnit
import play.api.test.WithApplication
import play.api.test.FakeRequest
import play.api.test.Helpers._
import play.api.libs.json.JsValue
import play.api.mvc.Security


/**
 * Tests for executing analytics rules, tests most of the services features
 *
 * Execution of Analytics rules allows us to create new graphs from existing graph data.
 * Should help us with
 *
 */
@RunWith(classOf[JUnitRunner])
class AnalyticsCatalogueSpec extends SpecificationWithJUnit {

    "The Analytics Catalogue Service" should {
        "be able list Analytics Rules as JSON giving id and name" in new WithApplication {
            val result = controllers.AnalyticsCatalogue.getAll()(FakeRequest())
            contentType(result) must beSome("application/json")
            charset(result) must beSome("utf-8")
            val json = contentAsJson(result)
            (json (0) \ "id").as[String] must contain("tinkerAll")
            (json (0) \ "name").as[String] must contain("simple")
        }
 
        "allow creation of a new rule given just a project ID and a query string" in new WithApplication {
            val result = controllers.AnalyticsCatalogue.add()(FakeRequest().withSession(Security.username -> "test@test.com")
            		.withFormUrlEncodedBody(("project", "1"), ("querystring", "g")))
            contentType(result) must beSome("text/html")
            charset(result) must beSome("utf-8")
            val html = contentAsString(result)
            html must contain("g")
            html must contain("not a name")
        }
        
        "allow rename of a rule" in new WithApplication {
            val result = controllers.AnalyticsCatalogue.rename("tinkerAll")(FakeRequest()
               .withFormUrlEncodedBody(("name", "newName")))
            contentType(result) must beSome("text/plain")
            charset(result) must beSome("utf-8")
            val html = contentAsString(result)
            html must beEqualTo("newName")
        }
        
        "allow update of a query string" in new WithApplication {
            val result = controllers.AnalyticsCatalogue.updateQueryString("tinkerAll")(FakeRequest()
                .withFormUrlEncodedBody(("querystring", "g.getAll()")))
            contentType(result) must beSome("text/plain")
            charset(result) must beSome("utf-8")
            val html = contentAsString(result)
            html must beEqualTo("g.getAll()")
        }
        
    }
    
    
}