package controllers

import org.junit.runner.RunWith
import org.specs2.mutable.SpecificationWithJUnit
import org.specs2.mock.Mockito
import org.specs2.runner.JUnitRunner
import play.api.libs._
import play.api.libs.json.JsValue
import play.api.mvc.AnyContent
import play.api.mvc.Controller
import play.api.test.DefaultAwaitTimeout
import play.api.test.PlaySpecification
import play.api.test.ResultExtractors
import play.api.test.WithApplication
import play.api.test.FakeRequest
import play.api.test.Helpers._
import play.api.mvc.Security
import play.api.libs.json.Json
import models.Project
import play.api.Logger

/**
 * Tests json services for projects
 *
 */
@RunWith(classOf[JUnitRunner])
class ProjectControllerSpec extends SpecificationWithJUnit with Mockito with WithLogin with WebCheck {

	"In Project Controller" should {

		"When I list all projects, I am returned a json array of projects, each project has id, folder and name" in new WithApplication {
			val result = controllers.Projects.listProjects()(FakeRequest())
			contentType(result) must beSome("application/json")
			charset(result) must beSome("utf-8")
			status(result) must equalTo(OK)
			val json = contentAsJson(result)
			val firstProj = (json)(0)
			// check first project matches that set in global class
			(firstProj \ "id").as[Int] must beEqualTo(1) // 1 indexed array
			(firstProj \ "folder").as[Option[String]] must beSome("Talend Example")
			(firstProj \ "name").as[Option[String]] must beSome("Demonstration of using Talend")
		}

		"When I create a project, I would like analytics rules to be referenced correctly" in new WithApplication {

			val authCookie = logMeIn()
			val projectIdInHtmlPattern = """(?<=data-project=\")\d+(?=\")""".r
			val ruleIdInHtmlPattern = """(?<=project=\")\d+(?=\")""".r

			// "Create a group testGroup to create the HTML element for the required group"
			val Some(result) = route(FakeRequest(POST, "/projects/groups")
				.withCookies(authCookie)
				.withFormUrlEncodedBody(("group", "megroup")))
			isHTML(result)
			contentAsString(result) must contain("""<button class="newProject btn btn-info btn-xs" alt="new Project">""")

			// "create a project testProject "
			val Some(projectResult) = route(FakeRequest(POST, "/projects")
				.withCookies(authCookie)
				.withFormUrlEncodedBody(("group", "megroup")))
			isHTML(projectResult)
			val projectResultBody = contentAsString(projectResult)
			val Some(projectId) = projectIdInHtmlPattern.findFirstIn(projectResultBody)
			projectId.toInt must beGreaterThan(1)

			// "add a rule to testProject "
			val Some(ruleResult) = route(FakeRequest(POST, "/rule")
				.withCookies(authCookie)
				.withFormUrlEncodedBody(("project", projectId)))
			isHTML(ruleResult)
//			val Some(ruleId) = ruleIdInHtmlPattern.findFirstIn(contentAsString(ruleResult))
//			ruleId.toInt must beGreaterThan(1)

			//		    { // "rename rule to ruleUnderTest "
			//				val Some(result) = route(FakeRequest(PUT, "/rule/rename/"+ruleId)
			//				    .withCookies(authCookie).withFormUrlEncodedBody(("name", "ruleUnderTest")))
			//				beOkHtmlHeader(result)
			//				result must be("ruleUnderTest")
			//			}
		}
	}
}