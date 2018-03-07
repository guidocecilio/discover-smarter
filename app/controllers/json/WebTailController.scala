package controllers.json

import play.api.mvc.Action
import play.api.mvc.Controller
import play.api.libs.json.Json
import storage.SmartResource
import java.io.File
import play.api.libs.json.Writes
import play.api.libs.json.Reads
import play.api.libs.json.JsArray

/**
 * Very simple web implementation of Tail, right now just
 * returns number of lines, but could be extended.
 * 
 * @author naodun
 *
 */
object WebTailController extends Controller{
	
	/**
	 * lists file 
	 * @param file file we want to read lines from
	 * @param n number of lines we want read
	 * @return array of strings for each file
	 */
	def getLinesFromFile(file: File, n: Int): Array[String]= {
		val src = io.Source.fromFile(file)
		try{
			src.getLines.take(n).toArray[String]
		}finally{
			src.close()
		}
	}
	//ND:  thinking about https://github.com/jsuereth/scala-arm for files
	
	/**
	 * tails a text file in the system by n number of lines
	 */
	def tail(location: String, noOfLines: Int) = Action {
		val resource = SmartResource(location).pull
		if (resource.exists()){
			Ok(Json.toJson(getLinesFromFile(resource, noOfLines)))			
		} else{
			BadRequest("Missing or malformed file")
		}
	}
	
}