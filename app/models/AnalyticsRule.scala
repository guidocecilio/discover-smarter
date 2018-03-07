package models

import play.api.db._
import play.api.Play.current
import anorm._
import anorm.SqlParser._
import scala.language.postfixOps
import java.util.Date

case class AnalyticsRule(id: Pk[String], 
    name: String, 
    queryString: String, 
    queryLang: String, 
    graph: Long, 
    lastExecuted:Option[Date],
    lastExecutedResult:Option[String],
    success: Boolean,
    project: Long )

object AnalyticsRule {
  
  // -- Parsers
  
  /**
   * Parse a Rule from a ResultSet
   */
  val simple = {
    get[Pk[String]]("analytics_rule.id") ~
    get[String]("analytics_rule.name") ~
    get[String]("analytics_rule.query_string") ~
    get[String]("analytics_rule.query_lang") ~
    get[Long]("analytics_rule.graph") ~
    get[Option[Date]]("analytics_rule.last_executed") ~
    get[Option[String]]("analytics_rule.last_executed_result") ~
    get[Boolean]("analytics_rule.success") ~
    get[Long]("analytics_rule.project") map {
      case id~name~queryString~queryLang~graph~lastExecuted~lastExecutedResult~success~project => AnalyticsRule(id,name,queryString,queryLang,graph,lastExecuted,lastExecutedResult,success,project)
    }
  }
  
  // -- Queries
  
  /**
   * Retrieve a Rule by Id.
   */
  def findById(id: String): Option[AnalyticsRule] = {
    DB.withConnection { implicit connection =>
      SQL("select * from analytics_rule where id = {id}").on(
        'id -> id
      ).as(AnalyticsRule.simple.singleOpt)
    }
  }
  
  /**
   * Retrieve all rules.
   */
  def findAll: Seq[AnalyticsRule] = {
    DB.withConnection { implicit connection =>
      SQL("select * from analytics_rule").as(AnalyticsRule.simple *)
    }
  }
  
  /**
   * Delete a Rule
   */
  def delete(id: String) {
    DB.withConnection { implicit connection =>
      SQL("delete from analytics_rule where id = {id}").on(
        'id -> id
      ).executeUpdate()
    }
  }
  
  /**
   * rename a rule.
   */
  def rename(id: String, newName: String) {
    DB.withConnection { implicit connection =>
      SQL("update analytics_rule set name = {name} where id = {id}").on(
        'id -> id, 'name -> newName
      ).executeUpdate()
    }
  }
  
    /**
   * rename a rule.
   */
  def updateQueryString(id: String, query: String) {
    DB.withConnection { implicit connection =>
      SQL("update analytics_rule set query_string = {query_string} where id = {id}").on(
        'id -> id, 'query_string -> query
      ).executeUpdate()
    }
  }
  
   /**
   * rename a rule.
   */
  def updateLastExecutedResult(id: String, query: String) {
    DB.withConnection { implicit connection =>
      SQL("update analytics_rule set last_executed_result = {last_executed_result} where id = {id}").on(
        'id -> id, 'last_executed_result -> query
      ).executeUpdate()
    }
  }
  
   /**
   * Finds an Analytics Rule related to a project
   */
  def findByProject(project: Long): Seq[AnalyticsRule] = {
    DB.withConnection { implicit connection =>
      SQL(
        """
          select * from analytics_rule 
          where analytics_rule.project = {project}
        """
      ).on(
        'project -> project
      ).as(AnalyticsRule.simple *)
    }
  }
  
  /**
   * Create a Rule.
   */
  def create(analyticsRule: AnalyticsRule): AnalyticsRule = {
    DB.withTransaction { implicit connection =>
      
      SQL(
        """
          insert into analytics_rule values (
          {id}, {name}, {query_string}, {query_lang}, {graph}, {last_executed}, {last_executed_result}, {success}, {project}
          )
        """
      ).on(
        'id -> analyticsRule.id,
        'name -> analyticsRule.name,
        'query_string -> analyticsRule.queryString,
        'query_lang -> analyticsRule.queryLang,
        'graph -> analyticsRule.graph,
        'last_executed -> analyticsRule.lastExecuted,
        'last_executed_result -> analyticsRule.lastExecutedResult,
        'success -> analyticsRule.success,
        'project -> analyticsRule.project
      ).executeUpdate()
      
      analyticsRule

    }
  }
  
}
