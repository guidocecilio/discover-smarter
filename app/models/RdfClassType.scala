package models

import play.api.libs.json._
import play.api.libs.json.JsValue
import play.api.libs.json.Json
import play.api.libs.json.Reads._
import play.api.libs.json.Writes._
import play.api.data.Mapping
import play.api.libs.functional.syntax._
import storage.SmartResource

case class RdfClassType(id: String, 
		categoryList: Map[String,String], 
		icons: Map[String,String], 
		iconChars: Map[String,String], 
		colors: Map[String,String],
		showTargetNodes: Option[Boolean])

object RdfClassType{
	

	implicit val classTypeReads: Reads[RdfClassType] = (
      (JsPath \ "id")				.read[String] and
	  (JsPath \ "categoryList")		.read[Map[String,String]] and
	  (JsPath \ "icons")			.read[Map[String,String]] and
	  (JsPath \ "iconChars")		.read[Map[String,String]] and
	  (JsPath \ "colors")			.read[Map[String,String]] and
	  (JsPath \ "showTargetNodes")	.read[Option[Boolean]]
	  
	)(RdfClassType.apply _)

	
	implicit val clasTypeWrites: Writes[RdfClassType] = (
      (JsPath \ "id")				.write[String] and
	  (JsPath \ "categoryList")		.write[Map[String,String]] and
	  (JsPath \ "icons")			.write[Map[String,String]] and
	  (JsPath \ "iconChars")		.write[Map[String,String]] and
	  (JsPath \ "colors")			.write[Map[String,String]] and
	  (JsPath \ "showTargetNodes")	.write[Option[Boolean]]
	)(unlift(RdfClassType.unapply))
	
	def findByRuleId(ruleId: String): Option[RdfClassType] = {
		val rdfClassType = SmartResource(ruleId,"classtype").getLatest()
		val jsonForRdfClassType = scala.io.Source.fromFile(rdfClassType.pull(), "utf-8").getLines.mkString
		val json = Json.parse(jsonForRdfClassType)
		val rdfClassTypez = json.validate[RdfClassType]
		rdfClassTypez.asOpt
	}
	
	def findAll(): Seq[RdfClassType] = {
		Seq.empty[RdfClassType]
	}
	
	def create(classType: RdfClassType): RdfClassType = {
		val resource= SmartResource(classType.id,"classtype")
		resource.push(Json.toJson(classType).toString)
		Json.toJson(classType)
		findByRuleId(classType.id).get
	}
	
}