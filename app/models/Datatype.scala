package models

import java.util.{Date}

import play.api.db._
import play.api.Play.current

import anorm._
import anorm.SqlParser._

import scala.language.postfixOps

case class Datatype(dataType: String, description: String)

object Datatype {
  
  /**
   * Parse a User from a ResultSet
   */
  val simple = {
    get[String]("data_type.data_type") ~
    get[String]("data_type.description") map {
      case dataType~description => Datatype(dataType, description)
    }
  }
  
  // -- Queries

  
  /**
   * Retrieve all users.
   */
  def findAll: Seq[Datatype] = {
    DB.withConnection { implicit connection =>
      SQL("select * from data_type").as(Datatype.simple *)
    }
  }
  
   
  /**
   * Create a User.
   */
  def create(datatype: Datatype): Datatype = {
    DB.withConnection { implicit connection =>
      SQL(
        """
          insert into data_type values (
            {data_type}, {description}
          )
        """
      ).on(
        'data_type -> datatype.dataType,
        'description -> datatype.description
      ).executeUpdate()
      
      datatype
      
    }
  }
  
  
}
