package controllers.json

import play.api.mvc.Controller
import play.api.mvc.Action
import models.AnalyticsRule
import play.api.libs.json.JsValue
import play.api.libs.json.Json
import play.api.data.Form
import play.api.data.Forms._
import play.api.data.Mapping
import play.api.data.format.Formats._
import anorm.Pk
import anorm.Id
import anorm.NotAssigned
import play.api.libs.json._
import play.api.libs.json.Reads._
import play.api.libs.functional.syntax._ // Combinator syntax
import java.util.Date

/**
 * JSON Controller for analytics rules REST operations
 * 
 * @author naodun
 *
 */
object AnalyticsRules  extends Controller{
  
	implicit val pkWrites = new Writes[Pk[String]] {
		def writes(id: Pk[String]) = JsString(id.get)
	}

	implicit val pkReads = new Reads[Pk[String]] {
		def reads(json: JsValue):JsResult[Pk[String]] = {
				JsSuccess(Id(json.as[String]))
		}
	}
	
	// ND: there is boiler plate and then there is this :)))
	
	val ruleForm = Form(
    mapping(
      "id" -> ignored(NotAssigned: Pk[String]),
      "name" -> nonEmptyText,
      "queryString" -> nonEmptyText,
      "queryLang" -> default(text, "gremlin"),
      "graph" -> longNumber,
      "lastExecuted" -> play.api.data.Forms.optional(date),
      "lastExecutedResult" -> play.api.data.Forms.optional(text),
      "success" -> default(boolean, true),
      "project" -> longNumber
      )(AnalyticsRule.apply)(AnalyticsRule.unapply))
	
    implicit val ruleReads: Reads[AnalyticsRule] = (
      (JsPath \ "id")				.read[Pk[String]] and
	  (JsPath \ "name")				.read[String] and
	  (JsPath \ "queryString")		.read[String](minLength[String](1)) and
	  (JsPath \ "queryLang")		.read[String](minLength[String](4)) and
	  (JsPath \ "graph")			.read[Long] and
	  (JsPath \ "lastExecuted")		.read[Option[Date]] and
	  (JsPath \ "lastExecutedResult").read[Option[String]] and
	  (JsPath \ "success")			.read[Boolean] and
	  (JsPath \ "project")			.read[Long] 
	)(AnalyticsRule.apply _)
	
	implicit val ruleWrites: Writes[AnalyticsRule] = (
      (JsPath \ "id")				.write[Pk[String]] and
	  (JsPath \ "name")				.write[String] and
	  (JsPath \ "queryString")		.write[String] and
	  (JsPath \ "queryLang")		.write[String] and
	  (JsPath \ "graph")			.write[Long] and
	  (JsPath \ "lastExecuted")		.write[Option[Date]] and
	  (JsPath \ "lastExecutedResult").write[Option[String]] and
	  (JsPath \ "success")			.write[Boolean] and
	  (JsPath \ "project")			.write[Long] 
	)(unlift(AnalyticsRule.unapply))
	
   /**
   * change rule for a project.
   */
  def getAll() = Action {
    val rules = AnalyticsRule.findAll
    Ok(Json.toJson(rules))
  }
  
	/**
	 * Add an Analytics Rule.
	 */
	def create() = Action {
		implicit request =>
		request.body.asJson.map { 
		    json => json.validate[AnalyticsRule].map { rule =>
				AnalyticsRule.create(rule)
				Ok(Json.toJson(rule))
		    }.recoverTotal{
				e => BadRequest("Detected error:"+ JsError.toFlatJson(e))
			}
		}.getOrElse {
			BadRequest("Expecting Json data")
		}   
	}
}