package models

import java.util.{Date}

import play.api.db._
import play.api.Play.current

import anorm._
import anorm.SqlParser._

import scala.language.postfixOps

case class Datasource(id: Pk[Long], name: String, location: String, project: Long, description: String, dataType: String)

/**
 * Datasource entity.
 * 
 * This object manages O-R mapping between RDBMS and Discover app
 * 
 * @author naodun
 *
 */
object Datasource {
  
  // -- Parsers
  
  /**
   * Parse a Datasource from a ResultSet
   */
  val simple = {
    get[Pk[Long]]("datasource.id") ~
    get[String]("datasource.name") ~
    get[String]("datasource.location") ~
    get[Long]("datasource.project") ~
    get[String]("datasource.description") ~
    get[String]("datasource.data_type")  map {
      case id~name~location~project~description~dataType => Datasource(
        id, name, location, project, description, dataType
      ) 
    }
  }
  
  // -- Queries
  
  /**
   * Retrieve a Datasource from the id.
   */
  def findById(id: Long): Option[Datasource] = {
    DB.withConnection { implicit connection =>
      SQL("select * from datasource where id = {id}").on(
        'id -> id
      ).as(Datasource.simple.singleOpt)
    }
  }
  
  
  /**
   * Find datasources related to a project
   */
  def findByProject(project: Long): Seq[Datasource] = {
    DB.withConnection { implicit connection =>
      SQL(
        """
          select * from datasource 
          join project_datasource on datasource.id = project_datasource.datasource_id 
          where project_datasource.project_id = {id}
        """
      ).on(
        'id -> project
      ).as(Datasource.simple *)
    }
  }
  
    /**
   * Retrieve all datasource.
   */
  def findAll: Seq[Datasource] = {
    DB.withConnection { implicit connection =>
      SQL("select * from datasource").as(Datasource.simple *)
    }
  }

  /**
   * Delete a datasource
   */
  def delete(id: Long) {
    DB.withConnection { implicit connection =>
      SQL("delete from datasource where id = {id}").on(
        'id -> id
      ).executeUpdate()
    }
  }
  
  /**
   * Delete all datasource in a location.
   */
  def deleteInLocation(projectId: Long, location: String) {
    DB.withConnection { implicit connection =>
      SQL("delete from datasource where project = {project} and location = {location}").on(
        'project -> projectId, 'location -> location
      ).executeUpdate()
    }
  }

  
  /**
   * Rename a location.
   */
  def renameLocation(projectId: Long, location: String, newLocation: String) {
    DB.withConnection { implicit connection =>
      SQL("update datasource set location = {newLocation} where location = {location} and project = {project}").on(
        'project -> projectId, 'location -> location, 'newLocation -> newLocation
      ).executeUpdate()
    }
  }
  
  /**
   * Create a Datasource.
   */
  def create(datasource: Datasource): Datasource = {
    DB.withConnection { implicit connection =>
      
      // Get the datasource id
      val id: Long = datasource.id.getOrElse {
        SQL("select next value for datasource_seq").as(scalar[Long].single)
      }
      
      SQL(
        """
          insert into datasource values (
            {id}, {name}, {location}, {project}, {description}, {data_type}
          )
        """
      ).on(
        'id -> id,
        'name -> datasource.name,
        'location -> datasource.location,
        'project -> datasource.project,
        'description -> datasource.description,
        'data_type -> datasource.dataType
      ).executeUpdate()
      
      // Add project_datasource
//      var result = SQL("select * for project_datasource where id = {id} and datasource = {ds}")
//        	.on('id -> datasource.project, 'ds -> id)
//      }
//      
//      DB.withConnection { implicit connection =>
//      SQL(
//        """
//          select * from datasource 
//          join project_datasource on datasource.id = project_datasource.datasource_id 
//          where project_datasource.project_id = {id}
//        """
//      ).on(
//        'id -> project
//      ).as(Datasource.simple *)
//    }
//      
//      
      SQL("insert into project_datasource values ({id}, {datasource})").on('id -> datasource.project, 'datasource -> id).executeUpdate()
            
      datasource.copy(id = Id(id))
      
    }
  }
  
}
