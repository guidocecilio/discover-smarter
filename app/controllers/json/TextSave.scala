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
import storage.SmartResource

/**
 * Class to save text strings to internal files
 * 
 * Useful for demos, requires some thought in production.
 * 
 * @author naodun, waqar
 *
 */
object TextSave extends Controller{

	def getLatest(filename : String) = Action { 
		Ok.sendFile(content = SmartResource(filename).getLatest().pull()) 
	}
	
	/**
	 * Add a text string
	 */
	def create(filename: String, fileExtention: String) = Action {
		implicit request =>{
			request.body.asText.map { 
				text => {
					val resource= SmartResource(filename,fileExtention)
					resource.push(text)
					val orgName = filename + "." + fileExtention
					Ok(Json.obj(
            		"status" -> "SUCCESS",
            		"originalFile" -> orgName,
            		"simpleName" -> resource.simpleName,
            		"clientUrl" -> resource.clientUrl,
            		"innerUrl" -> resource.innerUrl)) 					
				} 
			}.getOrElse {
				BadRequest("Expecting Json data")
			}   
		}
	}
}