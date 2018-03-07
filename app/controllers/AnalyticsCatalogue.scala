package controllers

import java.util.Date
import anorm.NotAssigned
import anorm.Pk
import models._
import play.api._
import play.api.data._
import play.api.data.Forms._
import play.api.data.format.Formats._
import play.api.libs.json._
import play.api.libs.json.Json._
import play.api.mvc._
import analytics.SimpleEdge
import analytics.SimpleGraph
import views._
import collection.JavaConversions._
import analytics.DataBlock
import play.modules.statsd.Statsd
import play.api.libs.json._



/**
 * Manages operations around analytics rules catalogue
 * 
 * This catalogue is used as a convenience to store and manage 
 * Both well known and custom rules used within the smarter data
 * application.
 * 
 */
object AnalyticsCatalogue extends Controller with Secured {

  def date(str: String) = (new java.text.SimpleDateFormat("yyyy-MM-dd")).parse(str)

  val taskForm = Form(
    tuple(
      //      "id" -> ignored(NotAssigned: Pk[Long]),
      "project" -> of[Long],
      "querystring" -> optional(text)))

  /**
   * Rename an analytics rule.
   */
  def rename(analyticsRuleId: String) = Action { implicit request =>
    Form("name" -> nonEmptyText).bindFromRequest.fold(
      errors => BadRequest,
      newName => {
        AnalyticsRule.rename(analyticsRuleId, newName)
        Ok(newName)
      })
  }
  /**
   * change rule for a project.
   */
  def updateQueryString(analyticsRuleId: String) = Action { implicit request =>
    Form("querystring" -> nonEmptyText).bindFromRequest.fold(
      errors => BadRequest,
      newQuery => {
        AnalyticsRule.updateQueryString(analyticsRuleId, newQuery)
        Ok(newQuery)
      })
  }
  /**
   * change rule for a project.
   */
  def getAll() = Action {
    val rules = AnalyticsRule.findAll
    Ok(rulesToJson(rules))
  }
  
  def rulesToJson(rules: Seq[AnalyticsRule]): JsValue = {
      Json.toJson(rules.map(x => Map ("id" -> x.id.getOrElse("no identifer for rule"), "name" -> x.name)))
  }
  
      /** used during unique name generation.*/
    private lazy val random = new java.util.Random
    
    def randomText():String = {
        java.lang.Integer.toHexString(random.nextInt)
    }
  
  /**
   * Add an Analytics Rule.
   */
  def add() = Action {
    implicit request =>
      taskForm.bindFromRequest.fold(
        errors => BadRequest,
        {
          case (project, querystring) =>
            val rule = AnalyticsRule.create(
              AnalyticsRule(anorm.Id(randomText()),
                "not a name",
                "g",
                "Gremlin",
                1, Some(date("2013-11-11")), None, false, project))
            Statsd.increment("rules.added")
            Ok(views.html.items.ruleItem(rule))
        })
  }
}