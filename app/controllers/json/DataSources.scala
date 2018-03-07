package controllers.json

import play.api._
import play.api.mvc.Action
import play.api.mvc.Controller
import play.api.data._
import play.api.data.Forms._
import play.api.libs.json.Json
import models.Datasource
import play.api.libs.json.Writes
import play.api.libs.json.Reads
import play.api.libs.json.JsResult
import play.api.libs.json.JsSuccess
import play.api.libs.json.JsValue
import anorm.NotAssigned
import anorm.Pk
import anorm.Id
import play.api.libs.json.JsNumber
import play.api.libs.json.JsError
import play.api.libs.json.Json.toJsFieldJsValueWrapper
import scala.math.BigDecimal.long2bigDecimal


/**
 * JSON controller for data sources
 * Added basic json serialisation, and endpoints for rest commands 
 * 
 * @author naodun
 *
 */
object DataSources extends Controller {

	implicit val pkWrites = new Writes[Pk[Long]] {
		def writes(id: Pk[Long]) = JsNumber(id.get)
	}

	implicit val pkReads = new Reads[Pk[Long]] {
		def reads(json: JsValue):JsResult[Pk[Long]] = {
				JsSuccess(Id(json.as[Long]))
		}
	}

	implicit val datasourceWrites = new Writes[Datasource] {
		def writes(datasource: Datasource) = Json.obj(
				"id" -> datasource.id,
				"name" -> datasource.name,
				"location" -> datasource.location,
				"project" -> datasource.project,
				"description" -> datasource.description,
				"dataType" -> datasource.dataType
				)
	}

	implicit val datasourceReads = new Reads[Datasource] {
		def reads(js: JsValue): JsResult[Datasource] = {
				JsSuccess(Datasource(
						id=NotAssigned,
						(js \ "name").as[String],
						(js \ "location").as[String],
						(js \ "project").as[Long],
						(js \ "description").as[String],
						(js \ "dataType").as[String]
						))
		}
	}

    def getDataSourcesByProjectId(project: Long) = Action{
            val ds = Datasource.findByProject(project)
            Ok(Json.toJson(ds))
    }
	
	/**
	 * lists the datasources in the application
	 * @return list of datasources
	 */
	def listDataSources = Action { 
		val ds = Datasource.findAll
				Ok(Json.toJson(ds))
	}

	/**
	 * given a datasource id will return the record
	 */
	def getDataSourceById(id: Long) = Action { 
		val ds = Datasource.findById(id)
				Ok(Json.toJson(ds))
	}

	
	
	/**
	 * 
	 */
	//def createDataSource = IsAuthenticated { _ => implicit request =>
	def createDataSource = Action { implicit request =>
		request.body.asJson.map { 
		    json => json.validate[Datasource].map { datasource =>  
				val ds = Datasource.create(datasource)
			
				// update the project_datasource table
			
			
				// TODO: add JSON deserializer for "routes.Projects.getDataSources(ds.id.asInstanceOf[Long])"
				// and a better ds.id conversion from Pk[Long] to Long
				// No Json deserializer found for type play.api.mvc.Call. 
				// Try to implement an implicit Writes or Format for this type.
				Ok(Json.obj("id" -> ds.id, "self" -> request.uri))
			}.recoverTotal{
				e => BadRequest("Detected error:"+ JsError.toFlatJson(e))
			}
		}.getOrElse {
			BadRequest("Expecting Json data")
		}
	}    
	
	
	
}