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
import play.api.libs.functional.syntax._
import java.util.Date
import models.RdfClassType
import models.RdfClassType._

/**
 * JSON Controller for Class Types as REST operations
 * 
 * Class types are used to help in visualisation of graph
 * 
 * @author naodun
 *
 */
object RdfClassTypes  extends Controller{
	
//	val rdfClassTypeForm = Form(
//    mapping(
//      "id" -> nonEmptyText,
//      "categoryList" -> play.api.data.Forms.map(nonEmptyText),
//      "icons" -> play.api.data.Forms.list(nonEmptyText),
//      "iconChars" -> play.api.data.Forms.list(nonEmptyText),
//      "colors" -> play.api.data.Forms.list(nonEmptyText)
//      )(RdfClassType.apply)(RdfClassType.unapply))
//	
   /**
   * get listing of all class types available
   */
  def getAll() = Action {
    val types = RdfClassType.findAll
    Ok(Json.toJson(types))
  }
	
   /**
   * get listing of all class types available
   */
  def getByRuleId(ruleId: String) = Action {
    Ok(Json.toJson(RdfClassType.findByRuleId(ruleId)))
  }
  
	/**
	 * Add an Analytics Rule.
	 */
	def create() = Action {
		implicit request =>
		request.body.asJson.map { 
		    json => json.validate[RdfClassType].map { classType =>
				Ok(Json.toJson(RdfClassType.create(classType)))
		    }.recoverTotal{
				e => BadRequest("Detected error:"+ JsError.toFlatJson(e))
			}
		}.getOrElse {
			BadRequest("Expecting Json data")
		}   
	}
}